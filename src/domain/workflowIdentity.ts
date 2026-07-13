import type { WorkflowInstance } from './core/entities';
import type { EncounterId, PatientId, WorkflowInstanceId, WorkflowTemplateVersionId } from './core/ids';

export interface WorkflowIdentityInput {
  instanceId: WorkflowInstanceId;
  patientId: PatientId;
  encounterId: EncounterId;
  templateVersionId: WorkflowTemplateVersionId;
  activatedAt: string;
}

const IDENTITY_VERSION = 1;

/** Deterministic frontend seal. The backend must replace this with an HMAC
 * generated and verified server-side; this prototype deliberately keeps the
 * interface and payload stable so that migration is mechanical. */
function hashPayload(payload: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function canonicalPayload(input: WorkflowIdentityInput): string {
  return [IDENTITY_VERSION, input.instanceId, input.patientId, input.encounterId, input.templateVersionId, input.activatedAt].join('|');
}

export function createWorkflowIdentity(input: WorkflowIdentityInput) {
  const date = input.activatedAt.slice(0, 10).replaceAll('-', '') || '00000000';
  const suffix = input.instanceId.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase();
  return {
    patientId: input.patientId,
    instanceCode: `QT-${date}-${suffix}`,
    integrityHash: `WF1-${hashPayload(canonicalPayload(input))}`,
    identityVersion: IDENTITY_VERSION,
  };
}

export function verifyWorkflowIdentity(instance: WorkflowInstance): boolean {
  const expected = createWorkflowIdentity({
    instanceId: instance.id,
    patientId: instance.patientId,
    encounterId: instance.encounterId,
    templateVersionId: instance.templateVersionId,
    activatedAt: instance.activatedAt,
  });
  return instance.identityVersion === IDENTITY_VERSION && instance.integrityHash === expected.integrityHash;
}
