import { appointmentCheckInTokenRepository, appointmentRepository, auditRepository, encounterRepository, queueRepository } from '../repositories';
import { nextId } from '../core/ids';
import type { AppointmentCheckInToken, QueueTicket } from '../core/entities';
import type { UserId } from '../core/ids';

const SIGNING_KEY = 'dermahealth-prototype-v1';
const hash = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).padStart(7, '0');
};
const signedToken = (appointmentId: string, patientId: string, version: number) => {
  const ref = `${appointmentId}.${version}.${hash(patientId)}`;
  return `DH1.${ref}.${hash(`${ref}.${SIGNING_KEY}`)}`;
};
const appointmentTime = (date: string, time: string) => {
  const [d, m, y] = date.split('/').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
};

function issueToken(appointmentId: string, actorId: UserId): AppointmentCheckInToken {
  const appointment = appointmentRepository.getById(appointmentId);
  if (!appointment?.encounterId) throw new Error('Lịch hẹn chưa có lượt khám dự kiến.');
  const current = appointmentCheckInTokenRepository.getAll().filter((t) => t.appointmentId === appointment.id && t.status === 'active');
  current.forEach((t) => appointmentCheckInTokenRepository.upsert({ ...t, status: 'replaced', revokedAt: new Date().toISOString(), revokedReason: 'Đã phát hành mã QR mới' }));
  const version = Math.max(0, ...appointmentCheckInTokenRepository.getAll().filter((t) => t.appointmentId === appointment.id).map((t) => t.version)) + 1;
  const raw = signedToken(appointment.id, appointment.patientId, version);
  const at = appointmentTime(appointment.date, appointment.time);
  const token: AppointmentCheckInToken = {
    id: nextId('QRT'), appointmentId: appointment.id, patientId: appointment.patientId,
    plannedEncounterId: appointment.encounterId, clinicLocationId: appointment.clinicLocationId ?? 'CS-HCM-01',
    token: raw, tokenHash: hash(raw), issuedAt: new Date().toISOString(),
    validFrom: new Date(at.getTime() - 4 * 60 * 60_000).toISOString(),
    expiresAt: new Date(at.getTime() + 12 * 60 * 60_000).toISOString(), status: 'active', version,
  };
  appointmentCheckInTokenRepository.upsert(token);
  log(actorId, 'QR_ISSUED', token.id, token.patientId, token.plannedEncounterId, 'info');
  return token;
}

function log(actorId: UserId, action: string, entityId: string, patientId?: string, encounterId?: string, severity: 'info' | 'warning' = 'info') {
  auditRepository.upsert({ id: nextId('AUD'), at: new Date().toISOString(), actorId, actorName: actorId, role: actorId === 'U-0005' ? 'patient' : 'receptionist', action, entityType: 'AppointmentCheckInToken', entityId, patientId, encounterId, sourceModule: 'QRCheckIn', severity });
}

export interface CheckInInput { token: string; clinicLocationId: string; deviceId: string; actorId: UserId; patientId?: string; allowOutsideWindow?: boolean }
export type CheckInResult = { ok: true; ticket: QueueTicket; repeated: boolean } | { ok: false; message: string };

function checkIn(input: CheckInInput): CheckInResult {
  const record = appointmentCheckInTokenRepository.getAll().find((t) => t.token === input.token && t.tokenHash === hash(input.token));
  if (!record) { log(input.actorId, 'QR_VALIDATION_FAILED', 'unknown', undefined, undefined, 'warning'); return { ok: false, message: 'Mã QR không hợp lệ hoặc đã hết hiệu lực.' }; }
  const existing = queueRepository.getAll().find((q) => q.appointmentId === record.appointmentId && q.status !== 'completed');
  if (existing && record.status === 'used') { log(input.actorId, 'QR_RESCAN_IDEMPOTENT', record.id, record.patientId, record.plannedEncounterId); return { ok: true, ticket: existing, repeated: true }; }
  const appointment = appointmentRepository.getById(record.appointmentId);
  const now = Date.now();
  const invalid = record.status !== 'active' || !appointment || appointment.status !== 'upcoming' || record.clinicLocationId !== input.clinicLocationId || (input.patientId && input.patientId !== record.patientId) || (!input.allowOutsideWindow && (now < Date.parse(record.validFrom) || now > Date.parse(record.expiresAt)));
  if (invalid) { log(input.actorId, 'QR_VALIDATION_FAILED', record.id, undefined, undefined, 'warning'); return { ok: false, message: 'Mã QR không hợp lệ hoặc đã hết hiệu lực.' }; }
  const waiting = queueRepository.getAll().filter((q) => q.department === (appointment.department ?? 'Khoa Da liễu') && ['waiting', 'called'].includes(q.status));
  const sequence = Math.max(0, ...queueRepository.getAll().map((q) => Number(q.number.replace(/\D/g, '')) || 0)) + 1;
  const ticket: QueueTicket = {
    id: nextId('QUEUE'), appointmentId: appointment.id, patientId: appointment.patientId, encounterId: record.plannedEncounterId,
    number: `D${String(sequence).padStart(3, '0')}`, department: appointment.department ?? 'Khoa Da liễu', serviceStation: 'Quầy khám Da liễu',
    room: 'Phòng 204', waitingArea: 'Khu chờ A, tầng 2', priority: 'normal', status: 'waiting', issuedAt: new Date().toISOString(),
    peopleAhead: waiting.length, estimatedWaitMinutes: waiting.length * 12 + 5,
    preparationInstructions: ['Giữ điện thoại ở chế độ có âm thanh', 'Chuẩn bị giấy tờ tùy thân và hồ sơ liên quan'],
  };
  queueRepository.upsert(ticket);
  appointmentCheckInTokenRepository.upsert({ ...record, status: 'used', usedAt: new Date().toISOString(), usedByDeviceId: input.deviceId });
  const encounter = encounterRepository.getById(record.plannedEncounterId);
  if (encounter) encounterRepository.upsert({ ...encounter, queueNumber: sequence, peopleAheadInQueue: ticket.peopleAhead, estimatedWaitMinutes: ticket.estimatedWaitMinutes, room: ticket.room, updatedAt: new Date().toISOString(), events: [...encounter.events, { id: nextId('EV'), at: new Date().toISOString(), label: 'Đã check-in bằng mã QR', kind: 'success' }] });
  log(input.actorId, 'QR_CHECK_IN_SUCCEEDED', record.id, record.patientId, record.plannedEncounterId);
  return { ok: true, ticket, repeated: false };
}

function revoke(appointmentId: string, reason: string, actorId: UserId) {
  appointmentCheckInTokenRepository.getAll().filter((t) => t.appointmentId === appointmentId && t.status === 'active').forEach((t) => {
    appointmentCheckInTokenRepository.upsert({ ...t, status: 'revoked', revokedAt: new Date().toISOString(), revokedReason: reason });
    log(actorId, 'QR_REVOKED', t.id, t.patientId, t.plannedEncounterId);
  });
}

export const checkInService = { issueToken, checkIn, revoke, hash };
