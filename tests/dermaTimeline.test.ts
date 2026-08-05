import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canReviewComparison,
  canTransitionComparison,
  deriveReviewState,
  effectiveMetrics,
  isLegacyClassification,
  isValidObservationPair,
  selectDefaultObservationPair,
  sortTimeline,
  validateReviewInput,
  type ComparisonSession,
  type Lesion,
  type LesionObservation,
} from '../src/domain/skinProgress.ts';

const observation = (
  id: string,
  capturedAt: string,
  status: LesionObservation['status'] = 'VERIFIED',
): LesionObservation => ({
  id,
  lesionId: 'lesion-1',
  capturedAt,
  capturedBy: 'actor-1',
  imageAssets: [],
  patientReportedSymptoms: [],
  clinicalMetrics: [],
  imageQualityStatus: 'ACCEPTABLE',
  imageQualityReasons: [],
  status,
  createdAt: capturedAt,
  updatedAt: capturedAt,
  revision: 1,
});

const lesion: Lesion = {
  id: 'lesion-1',
  patientId: 'patient-1',
  code: 'L-00001',
  title: 'Tổn thương theo dõi',
  bodyRegion: 'forearm',
  laterality: 'LEFT',
  firstObservedAt: '2026-01-01T00:00:00Z',
  status: 'ACTIVE',
  createdBy: 'doctor-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  currentAssessment: 'INDETERMINATE',
  reviewState: 'AI_SUGGESTION',
  clinicianSelectedBaselineId: 'observation-1',
  suspectedAdverseEvent: false,
};

const comparison = (): ComparisonSession => ({
  id: 'comparison-1',
  lesionId: lesion.id,
  baselineObservationId: 'observation-1',
  targetObservationId: 'observation-2',
  status: 'READY_FOR_REVIEW',
  requestedBy: 'patient-1',
  requestedAt: '2026-01-02T00:00:00Z',
  idempotencyKey: 'request-1',
  reviews: [],
  analysis: {
    id: 'analysis-1',
    comparisonSessionId: 'comparison-1',
    analysisType: 'CLINICAL_DATA_DELTA',
    modelName: 'none',
    modelVersion: 'not-applicable',
    algorithmVersion: 'clinical-delta-v1',
    confidence: null,
    generatedAt: '2026-01-02T00:00:00Z',
    assessment: 'INDETERMINATE',
    visualChangeSummary: 'Chưa có phân tích hình ảnh đã được kiểm định.',
    limitations: ['Chỉ hiển thị thay đổi của dữ liệu được ghi nhận.'],
    quality: {
      comparabilityScore: null,
      sharpness: null,
      lightingConsistency: null,
      angleConsistency: null,
      scaleConsistency: null,
      occlusion: null,
      registrationQuality: 'UNAVAILABLE',
      comparisonDisposition: 'UNAVAILABLE',
      reasons: ['Chưa có bộ phân tích chất lượng ảnh.'],
    },
    metrics: [{
      key: 'itch-nrs-24h',
      label: 'Ngứa NRS (24 giờ)',
      category: 'SYMPTOM',
      baseline: 8,
      current: 4,
      delta: -4,
      unit: '{score}',
      source: 'PATIENT_REPORTED',
      baselineSource: 'PATIENT_REPORTED',
      currentSource: 'PATIENT_REPORTED',
      interpretation: 'INDETERMINATE',
      clinicianVerified: false,
    }],
    evidence: [],
  },
});

test('default pair uses clinician baseline and latest valid observation', () => {
  const observations = [
    observation('observation-1', '2026-01-01T00:00:00Z'),
    observation('observation-2', '2026-01-03T00:00:00Z'),
  ];
  const pair = selectDefaultObservationPair(lesion, observations)!;
  assert.equal(pair.baselineId, lesion.clinicianSelectedBaselineId);
  assert.equal(isValidObservationPair(pair.baselineId, pair.targetId, observations), true);
  assert.equal(isValidObservationPair(pair.baselineId, pair.baselineId, observations), false);
});

