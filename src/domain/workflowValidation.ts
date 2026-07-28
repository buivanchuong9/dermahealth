import type { WorkflowStepDefinition } from './core/entities';

export const WORKFLOW_START_NODE_ID = '__START__';
export const WORKFLOW_END_NODE_ID = '__END__';

export type WorkflowValidationSeverity = 'error' | 'warning';

export type WorkflowValidationIssueCode =
  | 'missing_start'
  | 'missing_end'
  | 'empty_workflow'
  | 'duplicate_step_code'
  | 'missing_dependency'
  | 'self_dependency'
  | 'cycle'
  | 'invalid_terminal_edge'
  | 'duplicate_terminal_edge'
  | 'start_without_outgoing'
  | 'end_without_incoming'
  | 'start_boundary_mismatch'
  | 'end_boundary_mismatch'
  | 'unreachable_from_start'
  | 'cannot_reach_end'
  | 'decision_without_branches'
  | 'decision_branch_without_condition'
  | 'mandatory_output_missing'
  | 'clinical_location_missing';

export interface WorkflowValidationIssue {
  code: WorkflowValidationIssueCode;
  severity: WorkflowValidationSeverity;
  message: string;
  nodeCodes?: string[];
}

export interface WorkflowTerminalEdge {
  source: string;
  target: string;
}

export interface WorkflowValidationInput {
  steps: WorkflowStepDefinition[];
  hasStartNode: boolean;
  hasEndNode: boolean;
  terminalEdges: WorkflowTerminalEdge[];
}

export interface WorkflowValidationReport {
  valid: boolean;
  errors: WorkflowValidationIssue[];
  warnings: WorkflowValidationIssue[];
  reachableNodeCodes: string[];
  nodesWithoutPathToEnd: string[];
}

const CLINICAL_TASK_TYPES = new Set([
  'clinical',
  'consultation',
  'diagnostic',
  'laboratory',
  'imaging',
  'procedure',
  'treatment',
]);

function addEdge(adjacency: Map<string, Set<string>>, source: string, target: string) {
  const targets = adjacency.get(source) ?? new Set<string>();
  targets.add(target);
  adjacency.set(source, targets);
}

function visitGraph(adjacency: Map<string, Set<string>>, startingNode: string) {
  const visited = new Set<string>();
  const queue = [startingNode];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    for (const target of adjacency.get(current) ?? []) {
      if (!visited.has(target)) {
        queue.push(target);
      }
    }
  }

  return visited;
}

function reverseGraph(adjacency: Map<string, Set<string>>) {
  const reversed = new Map<string, Set<string>>();

  for (const [source, targets] of adjacency) {
    for (const target of targets) {
      addEdge(reversed, target, source);
    }
  }

  return reversed;
}

function findCycleNodes(stepCodes: string[], adjacency: Map<string, Set<string>>) {
  const state = new Map<string, 'visiting' | 'visited'>();
  const stack: string[] = [];
  const cycleNodes = new Set<string>();
  const allowedCodes = new Set(stepCodes);

  const visit = (nodeCode: string) => {
    state.set(nodeCode, 'visiting');
    stack.push(nodeCode);

    for (const target of adjacency.get(nodeCode) ?? []) {
      if (!allowedCodes.has(target)) {
        continue;
      }

      if (!state.has(target)) {
        visit(target);
        continue;
      }

      if (state.get(target) === 'visiting') {
        const cycleStart = stack.lastIndexOf(target);
        stack.slice(cycleStart).forEach((code) => cycleNodes.add(code));
      }
    }

    stack.pop();
    state.set(nodeCode, 'visited');
  };

  stepCodes.forEach((code) => {
    if (!state.has(code)) {
      visit(code);
    }
  });

  return [...cycleNodes];
}

function isDecisionStep(step: WorkflowStepDefinition) {
  const normalizedType = String(step.taskType ?? '').toLowerCase();
  const normalizedCode = step.code.toLowerCase();
  return (
    normalizedType === 'decision' ||
    normalizedType === 'gateway' ||
    normalizedCode.includes('decision') ||
    normalizedCode.includes('gateway') ||
    normalizedCode.includes('condition')
  );
}

