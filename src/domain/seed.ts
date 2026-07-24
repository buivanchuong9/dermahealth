import type {
  User,
  Patient,
  Appointment,
  MedicalEncounter,
  SymptomIntake,
  AIPreliminaryAssessment,
  DoctorReview,
  DoctorDiagnosis,
  ClinicalPlan,
  ClinicalOrder,
  ClinicalResult,
  WorkflowTemplate,
  WorkflowTemplateVersion,
  WorkflowInstance,
  WorkflowTask,
  ClinicalDocument,
  MedicalRecord,
  Prescription,
  CRMCarePlan,
  FollowUpActivity,
  ClinicalAlert,
  EncounterCreationRequest,
  Notification,
  Consent,
  AuditEvent,
  IntegrationConnection,
  IntegrationMessage,
  AppointmentCheckInToken,
  QueueTicket,
} from "./core/entities";

export interface DomainWorld {
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  encounters: MedicalEncounter[];
  symptomIntakes: SymptomIntake[];
  aiAssessments: AIPreliminaryAssessment[];
  doctorReviews: DoctorReview[];
  doctorDiagnoses: DoctorDiagnosis[];
  clinicalPlans: ClinicalPlan[];
  clinicalOrders: ClinicalOrder[];
  clinicalResults: ClinicalResult[];
  workflowTemplates: WorkflowTemplate[];
  workflowTemplateVersions: WorkflowTemplateVersion[];
  workflowInstances: WorkflowInstance[];
  workflowTasks: WorkflowTask[];
  clinicalDocuments: ClinicalDocument[];
  medicalRecords: MedicalRecord[];
  prescriptions: Prescription[];
  carePlans: CRMCarePlan[];
  followUpActivities: FollowUpActivity[];
  clinicalAlerts: ClinicalAlert[];
  encounterCreationRequests: EncounterCreationRequest[];
  notifications: Notification[];
  consents: Consent[];
  auditEvents: AuditEvent[];
  integrationConnections: IntegrationConnection[];
  integrationMessages: IntegrationMessage[];
  appointmentCheckInTokens: AppointmentCheckInToken[];
  queueTickets: QueueTicket[];
}

/** Empty runtime cache. All records are loaded from the backend API after authentication. */
export function createSeedWorld(): DomainWorld {
  return {
    users: [],
    patients: [],
    appointments: [],
    encounters: [],
    symptomIntakes: [],
    aiAssessments: [],
    doctorReviews: [],
    doctorDiagnoses: [],
    clinicalPlans: [],
    clinicalOrders: [],
    clinicalResults: [],
    workflowTemplates: [],
    workflowTemplateVersions: [],
    workflowInstances: [],
    workflowTasks: [],
    clinicalDocuments: [],
    medicalRecords: [],
    prescriptions: [],
    carePlans: [],
    followUpActivities: [],
    clinicalAlerts: [],
    encounterCreationRequests: [],
    notifications: [],
    consents: [],
    auditEvents: [],
    integrationConnections: [],
    integrationMessages: [],
    appointmentCheckInTokens: [],
    queueTickets: [],
  };
}
