import type {
  PatientId, UserId, AppointmentId, EncounterId, SymptomIntakeId, AIAssessmentId,
  DoctorReviewId, DoctorDiagnosisId, ClinicalPlanId, ClinicalOrderId, ClinicalResultId,
  WorkflowTemplateId, WorkflowTemplateVersionId, WorkflowInstanceId, WorkflowTaskId,
  ClinicalDocumentId, MedicalRecordId, PrescriptionId, MedicationId, CarePlanId,
  FollowUpActivityId, ClinicalAlertId, EncounterCreationRequestId, NotificationId,
  ConsentId, AuditEventId, IntegrationConnectionId, IntegrationMessageId,
} from './ids';
import type {
  EncounterStatus, AIHumanReviewStatus, DiagnosisStatus, ClinicalOrderStatus,
  WorkflowTemplateStatus, WorkflowInstanceStatus, WorkflowTaskStatus, MedicalRecordStatus,
  CarePlanStatus, FollowUpActivityStatus, AlertSeverity, AlertStatus,
  EncounterCreationRequestStatus, NotificationChannel, NotificationStatus, IntegrationStatus,
  Priority, Urgency,
} from './enums';
import type { UserRole } from './role';

export interface User {
  id: UserId;
  name: string;
  role: UserRole;
  department?: string;
  specialty?: string;
  online?: boolean;
}

export interface PatientProfile {
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  bloodType: string;
}

export interface Patient {
  id: PatientId;
  code: string;
  name: string;
  profile: PatientProfile;
  primaryDoctorId: UserId;
}

export interface Appointment {
  id: AppointmentId;
  patientId: PatientId;
  doctorId: UserId;
  date: string;
  time: string;
  mode: 'video' | 'in_person';
  status: 'upcoming' | 'done' | 'cancelled' | 'missed';
  encounterId?: EncounterId;
  clinicLocationId?: string;
  clinicName?: string;
  department?: string;
  consultationType?: string;
}

export type CheckInTokenStatus = 'active' | 'used' | 'expired' | 'revoked' | 'replaced';
export interface AppointmentCheckInToken {
  id: string; appointmentId: AppointmentId; patientId: PatientId; plannedEncounterId: EncounterId;
  clinicLocationId: string; token: string; tokenHash: string; issuedAt: string; validFrom: string;
  expiresAt: string; status: CheckInTokenStatus; usedAt?: string; usedByDeviceId?: string;
  revokedAt?: string; revokedReason?: string; version: number;
}

export type QueueTicketStatus = 'waiting' | 'called' | 'acknowledged' | 'in_service' | 'skipped' | 'completed' | 'routed';
export interface QueueTicket {
  id: string; appointmentId: AppointmentId; patientId: PatientId; encounterId: EncounterId;
  number: string; department: string; serviceStation: string; room?: string; waitingArea: string;
  priority: 'normal' | 'priority' | 'urgent'; status: QueueTicketStatus; issuedAt: string;
  calledAt?: string; acknowledgedAt?: string; serviceStartedAt?: string; completedAt?: string;
  peopleAhead: number; estimatedWaitMinutes: number; preparationInstructions: string[]; nextStation?: string;
}

export interface EncounterEvent {
  id: string;
  at: string;
  label: string;
  kind: 'info' | 'warning' | 'success' | 'danger';
}

export interface MedicalEncounter {
  id: EncounterId;
  patientId: PatientId;
  parentEncounterId?: EncounterId;
  appointmentId?: AppointmentId;
  type: 'standard' | 'emergency' | 'follow_up' | 'remote';
  origin: 'appointment' | 'walk_in' | 'follow_up_request';
  status: EncounterStatus;
  department: string;
  room?: string;
  queueNumber?: number;
  peopleAheadInQueue?: number;
  estimatedWaitMinutes?: number;
  createdAt: string;
  updatedAt: string;
  currentDoctorId?: UserId;
  symptomIntakeId?: SymptomIntakeId;
  aiAssessmentIds: AIAssessmentId[];
  doctorReviewIds: DoctorReviewId[];
  diagnosisIds: DoctorDiagnosisId[];
  clinicalPlanId?: ClinicalPlanId;
  clinicalOrderIds: ClinicalOrderId[];
  workflowInstanceId?: WorkflowInstanceId;
  medicalRecordId?: MedicalRecordId;
  blockingCondition?: string;
  events: EncounterEvent[];
}

export interface SymptomIntake {
  id: SymptomIntakeId;
  encounterId: EncounterId;
  chiefComplaint: string;
  severity: number;
  durationDays: number;
  symptoms: string[];
  history: string[];
  currentMedication: string[];
  images: string[];
  submittedAt: string;
}

export type ConfidenceBand = 'low' | 'moderate' | 'high';

export interface CandidateCondition {
  code: string;
  name: string;
  confidenceBand: ConfidenceBand;
  confidenceScore: number;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  rationale: string;
}

