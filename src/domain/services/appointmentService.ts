import { appointmentRepository } from '../repositories';
import { auditService } from './auditService';
import { nextId } from '../core/ids';
import type { Appointment } from '../core/entities';
import type { PatientId, UserId } from '../core/ids';

function listForPatient(patientId: PatientId): Appointment[] {
  return appointmentRepository.getAll().filter((a) => a.patientId === patientId);
}

function listUpcoming(patientId: PatientId): Appointment[] {
  return listForPatient(patientId).filter((a) => a.status === 'upcoming');
}

function bookAppointment(input: { patientId: PatientId; doctorId: UserId; date: string; time: string; mode: 'video' | 'in_person' }, actorId: UserId): Appointment {
  const appt: Appointment = { id: nextId('APT'), status: 'upcoming', ...input };
  appointmentRepository.upsert(appt);
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
