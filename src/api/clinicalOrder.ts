import { http } from './http';
import type { ClinicalOrderId, ClinicalResultId, EncounterId, UserId } from '../domain/core/ids';
import type { ClinicalOrder, ClinicalResult } from '../domain/core/entities';
import type { ClinicalOrderStatus } from '../domain/core/enums';

interface ClinicalOrderDto {
  id: string;
  encounterId: string;
  type: ClinicalOrder['type'];
  orderedByDoctorId: string;
  justification: string;
  status: ClinicalOrderStatus;
  assignedRole: ClinicalOrder['assignedRole'];
  invalidSampleReason?: unknown;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface ClinicalResultDto {
  id: string;
  orderId: string;
  summary: string;
  abnormal: boolean;
  critical?: boolean;
  criticalReason?: unknown;
  acknowledgedAt?: unknown;
  acknowledgedBy?: unknown;
  acknowledgementNote?: unknown;
  version?: number;
  recordedAt: string;
  recordedBy: string;
}

export interface CreateClinicalOrderRequest {
  type: ClinicalOrder['type'];
  justification: string;
  assignedRole: ClinicalOrder['assignedRole'];
}

export interface MarkInvalidSampleRequest {
  reason: string;
  version: number;
}

export interface RecordClinicalResultRequest {
  summary: string;
  abnormal: boolean;
  critical?: boolean;
  criticalReason?: string;
  version: number;
}

const mapOrder = (dto: ClinicalOrderDto): ClinicalOrder => ({
  id: dto.id as ClinicalOrderId,
  encounterId: dto.encounterId as EncounterId,
  type: dto.type,
  orderedByDoctorId: dto.orderedByDoctorId as UserId,
  justification: dto.justification,
  status: dto.status,
  assignedRole: dto.assignedRole,
  invalidSampleReason: typeof dto.invalidSampleReason === 'string' ? dto.invalidSampleReason : undefined,
  version: dto.version,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});

const mapResult = (dto: ClinicalResultDto): ClinicalResult => ({
  id: dto.id as ClinicalResultId,
  orderId: dto.orderId as ClinicalOrderId,
  summary: dto.summary,
  abnormal: dto.abnormal,
  critical: dto.critical ?? false,
  criticalReason: typeof dto.criticalReason === 'string' ? dto.criticalReason : undefined,
  acknowledgedAt: typeof dto.acknowledgedAt === 'string' ? dto.acknowledgedAt : undefined,
  acknowledgedBy: typeof dto.acknowledgedBy === 'string' ? dto.acknowledgedBy as UserId : undefined,
  acknowledgementNote: typeof dto.acknowledgementNote === 'string' ? dto.acknowledgementNote : undefined,
  version: dto.version ?? 1,
  recordedAt: dto.recordedAt,
  recordedBy: dto.recordedBy as UserId,
});

const orderPath = (orderId: string) =>
  `/api/v1/clinical-orders/${encodeURIComponent(orderId)}`;

export const createClinicalOrder = async (
  encounterId: string,
  body: CreateClinicalOrderRequest,
) =>
  mapOrder(
    await http.post<ClinicalOrderDto>(
      `/api/v1/encounters/${encodeURIComponent(encounterId)}/clinical-orders`,
      body,
    ),
  );

export const getEncounterClinicalOrders = async (encounterId: string) =>
  (
    await http.get<ClinicalOrderDto[]>(
      `/api/v1/encounters/${encodeURIComponent(encounterId)}/clinical-orders`,
    )
  ).map(mapOrder);

export const listAssignedClinicalOrders = async () =>
  (await http.get<ClinicalOrderDto[]>('/api/v1/clinical-orders')).map(mapOrder);

export const markClinicalOrderInvalidSample = async (
  orderId: string,
  body: MarkInvalidSampleRequest,
) => mapOrder(await http.patch<ClinicalOrderDto>(`${orderPath(orderId)}/invalid-sample`, body));

export const recordClinicalOrderResult = async (
  orderId: string,
  body: RecordClinicalResultRequest,
) => mapResult(await http.post<ClinicalResultDto>(`${orderPath(orderId)}/result`, body));

export const getClinicalOrderResult = async (orderId: string) =>
  mapResult(await http.get<ClinicalResultDto>(`${orderPath(orderId)}/result`));

export const acknowledgeCriticalClinicalResult = async (
  orderId: string,
  body: { note: string; version: number },
) => mapResult(await http.post<ClinicalResultDto>(
  `${orderPath(orderId)}/result/acknowledgements`,
  body,
));
