import type { QueueTicket } from "../domain/core/entities";
import { http } from "./http";

export interface ApiQueueTicket {
  id: string;
  appointmentId: string;
  patientId: string;
  encounterId: string;
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
  peopleAhead: row.peopleAhead,
  estimatedWaitMinutes: row.estimatedWaitMinutes,
  preparationInstructions: row.preparationInstructions,
  nextStation: row.nextStation ?? undefined,
  version: row.version,
});

export async function listQueueTickets(
  clinicLocationId?: string,
): Promise<QueueTicket[]> {
  const query = clinicLocationId
    ? `?${new URLSearchParams({ clinicLocationId })}`
    : "";
  const rows = await http.get<ApiQueueTicket[]>(`/api/v1/queue-tickets${query}`);
  return rows.map(mapQueueTicket);
}

/**
 * Queue APIs can be scoped by role/location and may legitimately return an
 * empty partial snapshot. Keep recent active tickets created in this browser,
 * while allowing rows returned by the server to override local versions.
 */
export function mergeQueueTicketSnapshot(
  serverRows: QueueTicket[],
  localRows: QueueTicket[],
  now = Date.now(),
): QueueTicket[] {
  const recentCutoff = now - 12 * 60 * 60 * 1000;
  const preservedLocalRows = localRows.filter(
    (item) =>
      item.status !== "completed" &&
      new Date(item.issuedAt).getTime() >= recentCutoff,
  );
  const merged = new Map(
    preservedLocalRows.map((item) => [item.id, item] as const),
  );
  serverRows.forEach((item) => merged.set(item.id, item));
  return [...merged.values()];
}

export async function callNextQueueTicket(payload: {
  department: string;
  clinicLocationId: string;
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
  action: "acknowledgements" | "service-starts" | "skips" | "completions",
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
): () => void {
  // Native EventSource cannot send an Authorization header. Passing the
  // access token in the URL leaked it into browser history, reverse-proxy
  // logs and DevTools, and also failed strict query validation on the API.
  // Poll through the authenticated HTTP client until the backend exposes a
  // short-lived, one-time SSE subscription ticket.
  let active = true;
  let inFlight = false;
  const refresh = async () => {
    if (!active || inFlight) return;
    inFlight = true;
    try {
      onSnapshot(await listQueueTickets());
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

// API cũ trả về chuỗi; giữ client riêng để tương thích trong giai đoạn chuyển đổi.
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
  http.post<string>(`/api/v1/queue/${encodeURIComponent(id)}/acknowledge`, {
    version,
  });
export const startQueueTicketServiceLegacy = (id: string, version: number) =>
  http.post<string>(`/api/v1/queue/${encodeURIComponent(id)}/start-service`, {
    version,
  });
export const skipQueueTicketLegacy = (id: string, version: number) =>
  http.post<string>(`/api/v1/queue/${encodeURIComponent(id)}/skip`, {
    version,
  });
export const completeQueueTicketLegacy = (
  id: string,
  payload: { version: number; nextStation?: string },
) => http.post<string>(`/api/v1/queue/${encodeURIComponent(id)}/complete`, payload);
