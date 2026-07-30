import { http } from "./http";

export type LifetimeRecordEventType =
  | "encounter"
  | "diagnosis"
  | "procedure"
  | "prescription"
  | "laboratory"
  | "imaging"
  | "vaccination"
  | "allergy"
  | "document"
  | "care_plan";

export interface LifetimeRecordSource {
  organizationId: string;
  organizationName: string;
  facilityId?: string | null;
  facilityName?: string | null;
  province?: string | null;
  system?: string | null;
}

export interface LifetimeRecordClinicalItem {
  id: string;
  code?: string | null;
  display: string;
  status?: string | null;
  value?: string | null;
  note?: string | null;
}

export interface LifetimeRecordEvent {
  id: string;
  occurredAt: string;
  endedAt?: string | null;
  type: LifetimeRecordEventType;
  title: string;
  summary?: string | null;
  status?: string | null;
  specialty?: string | null;
  practitionerName?: string | null;
  source: LifetimeRecordSource;
  diagnoses: LifetimeRecordClinicalItem[];
  medications: LifetimeRecordClinicalItem[];
  orders: LifetimeRecordClinicalItem[];
  results: LifetimeRecordClinicalItem[];
  procedures: LifetimeRecordClinicalItem[];
  documents: Array<{
    id: string;
    title: string;
    contentType?: string | null;
    signedAt?: string | null;
    downloadUrl?: string | null;
  }>;
  provenance: {
    sourceRecordId: string;
    sourceSystem?: string | null;
    importedAt?: string | null;
    lastVerifiedAt?: string | null;
    integrityHash?: string | null;
  };
}

export interface LifetimeMedicalRecord {
  patient: {
    id: string;
    nationalHealthId?: string | null;
    code: string;
    name: string;
    dob?: string | null;
    gender?: string | null;
    bloodType?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
  };
  summary: {
    encounterCount: number;
    organizationCount: number;
    facilityCount: number;
    firstRecordedAt?: string | null;
    lastRecordedAt?: string | null;
    activeConditions: LifetimeRecordClinicalItem[];
    allergies: LifetimeRecordClinicalItem[];
    currentMedications: LifetimeRecordClinicalItem[];
  };
  events: LifetimeRecordEvent[];
  page: number;
  limit: number;
  total: number;
  synchronizedAt: string;
}

const patientLifetimePath = (patientId: string) =>
  `/api/v1/patients/${encodeURIComponent(patientId)}/lifetime-medical-record`;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const asNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const EVENT_TYPES = new Set<LifetimeRecordEventType>([
  "encounter",
  "diagnosis",
  "procedure",
  "prescription",
  "laboratory",
  "imaging",
  "vaccination",
  "allergy",
  "document",
  "care_plan",
]);

const mapClinicalItem = (value: unknown): LifetimeRecordClinicalItem => {
  const item = asObject(value);
  return {
    id: asString(item.id),
    code: asNullableString(item.code),
    display: asString(item.display, "Chưa có mô tả"),
    status: asNullableString(item.status),
    value: asNullableString(item.value),
    note: asNullableString(item.note),
  };
};

const mapEvent = (value: unknown): LifetimeRecordEvent => {
  const event = asObject(value);
  const source = asObject(event.source);
  const provenance = asObject(event.provenance);
  const rawType = asString(event.type, "encounter") as LifetimeRecordEventType;
  return {
    id: asString(event.id),
    occurredAt: asString(event.occurredAt),
    endedAt: asNullableString(event.endedAt),
    type: EVENT_TYPES.has(rawType) ? rawType : "encounter",
    title: asString(event.title, "Sự kiện khám chữa bệnh"),
    summary: asNullableString(event.summary),
    status: asNullableString(event.status),
    specialty: asNullableString(event.specialty),
    practitionerName: asNullableString(event.practitionerName),
    source: {
      organizationId: asString(source.organizationId),
      organizationName: asString(source.organizationName, "Đơn vị y tế"),
      facilityId: asNullableString(source.facilityId),
      facilityName: asNullableString(source.facilityName),
      province: asNullableString(source.province),
      system: asNullableString(source.system),
    },
    diagnoses: asArray(event.diagnoses).map(mapClinicalItem),
    medications: asArray(event.medications).map(mapClinicalItem),
    orders: asArray(event.orders).map(mapClinicalItem),
    results: asArray(event.results).map(mapClinicalItem),
    procedures: asArray(event.procedures).map(mapClinicalItem),
    documents: asArray(event.documents).map((value) => {
      const document = asObject(value);
      return {
        id: asString(document.id),
        title: asString(document.title, "Tài liệu lâm sàng"),
        contentType: asNullableString(document.contentType),
        signedAt: asNullableString(document.signedAt),
        downloadUrl: asNullableString(document.downloadUrl),
      };
    }),
    provenance: {
      sourceRecordId: asString(provenance.sourceRecordId),
      sourceSystem: asNullableString(provenance.sourceSystem),
      importedAt: asNullableString(provenance.importedAt),
      lastVerifiedAt: asNullableString(provenance.lastVerifiedAt),
      integrityHash: asNullableString(provenance.integrityHash),
    },
  };
};

