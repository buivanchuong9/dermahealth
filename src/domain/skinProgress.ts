// Longitudinal lesion-tracking contracts shared by the medical-record UI.
// This module contains no fixture data and performs no image inference in the browser.

export type Laterality = 'LEFT' | 'RIGHT' | 'MIDLINE' | 'UNKNOWN';
export type LesionStatus = 'ACTIVE' | 'RESOLVED' | 'ARCHIVED';
export type ObservationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'READY_FOR_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'NEEDS_RECAPTURE';
export type ComparisonStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'NEEDS_RECAPTURE'
  | 'READY_FOR_REVIEW';
export type ClinicalAssessment = 'IMPROVING' | 'STABLE' | 'WORSENING' | 'INDETERMINATE';
export type ReviewDecision = 'CONFIRMED' | 'MODIFIED' | 'REJECTED';
export type ReviewState =
  | 'AI_SUGGESTION'
  | 'AWAITING_CLINICIAN_REVIEW'
  | 'CLINICIAN_CONFIRMED'
  | 'CLINICIAN_MODIFIED'
  | 'CLINICIAN_REJECTED'
  | 'UNABLE_TO_DETERMINE';

export type ImageAssetType =
  | 'ORIGINAL'
  | 'THUMBNAIL'
  | 'ALIGNED'
  | 'MASK'
  | 'HEATMAP'
  | 'DIFFERENCE_MAP';

export type MaskProvenance =
  | 'MODEL_PROPOSED'
  | 'CLINICIAN_DRAWN'
  | 'CLINICIAN_CORRECTED'
  | 'CLINICIAN_CONFIRMED';

export interface ImageAsset {
  id: string;
  patientId: string;
  observationId: string;
  originalAssetId?: string | null;
  type: ImageAssetType;
  /** Short-lived signed URL produced by the backend. Never a raw storage key. */
  protectedUrl: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSize?: number | null;
  checksum?: string | null;
  /** MASK assets only. Null = unknown provenance (pre-dates this field) or
   * not a MASK asset. */
  maskProvenance?: MaskProvenance | null;
  /** Self-reference to the prior mask this row confirms/corrects. lesion_image_assets
   * is append-only — a correction is always a new row, never an edit. */
  correctsAssetId?: string | null;
  capturedAt: string;
  createdAt: string;
}

export type MetricSource =
  | 'IMAGE_ANALYSIS'
  | 'PATIENT_REPORTED'
  | 'CLINICIAN_REPORTED'
  | 'DEVICE'
  | 'IMPORTED';

export type MetricCategory =
  | 'MORPHOLOGY'
  | 'INFLAMMATION'
  | 'SYMPTOM'
  | 'FUNCTION'
  | 'TREATMENT'
  | 'IMAGE_QUALITY'
  | 'OTHER';

export interface ObservationMetric {
  code: string;
  label: string;
  category: MetricCategory;
  value: number;
  unit: string;
  source: MetricSource;
  measurementMethod?: string | null;
  observedAt: string;
  confidence?: number | null;
  clinicianVerified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}