export interface ClinicalRedFlag {
  triggered: boolean;
  urgency: Urgency;
  reasons: string[];
}

export interface AIPreliminaryAssessment {
  id: AIAssessmentId;
  encounterId: EncounterId;
  status: 'completed' | 'insufficient_data' | 'failed';
  candidateConditions: CandidateCondition[];
  redFlag: ClinicalRedFlag;
  suggestedSpecialty?: string;
  suggestedNextActions: string[];
  modelVersion: string;
  inputSnapshotId: string;
  generatedAt: string;
  missingDataHints: string[];
  supersededBy?: AIAssessmentId;
}

export interface DoctorReview {
  id: DoctorReviewId;
  encounterId: EncounterId;
  aiAssessmentId?: AIAssessmentId;
  doctorId: UserId;
  action: AIHumanReviewStatus;
  acceptedConditionCode?: string;
  rationale?: string;
  reviewedAt: string;
}

export interface DoctorDiagnosis {
  id: DoctorDiagnosisId;
  encounterId: EncounterId;
  doctorId: UserId;
  status: DiagnosisStatus;
  conditionName: string;
  conditionCode?: string;
  aiAssessmentId?: AIAssessmentId;
  isAdditionalToAI: boolean;
  rationale?: string;
  revisionOf?: DoctorDiagnosisId;
  recordedAt: string;
}

export interface ClinicalPlan {
  id: ClinicalPlanId;
  encounterId: EncounterId;
  doctorId: UserId;
  diagnosisId: DoctorDiagnosisId;
  summary: string;
  approvedAt: string;
}

export interface ClinicalOrder {
  id: ClinicalOrderId;
  encounterId: EncounterId;
  type: 'laboratory' | 'imaging' | 'consultation';
  orderedByDoctorId: UserId;
  justification: string;
  status: ClinicalOrderStatus;
  assignedRole: UserRole;
  createdAt: string;
  resultId?: ClinicalResultId;
}

export interface ClinicalResult {
  id: ClinicalResultId;
  orderId: ClinicalOrderId;
  summary: string;
  abnormal: boolean;
  recordedAt: string;
  recordedBy: UserId;
}

export type WorkflowExecutorType =
  | 'patient'
  | 'receptionist'
  | 'nurse'
  | 'doctor'
  | 'lab_technician'
  | 'imaging_technician'
  | 'pharmacist'
  | 'procedure_team'
  | 'cashier'
  | 'care_coordinator'
  | 'customer_care'
  | 'clinic_manager'
  | 'ai_automation'
  | 'system_automation'
  | 'decision'
  | 'waiting';

export interface WorkflowStepDefinition {
  code: string;
  icon?: 'robot' | 'doctor' | 'nurse' | 'reception' | 'laboratory' | 'imaging' | 'pharmacy' | 'cashier' | 'procedure' | 'discharge' | 'patient' | 'decision' | 'waiting' | 'system' | 'customer_care' | 'manager' | 'task';
  executorType?: WorkflowExecutorType;
  name: string;
  description: string;
  taskType: string;
  responsibleRole: UserRole;
  department: string;
  skill?: string;
  location?: string;
  mandatory: boolean;
  conditionalRule?: string;
  estimatedDurationMinutes: number;
  maxWaitingMinutes: number;
  skipPermission: UserRole[];
  reworkRule?: string;
  escalationRule?: string;
  notificationRule?: string;
  requiredOutput?: string;
  prerequisiteStepCodes: string[];
}

export interface WorkflowTemplateVersion {
  id: WorkflowTemplateVersionId;
  templateId: WorkflowTemplateId;
  version: number;
  status: WorkflowTemplateStatus;
  steps: WorkflowStepDefinition[];
  nodePositions?: Record<string, { x: number; y: number }>;
  createdAt: string;
  publishedAt?: string;
}

export interface WorkflowTemplate {
  id: WorkflowTemplateId;
  name: string;
  specialty: string;
  description: string;
  createdBy: UserId;
  versionIds: WorkflowTemplateVersionId[];
  latestPublishedVersionId?: WorkflowTemplateVersionId;
}

export interface WorkflowTask {
  id: WorkflowTaskId;
  instanceId: WorkflowInstanceId;
  encounterId: EncounterId;
  stepCode: string;
  name: string;
  responsibleRole: UserRole;
  department: string;
  status: WorkflowTaskStatus;
  assigneeId?: UserId;
  dependsOnStepCodes: string[];
  slaMinutes: number;
  priority: Priority;
  urgency: Urgency;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  clinicalWarning?: string;
  patientArrivalStatus?: 'not_arrived' | 'arrived' | 'in_room';
  reworkCount: number;
}

