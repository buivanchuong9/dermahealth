import { http } from './http';
import type {
  EncounterId,
  UserId,
  WorkflowInstanceId,
  WorkflowTaskId,
} from '../domain/core/ids';
import type { WorkflowTask } from '../domain/core/entities';
import type { Priority, Urgency, WorkflowTaskStatus } from '../domain/core/enums';
import type { UserRole } from '../domain/core/role';

interface WorkflowTaskDto {
  id: string;
  instanceId: string;
  encounterId: string;
  stepCode: string;
  name: string;
  responsibleRole: UserRole;
  department: string;
  status: WorkflowTaskStatus;
  assigneeId?: unknown;
  dependsOnStepCodes?: string[];
  slaMinutes: number;
  priority: Priority;
  urgency: Urgency;
  createdAt: string;
  startedAt?: unknown;
  completedAt?: unknown;
  clinicalWarning?: unknown;
  patientArrivalStatus?: WorkflowTask['patientArrivalStatus'];
  reworkCount: number;
  version?: number;
  origin?: WorkflowTask['origin'];
  createdBy?: unknown;
}

export interface ReasonedTaskActionRequest {
  reason: string;
  version: number;
}

export interface ReassignTaskRequest {
  assigneeId: string;
  version: number;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const mapTask = (dto: WorkflowTaskDto): WorkflowTask => ({
  id: dto.id as WorkflowTaskId,
  instanceId: dto.instanceId as WorkflowInstanceId,
  encounterId: dto.encounterId as EncounterId,
  stepCode: dto.stepCode,
  name: dto.name,
  responsibleRole: dto.responsibleRole,
  department: dto.department,
  status: dto.status,
  assigneeId: optionalString(dto.assigneeId) as UserId | undefined,
  dependsOnStepCodes: dto.dependsOnStepCodes ?? [],
  slaMinutes: dto.slaMinutes,
  priority: dto.priority,
  urgency: dto.urgency,
  createdAt: dto.createdAt,
  startedAt: optionalString(dto.startedAt),
  completedAt: optionalString(dto.completedAt),
  clinicalWarning: optionalString(dto.clinicalWarning),
  patientArrivalStatus: dto.patientArrivalStatus,
  reworkCount: dto.reworkCount,
  version: dto.version,
  origin: dto.origin,
  createdBy: optionalString(dto.createdBy) as UserId | undefined,
});

const taskPath = (taskId: string) => `/api/v1/workflow-tasks/${encodeURIComponent(taskId)}`;

export const listWorkflowTasks = async () =>
  (await http.get<WorkflowTaskDto[]>('/api/v1/workflow-tasks')).map(mapTask);

export const acceptWorkflowTask = (taskId: string, version: number) =>
  http.post<unknown>(`${taskPath(taskId)}/accept`, { version });

export const startWorkflowTask = (taskId: string, version: number) =>
  http.post<unknown>(`${taskPath(taskId)}/start`, { version });

export const completeWorkflowTask = (taskId: string, version: number) =>
  http.post<unknown>(`${taskPath(taskId)}/complete`, { version });

export const redoWorkflowTask = (taskId: string, body: ReasonedTaskActionRequest) =>
  http.post<unknown>(`${taskPath(taskId)}/redo`, body);

export const rejectWorkflowTask = (taskId: string, body: ReasonedTaskActionRequest) =>
  http.post<unknown>(`${taskPath(taskId)}/reject`, body);

export const escalateWorkflowTask = (taskId: string, body: ReasonedTaskActionRequest) =>
  http.post<unknown>(`${taskPath(taskId)}/escalate`, body);

export const skipWorkflowTask = (taskId: string, body: ReasonedTaskActionRequest) =>
  http.post<unknown>(`${taskPath(taskId)}/skip`, body);

export const reassignWorkflowTask = (taskId: string, body: ReassignTaskRequest) =>
  http.post<unknown>(`${taskPath(taskId)}/reassign`, body);

export interface CreateAdHocTaskRequest {
  name: string;
  responsibleRole: UserRole;
  department: string;
  slaMinutes: number;
}

export interface UpdateAdHocTaskRequest {
  name?: string;
  responsibleRole?: UserRole;
  department?: string;
  slaMinutes?: number;
  version: number;
}

export const createAdHocWorkflowTask = async (instanceId: string, body: CreateAdHocTaskRequest) =>
  mapTask(await http.post<WorkflowTaskDto>(`/api/v1/workflow-instances/${encodeURIComponent(instanceId)}/tasks`, body));

export const updateAdHocWorkflowTask = async (taskId: string, body: UpdateAdHocTaskRequest) =>
  mapTask(await http.patch<WorkflowTaskDto>(taskPath(taskId), body));

export const cancelAdHocWorkflowTask = (taskId: string, version: number) =>
  http.post<unknown>(`${taskPath(taskId)}/cancel`, { version });
