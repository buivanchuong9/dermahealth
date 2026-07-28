import type {
  ClinicalOrder,
  MedicalEncounter,
  QueueTicket,
  WorkflowTask,
} from './core/entities';
import type { WorkflowTaskStatus } from './core/enums';

const FINISHED_STATUSES = new Set<WorkflowTaskStatus>([
  'completed',
  'skipped',
  'cancelled',
]);

const ACTIVE_STATUS_RANK: Partial<Record<WorkflowTaskStatus, number>> = {
  in_progress: 0,
  waiting_for_patient: 1,
  accepted: 2,
  assigned: 3,
  ready: 4,
  redo_required: 5,
  waiting_for_result: 6,
  waiting_for_approval: 7,
  escalated: 8,
  blocked: 9,
  pending: 10,
};

const URGENCY_RANK = { emergency: 0, urgent: 1, routine: 2 } as const;
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

export type PatientJourneyTone = 'active' | 'waiting' | 'blocked' | 'done';

export interface PatientJourneyStep {
  id: string;
  code: string;
  name: string;
  department: string;
  status: WorkflowTaskStatus;
  statusLabel: string;
  tone: PatientJourneyTone;
  isCurrent: boolean;
  isAdHoc: boolean;
  clinicalWarning?: string;
}

export interface ClinicalGpsView {
  current?: PatientJourneyStep;
  next: PatientJourneyStep[];
  timeline: PatientJourneyStep[];
  blockers: string[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  location: {
    department: string;
    room?: string;
    waitingArea?: string;
    nextStation?: string;
  };
  queue?: {
    number: string;
    peopleAhead: number;
    estimatedWaitMinutes: number;
    status: QueueTicket['status'];
  };
  preparationInstructions: string[];
  activeOrders: ClinicalOrder[];
}

const PATIENT_STATUS_LABEL: Record<WorkflowTaskStatus, string> = {
  pending: 'Chờ bước trước',
  blocked: 'Chưa thể thực hiện',
  ready: 'Sẵn sàng',
  assigned: 'Đã chuyển tới khoa phụ trách',
  accepted: 'Đơn vị phụ trách đã tiếp nhận',
  in_progress: 'Đang thực hiện',
  waiting_for_patient: 'Đang chờ bạn đến',
  waiting_for_result: 'Đang chờ kết quả',
  waiting_for_approval: 'Đang chờ bác sĩ duyệt',
  completed: 'Đã hoàn thành',
  failed: 'Cần nhân viên xử lý',
  rejected: 'Cần kiểm tra lại',
  redo_required: 'Cần thực hiện lại',
  skipped: 'Không cần thực hiện',
  cancelled: 'Đã hủy',
  expired: 'Đã quá thời hạn',
  escalated: 'Đang được ưu tiên xử lý',
};

function taskTone(status: WorkflowTaskStatus): PatientJourneyTone {
  if (FINISHED_STATUSES.has(status)) return 'done';
  if (['failed', 'rejected', 'redo_required', 'expired', 'escalated', 'blocked'].includes(status)) {
    return 'blocked';
  }
  if (['pending', 'waiting_for_result', 'waiting_for_approval'].includes(status)) {
    return 'waiting';
  }
  return 'active';
}

function compareTasks(left: WorkflowTask, right: WorkflowTask): number {
  const statusDiff =
    (ACTIVE_STATUS_RANK[left.status] ?? Number.MAX_SAFE_INTEGER) -
    (ACTIVE_STATUS_RANK[right.status] ?? Number.MAX_SAFE_INTEGER);
  if (statusDiff !== 0) return statusDiff;

  const urgencyDiff = URGENCY_RANK[left.urgency] - URGENCY_RANK[right.urgency];
  if (urgencyDiff !== 0) return urgencyDiff;

  const priorityDiff = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
  if (priorityDiff !== 0) return priorityDiff;

  return left.createdAt.localeCompare(right.createdAt);
}

function topologicalTaskOrder(tasks: WorkflowTask[]): WorkflowTask[] {
  const byCode = new Map(tasks.map((task) => [task.stepCode, task]));
  const remaining = new Map(tasks.map((task) => [task.id, task]));
  const ordered: WorkflowTask[] = [];
  const resolvedCodes = new Set<string>();

  while (remaining.size > 0) {
    const candidates = [...remaining.values()]
      .filter((task) =>
        task.dependsOnStepCodes.every(
          (code) => !byCode.has(code) || resolvedCodes.has(code),
        ),
      )
      .sort(compareTasks);

    // A malformed/cyclic graph must still render deterministically. Publishing
    // validation belongs to the BPM editor/backend; the patient screen must not
    // disappear because a graph is invalid.
    const nextBatch = candidates.length
      ? candidates
      : [...remaining.values()].sort(compareTasks).slice(0, 1);

    nextBatch.forEach((task) => {
      ordered.push(task);
      resolvedCodes.add(task.stepCode);
      remaining.delete(task.id);
    });
  }

  return ordered;
}

function toPatientStep(task: WorkflowTask, currentTaskId?: string): PatientJourneyStep {
  return {
    id: task.id,
    code: task.stepCode,
    name: task.name,
    department: task.department,
    status: task.status,
    statusLabel: PATIENT_STATUS_LABEL[task.status],
    tone: taskTone(task.status),
    isCurrent: task.id === currentTaskId,
    isAdHoc: task.origin === 'ad_hoc',
    clinicalWarning: task.clinicalWarning,
  };
}

function dependencyBlocker(task: WorkflowTask, allTasks: WorkflowTask[]): string | undefined {
  const dependencyNames = task.dependsOnStepCodes
    .map((code) => allTasks.find((candidate) => candidate.stepCode === code))
    .filter((candidate): candidate is WorkflowTask => Boolean(candidate))
    .filter((candidate) => !FINISHED_STATUSES.has(candidate.status))
    .map((candidate) => candidate.name);

  if (dependencyNames.length === 0) return undefined;
  return `${task.name} đang chờ hoàn tất: ${dependencyNames.join(', ')}.`;
}

export function buildClinicalGpsView(input: {
  encounter: MedicalEncounter;
  ticket?: QueueTicket;
  tasks: WorkflowTask[];
  orders: ClinicalOrder[];
}): ClinicalGpsView {
  const { encounter, ticket, orders } = input;
  const tasks = topologicalTaskOrder(input.tasks);
  const unfinished = tasks.filter((task) => !FINISHED_STATUSES.has(task.status));
  const currentTask = [...unfinished].sort(compareTasks)[0];
  const completedCount = tasks.filter((task) => FINISHED_STATUSES.has(task.status)).length;
  const actionableNext = unfinished
    .filter((task) => task.id !== currentTask?.id)
    .filter((task) =>
      task.dependsOnStepCodes.every((code) => {
        const dependency = tasks.find((candidate) => candidate.stepCode === code);
        return !dependency || FINISHED_STATUSES.has(dependency.status);
      }),
    )
    .sort(compareTasks);
  const fallbackNext = unfinished
    .filter((task) => task.id !== currentTask?.id)
    .sort(compareTasks);
  const nextTasks = (actionableNext.length ? actionableNext : fallbackNext).slice(0, 3);

  const blockers = [
    encounter.blockingCondition,
    ...unfinished.map((task) => task.clinicalWarning),
    ...unfinished
      .filter((task) => task.status === 'blocked' || task.status === 'pending')
      .map((task) => dependencyBlocker(task, tasks)),
  ].filter((item): item is string => Boolean(item));

  return {
    current: currentTask ? toPatientStep(currentTask, currentTask.id) : undefined,
    next: nextTasks.map((task) => toPatientStep(task, currentTask?.id)),
    timeline: tasks.map((task) => toPatientStep(task, currentTask?.id)),
    blockers: [...new Set(blockers)],
    completedCount,
    totalCount: tasks.length,
    progressPercent: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0,
    location: {
      department: currentTask?.department ?? ticket?.department ?? encounter.department,
      room: ticket?.room ?? encounter.room,
      waitingArea: ticket?.waitingArea,
      nextStation: ticket?.nextStation,
    },
    queue: ticket
      ? {
          number: ticket.number,
          peopleAhead: ticket.peopleAhead,
          estimatedWaitMinutes: ticket.estimatedWaitMinutes,
          status: ticket.status,
        }
      : undefined,
    preparationInstructions: ticket?.preparationInstructions ?? [],
    activeOrders: orders.filter((order) => order.status !== 'cancelled'),
  };
}
