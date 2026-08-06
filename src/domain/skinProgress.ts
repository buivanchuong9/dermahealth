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

export type DermaTimelinePresentationMode = 'PATIENT' | 'CLINICIAN' | 'ADMIN_CLINICAL';

export function resolveDermaTimelinePresentationMode(
  userRole: string,
): DermaTimelinePresentationMode {
  if (userRole === 'patient') {
    return 'PATIENT';
  }
  if (userRole === 'super_administrator') {
    return 'ADMIN_CLINICAL';
  }
  if (userRole === 'doctor' || userRole === 'nurse' || userRole === 'receptionist') {
    return 'CLINICIAN';
  }
  return 'PATIENT';
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

// ---------------------------------------------------------------------------
// Evidence capabilities
//
// Each function below answers exactly one question: "can the UI show X for
// this data?" — replacing what used to be a single broad hasRegisteredPair
// flag gating every kind of image evidence at once. That flag was correct
// for slider/overlay/difference-map (which genuinely need a registered pair),
// but wrong for per-image evidence like masks and Grad-CAM attention, which
// are computed on ONE photo before the two are ever compared to each other —
// gating those on pair registration hid real, valid evidence any time
// registration failed, even though nothing about that evidence depended on
// registration succeeding.
// ---------------------------------------------------------------------------

const MASK_PROVENANCE_ALLOWED = new Set<MaskProvenance>([
  'MODEL_PROPOSED',
  'CLINICIAN_DRAWN',
  'CLINICIAN_CORRECTED',
  'CLINICIAN_CONFIRMED',
]);

/** imageAssets is ordered oldest-first, and a derived type (ALIGNED, MASK,
 * HEATMAP, DIFFERENCE_MAP) can have multiple rows once a clinician
 * confirms/corrects an AI proposal (lesion_image_assets is append-only — a
 * correction is always a new row, never an edit). The most recently created
 * row for a type is always the authoritative one. */
export function latestImageAsset(
  observation: LesionObservation,
  type: ImageAssetType,
): ImageAsset | undefined {
  return observation.imageAssets.filter((asset) => asset.type === type).at(-1);
}

function hasUsableMask(
  observation: LesionObservation,
  analysis?: ComparisonAnalysis | null,
): boolean {
  if (isSimulatedAnalysis(analysis)) return false;
  const asset = latestImageAsset(observation, 'MASK');
  if (!asset?.protectedUrl) return false;
  // Provenance predates the field on some older rows — absence means
  // "unknown", not "invalid", mirroring isLegacyClassification's precedent
  // of never treating a missing field as a hidden false.
  if (asset.maskProvenance == null) return true;
  return MASK_PROVENANCE_ALLOWED.has(asset.maskProvenance);
}

/** Deliberately takes only the ONE observation whose mask is being asked
 * about — no pair-registration check, by design. */
export function canViewBaselineMask(
  baseline: LesionObservation,
  analysis?: ComparisonAnalysis | null,
): boolean {
  return hasUsableMask(baseline, analysis);
}

export function canViewFollowUpMask(
  target: LesionObservation,
  analysis?: ComparisonAnalysis | null,
): boolean {
  return hasUsableMask(target, analysis);
}

function hasAttentionMap(observation: LesionObservation): boolean {
  return Boolean(latestImageAsset(observation, 'HEATMAP')?.protectedUrl);
}

/** Grad-CAM is a classifier-attention map for ONE photo — it has never
 * required pair registration (the model classifies each photo
 * independently) and still doesn't here. */
export function canViewBaselineGradCam(baseline: LesionObservation): boolean {
  return hasAttentionMap(baseline);
}

export function canViewFollowUpGradCam(target: LesionObservation): boolean {
  return hasAttentionMap(target);
}

/** Combined side-by-side views only make sense once BOTH photos have the
 * same evidence kind — these are pure ANDs of the existing per-side checks
 * above, never a new gating source. */
export function canViewBothMasks(
  baseline: LesionObservation,
  target: LesionObservation,
  analysis?: ComparisonAnalysis | null,
): boolean {
  return canViewBaselineMask(baseline, analysis) && canViewFollowUpMask(target, analysis);
}

export function canViewBothGradCam(
  baseline: LesionObservation,
  target: LesionObservation,
): boolean {
  return canViewBaselineGradCam(baseline) && canViewFollowUpGradCam(target);
}

/** Slider/overlay render both photos in one shared, pixel-aligned coordinate
 * frame — unlike masks, that genuinely requires registration to have
 * succeeded, so this is the one place the old "pair" gate still belongs. */
export function isPairRegistered(
  baseline: LesionObservation,
  target: LesionObservation,
  analysis?: ComparisonAnalysis | null,
): boolean {
  if (!isRegisteredProgressAnalysis(analysis)) return false;
  return Boolean(
    latestImageAsset(baseline, 'ALIGNED')?.protectedUrl &&
      latestImageAsset(target, 'ALIGNED')?.protectedUrl,
  );
}

export function canUseSlider(
  baseline: LesionObservation,
  target: LesionObservation,
  analysis?: ComparisonAnalysis | null,
): boolean {
  return isPairRegistered(baseline, target, analysis);
}

export function canUseOverlay(
  baseline: LesionObservation,
  target: LesionObservation,
  analysis?: ComparisonAnalysis | null,
): boolean {
  return isPairRegistered(baseline, target, analysis);
}

/** Difference-map requires everything slider/overlay do, PLUS both masks
 * (the heatmap is rendered from the two masks) and the persisted asset
 * itself. */
export function canViewDifferenceMap(
  baseline: LesionObservation,
  target: LesionObservation,
  analysis?: ComparisonAnalysis | null,
): boolean {
  return (
    isPairRegistered(baseline, target, analysis) &&
    canViewBaselineMask(baseline, analysis) &&
    canViewFollowUpMask(target, analysis) &&
    Boolean(latestImageAsset(target, 'DIFFERENCE_MAP')?.protectedUrl)
  );
}

/** The relative (%) area index compares two pixel counts, which only means
 * something once the backend's own comparability policy has judged the pair
 * COMPARABLE (registration + lighting + scale + same-region checks) — see
 * quality_reasons in be/ai/app/comparison.py. */
export function canMeasureRelativeArea(
  baseline: LesionObservation,
  target: LesionObservation,
  analysis?: ComparisonAnalysis | null,
): boolean {
  if (!canViewBaselineMask(baseline, analysis) || !canViewFollowUpMask(target, analysis)) {
    return false;
  }
  return analysis?.quality.comparisonDisposition === 'COMPARABLE';
}

function physicalAreaMetric(
  analysis?: ComparisonAnalysis | null,
): ComparisonMetric | undefined {
  return analysis?.metrics.find((metric) => metric.key === 'lesion-area-physical-cm2');
}

/** Known limitation: the backend currently computes calibration for both
 * photos together and reports one combined metric row — it does not yet
 * distinguish "baseline had a card but follow-up didn't" from "neither did".
 * canMeasurePhysicalAreaBaseline/FollowUp read the same row today; keeping
 * them as two functions (rather than one canMeasurePhysicalArea) is what
 * lets the UI and the backend evolve independently once per-image
 * calibration provenance exists. */
export function canMeasurePhysicalAreaBaseline(
  analysis?: ComparisonAnalysis | null,
): boolean {
  return physicalAreaMetric(analysis)?.baseline != null;
}

export function canMeasurePhysicalAreaFollowUp(
  analysis?: ComparisonAnalysis | null,
): boolean {
  return physicalAreaMetric(analysis)?.current != null;
}

export function canMeasurePhysicalAreaDelta(
  analysis?: ComparisonAnalysis | null,
): boolean {
  return canMeasurePhysicalAreaBaseline(analysis) && canMeasurePhysicalAreaFollowUp(analysis);
}

/** A progression verdict (improving/stable/worsening) is a distinct, higher
 * bar than "some evidence exists" — it requires the full registered-pair
 * policy to have judged the pair COMPARABLE. Never derived from confidence
 * or classifier-label changes alone. */
export function canConcludeProgression(analysis?: ComparisonAnalysis | null): boolean {
  return (
    isRegisteredProgressAnalysis(analysis) &&
    analysis?.quality.comparisonDisposition === 'COMPARABLE'
  );
}

// ---------------------------------------------------------------------------
// Result summary — one honest headline state for the comparison result
// screen, built entirely from the capability functions above so the summary
// card, the workbench, and the metrics panel can never disagree about what
// evidence actually exists.
// ---------------------------------------------------------------------------

export type ResultSummaryState =
  | 'PROGRESSION_AVAILABLE'
  | 'RELATIVE_ONLY'
  | 'PER_IMAGE_ONLY'
  | 'RECAPTURE_REQUIRED'
  | 'ANALYSIS_UNAVAILABLE';

/** Precedence matters: a NEEDS_RECAPTURE session always wins (the backend
 * refused to analyze at all), then FAILED/missing-analysis, then the
 * strongest evidence tier the capability checks actually support — never the
 * other way around, so a partially-strong pair is never downgraded to a
 * weaker headline just because a later check also happens to be true. */
export function selectResultSummaryState(
  session: ComparisonSession | null | undefined,
  baseline?: LesionObservation,
  target?: LesionObservation,
): ResultSummaryState {
  if (!session) return 'ANALYSIS_UNAVAILABLE';
  if (session.status === 'NEEDS_RECAPTURE') return 'RECAPTURE_REQUIRED';
  const analysis = session.analysis;
  if (!analysis || session.status === 'FAILED') return 'ANALYSIS_UNAVAILABLE';
  if (canConcludeProgression(analysis)) return 'PROGRESSION_AVAILABLE';
  if (
    baseline &&
    target &&
    canMeasureRelativeArea(baseline, target, analysis) &&
    !canMeasurePhysicalAreaDelta(analysis)
  ) {
    return 'RELATIVE_ONLY';
  }
  return 'PER_IMAGE_ONLY';
}

export interface ResultSummaryCopy {
  title: string;
  description: string;
}

const PROGRESSION_SUMMARY_COPY: Record<ClinicalAssessment, ResultSummaryCopy> = {
  IMPROVING: {
    title: 'Có dấu hiệu cải thiện',
    description: 'Các chỉ số ghi nhận ở mốc hiện tại nhìn chung tốt hơn mốc ban đầu.',
  },
  STABLE: {
    title: 'Chưa thấy thay đổi đáng kể',
    description: 'Chưa ghi nhận khác biệt rõ rệt giữa hai mốc được chọn.',
  },
  WORSENING: {
    title: 'Có dấu hiệu tiến triển xấu',
    description: 'Một số chỉ số đang xấu hơn. Không tự thay đổi thuốc hoặc liều dùng khi chưa trao đổi với bác sĩ.',
  },
  INDETERMINATE: {
    title: 'Cần bác sĩ đánh giá sớm',
    description: 'Hệ thống không đủ cơ sở để phân loại xu hướng — cần bác sĩ xem xét trực tiếp.',
  },
};

/** The single source of patient-safe copy for every ResultSummaryState —
 * used identically by patient and clinician views (Part 7: same summary,
 * clinician gets extra detail elsewhere, not a different conclusion). */
export function resultSummaryCopy(
  state: ResultSummaryState,
  assessment?: ClinicalAssessment | null,
): ResultSummaryCopy {
  switch (state) {
    case 'PROGRESSION_AVAILABLE':
      return PROGRESSION_SUMMARY_COPY[assessment ?? 'INDETERMINATE'];
    case 'RELATIVE_ONLY':
      return {
        title: 'Chỉ có thể đánh giá diện tích tương đối',
        description: 'Ảnh chưa có thẻ đo DermaHealth hợp lệ nên chưa thể quy đổi sang cm².',
      };
    case 'PER_IMAGE_ONLY':
      return {
        title: 'Đã hoàn tất phân tích từng mốc ảnh',
        description:
          'Hệ thống đã xác định vùng tổn thương trên từng mốc ảnh và sẵn sàng để bác sĩ đối chiếu trực tiếp.',
      };
    case 'RECAPTURE_REQUIRED':
      return {
        title: 'Cần hướng dẫn bệnh nhân chụp lại ảnh chuẩn',
        description: 'Ảnh hiện tại cần điều kiện ánh sáng hoặc góc chụp chuẩn hơn để đạt độ chính xác tối đa.',
      };
    case 'ANALYSIS_UNAVAILABLE':
    default:
      return {
        title: 'Chưa thể phân tích cặp ảnh này',
        description: 'Hệ thống chưa tạo được kết quả phân tích cho cặp ảnh đang chọn.',
      };
  }
}

/** Deduplicated, order-preserved, capped — the one list every panel should
 * read `analysis.limitations` through, so the same sentence never gets
 * rendered twice on the same screen. */
export function dedupedLimitations(
  analysis: ComparisonAnalysis | null | undefined,
  max = 4,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of analysis?.limitations ?? []) {
    const text = raw.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
    if (result.length >= max) break;
  }
  return result;
}