test('invalid timestamps and unusable images cannot be compared', () => {
  const invalidDate = observation('invalid', 'not-a-date');
  const target = observation('target', '2026-01-03T00:00:00Z');
  assert.equal(isValidObservationPair(invalidDate.id, target.id, [invalidDate, target]), false);
  const unusable = { ...observation('bad', '2026-01-01T00:00:00Z'), imageQualityStatus: 'UNUSABLE' as const };
  assert.equal(isValidObservationPair(unusable.id, target.id, [unusable, target]), false);
});

test('only a doctor or super_administrator sees the clinical review action, and transitions are bounded', () => {
  assert.equal(canReviewComparison('doctor'), true);
  assert.equal(canReviewComparison('nurse'), false);
  assert.equal(canReviewComparison('super_administrator'), true);
  assert.equal(canTransitionComparison('FAILED', 'QUEUED'), true);
  assert.equal(canTransitionComparison('READY_FOR_REVIEW', 'PROCESSING'), false);
});

test('review validation requires an audit reason and rejection comment', () => {
  assert.equal(validateReviewInput({
    decision: 'REJECTED',
    clinicalAssessment: 'INDETERMINATE',
    comment: '',
    reason: '',
  }).length, 2);
});

test('clinical correction preserves the immutable server analysis', () => {
  const session = comparison();
  const original = structuredClone(session.analysis!.metrics[0]);
  session.reviews.push({
    id: 'review-1',
    comparisonSessionId: session.id,
    reviewerId: 'doctor-1',
    reviewerName: 'Doctor',
    decision: 'MODIFIED',
    clinicalAssessment: 'STABLE',
    correctedMetrics: { 'itch-nrs-24h': 5 },
    comment: 'Đã đối chiếu bệnh sử.',
    reviewedAt: '2026-01-03T00:00:00Z',
  });
  const effective = effectiveMetrics(session)[0];
  assert.equal(effective.current, 5);
  assert.equal(effective.currentSource, 'CLINICIAN_REPORTED');
  assert.deepEqual(session.analysis!.metrics[0], original);
  assert.equal(deriveReviewState(session), 'CLINICIAN_MODIFIED');
});

test('timeline ordering is newest-first', () => {
  const sorted = sortTimeline([
    { id: 'old', lesionId: lesion.id, occurredAt: '2026-01-01T00:00:00Z', type: 'OBSERVATION', title: 'Old', summary: '', source: 'SYSTEM' },
    { id: 'new', lesionId: lesion.id, occurredAt: '2026-01-03T00:00:00Z', type: 'CLINICIAN_REVIEW', title: 'New', summary: '', source: 'CLINICIAN_REPORTED' },
  ]);
  assert.deepEqual(sorted.map((item) => item.id), ['new', 'old']);
});

test('legacy classification prefers the backend-persisted field over the client heuristic', () => {
  const session = comparison();
  session.analysis!.isLegacyClassification = false;
  assert.equal(isLegacyClassification(session.analysis), false);

  session.analysis!.isLegacyClassification = true;
  assert.equal(isLegacyClassification(session.analysis), true);
});

test('legacy classification falls back to the heuristic for bundles predating the persisted field', () => {
  const session = comparison();
  delete session.analysis!.isLegacyClassification;
  // The fixture's analysis is a clinical-data-only result (modelName 'none'),
  // which never matches the registered-pair pipeline signature.
  assert.equal(isLegacyClassification(session.analysis), true);
});

test('a simulated (demo) analysis is never reported as legacy, even if flagged', () => {
  const session = comparison();
  session.analysis!.modelName = 'derma-timeline-demo-analysis';
  session.analysis!.algorithmVersion = 'seeded-fixture-comparison/1.0.0';
  session.analysis!.isLegacyClassification = true;
  assert.equal(isLegacyClassification(session.analysis), false);
});
