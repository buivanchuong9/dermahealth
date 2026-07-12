import { patientRepository, userRepository, consentRepository } from '../repositories';
import { nextId } from '../core/ids';
import type { Patient, User, Consent } from '../core/entities';
import type { PatientId } from '../core/ids';

/** This is a single-tenant prototype: there is exactly one patient in the seed data. */
function getCurrentPatient(): Patient {
  const patient = patientRepository.getAll()[0];
  if (!patient) throw new Error('Không có bệnh nhân nào trong dữ liệu mẫu');
  return patient;
}

function getPatient(id: PatientId): Patient | undefined {
  return patientRepository.getById(id);
}

function getPrimaryDoctor(patient: Patient): User | undefined {
  return userRepository.getById(patient.primaryDoctorId);
}

function getUser(id: string): User | undefined {
  return userRepository.getById(id);
}

function listUsersByRole(role: User['role']): User[] {
  return userRepository.getAll().filter((u) => u.role === role);
}

function listConsents(patientId: PatientId): Consent[] {
  return consentRepository.getAll().filter((c) => c.patientId === patientId);
}

function setConsent(patientId: PatientId, type: string, granted: boolean): Consent {
  const existing = consentRepository.getAll().find((c) => c.patientId === patientId && c.type === type);
  const now = new Date().toISOString();
  const consent: Consent = existing
    ? { ...existing, granted, grantedAt: granted ? now : existing.grantedAt, withdrawnAt: granted ? undefined : now }
    : { id: nextId('CONSENT'), patientId, type, granted, grantedAt: granted ? now : undefined, withdrawnAt: granted ? undefined : now };
  return consentRepository.upsert(consent);
}

export const patientService = { getCurrentPatient, getPatient, getPrimaryDoctor, getUser, listUsersByRole, listConsents, setConsent };