export interface LesionObservation {
  id: string;
  lesionId: string;
  encounterId?: string | null;
  capturedAt: string;
  capturedBy: string;
  imageAssets: ImageAsset[];
  patientReportedSymptoms: string[];
  itchScore?: number | null;
  painScore?: number | null;
  burningScore?: number | null;
  sleepImpactScore?: number | null;
  clinicianNotes?: string | null;
  treatmentContext?: string | null;
  clinicalMetrics: ObservationMetric[];
  imageQualityStatus: 'ACCEPTABLE' | 'CAUTION' | 'UNUSABLE';
  imageQualityReasons: string[];
  status: ObservationStatus;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface Lesion {
  id: string;
  patientId: string;
  code: string;
  title: string;
  bodyRegion: string;
  laterality: Laterality;
  diagnosis?: string | null;
  diagnosisCode?: string | null;
  firstObservedAt: string;
  status: LesionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currentAssessment: ClinicalAssessment;
  reviewState: ReviewState;
  clinicianName?: string | null;
  clinicianId?: string | null;
  currentTreatment?: string | null;
  clinicianSelectedBaselineId?: string | null;
  suspectedAdverseEvent: boolean;
}

export interface ComparisonMetric {
  key: string;
  label: string;
  category: MetricCategory;
  baseline: number | null;
  current: number | null;
  delta: number | null;
  unit: string;
  source: MetricSource;
  baselineSource?: MetricSource | null;
  currentSource?: MetricSource | null;
  baselineObservedAt?: string | null;
  currentObservedAt?: string | null;
  measurementMethod?: string | null;
  missingReason?: string | null;
  interpretation: 'IMPROVED' | 'STABLE' | 'WORSENED' | 'INDETERMINATE' | 'NOT_APPLICABLE';
  interpretationPolicy?: { id: string; version: string } | null;
  confidence?: number | null;
  clinicianVerified: boolean;
}

export interface RegistrationProvenance {
  kind: string;
  dx: number;
  dy: number;
  score: number;
  phasePeakStrength: number;
  likelySameBodyRegion: number;
  likelySameLesion: number;
  requiresClinicianMaskReview: boolean;
}

export interface ImageQualityAssessment {
  comparabilityScore: number | null;
  sharpness: number | null;
  lightingConsistency: number | null;
  angleConsistency: number | null;
  scaleConsistency: number | null;
  occlusion: number | null;
  registrationQuality: 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE';
  comparisonDisposition: 'COMPARABLE' | 'CAUTION' | 'NOT_COMPARABLE' | 'UNAVAILABLE';
  policyVersion?: string | null;
  reasons: string[];
  registrationProvenance?: RegistrationProvenance | null;
}

export interface EvidenceLink {
  id: string;
  text: string;
  type: 'METRIC' | 'OVERLAY' | 'TIMELINE';
  targetId: string;
}

export interface ComparisonAnalysis {
  id: string;
  comparisonSessionId: string;
  analysisType: 'CLINICAL_DATA_DELTA' | 'IMAGE_ANALYSIS' | 'HYBRID';
  modelName: string;
  modelVersion: string;
  algorithmVersion: string;
  confidence: number | null;
  generatedAt: string;
  assessment: ClinicalAssessment;
  visualChangeSummary: string;
  limitations: string[];
  /** Persisted mirror of isRegisteredProgressAnalysis()'s heuristic — set by
   * the backend at write time. Optional only for older cached bundles /
   * fixtures predating this field; treat missing as unknown, not false. */
  isLegacyClassification?: boolean;
  quality: ImageQualityAssessment;
  metrics: ComparisonMetric[];
  evidence: EvidenceLink[];
}

export interface ClinicianReview {
  id: string;
  comparisonSessionId: string;
  reviewerId: string;
  reviewerName: string;
  decision: ReviewDecision;
  clinicalAssessment: ClinicalAssessment;
  correctedMetrics: Record<string, number>;
  comment: string;
  imageLimitations?: string[];
  recaptureRequested?: boolean;
  reviewedAt: string;
}

export interface ComparisonSession {
  id: string;
  lesionId: string;
  baselineObservationId: string;
  targetObservationId: string;
  status: ComparisonStatus;
  requestedBy: string;
  requestedAt: string;
  completedAt?: string | null;
  failureReason?: string | null;
  analysisVersion?: string | null;
  idempotencyKey: string;
  analysis?: ComparisonAnalysis | null;
  reviews: ClinicianReview[];
}

export type TimelineEventType =
  | 'OBSERVATION'
  | 'IMAGE'
  | 'TREATMENT'
  | 'SYMPTOM'
  | 'ANALYSIS'
  | 'CLINICIAN_REVIEW'
  | 'ADVERSE_EVENT'
  | 'RECAPTURE';

export interface TimelineEvent {
  id: string;
  lesionId: string;
  occurredAt: string;
  type: TimelineEventType;
  title: string;
  summary: string;
  source: MetricSource | 'SYSTEM';
  relatedId?: string;
  warning?: boolean;
}

export interface AuditEntry {
  id: string;
  occurredAt: string;
  actorName: string;
  action: string;
  previousValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  source: string;
  correlationId: string;
}

export type AdverseEventCausality =
  | 'UNASSESSED'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'PROBABLE'
  | 'INDETERMINATE';

export interface AdverseEvent {
  id: string;
  patientId: string;
  lesionId?: string | null;
  suspectedMedicationIds: string[];
  onsetAt: string;
  symptoms: string[];
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'UNKNOWN';
  urgencyLevel: 'ROUTINE' | 'SOON' | 'URGENT' | 'EMERGENCY';
  causalityStatus: AdverseEventCausality;
  clinicianStatus: 'PENDING_REVIEW' | 'REVIEWED';
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  updatedAt: string;
}

export interface LesionDetailBundle {
  lesion: Lesion;
  observations: LesionObservation[];
  comparison: ComparisonSession | null;
  timeline: TimelineEvent[];
  audit: AuditEntry[];
}

export interface ReviewInput {
  decision: ReviewDecision;
  clinicalAssessment: ClinicalAssessment;
  correctedMetrics?: Record<string, number>;
  comment: string;
  reason: string;
  imageLimitations?: string[];
  requestRecapture?: boolean;
}

/** This UI check only controls visibility. Backend policy remains authoritative. */
export function canReviewComparison(role: string): boolean {
  return role === 'doctor' || role === 'super_administrator';
}

export function isValidObservationPair(
  baselineId: string,
  targetId: string,
  observations: LesionObservation[],
): boolean {
  if (!baselineId || !targetId || baselineId === targetId) return false;
  const validStatuses = new Set<ObservationStatus>(['READY_FOR_REVIEW', 'VERIFIED']);
  const baseline = observations.find((item) => item.id === baselineId);
  const target = observations.find((item) => item.id === targetId);
  return Boolean(
    baseline &&
      target &&
      validStatuses.has(baseline.status) &&
      validStatuses.has(target.status) &&
      baseline.imageQualityStatus !== 'UNUSABLE' &&
      target.imageQualityStatus !== 'UNUSABLE' &&
      Number.isFinite(Date.parse(baseline.capturedAt)) &&
      Number.isFinite(Date.parse(target.capturedAt)) &&
      Date.parse(baseline.capturedAt) < Date.parse(target.capturedAt),
  );
}

/** Single source of truth for "usable as a comparison endpoint" — mirrors the
 * status/quality checks in isValidObservationPair, sorted oldest first. */
export function validObservationsSorted(observations: LesionObservation[]): LesionObservation[] {
  return observations
    .filter(
      (item) =>
        ['READY_FOR_REVIEW', 'VERIFIED'].includes(item.status) &&
        item.imageQualityStatus !== 'UNUSABLE' &&
        Number.isFinite(Date.parse(item.capturedAt)),
    )
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
}

export function selectDefaultObservationPair(
  lesion: Lesion,
  observations: LesionObservation[],
): { baselineId: string; targetId: string } | null {
  const valid = validObservationsSorted(observations);
  if (valid.length < 2) return null;
  const selected = valid.find((item) => item.id === lesion.clinicianSelectedBaselineId);
  const baseline = selected ?? valid[0];
  const target = [...valid].reverse().find((item) => item.id !== baseline.id);
  return target ? { baselineId: baseline.id, targetId: target.id } : null;
}

/** True only for the approved seeded demo lesion's comparisons — the backend
 * names its demo adapter's model/algorithm identifiers so this is never a
 * guess about arbitrary production analysis. */
export function isSimulatedAnalysis(analysis: ComparisonAnalysis | null | undefined): boolean {
  if (!analysis) return false;
  return analysis.modelName.includes('demo') || analysis.algorithmVersion.includes('demo');
}

/** Only analyses produced by the registered-pair pipeline may drive image
 * progression UI. Older per-image classifier snapshots have valid model
 * probabilities, but no alignment or masks, so they are not progression
 * evidence and must never be rendered as such. */
export function isRegisteredProgressAnalysis(
  analysis: ComparisonAnalysis | null | undefined,
): boolean {
  if (!analysis || isSimulatedAnalysis(analysis)) return false;
  return Boolean(
    analysis.modelName.includes('semi-automatic-lesion-progress') &&
      analysis.quality.policyVersion?.startsWith('lesion-comparability/'),
  );
}

/** Prefers the backend's persisted isLegacyClassification (set once, at
 * analysis-write time — see ComparisonAnalysisService.analyze) and falls
 * back to the equivalent client-side heuristic only for bundles/fixtures
 * predating that field. Never true for simulated (demo) analyses — legacy
 * and simulated are distinct concepts and a row is never both. */
export function isLegacyClassification(
  analysis: ComparisonAnalysis | null | undefined,
): boolean {
  if (!analysis || isSimulatedAnalysis(analysis)) return false;
  if (analysis.isLegacyClassification !== undefined) return analysis.isLegacyClassification;
  return !isRegisteredProgressAnalysis(analysis);
}

export function deriveReviewState(session: ComparisonSession): ReviewState {
  const latest = session.reviews.at(-1);
  if (latest?.decision === 'CONFIRMED') return 'CLINICIAN_CONFIRMED';
  if (latest?.decision === 'MODIFIED') return 'CLINICIAN_MODIFIED';
  if (latest?.decision === 'REJECTED') return 'CLINICIAN_REJECTED';
  if (session.status === 'FAILED' || session.status === 'NEEDS_RECAPTURE') {
    return 'UNABLE_TO_DETERMINE';
  }
  return session.analysis ? 'AWAITING_CLINICIAN_REVIEW' : 'AI_SUGGESTION';
}

/** Applies the newest clinician correction without mutating the immutable
 * server analysis snapshot. */
export function effectiveMetrics(session: ComparisonSession): ComparisonMetric[] {
  const metrics = session.analysis?.metrics ?? [];
  const latest = session.reviews.at(-1);
  if (!latest || latest.decision !== 'MODIFIED') return metrics;
  return metrics.map((metric) => {
    const current = latest.correctedMetrics[metric.key];
    if (current === undefined) return metric;
    return {
      ...metric,
      current,
      delta: metric.baseline === null ? null : current - metric.baseline,
      clinicianVerified: true,
      source: 'CLINICIAN_REPORTED',
      currentSource: 'CLINICIAN_REPORTED',
    };
  });
}

export function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const byTime = Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
    return byTime || a.id.localeCompare(b.id);
  });
}

