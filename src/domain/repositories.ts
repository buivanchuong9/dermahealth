import { createEntityStore, clearPersistedState, wasRecoveredFromCorruption, type EntityStore } from './store';
import { createSeedWorld } from './seed';
import { resetIdSequence } from './core/ids';
import { createWorkflowIdentity } from './workflowIdentity';
import type {
  User, Patient, Appointment, MedicalEncounter, SymptomIntake, AIPreliminaryAssessment,
  DoctorReview, DoctorDiagnosis, ClinicalPlan, ClinicalOrder, ClinicalResult,
  WorkflowTemplate, WorkflowTemplateVersion, WorkflowInstance, WorkflowTask,
  ClinicalDocument, MedicalRecord, Prescription, CRMCarePlan, FollowUpActivity,
  ClinicalAlert, EncounterCreationRequest, Notification, Consent, AuditEvent,
  IntegrationConnection, IntegrationMessage,
  AppointmentCheckInToken, QueueTicket,
} from './core/entities';

// Named, typed repositories. Each is a thin wrapper around an in-memory
// EntityStore (see store.ts). Entities that are tightly
// coupled to one of the eleven named repositories called out in the
// implementation brief (diagnosis, clinicalOrder, workflow, medicalRecord,
// carePlan) are grouped as sub-namespaces on that repository rather than
// spawning ~15 more near-duplicate top-level repository objects.

let world = createSeedWorld();

const userStore: EntityStore<User> = createEntityStore('users', world.users);
const patientStore: EntityStore<Patient> = createEntityStore('patients', world.patients);
const appointmentStore: EntityStore<Appointment> = createEntityStore('appointments', world.appointments);
const encounterStore: EntityStore<MedicalEncounter> = createEntityStore('encounters', world.encounters);
const intakeStore: EntityStore<SymptomIntake> = createEntityStore('symptomIntakes', world.symptomIntakes);
const aiAssessmentStore: EntityStore<AIPreliminaryAssessment> = createEntityStore('aiAssessments', world.aiAssessments);
const doctorReviewStore: EntityStore<DoctorReview> = createEntityStore('doctorReviews', world.doctorReviews);
const doctorDiagnosisStore: EntityStore<DoctorDiagnosis> = createEntityStore('doctorDiagnoses', world.doctorDiagnoses);
const clinicalPlanStore: EntityStore<ClinicalPlan> = createEntityStore('clinicalPlans', world.clinicalPlans);
const clinicalOrderStore: EntityStore<ClinicalOrder> = createEntityStore('clinicalOrders', world.clinicalOrders);
const clinicalResultStore: EntityStore<ClinicalResult> = createEntityStore('clinicalResults', world.clinicalResults);
const workflowTemplateStore: EntityStore<WorkflowTemplate> = createEntityStore('workflowTemplates', world.workflowTemplates);
const workflowTemplateVersionStore: EntityStore<WorkflowTemplateVersion> = createEntityStore('workflowTemplateVersions', world.workflowTemplateVersions);
const workflowInstanceStore: EntityStore<WorkflowInstance> = createEntityStore('workflowInstances', world.workflowInstances);
const workflowTaskStore: EntityStore<WorkflowTask> = createEntityStore('workflowTasks', world.workflowTasks);
const clinicalDocumentStore: EntityStore<ClinicalDocument> = createEntityStore('clinicalDocuments', world.clinicalDocuments);
const medicalRecordStore: EntityStore<MedicalRecord> = createEntityStore('medicalRecords', world.medicalRecords);
const prescriptionStore: EntityStore<Prescription> = createEntityStore('prescriptions', world.prescriptions);
const carePlanStore: EntityStore<CRMCarePlan> = createEntityStore('carePlans', world.carePlans);
const followUpActivityStore: EntityStore<FollowUpActivity> = createEntityStore('followUpActivities', world.followUpActivities);
const clinicalAlertStore: EntityStore<ClinicalAlert> = createEntityStore('clinicalAlerts', world.clinicalAlerts);
const encounterCreationRequestStore: EntityStore<EncounterCreationRequest> = createEntityStore('encounterCreationRequests', world.encounterCreationRequests);
const notificationStore: EntityStore<Notification> = createEntityStore('notifications', world.notifications);
const consentStore: EntityStore<Consent> = createEntityStore('consents', world.consents);
const auditStore: EntityStore<AuditEvent> = createEntityStore('auditEvents', world.auditEvents);
const integrationConnectionStore: EntityStore<IntegrationConnection> = createEntityStore('integrationConnections', world.integrationConnections);
const integrationMessageStore: EntityStore<IntegrationMessage> = createEntityStore('integrationMessages', world.integrationMessages);
const checkInTokenStore: EntityStore<AppointmentCheckInToken> = createEntityStore('appointmentCheckInTokens', world.appointmentCheckInTokens);
const queueTicketStore: EntityStore<QueueTicket> = createEntityStore('queueTickets', world.queueTickets);