export interface WorkflowInstance {
  id: WorkflowInstanceId;
  /** Patient ownership is duplicated from the encounter deliberately so every
   * query can be tenant-scoped without walking an untrusted client relation. */
  patientId: PatientId;
  encounterId: EncounterId;
  templateId: WorkflowTemplateId;
  templateVersionId: WorkflowTemplateVersionId;
  /** Human-readable operational reference; never contains patient PII. */
  instanceCode: string;
  /** Prototype integrity seal over patient + encounter + pinned template version. */
  integrityHash: string;
  identityVersion: number;
  status: WorkflowInstanceStatus;
  activatedBy: UserId;
  activatedAt: string;
  completedAt?: string;
  suspendedReason?: string;
  taskIds: WorkflowTaskId[];
}

export interface ClinicalDocument {
  id: ClinicalDocumentId;
  encounterId: EncounterId;
  workflowTaskId?: WorkflowTaskId;
  clinicalOrderId?: ClinicalOrderId;
  type: string;
  fileName: string;
  fileHash: string;
  version: number;
  uploadedBy: UserId;
  uploadedAt: string;
  reviewStatus: 'pending' | 'reviewed';
  signatureStatus: 'unsigned' | 'signed';
  incorrectLinkFlag?: boolean;
}

export interface Medication {
  id: MedicationId;
  name: string;
  dose: string;
  durationDays: number;
}

export interface Prescription {
  id: PrescriptionId;
  encounterId: EncounterId;
  doctorId: UserId;
  medications: Medication[];
  issuedAt: string;
}

export interface DischargeInstruction {
  encounterId: EncounterId;
  instructions: string[];
  followUpNeeded: boolean;
}

export interface FollowUpInstruction {
  encounterId: EncounterId;
  description: string;
  dueInDays: number;
}

export interface MedicalRecordAddendum {
  id: string;
  text: string;
  addedBy: UserId;
  addedAt: string;
}

export interface MedicalRecord {
  id: MedicalRecordId;
  encounterId: EncounterId;
  status: MedicalRecordStatus;
  diagnosisId?: DoctorDiagnosisId;
  prescriptionId?: PrescriptionId;
  documentIds: ClinicalDocumentId[];
  discharge?: DischargeInstruction;
  followUp?: FollowUpInstruction;
  signedBy?: UserId;
  signedAt?: string;
  addenda: MedicalRecordAddendum[];
  reopenedReason?: string;
}

export interface CRMCarePlan {
  id: CarePlanId;
  patientId: PatientId;
  encounterId: EncounterId;
  status: CarePlanStatus;
  createdAt: string;
}

export interface FollowUpActivity {
  id: FollowUpActivityId;
  carePlanId: CarePlanId;
  type: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  status: FollowUpActivityStatus;
  automationMode?: 'automatic' | 'patient_action' | 'human_review';
  automationAction?: string;
  lastAutomatedAt?: string;
  automationRunCount?: number;
}

export interface ClinicalAlert {
  id: ClinicalAlertId;
  carePlanId: CarePlanId;
  patientId: PatientId;
  encounterId?: EncounterId;
  trigger: string;
  severity: AlertSeverity;
  responsibleActor: string;
  responseDeadlineHours: number;
  requiresLinkedEncounter: boolean;
  status: AlertStatus;
  note: string;
  detectedAt: string;
  closedBy?: UserId;
  closedAt?: string;
}

export interface EncounterCreationRequest {
  id: EncounterCreationRequestId;
  patientId: PatientId;
  sourceAlertId?: ClinicalAlertId;
  requestedByRole: UserRole;
  reason: string;
  status: EncounterCreationRequestStatus;
  requestedAt: string;
  decidedBy?: UserId;
  decidedAt?: string;
  createdEncounterId?: EncounterId;
}

export interface Notification {
  id: NotificationId;
  event: string;
  recipientId: UserId;
  recipientRole: UserRole;
  channel: NotificationChannel;
  status: NotificationStatus;
  message: string;
  relatedPatientId?: PatientId;
  relatedEncounterId?: EncounterId;
  relatedWorkflowTaskId?: WorkflowTaskId;
  createdAt: string;
  deliveredAt?: string;
  failureReason?: string;
  retryCount: number;
  read: boolean;
}

export interface Consent {
  id: ConsentId;
  patientId: PatientId;
  type: string;
  granted: boolean;
  grantedAt?: string;
  withdrawnAt?: string;
}

export interface DigitalSignature {
  id: string;
  signedBy: UserId;
  signedAt: string;
  entityType: string;
  entityId: string;
}

export interface AuditEvent {
  id: AuditEventId;
  at: string;
  actorId: UserId;
  actorName: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  patientId?: PatientId;
  encounterId?: EncounterId;
  previousState?: string;
  newState?: string;
  reason?: string;
  sourceModule: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface IntegrationConnection {
  id: IntegrationConnectionId;
  name: string;
  status: IntegrationStatus;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  pendingMessages: number;
  retryCount: number;
  deadLetterCount: number;
}

export interface IntegrationMessage {
  id: IntegrationMessageId;
  connectionId: IntegrationConnectionId;
  correlationId: string;
  idempotencyKey: string;
  status: 'pending' | 'delivered' | 'failed' | 'duplicate_rejected';
  createdAt: string;
}
