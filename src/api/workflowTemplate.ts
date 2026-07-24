import { http } from './http';
import type { UserId, WorkflowTemplateId, WorkflowTemplateVersionId } from '../domain/core/ids';
import type { WorkflowStepDefinition, WorkflowTemplate, WorkflowTemplateVersion } from '../domain/core/entities';
import type { WorkflowTemplateStatus } from '../domain/core/enums';

interface WorkflowTemplateDto {
  id: string;
  name: string;
  specialty: string;
  description: string;
  createdBy?: unknown;
  versionIds?: string[];
  latestPublishedVersionId?: unknown;
  version: number;
}

interface WorkflowTemplateVersionDto {
  id: string;
  templateId: string;
  version: number;
  status: WorkflowTemplateStatus;
  steps?: WorkflowStepDefinition[];
  nodePositions?: Record<string, { x: number; y: number }>;
  createdAt: string;
  publishedAt?: unknown;
  rowVersion?: number;
}

export interface CreateWorkflowTemplateRequest {
  name: string;
  specialty: string;
  description: string;
}

export interface UpdateWorkflowTemplateRequest {
  name: string;
  specialty: string;
  description: string;
  version: number;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const mapTemplate = (dto: WorkflowTemplateDto): WorkflowTemplate => ({
  id: dto.id as WorkflowTemplateId,
  name: dto.name,
  specialty: dto.specialty,
  description: dto.description,
  createdBy: optionalString(dto.createdBy) as UserId ?? ('' as UserId),
  versionIds: (dto.versionIds ?? []) as WorkflowTemplateVersionId[],
  latestPublishedVersionId: optionalString(dto.latestPublishedVersionId) as WorkflowTemplateVersionId | undefined,
  version: dto.version,
});

const mapVersion = (dto: WorkflowTemplateVersionDto): WorkflowTemplateVersion => ({
  id: dto.id as WorkflowTemplateVersionId,
  templateId: dto.templateId as WorkflowTemplateId,
  version: dto.version,
  status: dto.status,
  steps: dto.steps ?? [],
  nodePositions: dto.nodePositions,
  createdAt: dto.createdAt,
  publishedAt: optionalString(dto.publishedAt),
  rowVersion: dto.rowVersion,
});

const templatePath = (templateId: string) =>
  `/api/v1/workflow-templates/${encodeURIComponent(templateId)}`;

export const listWorkflowTemplates = async () =>
  (await http.get<WorkflowTemplateDto[]>('/api/v1/workflow-templates')).map(mapTemplate);

export const createWorkflowTemplate = async (body: CreateWorkflowTemplateRequest) =>
  mapTemplate(await http.post<WorkflowTemplateDto>('/api/v1/workflow-templates', body));

export const recommendWorkflowTemplate = async () => {
  const dto = await http.get<WorkflowTemplateDto | null>('/api/v1/workflow-templates/recommend');
  return dto ? mapTemplate(dto) : undefined;
};

export const updateWorkflowTemplate = async (
  templateId: string,
  body: UpdateWorkflowTemplateRequest,
) => mapTemplate(await http.patch<WorkflowTemplateDto>(templatePath(templateId), body));

export const listWorkflowTemplateVersions = async (templateId: string) =>
  (
    await http.get<WorkflowTemplateVersionDto[]>(`${templatePath(templateId)}/versions`)
  ).map(mapVersion);

export const createWorkflowTemplateVersion = async (templateId: string) =>
  mapVersion(await http.post<WorkflowTemplateVersionDto>(`${templatePath(templateId)}/versions`, {}));

export const getWorkflowTemplateVersion = async (versionId: string) =>
  mapVersion(
    await http.get<WorkflowTemplateVersionDto>(
      `/api/v1/workflow-template-versions/${encodeURIComponent(versionId)}`,
    ),
  );

export const updateWorkflowTemplateVersionSteps = async (
  versionId: string,
  steps: WorkflowStepDefinition[],
  rowVersion: number,
) =>
  mapVersion(
    await http.put<WorkflowTemplateVersionDto>(
      `/api/v1/workflow-template-versions/${encodeURIComponent(versionId)}/steps`,
      { steps, rowVersion },
    ),
  );

// Response envelope only echoes a generic "data" placeholder in the spec (no
// object schema), so the created/updated version is re-fetched afterwards via
// getWorkflowTemplateVersion rather than trusted from this call's return value.
export const addWorkflowTemplateVersionStep = (versionId: string, step: WorkflowStepDefinition) =>
  http.post<unknown>(`/api/v1/workflow-template-versions/${encodeURIComponent(versionId)}/steps`, step);

const versionPath = (versionId: string) =>
  `/api/v1/workflow-template-versions/${encodeURIComponent(versionId)}`;

export const updateWorkflowTemplateVersionStep = (
  versionId: string,
  code: string,
  patch: Partial<WorkflowStepDefinition>,
) => http.patch<unknown>(`${versionPath(versionId)}/steps/${encodeURIComponent(code)}`, patch);

export const deleteWorkflowTemplateVersionStep = (versionId: string, code: string) =>
  http.delete<unknown>(`${versionPath(versionId)}/steps/${encodeURIComponent(code)}`);

// The spec's example body for this endpoint is an empty object with no field
// names shown — `orderedCodes` is a best-effort guess based on the mock
// service's `reorderSteps(templateId, orderedCodes)` signature it replaces.
export const reorderWorkflowTemplateVersionSteps = (versionId: string, orderedCodes: string[]) =>
  http.post<unknown>(`${versionPath(versionId)}/steps/reorder`, { orderedCodes });

// Same caveat as reorder above: field names (`sourceCode`/`targetCode`) are
// inferred from workflowService.connectSteps/disconnectSteps, not confirmed
// against the spec's Schema tab.
export const connectWorkflowTemplateVersionSteps = (
  versionId: string,
  sourceCode: string,
  targetCode: string,
) => http.post<unknown>(`${versionPath(versionId)}/edges`, { sourceCode, targetCode });

export const disconnectWorkflowTemplateVersionSteps = (
  versionId: string,
  sourceCode: string,
  targetCode: string,
) => http.delete<unknown>(`${versionPath(versionId)}/edges`, { sourceCode, targetCode });

export const saveWorkflowTemplateVersionNodePositions = (
  versionId: string,
  positions: Record<string, { x: number; y: number }>,
) => http.put<unknown>(`${versionPath(versionId)}/node-positions`, { positions });

export const publishWorkflowTemplateVersion = async (versionId: string, version: number) =>
  mapVersion(await http.post<WorkflowTemplateVersionDto>(`${versionPath(versionId)}/publish`, { version }));

export const archiveWorkflowTemplateVersion = async (versionId: string, version: number) =>
  mapVersion(await http.post<WorkflowTemplateVersionDto>(`${versionPath(versionId)}/archive`, { version }));
