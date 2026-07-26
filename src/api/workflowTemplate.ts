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
  version?: number;
  rowVersion?: number;
}

interface WorkflowTemplateVersionDto {
  id: string;
  templateId: string;
  version?: number;
  versionNumber?: number;
  status?: WorkflowTemplateStatus;
  lifecycleStatus?: WorkflowTemplateStatus;
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

const decode = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

const isTemplateDto = (value: unknown): value is WorkflowTemplateDto =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>).id === 'string' &&
      typeof (value as Record<string, unknown>).name === 'string',
  );

const isVersionDto = (value: unknown): value is WorkflowTemplateVersionDto =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>).id === 'string' &&
      typeof (value as Record<string, unknown>).templateId === 'string',
  );

const mapTemplate = (dto: WorkflowTemplateDto): WorkflowTemplate => ({
  id: dto.id as WorkflowTemplateId,
  name: dto.name,
  specialty: dto.specialty,
  description: dto.description,
  createdBy: optionalString(dto.createdBy) as UserId ?? ('' as UserId),
  versionIds: (dto.versionIds ?? []) as WorkflowTemplateVersionId[],
  latestPublishedVersionId: optionalString(dto.latestPublishedVersionId) as WorkflowTemplateVersionId | undefined,
  version: dto.version ?? dto.rowVersion ?? 0,
});

const mapVersion = (dto: WorkflowTemplateVersionDto): WorkflowTemplateVersion => ({
  id: dto.id as WorkflowTemplateVersionId,
  templateId: dto.templateId as WorkflowTemplateId,
  version: dto.version ?? dto.versionNumber ?? 1,
  status: dto.status ?? dto.lifecycleStatus ?? 'draft',
  steps: (dto.steps ?? []).map((step) => ({
    ...step,
    description: step.description ?? '',
    taskType: step.taskType ?? 'clinical',
    department: step.department ?? '',
    mandatory: step.mandatory ?? true,
    estimatedDurationMinutes: step.estimatedDurationMinutes ?? 10,
    maxWaitingMinutes: step.maxWaitingMinutes ?? 20,
    skipPermission: step.skipPermission ?? [],
    prerequisiteStepCodes: step.prerequisiteStepCodes ?? [],
  })),
  nodePositions: dto.nodePositions,
  createdAt: dto.createdAt,
  publishedAt: optionalString(dto.publishedAt),
  // A draft created by older API versions did not always expose rowVersion.
  // The command contract starts at 1, never send 0/undefined back to mutations.
  rowVersion: Math.max(1, dto.rowVersion ?? 1),
});

const templatePath = (templateId: string) =>
  `/api/v1/workflow-templates/${encodeURIComponent(templateId)}`;

export const listWorkflowTemplates = async () =>
  (await http.get<WorkflowTemplateDto[]>('/api/v1/workflow-templates')).map(mapTemplate);

export const createWorkflowTemplate = async (body: CreateWorkflowTemplateRequest) => {
  const raw = decode(
    await http.post<unknown>('/api/v1/workflow-templates', body),
  );
  if (isTemplateDto(raw)) return mapTemplate(raw);

  const rows = await listWorkflowTemplates();
  const returnedId = typeof raw === 'string' ? raw : undefined;
  const created =
    (returnedId ? rows.find((item) => item.id === returnedId) : undefined) ??
    rows
      .filter(
        (item) =>
          item.name === body.name && item.specialty === body.specialty,
      )
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
  if (!created) {
    throw new Error(
      'Backend đã nhận yêu cầu nhưng không trả template vừa tạo. Cần kiểm tra response contract của POST /workflow-templates.',
    );
  }
  return created;
};

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

export const createWorkflowTemplateVersion = async (templateId: string) => {
  const raw = decode(
    await http.post<unknown>(`${templatePath(templateId)}/versions`, {}),
  );
  if (isVersionDto(raw)) return mapVersion(raw);
  const versions = await listWorkflowTemplateVersions(templateId);
  const returnedId = typeof raw === 'string' ? raw : undefined;
  const created =
    (returnedId ? versions.find((item) => item.id === returnedId) : undefined) ??
    versions
      .filter((item) => item.status === 'draft')
      .sort((a, b) => b.version - a.version)[0];
  if (!created) {
    throw new Error('Backend không trả phiên bản nháp vừa tạo.');
  }
  return created;
};

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
export const addWorkflowTemplateVersionStep = (
  versionId: string,
  step: WorkflowStepDefinition,
  rowVersion: number,
) =>
  http.post<unknown>(
    `/api/v1/workflow-template-versions/${encodeURIComponent(versionId)}/steps`,
    { ...step, rowVersion },
  );

const versionPath = (versionId: string) =>
  `/api/v1/workflow-template-versions/${encodeURIComponent(versionId)}`;

export const updateWorkflowTemplateVersionStep = (
  versionId: string,
  code: string,
  patch: Partial<WorkflowStepDefinition>,
  rowVersion: number,
) => http.patch<unknown>(
  `${versionPath(versionId)}/steps/${encodeURIComponent(code)}`,
  { ...patch, rowVersion },
);

export const deleteWorkflowTemplateVersionStep = (
  versionId: string,
  code: string,
  rowVersion: number,
) =>
  http.delete<unknown>(
    `${versionPath(versionId)}/steps/${encodeURIComponent(code)}`,
    { rowVersion },
  );

// The spec's example body for this endpoint is an empty object with no field
// names shown — `orderedCodes` is a best-effort guess based on the mock
// service's `reorderSteps(templateId, orderedCodes)` signature it replaces.
export const reorderWorkflowTemplateVersionSteps = (
  versionId: string,
  orderedCodes: string[],
  rowVersion: number,
) =>
  http.post<unknown>(`${versionPath(versionId)}/steps/reorder`, { orderedCodes, rowVersion });

// Same caveat as reorder above: field names (`sourceCode`/`targetCode`) are
// inferred from workflowService.connectSteps/disconnectSteps, not confirmed
// against the spec's Schema tab.
export const connectWorkflowTemplateVersionSteps = (
  versionId: string,
  sourceCode: string,
  targetCode: string,
  rowVersion: number,
) => http.post<unknown>(
  `${versionPath(versionId)}/edges`,
  { sourceCode, targetCode, rowVersion },
);

export const disconnectWorkflowTemplateVersionSteps = (
  versionId: string,
  sourceCode: string,
  targetCode: string,
  rowVersion: number,
) => http.delete<unknown>(
  `${versionPath(versionId)}/edges`,
  { sourceCode, targetCode, rowVersion },
);

export const saveWorkflowTemplateVersionNodePositions = (
  versionId: string,
  positions: Record<string, { x: number; y: number }>,
  rowVersion: number,
) => http.put<unknown>(
  `${versionPath(versionId)}/node-positions`,
  { positions, rowVersion },
);

export const publishWorkflowTemplateVersion = async (versionId: string, version: number) => {
  const raw = decode(
    await http.post<unknown>(`${versionPath(versionId)}/publish`, { version }),
  );
  return isVersionDto(raw) ? mapVersion(raw) : getWorkflowTemplateVersion(versionId);
};

export const archiveWorkflowTemplateVersion = async (versionId: string, version: number) => {
  const raw = decode(
    await http.post<unknown>(`${versionPath(versionId)}/archive`, { version }),
  );
  return isVersionDto(raw) ? mapVersion(raw) : getWorkflowTemplateVersion(versionId);
};
