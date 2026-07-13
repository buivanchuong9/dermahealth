import { encounterRepository, workflowRepository } from '../repositories';
import { auditService } from './auditService';
import { encounterService } from './encounterService';
import { assertRole, InvalidTransitionError } from '../guards';
import { nextId } from '../core/ids';
import type {
  WorkflowTemplate, WorkflowTemplateVersion, WorkflowStepDefinition, WorkflowInstance, WorkflowTask,
} from '../core/entities';
import type { WorkflowTaskStatus } from '../core/enums';
import type { EncounterId, UserId, WorkflowTemplateId, WorkflowTemplateVersionId, WorkflowInstanceId, WorkflowTaskId } from '../core/ids';

// BPM boundary: this module creates and tracks operational tasks only. It
// never writes a DoctorDiagnosis, never touches Prescription content, and
// activateWorkflow refuses to run without an approved ClinicalPlan already
// on the encounter (encounterService.canActivateWorkflow).

const ALLOWED_TASK_TRANSITIONS: Record<WorkflowTaskStatus, WorkflowTaskStatus[]> = {
  pending: ['blocked', 'ready'],
  blocked: ['ready'],
  ready: ['assigned', 'escalated'],
  assigned: ['accepted', 'escalated'],
  accepted: ['in_progress', 'escalated'],
  in_progress: ['waiting_for_patient', 'waiting_for_result', 'waiting_for_approval', 'completed', 'failed', 'escalated'],
  waiting_for_patient: ['in_progress', 'expired', 'escalated'],
  waiting_for_result: ['in_progress', 'failed', 'escalated'],
  waiting_for_approval: ['completed', 'rejected', 'escalated'],
  completed: [],
  failed: ['redo_required'],
  rejected: ['redo_required'],
  redo_required: ['ready', 'assigned'],
  skipped: [],
  cancelled: [],
  expired: ['ready', 'escalated'],
  escalated: ['ready', 'assigned', 'cancelled'],
};