// Seed additions are merged into the in-memory startup view.
world.users.filter((user) => user.role === 'super_administrator').forEach((user) => {
  if (!userStore.getById(user.id)) userStore.upsert(user);
});

// Non-destructive migration for workflow instances created before patient
// ownership and integrity seals were introduced. Existing tasks and status are
// preserved; only the missing identity envelope is added.
workflowInstanceStore.getAll().forEach((instance) => {
  const legacy = instance as WorkflowInstance & { patientId?: WorkflowInstance['patientId']; instanceCode?: string; integrityHash?: string; identityVersion?: number };
  if (legacy.patientId && legacy.instanceCode && legacy.integrityHash && legacy.identityVersion) return;
  const encounter = encounterStore.getById(instance.encounterId);
  if (!encounter) return;
  const identity = createWorkflowIdentity({
    instanceId: instance.id,
    patientId: encounter.patientId,
    encounterId: instance.encounterId,
    templateVersionId: instance.templateVersionId,
    activatedAt: instance.activatedAt,
  });
  workflowInstanceStore.upsert({ ...instance, ...identity });
});

/** Cross-collection FK sanity check for the in-memory startup view. */
function hasReferentialIntegrityIssues(): boolean {
  const patientIds = new Set(patientStore.getAll().map((p) => p.id));
  const encounterIds = new Set(encounterStore.getAll().map((e) => e.id));
  const instanceIds = new Set(workflowInstanceStore.getAll().map((i) => i.id));

  const encountersValid = encounterStore.getAll().every((e) => patientIds.has(e.patientId));
  const tasksValid = workflowTaskStore.getAll().every((t) => instanceIds.has(t.instanceId) && encounterIds.has(t.encounterId));
  const recordsValid = medicalRecordStore.getAll().every((r) => encounterIds.has(r.encounterId));
  const ordersValid = clinicalOrderStore.getAll().every((o) => encounterIds.has(o.encounterId));

  return !(encountersValid && tasksValid && recordsValid && ordersValid);
}

let autoRecovered = wasRecoveredFromCorruption();
if (autoRecovered || hasReferentialIntegrityIssues()) {
  autoRecovered = true;
  resetAllRepositoriesToSeed();
}

/** True if this page load discarded a referentially broken startup view and
 * fell back to fresh seed data. Consumed once by
 * AppStateProvider to surface a one-time notice to the user. */
export function wasDataAutoRecovered(): boolean {
  return autoRecovered;
}

export const userRepository = userStore;
export const patientRepository = patientStore;
export const appointmentRepository = appointmentStore;
export const appointmentCheckInTokenRepository = checkInTokenStore;
export const queueRepository = queueTicketStore;

export const encounterRepository = {
  ...encounterStore,
  intakes: () => intakeStore,
};

export const aiAssessmentRepository = aiAssessmentStore;

export const diagnosisRepository = {
  reviews: () => doctorReviewStore,
  diagnoses: () => doctorDiagnosisStore,
  plans: () => clinicalPlanStore,
};

export const clinicalOrderRepository = {
  orders: () => clinicalOrderStore,
  results: () => clinicalResultStore,
};

export const workflowRepository = {
  templates: () => workflowTemplateStore,
  versions: () => workflowTemplateVersionStore,
  instances: () => workflowInstanceStore,
  tasks: () => workflowTaskStore,
};

