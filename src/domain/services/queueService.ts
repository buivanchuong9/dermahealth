import { queueRepository } from '../repositories';
import { auditService } from './auditService';
import type { QueueTicket, QueueTicketStatus } from '../core/entities';
import type { UserId } from '../core/ids';

function update(id: string, status: QueueTicketStatus, actorId: UserId, extra: Partial<QueueTicket> = {}) {
  const ticket = queueRepository.getById(id);
  if (!ticket) throw new Error('Không tìm thấy số thứ tự.');
  const updated = queueRepository.upsert({ ...ticket, ...extra, status });
  auditService.log({ actorId, action: `QUEUE_${status.toUpperCase()}`, entityType: 'QueueTicket', entityId: id, patientId: ticket.patientId, encounterId: ticket.encounterId, previousState: ticket.status, newState: status, sourceModule: 'ClinicQueue' });
  return updated;
}
function callNext(department: string, actorId: UserId) {
  const rank = { urgent: 0, priority: 1, normal: 2 } as const;
  const ticket = queueRepository.getAll().filter((q) => q.department === department && q.status === 'waiting').sort((a, b) => rank[a.priority] - rank[b.priority] || a.issuedAt.localeCompare(b.issuedAt))[0];
  if (!ticket) throw new Error('Không còn bệnh nhân đang chờ.');
  return update(ticket.id, 'called', actorId, { calledAt: new Date().toISOString() });
}
export const queueService = {
  callNext,
  acknowledge: (id: string, actorId: UserId) => update(id, 'acknowledged', actorId, { acknowledgedAt: new Date().toISOString() }),
  startService: (id: string, actorId: UserId) => update(id, 'in_service', actorId, { serviceStartedAt: new Date().toISOString() }),
  skip: (id: string, actorId: UserId) => update(id, 'skipped', actorId),
  complete: (id: string, actorId: UserId, nextStation?: string) => update(id, nextStation ? 'routed' : 'completed', actorId, { completedAt: new Date().toISOString(), nextStation }),
};
