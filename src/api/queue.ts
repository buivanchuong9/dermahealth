import type { QueueTicket } from "../domain/core/entities";
import { http } from "./http";

export interface ApiQueueTicket {
  id: string;
  appointmentId: string | null;
  patientId: string;
  encounterId: string | null;
  checkInId: string | null;
  sourceType: QueueTicket["sourceType"];
  clinicDate: string;
  number: string;
  department: string;
  serviceStation: string;
  room: string | null;
  waitingArea: string;
  priority: QueueTicket["priority"];
  status: QueueTicket["status"];
  issuedAt: string;
  calledAt: string | null;
  acknowledgedAt: string | null;
  serviceStartedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  preparationInstructions: string[];
  nextStation: string | null;
  version: number;
}

export interface QueueStationSnapshot {
  serviceStation: string;
  waiting: number;
  called: number;
  inService: number;
}

export const mapQueueTicket = (row: ApiQueueTicket): QueueTicket => ({
  id: row.id,
  appointmentId: row.appointmentId as QueueTicket["appointmentId"],
  patientId: row.patientId as QueueTicket["patientId"],
  encounterId: row.encounterId as QueueTicket["encounterId"],
  checkInId: row.checkInId,
  sourceType: row.sourceType,
  clinicDate: row.clinicDate,
  number: row.number,
  department: row.department,
  serviceStation: row.serviceStation,
  room: row.room ?? undefined,
  waitingArea: row.waitingArea,
  priority: row.priority,
  status: row.status,
  issuedAt: row.issuedAt,
  calledAt: row.calledAt ?? undefined,
  acknowledgedAt: row.acknowledgedAt ?? undefined,
  serviceStartedAt: row.serviceStartedAt ?? undefined,
  completedAt: row.completedAt ?? undefined,
  skippedAt: row.skippedAt ?? undefined,
  cancelledAt: row.cancelledAt ?? undefined,
  noShowAt: row.noShowAt ?? undefined,
  peopleAhead: row.peopleAhead,
  estimatedWaitMinutes: row.estimatedWaitMinutes,
  preparationInstructions: row.preparationInstructions,
  nextStation: row.nextStation ?? undefined,
  version: row.version,
});

export async function listQueueTickets(params?: {
  clinicLocationId?: string;
  clinicDate?: string;
  department?: string;
  status?: QueueTicket["status"];
}): Promise<QueueTicket[]> {
  const query = new URLSearchParams();
  if (params?.clinicLocationId) query.set("clinicLocationId", params.clinicLocationId);
  if (params?.clinicDate) query.set("clinicDate", params.clinicDate);
  if (params?.department) query.set("department", params.department);
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const rows = await http.get<ApiQueueTicket[]>(`/api/v1/queue-tickets${qs ? `?${qs}` : ""}`);
  return rows.map(mapQueueTicket);
}

/**
 * Keep server rows authoritative. Local rows are preserved only when the
 * server snapshot is empty (transient failure) to avoid clearing the screen.
 */
export function mergeQueueTicketSnapshot(
  serverRows: QueueTicket[],
  localRows: QueueTicket[],
): QueueTicket[] {
  if (serverRows.length === 0) return localRows;
  const merged = new Map(serverRows.map((item) => [item.id, item] as const));
  return [...merged.values()];
}

export async function callNextQueueTicket(payload: {
  clinicLocationId: string;
  department?: string;
}): Promise<QueueTicket> {
  const row = await http.post<ApiQueueTicket>(
    "/api/v1/queue-tickets/calls",
    payload,
  );
  return mapQueueTicket(row);
}

export async function createWalkInQueueTicket(payload: {
  clinicLocationId: string;
  serviceCode: string;
  fullName: string;
  phone: string;
  note?: string;
}): Promise<QueueTicket> {
  const row = await http.post<ApiQueueTicket>(
    "/api/v1/queue-tickets/walk-ins",
    payload,
    { auth: false },
  );
  return mapQueueTicket(row);
}

async function updateQueueTicket(
  ticketId: string,
  action:
    | "acknowledgements"
    | "service-starts"
    | "skips"
    | "return-to-queue"
    | "cancellations"
    | "no-shows"
    | "completions",
  payload: { version: number; nextStation?: string },
): Promise<QueueTicket> {
  const row = await http.post<ApiQueueTicket>(
    `/api/v1/queue-tickets/${encodeURIComponent(ticketId)}/${action}`,
    payload,
  );
  return mapQueueTicket(row);
}

export const acknowledgeQueueTicket = (ticketId: string, version: number) =>
  updateQueueTicket(ticketId, "acknowledgements", { version });

export const startQueueTicketService = (ticketId: string, version: number) =>
  updateQueueTicket(ticketId, "service-starts", { version });

export const skipQueueTicket = (ticketId: string, version: number) =>
  updateQueueTicket(ticketId, "skips", { version });

export const returnQueueTicketToQueue = (ticketId: string, version: number) =>
  updateQueueTicket(ticketId, "return-to-queue", { version });

export const cancelQueueTicket = (ticketId: string, version: number) =>
  updateQueueTicket(ticketId, "cancellations", { version });

export const noShowQueueTicket = (ticketId: string, version: number) =>
  updateQueueTicket(ticketId, "no-shows", { version });

export const completeQueueTicket = (
  ticketId: string,
  payload: { version: number; nextStation?: string },
) => updateQueueTicket(ticketId, "completions", payload);

export const listQueueStations = (clinicLocationId: string) => {
  const query = new URLSearchParams({ clinicLocationId });
  return http.get<QueueStationSnapshot[]>(`/api/v1/queue-stations?${query}`);
};

export function subscribeQueueStream(
  onSnapshot: (tickets: QueueTicket[]) => void,
  params?: { clinicLocationId?: string; clinicDate?: string },
): () => void {
  // Native EventSource cannot send an Authorization header.
  // Poll through the authenticated HTTP client at 5-second intervals.
  let active = true;
  let inFlight = false;
  const refresh = async () => {
    if (!active || inFlight) return;
    inFlight = true;
    try {
      onSnapshot(await listQueueTickets(params));
    } catch {
      // Boot already loads a snapshot. A transient refresh failure must not
      // clear the queue or interrupt unrelated clinical work.
    } finally {
      inFlight = false;
    }
  };
  void refresh();
  const timer = window.setInterval(() => void refresh(), 5_000);
  return () => {
    active = false;
    window.clearInterval(timer);
  };
}

// Legacy compatibility shims — kept for backward compat during transition.
export const getQueueLegacy = () => http.get<string>("/api/v1/queue");
export const getQueueStationsLegacy = (clinicLocationId: string) => {
  const query = new URLSearchParams({ clinicLocationId });
  return http.get<string>(`/api/v1/queue/stations?${query}`);
};
export const callNextQueueTicketLegacy = (payload: {
  department: string;
  clinicLocationId: string;
}) => http.post<string>("/api/v1/queue/call-next", payload);
export const acknowledgeQueueTicketLegacy = (id: string, version: number) =>
  http.post<string>(`/api/v1/queue/${encodeURIComponent(id)}/acknowledge`, { version });
export const startQueueTicketServiceLegacy = (id: string, version: number) =>
  http.post<string>(`/api/v1/queue/${encodeURIComponent(id)}/start-service`, { version });
export const skipQueueTicketLegacy = (id: string, version: number) =>
  http.post<string>(`/api/v1/queue/${encodeURIComponent(id)}/skip`, { version });
export const completeQueueTicketLegacy = (
  id: string,
  payload: { version: number; nextStation?: string },
) => http.post<string>(`/api/v1/queue/${encodeURIComponent(id)}/complete`, payload);