const mapLifetimeMedicalRecord = (value: unknown): LifetimeMedicalRecord => {
  const root = asObject(value);
  const patient = asObject(root.patient);
  const summary = asObject(root.summary);
  return {
    patient: {
      id: asString(patient.id),
      nationalHealthId: asNullableString(patient.nationalHealthId),
      code: asString(patient.code),
      name: asString(patient.name),
      dob: asNullableString(patient.dob),
      gender: asNullableString(patient.gender),
      bloodType: asNullableString(patient.bloodType),
      phone: asNullableString(patient.phone),
      email: asNullableString(patient.email),
      address: asNullableString(patient.address),
      heightCm:
        typeof patient.heightCm === "number" && Number.isFinite(patient.heightCm)
          ? patient.heightCm
          : null,
      weightKg:
        typeof patient.weightKg === "number" && Number.isFinite(patient.weightKg)
          ? patient.weightKg
          : null,
    },
    summary: {
      encounterCount: asNumber(summary.encounterCount),
      organizationCount: asNumber(summary.organizationCount),
      facilityCount: asNumber(summary.facilityCount),
      firstRecordedAt: asNullableString(summary.firstRecordedAt),
      lastRecordedAt: asNullableString(summary.lastRecordedAt),
      activeConditions: asArray(summary.activeConditions).map(mapClinicalItem),
      allergies: asArray(summary.allergies).map(mapClinicalItem),
      currentMedications: asArray(summary.currentMedications).map(mapClinicalItem),
    },
    events: asArray(root.events).map(mapEvent),
    page: asNumber(root.page),
    limit: asNumber(root.limit),
    total: asNumber(root.total),
    synchronizedAt: asString(root.synchronizedAt),
  };
};

/** v2.7.1 currently supports only the patientId path parameter. Filtering is
 * intentionally performed by the UI until the backend publishes query params. */
export async function getLifetimeMedicalRecord(
  patientId: string,
): Promise<LifetimeMedicalRecord> {
  const raw = await http.get<unknown>(patientLifetimePath(patientId));
  return mapLifetimeMedicalRecord(raw);
}

export interface CreateExternalRecordImportRequest {
  sourceOrganizationId: string;
  sourceFacilityId?: string;
  sourceSystem: string;
  externalPatientId: string;
  consentId: string;
  records: Array<{
    resourceType: string;
    externalId: string;
    occurredAt: string;
    payload: Record<string, unknown>;
    integrityHash?: string;
  }>;
}

export const importExternalLifetimeRecords = (
  patientId: string,
  body: CreateExternalRecordImportRequest,
) =>
  http.post<{ importJobId: string; accepted: number; rejected: number }>(
    `${patientLifetimePath(patientId)}/imports`,
    body,
  );

export interface ShareLifetimeRecordRequest {
  recipientOrganizationId: string;
  recipientPractitionerId?: string;
  purpose: "treatment" | "referral" | "emergency" | "patient_request";
  eventIds?: string[];
  expiresAt: string;
  consentId: string;
}

export const shareLifetimeMedicalRecord = (
  patientId: string,
  body: ShareLifetimeRecordRequest,
) =>
  http.post<{ shareId: string; accessUrl: string; expiresAt: string }>(
    `${patientLifetimePath(patientId)}/shares`,
    body,
  );
