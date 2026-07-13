import { appointmentRepository, encounterRepository } from '../repositories';
import { auditService } from './auditService';
import { checkInService } from './checkInService';
import { notificationService } from './notificationService';
import { nextId } from '../core/ids';
import type { Appointment } from '../core/entities';
import type { PatientId, UserId } from '../core/ids';

function listForPatient(patientId: PatientId): Appointment[] {
  return appointmentRepository.getAll().filter((a) => a.patientId === patientId);
}

function listUpcoming(patientId: PatientId): Appointment[] {
  return listForPatient(patientId).filter((a) => a.status === 'upcoming');
}

function bookAppointment(input: { patientId: PatientId; doctorId: UserId; date: string; time: string; mode: 'video' | 'in_person'; clinicLocationId?: string; clinicName?: string; department?: string }, actorId: UserId): Appointment {
  const appointmentId = nextId('APT');
  const encounterId = nextId('ENC');
  const appt: Appointment = { id: appointmentId, encounterId, status: 'upcoming', consultationType: input.mode === 'video' ? 'Khám trực tuyến' : 'Khám tại phòng khám', ...input };
  appointmentRepository.upsert(appt);
  encounterRepository.upsert({ id: encounterId, patientId: input.patientId, appointmentId, type: input.mode === 'video' ? 'remote' : 'standard', origin: 'appointment', status: 'registered', department: input.department ?? 'Khoa Da liễu', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), currentDoctorId: input.doctorId, aiAssessmentIds: [], doctorReviewIds: [], diagnosisIds: [], clinicalOrderIds: [], events: [{ id: nextId('EV'), at: new Date().toISOString(), label: 'Đã tạo lượt khám dự kiến từ lịch hẹn', kind: 'info' }] });
  checkInService.issueToken(appt.id, actorId);
  notificationService.send({ event: 'appointment_qr_issued', recipientId: actorId, recipientRole: 'patient', channel: 'in_app', message: `Lịch hẹn ${appt.id} đã được xác nhận. Mã QR check-in đã sẵn sàng.`, relatedPatientId: input.patientId, relatedEncounterId: encounterId });
  auditService.log({ actorId, action: 'APPOINTMENT_BOOKED', entityType: 'Appointment', entityId: appt.id, patientId: input.patientId, sourceModule: 'Appointments', newState: 'upcoming' });
  return appt;
}

function markMissed(id: string): Appointment | undefined {
  const appt = appointmentRepository.getById(id);
  if (!appt) return undefined;
  const updated: Appointment = { ...appt, status: 'missed' };
  appointmentRepository.upsert(updated);
  return updated;
}

export const appointmentService = { listForPatient, listUpcoming, bookAppointment, markMissed };
