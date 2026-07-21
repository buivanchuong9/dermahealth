// Auto-generated from Swagger specification
// DO NOT EDIT MANUALLY

export interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
  meta?: unknown;
  requestId?: string;
}

export interface UserMembershipResponseDto {
  organizationId: string;
  clinicLocationId: Record<string, any>;
  departmentId: Record<string, any>;
  role: 'super_administrator' | 'patient' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'imaging_technician' | 'pharmacist' | 'care_coordinator' | 'customer_care_employee' | 'medical_administrator' | 'system_administrator' | 'clinical_process_designer';
}

export interface CurrentUserResponseDto {
  id: string;
  displayName: string;
  name: string;
  email: string;
  phone: Record<string, any>;
  avatarUrl: Record<string, any>;
  status: 'invited' | 'active' | 'locked' | 'disabled';
  activeOrganizationId: Record<string, any>;
  memberships: UserMembershipResponseDto[];
  version: number;
}

export interface PatientRegistrationResponseDto {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: CurrentUserResponseDto;
  mode: 'registered';
}

export interface StaffInvitationRegistrationResponseDto {
  mode: 'invited';
  invitationId: string;
  email: string;
  displayName: string;
  role: 'super_administrator' | 'patient' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'imaging_technician' | 'pharmacist' | 'care_coordinator' | 'customer_care_employee' | 'medical_administrator' | 'system_administrator' | 'clinical_process_designer';
  expiresAt: string;
  activationUrl: string;
}

export interface CreateAccountRequest {
  email: string;
  displayName: string;
  name?: string;
  password?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  phone?: string;
  address?: string;
  organizationId?: string;
  organizationCode?: string;
  role?: 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'imaging_technician' | 'pharmacist' | 'care_coordinator' | 'customer_care_employee' | 'medical_administrator' | 'system_administrator' | 'clinical_process_designer';
  clinicLocationId?: string;
  departmentId?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
}

export interface SessionResponseDto {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: CurrentUserResponseDto;
}

export interface CreateSessionRequest {
  email: string;
  password: string;
  rememberMe: boolean;
  mfaCode?: string;
}

export interface ForgotPasswordRequest {

}

export interface ResetPasswordRequest {

}

export interface EndAllSessionsRequest {
  password?: string;
}

export interface UpdateCurrentUserRequest {
  displayName?: string;
  name?: string;
  phone?: string;
  avatarFileId?: string;
  version: number;
}