export function validateReviewInput(input: ReviewInput): string[] {
  const errors: string[] = [];
  if (!['CONFIRMED', 'MODIFIED', 'REJECTED'].includes(input.decision)) {
    errors.push('Quyết định review không hợp lệ.');
  }
  if (!['IMPROVING', 'STABLE', 'WORSENING', 'INDETERMINATE'].includes(input.clinicalAssessment)) {
    errors.push('Đánh giá lâm sàng không hợp lệ.');
  }
  if (!input.reason.trim()) errors.push('Phải ghi lý do để bảo toàn audit trail.');
  if (input.decision === 'REJECTED' && !input.comment.trim()) {
    errors.push('Phải ghi chú khi từ chối kết quả phân tích.');
  }
  for (const [code, value] of Object.entries(input.correctedMetrics ?? {})) {
    if (!code.trim() || !Number.isFinite(value)) {
      errors.push('Mã và giá trị chỉ số hiệu chỉnh phải hợp lệ.');
    }
  }
  return errors;
}

const COMPARISON_TRANSITIONS: Record<ComparisonStatus, ComparisonStatus[]> = {
  QUEUED: ['PROCESSING', 'FAILED'],
  PROCESSING: ['COMPLETED', 'READY_FOR_REVIEW', 'NEEDS_RECAPTURE', 'FAILED'],
  COMPLETED: ['READY_FOR_REVIEW'],
  FAILED: ['QUEUED'],
  NEEDS_RECAPTURE: ['QUEUED'],
  READY_FOR_REVIEW: [],
};

export function canTransitionComparison(
  current: ComparisonStatus,
  next: ComparisonStatus,
): boolean {
  return COMPARISON_TRANSITIONS[current].includes(next);
}