function hasCondition(step: WorkflowStepDefinition | undefined) {
  return Boolean(step?.conditionalRule?.trim());
}

export function validateWorkflowGraph({
  steps,
  hasStartNode,
  hasEndNode,
  terminalEdges,
}: WorkflowValidationInput): WorkflowValidationReport {
  const issues: WorkflowValidationIssue[] = [];
  const stepCountByCode = new Map<string, number>();

  steps.forEach((step) => {
    stepCountByCode.set(step.code, (stepCountByCode.get(step.code) ?? 0) + 1);
  });

  const duplicateCodes = [...stepCountByCode.entries()]
    .filter(([, count]) => count > 1)
    .map(([code]) => code);
  const uniqueSteps = steps.filter(
    (step, index) => steps.findIndex((candidate) => candidate.code === step.code) === index,
  );
  const stepCodes = uniqueSteps.map((step) => step.code);
  const stepCodeSet = new Set(stepCodes);
  const stepByCode = new Map(uniqueSteps.map((step) => [step.code, step]));
  const adjacency = new Map<string, Set<string>>();

  if (!hasStartNode) {
    issues.push({
      code: 'missing_start',
      severity: 'error',
      message: 'Quy trình chưa có điểm Bắt đầu.',
    });
  }

  if (!hasEndNode) {
    issues.push({
      code: 'missing_end',
      severity: 'error',
      message: 'Quy trình chưa có điểm Kết thúc.',
    });
  }

  if (steps.length === 0) {
    issues.push({
      code: 'empty_workflow',
      severity: 'error',
      message: 'Quy trình phải có ít nhất một bước nghiệp vụ.',
    });
  }

  if (duplicateCodes.length > 0) {
    issues.push({
      code: 'duplicate_step_code',
      severity: 'error',
      message: `Mã bước bị trùng: ${duplicateCodes.join(', ')}.`,
      nodeCodes: duplicateCodes,
    });
  }

  uniqueSteps.forEach((step) => {
    for (const dependencyCode of step.prerequisiteStepCodes ?? []) {
      if (dependencyCode === step.code) {
        issues.push({
          code: 'self_dependency',
          severity: 'error',
          message: `Bước “${step.name}” đang nối vào chính nó.`,
          nodeCodes: [step.code],
        });
        continue;
      }

      if (!stepCodeSet.has(dependencyCode)) {
        issues.push({
          code: 'missing_dependency',
          severity: 'error',
          message: `Bước “${step.name}” phụ thuộc vào node không còn tồn tại: ${dependencyCode}.`,
          nodeCodes: [step.code, dependencyCode],
        });
        continue;
      }

      addEdge(adjacency, dependencyCode, step.code);
    }
  });

  const terminalEdgeKeys = new Set<string>();
  terminalEdges.forEach((edge) => {
    const edgeKey = `${edge.source}->${edge.target}`;
    if (terminalEdgeKeys.has(edgeKey)) {
      issues.push({
        code: 'duplicate_terminal_edge',
        severity: 'warning',
        message: `Liên kết ${edge.source} → ${edge.target} đang bị lặp.`,
        nodeCodes: [edge.source, edge.target],
      });
      return;
    }
    terminalEdgeKeys.add(edgeKey);

    const validSource =
      (edge.source === WORKFLOW_START_NODE_ID && hasStartNode) || stepCodeSet.has(edge.source);
    const validTarget =
      (edge.target === WORKFLOW_END_NODE_ID && hasEndNode) || stepCodeSet.has(edge.target);
    const touchesTerminal =
      edge.source === WORKFLOW_START_NODE_ID || edge.target === WORKFLOW_END_NODE_ID;
    const invalidDirection =
      edge.target === WORKFLOW_START_NODE_ID || edge.source === WORKFLOW_END_NODE_ID;

    if (
      !validSource ||
      !validTarget ||
      !touchesTerminal ||
      invalidDirection ||
      edge.source === edge.target
    ) {
      issues.push({
        code: 'invalid_terminal_edge',
        severity: 'error',
        message: `Liên kết hệ thống ${edge.source} → ${edge.target} không hợp lệ.`,
        nodeCodes: [edge.source, edge.target],
      });
      return;
    }

    addEdge(adjacency, edge.source, edge.target);
  });

  const cycleNodes = findCycleNodes(stepCodes, adjacency);
  if (cycleNodes.length > 0) {
    issues.push({
      code: 'cycle',
      severity: 'error',
      message: `Phát hiện vòng lặp không có kiểm soát giữa các bước: ${cycleNodes.join(', ')}.`,
      nodeCodes: cycleNodes,
    });
  }

  if (hasStartNode && (adjacency.get(WORKFLOW_START_NODE_ID)?.size ?? 0) === 0) {
    issues.push({
      code: 'start_without_outgoing',
      severity: 'error',
      message: 'Điểm Bắt đầu chưa được nối tới bước nghiệp vụ.',
      nodeCodes: [WORKFLOW_START_NODE_ID],
    });
  }

  const reversed = reverseGraph(adjacency);
  if (hasEndNode && (reversed.get(WORKFLOW_END_NODE_ID)?.size ?? 0) === 0) {
    issues.push({
      code: 'end_without_incoming',
      severity: 'error',
      message: 'Chưa có nhánh nào đi tới điểm Kết thúc.',
      nodeCodes: [WORKFLOW_END_NODE_ID],
    });
  }

  const rootCodes = uniqueSteps
    .filter((step) => step.prerequisiteStepCodes.length === 0)
    .map((step) => step.code);
  const referencedCodes = new Set(
    uniqueSteps.flatMap((step) => step.prerequisiteStepCodes),
  );
  const leafCodes = uniqueSteps
    .filter((step) => !referencedCodes.has(step.code))
    .map((step) => step.code);
  const startTargets = new Set(
    terminalEdges
      .filter((edge) => edge.source === WORKFLOW_START_NODE_ID)
      .map((edge) => edge.target),
  );
  const endSources = new Set(
    terminalEdges
      .filter((edge) => edge.target === WORKFLOW_END_NODE_ID)
      .map((edge) => edge.source),
  );
  const missingRootConnections = rootCodes.filter((code) => !startTargets.has(code));
  const invalidStartTargets = [...startTargets].filter(
    (code) => code !== WORKFLOW_END_NODE_ID && !rootCodes.includes(code),
  );
  if (missingRootConnections.length > 0 || invalidStartTargets.length > 0) {
    issues.push({
      code: 'start_boundary_mismatch',
      severity: 'error',
      message: `Bắt đầu phải nối trực tiếp tới mọi bước gốc. Thiếu: ${missingRootConnections.join(', ') || 'không'}; nối sai: ${invalidStartTargets.join(', ') || 'không'}.`,
      nodeCodes: [WORKFLOW_START_NODE_ID, ...missingRootConnections, ...invalidStartTargets],
    });
  }
  const missingLeafConnections = leafCodes.filter((code) => !endSources.has(code));
  const invalidEndSources = [...endSources].filter(
    (code) => code !== WORKFLOW_START_NODE_ID && !leafCodes.includes(code),
  );
  if (missingLeafConnections.length > 0 || invalidEndSources.length > 0) {
    issues.push({
      code: 'end_boundary_mismatch',
      severity: 'error',
      message: `Mọi bước cuối phải nối trực tiếp tới Kết thúc. Thiếu: ${missingLeafConnections.join(', ') || 'không'}; nối sai: ${invalidEndSources.join(', ') || 'không'}.`,
      nodeCodes: [WORKFLOW_END_NODE_ID, ...missingLeafConnections, ...invalidEndSources],
    });
  }

  const reachableFromStart = hasStartNode
    ? visitGraph(adjacency, WORKFLOW_START_NODE_ID)
    : new Set<string>();
  const canReachEnd = hasEndNode
    ? visitGraph(reversed, WORKFLOW_END_NODE_ID)
    : new Set<string>();
  const unreachableCodes = hasStartNode
    ? stepCodes.filter((code) => !reachableFromStart.has(code))
    : [];
  const withoutPathToEnd = hasEndNode
    ? stepCodes.filter((code) => !canReachEnd.has(code))
    : [];

  if (unreachableCodes.length > 0) {
    issues.push({
      code: 'unreachable_from_start',
      severity: 'error',
      message: `Các bước chưa có đường đi từ Bắt đầu: ${unreachableCodes.join(', ')}.`,
      nodeCodes: unreachableCodes,
    });
  }

  if (withoutPathToEnd.length > 0) {
    issues.push({
      code: 'cannot_reach_end',
      severity: 'error',
      message: `Các bước chưa có đường đi tới Kết thúc: ${withoutPathToEnd.join(', ')}.`,
      nodeCodes: withoutPathToEnd,
    });
  }

  uniqueSteps.forEach((step) => {
    const outgoingCodes = [...(adjacency.get(step.code) ?? [])];

    if (isDecisionStep(step)) {
      if (outgoingCodes.length < 2) {
        issues.push({
          code: 'decision_without_branches',
          severity: 'error',
          message: `Điểm quyết định “${step.name}” cần ít nhất hai nhánh đi ra.`,
          nodeCodes: [step.code],
        });
      }

      const branchCodesWithoutCondition = outgoingCodes
        .filter((code) => code !== WORKFLOW_END_NODE_ID)
        .filter((code) => !hasCondition(stepByCode.get(code)));
      if (branchCodesWithoutCondition.length > 0) {
        issues.push({
          code: 'decision_branch_without_condition',
          severity: 'warning',
          message: `Nhánh ra từ “${step.name}” chưa có điều kiện rõ ràng: ${branchCodesWithoutCondition.join(', ')}.`,
          nodeCodes: [step.code, ...branchCodesWithoutCondition],
        });
      }
    }

    if (step.mandatory && !String(step.requiredOutput ?? '').trim()) {
      issues.push({
        code: 'mandatory_output_missing',
        severity: 'warning',
        message: `Bước bắt buộc “${step.name}” chưa định nghĩa kết quả cần bàn giao.`,
        nodeCodes: [step.code],
      });
    }

    if (
      CLINICAL_TASK_TYPES.has(String(step.taskType ?? '').toLowerCase()) &&
      !String(step.location ?? '').trim()
    ) {
      issues.push({
        code: 'clinical_location_missing',
        severity: 'warning',
        message: `Bước lâm sàng “${step.name}” chưa có địa điểm thực hiện.`,
        nodeCodes: [step.code],
      });
    }
  });

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    reachableNodeCodes: stepCodes.filter((code) => reachableFromStart.has(code)),
    nodesWithoutPathToEnd: withoutPathToEnd,
  };
}