export interface NotificationChannelsResponseDto {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface DeviceSettingsResponseDto {
  biometricLogin: boolean;
  mobileNotifications: boolean;
}

export interface UserPreferenceResponseDto {
  userId: string;
  locale: 'vi-VN' | 'en-US';
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  theme: 'light' | 'dark' | 'system';
  notificationChannels: NotificationChannelsResponseDto;
  deviceSettings: DeviceSettingsResponseDto;
  version: number;
  updatedAt: string;
}

export interface NotificationChannelsDto {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface DeviceSettingsDto {
  biometricLogin: boolean;
  mobileNotifications: boolean;
}

export interface UpsertUserPreferenceRequest {
  locale: 'vi-VN' | 'en-US';
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  theme: 'light' | 'dark' | 'system';
  notificationChannels: NotificationChannelsDto;
  deviceSettings: DeviceSettingsDto;
  version: number;
}

export interface MfaCodeRequest {

}

export interface UserResponseDto {
  id: string;
  displayName: string;
  name: string;
  email: string;
  phone: Record<string, any>;
  status: 'invited' | 'active' | 'locked' | 'disabled';
  memberships: UserMembershipResponseDto[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceResponseDto {
  id: string;
  code?: string;
  name: string;
}

export interface PatientResponseDto {
  id: string;
  code: string;
  userId: Record<string, any>;
  organizationId: string;
  name: string;
  dob: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  phone: string;
  email: Record<string, any>;
  address: Record<string, any>;
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  primaryDoctor: ReferenceResponseDto;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentSummaryItemDto {
  type: string;
  granted: boolean;
  policyVersion: string;
}

export interface PatientDetailResponseDto {
  id: string;
  code: string;
  userId: Record<string, any>;
  organizationId: string;
  name: string;
  dob: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  phone: string;
  email: Record<string, any>;
  address: Record<string, any>;
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  primaryDoctor: ReferenceResponseDto;
  version: number;
  createdAt: string;
  updatedAt: string;
  activeAppointmentCount: number;
  activeEncounterId: Record<string, any>;
  activeCarePlanId: Record<string, any>;
  consentSummary: ConsentSummaryItemDto[];
}

export interface UpdatePatientRequest {
  name?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  phone?: string;
  email?: Record<string, any>;
  address?: Record<string, any>;
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  primaryDoctorId?: Record<string, any>;
  version: number;
}

export interface ConsentResponseDto {
  id: string;
  patientId: string;
  type: string;
  policyVersion: string;
  granted: boolean;
  grantedAt: Record<string, any>;
  withdrawnAt: Record<string, any>;
  version: number;
}

export interface CreateConsentGrantRequest {
  type: 'data_processing' | 'research_data_sharing' | 'telemedicine';
  policyVersion: string;
  grantedAt?: string;
}

export interface CreateConsentWithdrawalRequest {
  type: 'data_processing' | 'research_data_sharing' | 'telemedicine';
  reason?: string;
  version: number;
}

export interface SetConsentRequest {

}

export interface OrganizationResponseDto {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  version: number;
}

export interface ClinicLocationResponseDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  timezone: string;
  address: Record<string, any>;
  status: 'active' | 'inactive';
}

export interface DepartmentResponseDto {
  id: string;
  clinicLocationId: Record<string, any>;
  code: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface PractitionerSpecialtyResponseDto {
  id: string;
  code: string;
  name: string;
  primary: boolean;
}

export interface PractitionerClinicAssignmentResponseDto {
  clinicLocationId: string;
  clinicName: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  slotDurationMinutes: number;
  capacity: number;
}

export interface PractitionerResponseDto {
  id: string;
  displayName: string;
  avatarFileId?: Record<string, any>;
  title?: Record<string, any>;
  bio?: Record<string, any>;
  status: 'active' | 'inactive';
  specialties: PractitionerSpecialtyResponseDto[];
  clinicAssignments: PractitionerClinicAssignmentResponseDto[];
}

export interface AvailabilitySlotResponseDto {
  slotId: string;
  startsAt: string;
  endsAt: string;
  remainingCapacity: number;
}

export interface PractitionerAvailabilityResponseDto {
  practitionerId: string;
  clinicLocationId: string;
  timezone?: Record<string, any>;
  date: string;
  slotDurationMinutes?: Record<string, any>;
  capacity?: Record<string, any>;
  slots: AvailabilitySlotResponseDto[];
}

export interface EncounterResponseDto {
  id: string;
  patientId: string;
  parentEncounterId: Record<string, any>;
  appointmentId: Record<string, any>;
  type: 'standard' | 'emergency' | 'follow_up' | 'remote';
  origin: 'appointment' | 'walk_in' | 'follow_up_request';
  status: 'registered' | 'intake_in_progress' | 'intake_complete' | 'ai_assessed' | 'routed' | 'checked_in' | 'under_doctor_review' | 'awaiting_results' | 'diagnosed' | 'plan_approved' | 'workflow_active' | 'in_progress' | 'results_complete' | 'final_review' | 'discharge_ready' | 'record_signed' | 'closed' | 'post_visit_monitoring' | 'escalated' | 'follow_up_linked';
  department: string;
  room: Record<string, any>;
  queueNumber: Record<string, any>;
  peopleAheadInQueue: Record<string, any>;
  estimatedWaitMinutes: Record<string, any>;
  currentDoctorId: Record<string, any>;
  blockingCondition: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EncounterEventResponseDto {
  id: string;
  at: string;
  label: string;
  kind: 'info' | 'warning' | 'success' | 'danger';
}

export interface CreateEncounterRequest {
  patientId: string;
  type: 'standard' | 'emergency' | 'follow_up' | 'remote';
  origin: 'walk_in' | 'follow_up_request';
  department: string;
  parentEncounterId?: string;
}

export interface TransitionEncounterRequest {
  toStatus: 'registered' | 'intake_in_progress' | 'intake_complete' | 'ai_assessed' | 'routed' | 'checked_in' | 'under_doctor_review' | 'awaiting_results' | 'diagnosed' | 'plan_approved' | 'workflow_active' | 'in_progress' | 'results_complete' | 'final_review' | 'discharge_ready' | 'record_signed' | 'closed' | 'post_visit_monitoring' | 'escalated' | 'follow_up_linked';
  reason?: string;
  blockingCondition?: string;
  version: number;
}

export interface CloseEncounterRequest {
  version: number;
}

export interface AppointmentResponseDto {
  id: string;
  organizationId: string;
  clinicLocationId: string;
  patientId: string;
  doctorId: string;
  department: string;
  consultationType: Record<string, any>;
  mode: 'video' | 'in_person';
  status: 'upcoming' | 'done' | 'cancelled' | 'missed';
  startAt: string;
  endAt: string;
  encounterId: Record<string, any>;
  cancelReason: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInTokenIssuedResponseDto {
  id: string;
  appointmentId: string;
  status: 'active' | 'used' | 'expired' | 'revoked' | 'replaced';
  issuedAt: string;
  validFrom: string;
  expiresAt: string;
  version: number;
  token: string;
}

export interface AppointmentWithCheckInTokenResponseDto {
  id: string;
  organizationId: string;
  clinicLocationId: string;
  patientId: string;
  doctorId: string;
  department: string;
  consultationType: Record<string, any>;
  mode: 'video' | 'in_person';
  status: 'upcoming' | 'done' | 'cancelled' | 'missed';
  startAt: string;
  endAt: string;
  encounterId: Record<string, any>;
  cancelReason: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
  checkInToken: CheckInTokenIssuedResponseDto;
}

export interface CreateAppointmentRequest {
  slotId: string;
  mode: 'video' | 'in_person';
  consultationType?: string;
  onBehalfOfPatientId?: string;
}

export interface CancelAppointmentRequest {
  reason?: string;
  version: number;
}

export interface RescheduleAppointmentRequest {
  slotId: string;
  version: number;
}

export interface MarkMissedRequest {
  version: number;
}

export interface RevokeCheckInTokenResponseDto {
  revoked: boolean;
}

export interface RevokeCheckInTokenRequest {
  reason: string;
}

export interface SetAppointmentStatusRequest {

}

export interface QueueTicketResponseDto {
  id: string;
  appointmentId: string;
  patientId: string;
  encounterId: string;
  number: string;
  department: string;
  serviceStation: string;
  room: Record<string, any>;
  waitingArea: string;
  priority: 'normal' | 'priority' | 'urgent';
  status: 'waiting' | 'called' | 'acknowledged' | 'in_service' | 'skipped' | 'completed' | 'routed';
  issuedAt: string;
  calledAt: Record<string, any>;
  acknowledgedAt: Record<string, any>;
  serviceStartedAt: Record<string, any>;
  completedAt: Record<string, any>;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  preparationInstructions: string[];
  nextStation: Record<string, any>;
  version: number;
}

export interface CallNextRequest {
  department: string;
  clinicLocationId: string;
}

export interface TicketActionRequest {
  version: number;
}

export interface CompleteTicketRequest {
  version: number;
  nextStation?: string;
}

export interface QueueStationSummaryResponseDto {
  serviceStation: string;
  waiting: number;
  called: number;
  inService: number;
}

export interface ReceptionSummaryResponseDto {
  upcomingAppointments: number;
  waitingCount: number;
  inServiceCount: number;
}

export interface CheckInResponseDto {
  ticket: QueueTicketResponseDto;
  repeated: boolean;
}

export interface CreateCheckInRequest {
  token: string;
  clinicLocationId: string;
  deviceId: string;
  deviceSecret: string;
  patientId?: string;
}

export interface KioskDeviceRegisteredResponseDto {
  id: string;
  organizationId: string;
  clinicLocationId: string;
  label: string;
  status: 'active' | 'inactive';
  createdAt: string;
  deviceSecret: string;
}

export interface RegisterKioskDeviceRequest {
  clinicLocationId: string;
  label: string;
}

export interface KioskDeviceResponseDto {
  id: string;
  organizationId: string;
  clinicLocationId: string;
  label: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface SymptomIntakeResponseDto {
  id: string;
  encounterId: string;
  chiefComplaint: string;
  severity: number;
  durationDays: number;
  symptoms: string[];
  history: string[];
  currentMedication: string[];
  images: string[];
  submittedAt: string;
}

export interface CandidateConditionDto {
  code: string;
  name: string;
  confidenceBand: 'low' | 'moderate' | 'high';
  confidenceScore: number;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  rationale: string;
}

export interface AIAssessmentResponseDto {
  id: string;
  encounterId: string;
  intakeId: string;
  status: 'completed' | 'insufficient_data' | 'failed';
  candidateConditions: CandidateConditionDto[];
  redFlagTriggered: boolean;
  redFlagUrgency: 'routine' | 'urgent' | 'emergency';
  redFlagReasons: string[];
  suggestedSpecialty: Record<string, any>;
  suggestedNextActions: string[];
  modelVersion: string;
  missingDataHints: string[];
  supersededById: Record<string, any>;
  generatedAt: string;
}

export interface SubmitIntakeResponseDto {
  intake: SymptomIntakeResponseDto;
  assessment: AIAssessmentResponseDto;
}

export interface SubmitIntakeRequest {
  chiefComplaint: string;
  severity: number;
  durationDays: number;
  symptoms: ('itching' | 'pain' | 'pus' | 'fever' | 'rapid_spreading' | 'bleeding' | 'scaling')[];
  history: string[];
  currentMedication: string[];
  images?: string[];
}

export interface DoctorReviewResponseDto {
  id: string;
  encounterId: string;
  aiAssessmentId: Record<string, any>;
  doctorId: string;
  action: 'pending' | 'accepted' | 'partial' | 'rejected';
  acceptedConditionCode: Record<string, any>;
  rationale: Record<string, any>;
  reviewedAt: string;
}

export interface ReviewAssessmentRequest {
  action: 'accepted' | 'partial' | 'rejected';
  acceptedConditionCode?: string;
  rationale?: string;
}

export interface DoctorDiagnosisResponseDto {
  id: string;
  encounterId: string;
  doctorId: string;
  status: 'none' | 'provisional' | 'differential' | 'confirmed' | 'revised' | 'signed';
  conditionName: string;
  conditionCode: Record<string, any>;
  aiAssessmentId: Record<string, any>;
  isAdditionalToAI: boolean;
  rationale: Record<string, any>;
  revisionOfId: Record<string, any>;
  version: number;
  recordedAt: string;
}

export interface RecordDiagnosisRequest {
  conditionName: string;
  conditionCode?: string;
  aiAssessmentId?: string;
  isAdditionalToAI: boolean;
  rationale?: string;
  status: 'provisional' | 'confirmed';
}

export interface ClinicalPlanResponseDto {
  id: string;
  encounterId: string;
  doctorId: string;
  diagnosisId: string;
  summary: string;
  approvedAt: string;
  autoActivatedWorkflowInstanceId: Record<string, any>;
}

export interface ApproveClinicalPlanRequest {
  diagnosisId: string;
  summary: string;
}

export interface ReviseDiagnosisRequest {
  conditionName: string;
  rationale: string;
}

export interface ClinicalOrderResponseDto {
  id: string;
  encounterId: string;
  type: 'laboratory' | 'imaging' | 'consultation';
  orderedByDoctorId: string;
  justification: string;
  status: 'requested' | 'in_progress' | 'invalid_sample' | 'result_ready' | 'completed' | 'cancelled';
  assignedRole: string;
  invalidSampleReason: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicalOrderRequest {
  type: 'laboratory' | 'imaging' | 'consultation';
  justification: string;
  assignedRole: 'lab_technician' | 'imaging_technician' | 'doctor' | 'nurse';
}

export interface InvalidSampleRequest {
  reason: string;
  version: number;
}

export interface ClinicalResultResponseDto {
  id: string;
  orderId: string;
  summary: string;
  abnormal: boolean;
  recordedAt: string;
  recordedBy: string;
}

export interface SubmitResultRequest {
  summary: string;
  abnormal: boolean;
  version: number;
}

export interface CreateWorkflowTemplateRequest {
  name: string;
  specialty: string;
  description: string;
}

export interface UpdateWorkflowTemplateRequest {
  name?: string;
  specialty?: string;
  description?: string;
  version: number;
}

export interface WorkflowStepDefinitionDto {
  code: string;
  icon?: string;
  executorType?: string;
  name: string;
  description: string;
  taskType: string;
  responsibleRole: 'super_administrator' | 'patient' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'imaging_technician' | 'pharmacist' | 'care_coordinator' | 'customer_care_employee' | 'medical_administrator' | 'system_administrator' | 'clinical_process_designer';
  department: string;
  skill?: string;
  location?: string;
  mandatory: boolean;
  conditionalRule?: string;
  estimatedDurationMinutes: number;
  maxWaitingMinutes: number;
  skipPermission: ('super_administrator' | 'patient' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'imaging_technician' | 'pharmacist' | 'care_coordinator' | 'customer_care_employee' | 'medical_administrator' | 'system_administrator' | 'clinical_process_designer')[];
  reworkRule?: string;
  escalationRule?: string;
  notificationRule?: string;
  requiredOutput?: string;
  prerequisiteStepCodes: string[];
}

export interface ReplaceStepsRequest {
  steps: WorkflowStepDefinitionDto[];
  rowVersion: number;
}

export interface StepCreateRequest {
  code: string;
  icon?: string;
  executorType?: string;
  name: string;
  description: string;
  taskType: string;
  responsibleRole: 'super_administrator' | 'patient' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'imaging_technician' | 'pharmacist' | 'care_coordinator' | 'customer_care_employee' | 'medical_administrator' | 'system_administrator' | 'clinical_process_designer';
  department: string;
  skill?: string;
  location?: string;
  mandatory: boolean;
  conditionalRule?: string;
  estimatedDurationMinutes: number;
  maxWaitingMinutes: number;
  skipPermission: ('super_administrator' | 'patient' | 'doctor' | 'nurse' | 'receptionist' | 'lab_technician' | 'imaging_technician' | 'pharmacist' | 'care_coordinator' | 'customer_care_employee' | 'medical_administrator' | 'system_administrator' | 'clinical_process_designer')[];
  reworkRule?: string;
  escalationRule?: string;
  notificationRule?: string;
  requiredOutput?: string;
  prerequisiteStepCodes: string[];
}

export interface StepPatchRequest {

}

export interface ReorderRequest {

}

export interface EdgeRequest {

}

export interface NodePositionsRequest {
  positions: Record<string, any>;
}

export interface VersionOnlyRequest {
  version: number;
}

export interface ActivateWorkflowRequest {
  templateId: string;
  encounterVersion: number;
}

export interface ReasonedVersionRequest {
  reason: string;
  version: number;
}

export interface ReassignTaskRequest {
  assigneeId: string;
  version: number;
}

export interface PrescriptionDto {

}

export interface DocumentDto {

}

export interface DiagnosisDto {

}

export interface DischargeDto {

}

export interface TextDto {

}

export interface ReasonDto {

}

export interface LateResultDto {

}

export interface AlertRequest {

}

export interface EncounterRequestDto {

}

export interface ReminderRequest {

}

export interface PhotoRequest {

}

export interface RefillRequest {

}

export interface ActivityRequest {

}

export interface TransitionRequest {

}

export interface DecisionRequest {

}

export interface ClientEventRequest {

}

export interface PresignRequest {

}

export interface ConfirmUploadRequest {

}

export interface SupportRequest {

}

export interface DeletionRequest {

}

export interface SetFeatureFlagOverrideRequest {
  enabled: boolean;
}

export interface GrantRolePermissionRequest {
  role: string;
  permissionCode: string;
}

export interface RequestBreakGlassRequest {
  patientId: string;
  reason: string;
  mfaCode: string;
}

export interface ProposeDangerousActionRequest {
  type: 'add_owner' | 'revoke_all_sessions' | 'bulk_directory_export' | 'bulk_membership_revoke' | 'disable_audit';
  reason: string;
  payload: Record<string, any>;
  mfaCode: string;
}

export interface DecideDangerousActionRequest {
  decision: 'approved' | 'rejected';
  reason?: string;
  mfaCode: string;
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  errors: Record<string, string>;
  requestId: string;
}

export interface GenericSuccessEnvelope {
  success: true;
  data: any;
  meta: Record<string, any>;
  requestId: string;
}