const HEADLINE_METRIC_KEYS = new Set(['lesion-area-physical-cm2', 'lesion-area-index']);

/** Splits metrics into a small "primary" set (area metrics first, since size
 * change is what most drives the headline) and everything else, for a
 * "Xem thêm chỉ số" collapse — never drops a metric, only reorders/paginates. */
export function primaryMetrics(
  metrics: ComparisonMetric[],
  max = 4,
): { primary: ComparisonMetric[]; secondary: ComparisonMetric[] } {
  const ordered = [...metrics].sort((left, right) => {
    const leftRank = HEADLINE_METRIC_KEYS.has(left.key) ? 0 : 1;
    const rightRank = HEADLINE_METRIC_KEYS.has(right.key) ? 0 : 1;
    return leftRank - rightRank;
  });
  return { primary: ordered.slice(0, max), secondary: ordered.slice(max) };
}

export type EvidenceActionKind =
  | 'ORIGINAL'
  | 'BASELINE_MASK'
  | 'TARGET_MASK'
  | 'BOTH_MASK'
  | 'BOTH_GRADCAM'
  | 'DIFFERENCE_MAP';

/** Flag-independent by design: dermaTimelineFlags.heatmapEnabled is an ops
 * rollout switch that lives with the hook layer, not a clinical capability —
 * callers AND it in themselves (ComparisonWorkbench does the same). */
export function primaryEvidenceActions(
  baseline: LesionObservation,
  target: LesionObservation,
  analysis?: ComparisonAnalysis | null,
): EvidenceActionKind[] {
  const actions: EvidenceActionKind[] = ['ORIGINAL'];
  if (canViewBothMasks(baseline, target, analysis)) {
    actions.push('BOTH_MASK');
  } else {
    if (canViewBaselineMask(baseline, analysis)) actions.push('BASELINE_MASK');
    if (canViewFollowUpMask(target, analysis)) actions.push('TARGET_MASK');
  }
  if (canViewBothGradCam(baseline, target)) actions.push('BOTH_GRADCAM');
  if (canViewDifferenceMap(baseline, target, analysis)) actions.push('DIFFERENCE_MAP');
  return actions;
}