/**
 * Returns a deterministic topological walk for structural simulation.
 * Parallel branches are intentionally visited in authoring order; this is not
 * a clinical rule evaluator and must not guess which conditional branch wins.
 */
export function buildWorkflowSimulationSequence(input: WorkflowValidationInput): string[] {
  const report = validateWorkflowGraph(input);
  if (!report.valid) {
    return [];
  }

  const stepCodes = input.steps.map((step) => step.code);
  const allNodeCodes = [
    ...(input.hasStartNode ? [WORKFLOW_START_NODE_ID] : []),
    ...stepCodes,
    ...(input.hasEndNode ? [WORKFLOW_END_NODE_ID] : []),
  ];
  const order = new Map(allNodeCodes.map((code, index) => [code, index]));
  const adjacency = new Map<string, Set<string>>();
  const indegree = new Map(allNodeCodes.map((code) => [code, 0]));

  const registerEdge = (source: string, target: string) => {
    const existing = adjacency.get(source);
    if (existing?.has(target)) {
      return;
    }
    addEdge(adjacency, source, target);
    indegree.set(target, (indegree.get(target) ?? 0) + 1);
  };

  input.steps.forEach((step) => {
    step.prerequisiteStepCodes.forEach((source) => registerEdge(source, step.code));
  });
  input.terminalEdges.forEach((edge) => registerEdge(edge.source, edge.target));

  const ready = allNodeCodes
    .filter((code) => (indegree.get(code) ?? 0) === 0)
    .sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
  const sequence: string[] = [];

  while (ready.length > 0) {
    const current = ready.shift();
    if (!current) {
      continue;
    }
    sequence.push(current);

    for (const target of adjacency.get(current) ?? []) {
      const nextIndegree = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, nextIndegree);
      if (nextIndegree === 0) {
        ready.push(target);
        ready.sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
      }
    }
  }

  return sequence.length === allNodeCodes.length ? sequence : [];
}