function canTransitionTask(from: WorkflowTaskStatus, to: WorkflowTaskStatus): boolean {
  return ALLOWED_TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---- Template design (Clinical Process Designer authors; Medical Administrator publishes) ----

function createDraftTemplate(name: string, specialty: string, description: string, createdBy: UserId): WorkflowTemplate {
  assertRole(createdBy, ['clinical_process_designer', 'medical_administrator']);
  const templateId = nextId<WorkflowTemplateId>('WFT');
  const version: WorkflowTemplateVersion = { id: nextId('WFV'), templateId, version: 1, status: 'draft', steps: [], createdAt: new Date().toISOString() };
  const template: WorkflowTemplate = { id: templateId, name, specialty, description, createdBy, versionIds: [version.id] };
  workflowRepository.templates().upsert(template);
  workflowRepository.versions().upsert(version);
  auditService.log({ actorId: createdBy, action: 'WORKFLOW_TEMPLATE_DRAFT_CREATED', entityType: 'WorkflowTemplate', entityId: template.id, sourceModule: 'BPM', newState: 'draft' });
  return template;
}

function getDraftVersion(templateId: WorkflowTemplateId): WorkflowTemplateVersion | undefined {
  const template = workflowRepository.templates().getById(templateId);
  if (!template) return undefined;
  return template.versionIds.map((id) => workflowRepository.versions().getById(id)).find((v) => v?.status === 'draft');
}

function addStep(templateId: WorkflowTemplateId, step: WorkflowStepDefinition, actorId: UserId): WorkflowTemplateVersion {
  assertRole(actorId, ['clinical_process_designer', 'medical_administrator']);
  const draft = getDraftVersion(templateId);
  if (!draft) throw new InvalidTransitionError('Không có phiên bản nháp để chỉnh sửa — hãy tạo phiên bản mới trước.');
  const updated = { ...draft, steps: [...draft.steps, step] };
  workflowRepository.versions().upsert(updated);
  return updated;
}

function editStep(templateId: WorkflowTemplateId, stepCode: string, patch: Partial<WorkflowStepDefinition>, actorId: UserId): WorkflowTemplateVersion {
  assertRole(actorId, ['clinical_process_designer', 'medical_administrator']);
  const draft = getDraftVersion(templateId);
  if (!draft) throw new InvalidTransitionError('Không có phiên bản nháp để chỉnh sửa.');
  const updated = { ...draft, steps: draft.steps.map((s) => (s.code === stepCode ? { ...s, ...patch } : s)) };
  workflowRepository.versions().upsert(updated);
  return updated;
}

function connectSteps(templateId: WorkflowTemplateId, sourceCode: string, targetCode: string, actorId: UserId): WorkflowTemplateVersion {
  assertRole(actorId, ['clinical_process_designer', 'medical_administrator']);
  const draft = getDraftVersion(templateId);
  if (!draft) throw new InvalidTransitionError('Không có phiên bản nháp để chỉnh sửa.');
  if (sourceCode === targetCode) throw new InvalidTransitionError('Một bước không thể tự nối với chính nó.');
  const source = draft.steps.find((s) => s.code === sourceCode);
  const target = draft.steps.find((s) => s.code === targetCode);
  if (!source || !target) throw new InvalidTransitionError('Không tìm thấy bước nguồn hoặc bước đích.');
  if (target.prerequisiteStepCodes.includes(sourceCode)) return draft;
  const dependencies = new Map(draft.steps.map((s) => [s.code, s.prerequisiteStepCodes]));
  const reaches = (from: string, wanted: string, seen = new Set<string>()): boolean => {
    if (from === wanted) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return (dependencies.get(from) ?? []).some((parent) => reaches(parent, wanted, seen));
  };
  if (reaches(sourceCode, targetCode)) throw new InvalidTransitionError('Không thể nối vì sẽ tạo vòng lặp trong quy trình.');
  const updated = editStep(templateId, targetCode, { prerequisiteStepCodes: [...target.prerequisiteStepCodes, sourceCode] }, actorId);
  auditService.log({ actorId, action: 'WORKFLOW_EDGE_CREATED', entityType: 'WorkflowTemplateVersion', entityId: draft.id, newState: `${sourceCode}->${targetCode}`, sourceModule: 'BPM' });
  return updated;
}

function disconnectSteps(templateId: WorkflowTemplateId, sourceCode: string, targetCode: string, actorId: UserId): WorkflowTemplateVersion {
  assertRole(actorId, ['clinical_process_designer', 'medical_administrator']);
  const draft = getDraftVersion(templateId);
  const target = draft?.steps.find((s) => s.code === targetCode);
  if (!draft || !target) throw new InvalidTransitionError('Không tìm thấy dây nối cần xóa.');
  const updated = editStep(templateId, targetCode, { prerequisiteStepCodes: target.prerequisiteStepCodes.filter((code) => code !== sourceCode) }, actorId);
  auditService.log({ actorId, action: 'WORKFLOW_EDGE_REMOVED', entityType: 'WorkflowTemplateVersion', entityId: draft.id, previousState: `${sourceCode}->${targetCode}`, sourceModule: 'BPM' });
  return updated;
}

function reorderSteps(templateId: WorkflowTemplateId, orderedCodes: string[], actorId: UserId): WorkflowTemplateVersion {
  assertRole(actorId, ['clinical_process_designer', 'medical_administrator']);
  const draft = getDraftVersion(templateId);
  if (!draft) throw new InvalidTransitionError('Không có phiên bản nháp để chỉnh sửa.');
  const byCode = new Map(draft.steps.map((s) => [s.code, s]));
  const steps = orderedCodes.map((c) => byCode.get(c)).filter((s): s is WorkflowStepDefinition => !!s);
  const updated = { ...draft, steps };
  workflowRepository.versions().upsert(updated);
  return updated;
}

function removeStep(templateId: WorkflowTemplateId, stepCode: string, actorId: UserId): WorkflowTemplateVersion {
  assertRole(actorId, ['clinical_process_designer', 'medical_administrator']);
  const draft = getDraftVersion(templateId);
  if (!draft) throw new InvalidTransitionError('Không có phiên bản nháp để chỉnh sửa.');
  const target = draft.steps.find((s) => s.code === stepCode);
  if (target?.mandatory) throw new InvalidTransitionError('Không thể xóa bước bắt buộc — hãy đổi thành không bắt buộc trước.');
  const updated = { ...draft, steps: draft.steps.filter((s) => s.code !== stepCode) };
  workflowRepository.versions().upsert(updated);
  return updated;
}

function publishVersion(templateId: WorkflowTemplateId, actorId: UserId): WorkflowTemplateVersion {
  assertRole(actorId, ['medical_administrator']);
  const draft = getDraftVersion(templateId);
  if (!draft) throw new InvalidTransitionError('Không có phiên bản nháp để xuất bản.');
  if (draft.steps.length === 0) throw new InvalidTransitionError('Quy trình cần ít nhất một bước trước khi xuất bản.');
  const published = { ...draft, status: 'published' as const, publishedAt: new Date().toISOString() };
  workflowRepository.versions().upsert(published);
  const template = workflowRepository.templates().getById(templateId);
  if (template) {
    const prior = template.latestPublishedVersionId ? workflowRepository.versions().getById(template.latestPublishedVersionId) : undefined;
    if (prior) workflowRepository.versions().upsert({ ...prior, status: 'deprecated' });
    workflowRepository.templates().upsert({ ...template, latestPublishedVersionId: published.id });
  }
  auditService.log({ actorId, action: 'WORKFLOW_TEMPLATE_VERSION_PUBLISHED', entityType: 'WorkflowTemplateVersion', entityId: published.id, newState: 'published', sourceModule: 'BPM' });
  return published;
}

function archiveVersion(versionId: WorkflowTemplateVersionId, actorId: UserId): WorkflowTemplateVersion {
  assertRole(actorId, ['medical_administrator']);
  const version = workflowRepository.versions().getById(versionId);
  if (!version) throw new Error(`Không tìm thấy phiên bản ${versionId}`);
  return workflowRepository.versions().upsert({ ...version, status: 'archived' });
}

function startNewDraftFromPublished(templateId: WorkflowTemplateId, actorId: UserId): WorkflowTemplateVersion {
  assertRole(actorId, ['clinical_process_designer', 'medical_administrator']);
  const template = workflowRepository.templates().getById(templateId);
  if (!template) throw new Error(`Không tìm thấy quy trình ${templateId}`);
  const base = template.latestPublishedVersionId ? workflowRepository.versions().getById(template.latestPublishedVersionId) : undefined;
  const nextVersion: WorkflowTemplateVersion = {
    id: nextId('WFV'), templateId, version: (base?.version ?? 0) + 1, status: 'draft',
    steps: base ? base.steps.map((s) => ({ ...s })) : [], createdAt: new Date().toISOString(),
  };
  workflowRepository.versions().upsert(nextVersion);
  workflowRepository.templates().upsert({ ...template, versionIds: [...template.versionIds, nextVersion.id] });
  return nextVersion;
}

function listTemplates(): WorkflowTemplate[] {
  return workflowRepository.templates().getAll();
}

function listVersions(templateId: WorkflowTemplateId): WorkflowTemplateVersion[] {
  return workflowRepository.versions().getAll().filter((v) => v.templateId === templateId).sort((a, b) => a.version - b.version);
}

function recommendTemplate(specialty: string): WorkflowTemplate | undefined {
  return listTemplates().find((t) => t.specialty === specialty && t.latestPublishedVersionId);
}

// ---- Instance activation & task runtime ----

function activateWorkflow(encounterId: EncounterId, templateId: WorkflowTemplateId, doctorId: UserId): WorkflowInstance {
  assertRole(doctorId, ['doctor']);
  const encounter = encounterRepository.getById(encounterId);
  if (!encounter) throw new Error(`Không tìm thấy lượt khám ${encounterId}`);
  const gate = encounterService.canActivateWorkflow(encounter);
  if (!gate.ok) throw new InvalidTransitionError(gate.reason ?? 'Không thể kích hoạt quy trình.');

  const template = workflowRepository.templates().getById(templateId);
  const version = template?.latestPublishedVersionId ? workflowRepository.versions().getById(template.latestPublishedVersionId) : undefined;
  if (!template || !version) throw new Error('Quy trình chưa có phiên bản đã xuất bản.');

  const instance: WorkflowInstance = {
    id: nextId('WFI'), encounterId, templateId, templateVersionId: version.id, status: 'active',
    activatedBy: doctorId, activatedAt: new Date().toISOString(), taskIds: [],
  };

  // copy-on-instantiate: tasks are generated from the pinned version's steps now;
  // later edits to the template never retroactively change this instance.
  const tasks: WorkflowTask[] = version.steps.map((step) => ({
    id: nextId('TASK'), instanceId: instance.id, encounterId, stepCode: step.code, name: step.name,
    responsibleRole: step.responsibleRole, department: step.department,
    status: step.prerequisiteStepCodes.length === 0 ? 'ready' : 'pending',
    dependsOnStepCodes: step.prerequisiteStepCodes, slaMinutes: step.maxWaitingMinutes,
    priority: 'medium', urgency: 'routine', createdAt: new Date().toISOString(), reworkCount: 0,
  }));
  tasks.forEach((t) => workflowRepository.tasks().upsert(t));
  instance.taskIds = tasks.map((t) => t.id);
  workflowRepository.instances().upsert(instance);

  encounterRepository.upsert({ ...encounter, workflowInstanceId: instance.id });
  auditService.log({ actorId: doctorId, action: 'WORKFLOW_INSTANCE_ACTIVATED', entityType: 'WorkflowInstance', entityId: instance.id, patientId: encounter.patientId, encounterId, sourceModule: 'BPM', newState: 'active' });
  if (encounterService.canTransition(encounter.status, 'workflow_active')) {
    encounterService.transitionStatus(encounterId, 'workflow_active', doctorId);
  }
  const current = encounterRepository.getById(encounterId)!;
  if (encounterService.canTransition(current.status, 'in_progress')) {
    encounterService.transitionStatus(encounterId, 'in_progress', doctorId);
  }
  return instance;
}

function refreshDependentTasks(instanceId: WorkflowInstanceId): void {
  const instance = workflowRepository.instances().getById(instanceId);
  if (!instance) return;
  const tasks = instance.taskIds.map((id) => workflowRepository.tasks().getById(id)).filter((t): t is WorkflowTask => !!t);
  const doneCodes = new Set(tasks.filter((t) => t.status === 'completed' || t.status === 'skipped').map((t) => t.stepCode));
  tasks.forEach((t) => {
    if (t.status === 'pending' || t.status === 'blocked') {
      const unmet = t.dependsOnStepCodes.filter((c) => !doneCodes.has(c));
      if (unmet.length === 0) workflowRepository.tasks().upsert({ ...t, status: 'ready' });
      else if (t.status !== 'blocked') workflowRepository.tasks().upsert({ ...t, status: 'blocked', clinicalWarning: `Chờ hoàn tất: ${unmet.join(', ')}` });
    }
  });
}

function transitionTask(taskId: WorkflowTaskId, to: WorkflowTaskStatus, actorId: UserId, opts?: { reason?: string; assigneeId?: UserId }): WorkflowTask {
  const task = workflowRepository.tasks().getById(taskId);
  if (!task) throw new Error(`Không tìm thấy tác vụ ${taskId}`);
  if (!canTransitionTask(task.status, to)) throw new InvalidTransitionError(`Không thể chuyển tác vụ từ "${task.status}" sang "${to}".`);
  const now = new Date().toISOString();
  const updated: WorkflowTask = {
    ...task, status: to, assigneeId: opts?.assigneeId ?? task.assigneeId,
    startedAt: to === 'in_progress' && !task.startedAt ? now : task.startedAt,
    completedAt: to === 'completed' ? now : task.completedAt,
    reworkCount: to === 'redo_required' ? task.reworkCount + 1 : task.reworkCount,
  };
  workflowRepository.tasks().upsert(updated);
  auditService.log({ actorId, action: 'TASK_STATUS_CHANGED', entityType: 'WorkflowTask', entityId: taskId, previousState: task.status, newState: to, reason: opts?.reason, encounterId: task.encounterId, sourceModule: 'BPM' });
  if (to === 'completed' || to === 'skipped') refreshDependentTasks(task.instanceId);
  return updated;
}

function acceptTask(taskId: WorkflowTaskId, actorId: UserId): WorkflowTask {
  return transitionTask(taskId, 'accepted', actorId, { assigneeId: actorId });
}
function startTask(taskId: WorkflowTaskId, actorId: UserId): WorkflowTask {
  return transitionTask(taskId, 'in_progress', actorId);
}
function completeTask(taskId: WorkflowTaskId, actorId: UserId): WorkflowTask {
  return transitionTask(taskId, 'completed', actorId);
}
function requestRedo(taskId: WorkflowTaskId, actorId: UserId, reason: string): WorkflowTask {
  const task = workflowRepository.tasks().getById(taskId);
  if (!task) throw new Error(`Không tìm thấy tác vụ ${taskId}`);
  const failed = transitionTask(taskId, 'failed', actorId, { reason });
  return transitionTask(failed.id, 'redo_required', actorId, { reason });
}
function rejectResult(taskId: WorkflowTaskId, actorId: UserId, reason: string): WorkflowTask {
  const rejected = transitionTask(taskId, 'rejected', actorId, { reason });
  return transitionTask(rejected.id, 'redo_required', actorId, { reason });
}
function escalateTask(taskId: WorkflowTaskId, actorId: UserId, reason: string): WorkflowTask {
  return transitionTask(taskId, 'escalated', actorId, { reason });
}
function skipTask(taskId: WorkflowTaskId, actorId: UserId, reason: string): WorkflowTask {
  const task = workflowRepository.tasks().getById(taskId);
  if (!task) throw new Error(`Không tìm thấy tác vụ ${taskId}`);
  const version = workflowRepository.versions().getById(workflowRepository.instances().getById(task.instanceId)?.templateVersionId ?? ('' as WorkflowTemplateVersionId));
  const step = version?.steps.find((s) => s.code === task.stepCode);
  if (step?.mandatory) throw new InvalidTransitionError('Không thể bỏ qua bước bắt buộc.');
  const updated = workflowRepository.tasks().upsert({ ...task, status: 'skipped' as WorkflowTaskStatus });
  auditService.log({ actorId, action: 'TASK_SKIPPED', entityType: 'WorkflowTask', entityId: taskId, reason, encounterId: task.encounterId, sourceModule: 'BPM' });
  refreshDependentTasks(task.instanceId);
  return updated;
}
function reassignTask(taskId: WorkflowTaskId, newAssigneeId: UserId, actorId: UserId): WorkflowTask {
  const task = workflowRepository.tasks().getById(taskId);
  if (!task) throw new Error(`Không tìm thấy tác vụ ${taskId}`);
  const updated = workflowRepository.tasks().upsert({ ...task, assigneeId: newAssigneeId, status: task.status === 'ready' ? 'assigned' : task.status });
  auditService.log({ actorId, action: 'TASK_REASSIGNED', entityType: 'WorkflowTask', entityId: taskId, newState: newAssigneeId, encounterId: task.encounterId, sourceModule: 'BPM' });
  return updated;
}

function suspendInstance(instanceId: WorkflowInstanceId, actorId: UserId, reason: string): WorkflowInstance {
  const instance = workflowRepository.instances().getById(instanceId);
  if (!instance) throw new Error(`Không tìm thấy quy trình ${instanceId}`);
  const updated = workflowRepository.instances().upsert({ ...instance, status: 'suspended', suspendedReason: reason });
  auditService.log({ actorId, action: 'WORKFLOW_INSTANCE_SUSPENDED', entityType: 'WorkflowInstance', entityId: instanceId, reason, encounterId: instance.encounterId, sourceModule: 'BPM', severity: 'warning' });
  return updated;
}
function resumeInstance(instanceId: WorkflowInstanceId, actorId: UserId): WorkflowInstance {
  const instance = workflowRepository.instances().getById(instanceId);
  if (!instance) throw new Error(`Không tìm thấy quy trình ${instanceId}`);
  const updated = workflowRepository.instances().upsert({ ...instance, status: 'active', suspendedReason: undefined });
  auditService.log({ actorId, action: 'WORKFLOW_INSTANCE_RESUMED', entityType: 'WorkflowInstance', entityId: instanceId, encounterId: instance.encounterId, sourceModule: 'BPM' });
  return updated;
}
function cancelInstance(instanceId: WorkflowInstanceId, actorId: UserId, reason: string): WorkflowInstance {
  assertRole(actorId, ['doctor', 'medical_administrator']);
  const instance = workflowRepository.instances().getById(instanceId);
  if (!instance) throw new Error(`Không tìm thấy quy trình ${instanceId}`);
  const updated = workflowRepository.instances().upsert({ ...instance, status: 'cancelled' });
  auditService.log({ actorId, action: 'WORKFLOW_INSTANCE_CANCELLED', entityType: 'WorkflowInstance', entityId: instanceId, reason, encounterId: instance.encounterId, sourceModule: 'BPM', severity: 'warning' });
  return updated;
}

/** Completion criteria: every mandatory task is completed or (legally) skipped. */
function checkAndCompleteInstance(instanceId: WorkflowInstanceId, actorId: UserId): WorkflowInstance {
  const instance = workflowRepository.instances().getById(instanceId);
  if (!instance) throw new Error(`Không tìm thấy quy trình ${instanceId}`);
  const version = workflowRepository.versions().getById(instance.templateVersionId);
  const tasks = instance.taskIds.map((id) => workflowRepository.tasks().getById(id)).filter((t): t is WorkflowTask => !!t);
  const mandatoryCodes = new Set((version?.steps ?? []).filter((s) => s.mandatory).map((s) => s.code));
  const allMandatoryDone = tasks.filter((t) => mandatoryCodes.has(t.stepCode)).every((t) => t.status === 'completed' || t.status === 'skipped');
  if (!allMandatoryDone) throw new InvalidTransitionError('Vẫn còn bước bắt buộc chưa hoàn thành.');
  const updated = workflowRepository.instances().upsert({ ...instance, status: 'completed', completedAt: new Date().toISOString() });
  auditService.log({ actorId, action: 'WORKFLOW_INSTANCE_COMPLETED', entityType: 'WorkflowInstance', entityId: instanceId, newState: 'completed', encounterId: instance.encounterId, sourceModule: 'BPM' });
  // Workflow completion does NOT automatically close the encounter — only nudges it toward final review.
  const encounter = encounterRepository.getById(instance.encounterId);
  if (encounter && encounterService.canTransition(encounter.status, 'results_complete')) {
    encounterService.transitionStatus(instance.encounterId, 'results_complete', actorId);
  }
  return updated;
}

function listTasksForEncounter(encounterId: EncounterId): WorkflowTask[] {
  return workflowRepository.tasks().getAll().filter((t) => t.encounterId === encounterId);
}
function listTasksForRole(role: WorkflowTask['responsibleRole']): WorkflowTask[] {
  return workflowRepository.tasks().getAll().filter((t) => t.responsibleRole === role);
}
function listTasksForAssignee(assigneeId: UserId): WorkflowTask[] {
  return workflowRepository.tasks().getAll().filter((t) => t.assigneeId === assigneeId);
}
function getInstance(instanceId: WorkflowInstanceId): WorkflowInstance | undefined {
  return workflowRepository.instances().getById(instanceId);
}
function getVersion(versionId: WorkflowTemplateVersionId): WorkflowTemplateVersion | undefined {
  return workflowRepository.versions().getById(versionId);
}

export const workflowService = {
  ALLOWED_TASK_TRANSITIONS, canTransitionTask,
  createDraftTemplate, getDraftVersion, addStep, editStep, connectSteps, disconnectSteps, reorderSteps, removeStep,
  publishVersion, archiveVersion, startNewDraftFromPublished, listTemplates, listVersions, recommendTemplate,
  activateWorkflow, transitionTask, acceptTask, startTask, completeTask, requestRedo, rejectResult,
  escalateTask, skipTask, reassignTask, suspendInstance, resumeInstance, cancelInstance,
  checkAndCompleteInstance, listTasksForEncounter, listTasksForRole, listTasksForAssignee, getInstance, getVersion,
};
