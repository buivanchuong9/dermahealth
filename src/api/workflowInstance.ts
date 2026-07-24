import { http } from './http';
import type {
  EncounterId,
  PatientId,
  UserId,
  WorkflowInstanceId,
  WorkflowTaskId,
  WorkflowTemplateId,
  WorkflowTemplateVersionId,
} from '../domain/core/ids';
import type { WorkflowInstance } from '../domain/core/entities';
import type { WorkflowInstanceStatus } from '../domain/core/enums';

interface WorkflowInstanceDto {
  id: string;
  patientId: string;
  encounterId: string;
  templateId: string;
  templateVersionId: string;
  instanceCode: string;
  integrityHash: string;
  identityVersion: number;
  status: WorkflowInstanceStatus;
  activatedBy: string;
  activatedAt: string;
  completedAt?: unknown;
  suspendedReason?: unknown;
  taskIds?: string[];
  version?: number;
}

export interface SuspendWorkflowInstanceRequest {
  reason: string;
  version: number;
}

export interface CancelWorkflowInstanceRequest {
  reason: string;
  version: number;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const mapInstance = (dto: WorkflowInstanceDto): WorkflowInstance => ({
  id: dto.id as WorkflowInstanceId,
  patientId: dto.patientId as PatientId,
  encounterId: dto.encounterId as EncounterId,
  templateId: dto.templateId as WorkflowTemplateId,
  templateVersionId: dto.templateVersionId as WorkflowTemplateVersionId,
  instanceCode: dto.instanceCode,
  integrityHash: dto.integrityHash,
  identityVersion: dto.identityVersion,
  status: dto.status,
  activatedBy: dto.activatedBy as UserId,
  activatedAt: dto.activatedAt,
  completedAt: optionalString(dto.completedAt),
  suspendedReason: optionalString(dto.suspendedReason),
  taskIds: (dto.taskIds ?? []) as WorkflowTaskId[],
  version: dto.version,
});

const instancePath = (instanceId: string) =>
  `/api/v1/workflow-instances/${encodeURIComponent(instanceId)}`;

export const listWorkflowInstances = async () =>
  (await http.get<WorkflowInstanceDto[]>('/api/v1/workflow-instances')).map(mapInstance);

export const getWorkflowInstance = async (instanceId: string) =>
  mapInstance(await http.get<WorkflowInstanceDto>(instancePath(instanceId)));

export const verifyWorkflowInstanceIdentity = (instanceId: string) =>
  http.get<unknown>(`${instancePath(instanceId)}/identity-verify`);

export const suspendWorkflowInstance = (instanceId: string, body: SuspendWorkflowInstanceRequest) =>
  http.post<unknown>(`${instancePath(instanceId)}/suspend`, body);

export const resumeWorkflowInstance = (instanceId: string, version: number) =>
  http.post<unknown>(`${instancePath(instanceId)}/resume`, { version });

export const cancelWorkflowInstance = (instanceId: string, body: CancelWorkflowInstanceRequest) =>
  http.post<unknown>(`${instancePath(instanceId)}/cancel`, body);

export const completeWorkflowInstance = (instanceId: string, version: number) =>
  http.post<unknown>(`${instancePath(instanceId)}/complete`, { version });