export const medicalRecordRepository = {
  records: () => medicalRecordStore,
  documents: () => clinicalDocumentStore,
  prescriptions: () => prescriptionStore,
};

export const carePlanRepository = {
  plans: () => carePlanStore,
  activities: () => followUpActivityStore,
  alerts: () => clinicalAlertStore,
  encounterRequests: () => encounterCreationRequestStore,
};

export const notificationRepository = notificationStore;
export const consentRepository = consentStore;
export const auditRepository = auditStore;

export const integrationRepository = {
  connections: () => integrationConnectionStore,
  messages: () => integrationMessageStore,
};

/** Zeroizes every user-scoped in-memory collection on logout. Keeping only
 * the boot collections clear would let a second account in the same tab see
 * stale, lazily loaded data from the previous account. */
export function clearAllRepositories(): void {
  userStore.replaceAll([]);
  patientStore.replaceAll([]);
  appointmentStore.replaceAll([]);
  encounterStore.replaceAll([]);
  intakeStore.replaceAll([]);
  aiAssessmentStore.replaceAll([]);
  doctorReviewStore.replaceAll([]);
  doctorDiagnosisStore.replaceAll([]);
  clinicalPlanStore.replaceAll([]);
  clinicalOrderStore.replaceAll([]);
  clinicalResultStore.replaceAll([]);
  workflowTemplateStore.replaceAll([]);
  workflowTemplateVersionStore.replaceAll([]);
  workflowInstanceStore.replaceAll([]);
  workflowTaskStore.replaceAll([]);
  clinicalDocumentStore.replaceAll([]);
  medicalRecordStore.replaceAll([]);
  prescriptionStore.replaceAll([]);
  carePlanStore.replaceAll([]);
  followUpActivityStore.replaceAll([]);
  clinicalAlertStore.replaceAll([]);
  encounterCreationRequestStore.replaceAll([]);
  notificationStore.replaceAll([]);
  consentStore.replaceAll([]);
  auditStore.replaceAll([]);
  integrationConnectionStore.replaceAll([]);
  integrationMessageStore.replaceAll([]);
  checkInTokenStore.replaceAll([]);
  queueTicketStore.replaceAll([]);
}

/** Purges legacy persisted entities and re-seeds every in-memory store. */
export function resetAllRepositoriesToSeed(): void {
  clearPersistedState();
  resetIdSequence();
  world = createSeedWorld();
  userStore.replaceAll(world.users);
  patientStore.replaceAll(world.patients);
  appointmentStore.replaceAll(world.appointments);
  encounterStore.replaceAll(world.encounters);
  intakeStore.replaceAll(world.symptomIntakes);
  aiAssessmentStore.replaceAll(world.aiAssessments);
  doctorReviewStore.replaceAll(world.doctorReviews);
  doctorDiagnosisStore.replaceAll(world.doctorDiagnoses);
  clinicalPlanStore.replaceAll(world.clinicalPlans);
  clinicalOrderStore.replaceAll(world.clinicalOrders);
  clinicalResultStore.replaceAll(world.clinicalResults);
  workflowTemplateStore.replaceAll(world.workflowTemplates);
  workflowTemplateVersionStore.replaceAll(world.workflowTemplateVersions);
  workflowInstanceStore.replaceAll(world.workflowInstances);
  workflowTaskStore.replaceAll(world.workflowTasks);
  clinicalDocumentStore.replaceAll(world.clinicalDocuments);
  medicalRecordStore.replaceAll(world.medicalRecords);
  prescriptionStore.replaceAll(world.prescriptions);
  carePlanStore.replaceAll(world.carePlans);
  followUpActivityStore.replaceAll(world.followUpActivities);
  clinicalAlertStore.replaceAll(world.clinicalAlerts);
  encounterCreationRequestStore.replaceAll(world.encounterCreationRequests);
  notificationStore.replaceAll(world.notifications);
  consentStore.replaceAll(world.consents);
  auditStore.replaceAll(world.auditEvents);
  integrationConnectionStore.replaceAll(world.integrationConnections);
  integrationMessageStore.replaceAll(world.integrationMessages);
  checkInTokenStore.replaceAll(world.appointmentCheckInTokens);
  queueTicketStore.replaceAll(world.queueTickets);
}
