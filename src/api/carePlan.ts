import { http } from './http';
import type { CRMCarePlan, FollowUpActivity } from '../domain/core/entities';
import type {
  CarePlanId,
  EncounterId,
  FollowUpActivityId,
  PatientId,
} from '../domain/core/ids';
import type {
  CarePlanStatus,
  FollowUpActivityStatus,
  Priority,
} from '../domain/core/enums';

interface CarePlanDto {
  id: string;
  patientId: string;
  encounterId: string;
  status: CarePlanStatus;
  createdAt: string;
  updatedAt?: string;
}

interface FollowUpActivityDto {
  id: string;
  carePlanId: string;
  type: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  status: FollowUpActivityStatus;
  automationMode?: unknown;
  automationAction?: unknown;
  lastAutomatedAt?: unknown;
  automationRunCount?: number;
  version?: number;
  createdAt?: string;
}

export interface CreateCarePlanActivityRequest {
  type: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  status?: FollowUpActivityStatus;
  automationMode?: 'automatic' | 'patient_action' | 'human_review';
  automationAction?: string;
}

const optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const mapCarePlan = (dto: CarePlanDto): CRMCarePlan => ({
  id: dto.id as CarePlanId,
  patientId: dto.patientId as PatientId,
  encounterId: dto.encounterId as EncounterId,
  status: dto.status,
  createdAt: dto.createdAt,
});

const mapActivity = (dto: FollowUpActivityDto): FollowUpActivity => {
  const automationMode = optionalString(dto.automationMode);
  return {
    id: dto.id as FollowUpActivityId,
    carePlanId: dto.carePlanId as CarePlanId,
    type: dto.type,
    title: dto.title,
    description: dto.description,
    dueDate: dto.dueDate,
    priority: dto.priority,
    status: dto.status,
    automationMode:
      automationMode === 'automatic' ||
      automationMode === 'patient_action' ||
      automationMode === 'human_review'
        ? automationMode
        : undefined,
    automationAction: optionalString(dto.automationAction),
    lastAutomatedAt: optionalString(dto.lastAutomatedAt),
    automationRunCount: dto.automationRunCount ?? 0,
    version: dto.version,
    createdAt: dto.createdAt,
  };
};

export const getPatientCarePlan = async (patientId: string) =>
  mapCarePlan(
    await http.get<CarePlanDto>(
      `/api/v1/patients/${encodeURIComponent(patientId)}/care-plan`,
    ),
  );

export const listCarePlanActivities = async (carePlanId: string) =>
  (
    await http.get<FollowUpActivityDto[]>(
      `/api/v1/care-plans/${encodeURIComponent(carePlanId)}/activities`,
    )
  ).map(mapActivity);

export const createCarePlanActivity = async (
  carePlanId: string,
  body: CreateCarePlanActivityRequest,
) =>
  mapActivity(
    await http.post<FollowUpActivityDto>(
      `/api/v1/care-plans/${encodeURIComponent(carePlanId)}/activities`,
      body,
    ),
  );

export interface CareAutomationRunResult {
  processed: number;
  notifications: number;
  runAt: string;
  activities: FollowUpActivity[];
}

export const runPatientCareAutomation = async (patientId: string) => {
  const result = await http.post<{
    processed: number;
    notifications: number;
    runAt: string;
    activities: FollowUpActivityDto[];
  }>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/care-automation-runs`,
  );
  return {
    ...result,
    activities: result.activities.map(mapActivity),
  } satisfies CareAutomationRunResult;
};

export const advanceCarePlanActivity = async (activityId: string) =>
  mapActivity(
    await http.post<FollowUpActivityDto>(
      `/api/v1/activities/${encodeURIComponent(activityId)}/advance`,
      {},
    ),
  );

export const confirmCarePlanActivity = async (activityId: string) =>
  mapActivity(
    await http.post<FollowUpActivityDto>(
      `/api/v1/follow-up-activities/${encodeURIComponent(activityId)}/confirmations`,
    ),
  );

export interface TransitionCarePlanActivityRequest {
  toStatus: FollowUpActivityStatus;
  // Required by the backend when toStatus is 'cancelled' or 'escalated'.
  reason?: string;
  version: number;
}

// New in v2.6 — the Kanban board's explicit column-to-column state machine.
// Distinct from advanceCarePlanActivity: enforces `version` atomically
// against the current status (409 CONCURRENCY_CONFLICT on a race), and
// allows 'due' to move back to 'scheduled' since a card can be dropped on
// any column directly.
export const transitionCarePlanActivity = async (
  activityId: string,
  body: TransitionCarePlanActivityRequest,
) =>
  mapActivity(
    await http.post<FollowUpActivityDto>(
      `/api/v1/follow-up-activities/${encodeURIComponent(activityId)}/transitions`,
      body,
    ),
  );
