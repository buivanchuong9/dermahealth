import { encounterRepository, clinicalOrderRepository } from '../repositories';
import { auditService } from './auditService';
import { encounterService } from './encounterService';
import { assertRole } from '../guards';
import { nextId } from '../core/ids';
import type { ClinicalOrder, ClinicalResult } from '../core/entities';
import type { EncounterId, ClinicalOrderId, UserId } from '../core/ids';

function createOrder(
  encounterId: EncounterId, doctorId: UserId,
  input: { type: ClinicalOrder['type']; justification: string; assignedRole: ClinicalOrder['assignedRole'] },
): ClinicalOrder {
  assertRole(doctorId, ['doctor']);
  const order: ClinicalOrder = { id: nextId('ORD'), encounterId, orderedByDoctorId: doctorId, status: 'requested', createdAt: new Date().toISOString(), ...input };
  clinicalOrderRepository.orders().upsert(order);
  const encounter = encounterRepository.getById(encounterId);
  if (encounter) {
    encounterRepository.upsert({ ...encounter, clinicalOrderIds: [...encounter.clinicalOrderIds, order.id] });
    if (encounterService.canTransition(encounter.status, 'awaiting_results')) {
      encounterService.transitionStatus(encounterId, 'awaiting_results', doctorId, { reason: `Chờ kết quả: ${input.type}` });
    }
  }
  auditService.log({ actorId: doctorId, action: 'CLINICAL_ORDER_CREATED', entityType: 'ClinicalOrder', entityId: order.id, patientId: encounter?.patientId, encounterId, sourceModule: 'ClinicalOrder', newState: 'requested' });
  return order;
}

function markInvalidSample(orderId: ClinicalOrderId, actorId: UserId, reason: string): ClinicalOrder {
  const order = clinicalOrderRepository.orders().getById(orderId);
  if (!order) throw new Error(`Không tìm thấy chỉ định ${orderId}`);
  const updated = clinicalOrderRepository.orders().upsert({ ...order, status: 'invalid_sample' });
  auditService.log({ actorId, action: 'ORDER_INVALID_SAMPLE', entityType: 'ClinicalOrder', entityId: orderId, reason, encounterId: order.encounterId, sourceModule: 'ClinicalOrder', severity: 'warning' });
  return updated;
}

function completeOrder(orderId: ClinicalOrderId, actorId: UserId, summary: string, abnormal: boolean): { order: ClinicalOrder; result: ClinicalResult } {
  const order = clinicalOrderRepository.orders().getById(orderId);
  if (!order) throw new Error(`Không tìm thấy chỉ định ${orderId}`);
  const result: ClinicalResult = { id: nextId('RES'), orderId, summary, abnormal, recordedAt: new Date().toISOString(), recordedBy: actorId };
  clinicalOrderRepository.results().upsert(result);
  const updatedOrder = clinicalOrderRepository.orders().upsert({ ...order, status: abnormal ? 'result_ready' : 'completed', resultId: result.id });
  auditService.log({ actorId, action: 'RESULT_RECORDED', entityType: 'ClinicalResult', entityId: result.id, reason: abnormal ? 'Kết quả bất thường' : undefined, encounterId: order.encounterId, sourceModule: 'ClinicalOrder', severity: abnormal ? 'warning' : 'info' });
  return { order: updatedOrder, result };
}

function listForEncounter(encounterId: EncounterId): ClinicalOrder[] {
  return clinicalOrderRepository.orders().getAll().filter((o) => o.encounterId === encounterId);
}

function getResult(resultId: string): ClinicalResult | undefined {
  return clinicalOrderRepository.results().getById(resultId);
}

export const clinicalOrderService = { createOrder, markInvalidSample, completeOrder, listForEncounter, getResult };
