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

export async function listQueueTickets(): Promise<QueueTicket[]> {
  const rows = await http.get<ApiQueueTicket[]>("/api/v1/queue-tickets");
  return rows.map(mapQueueTicket);
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

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "";

export function subscribeQueueStream(
  onSnapshot: (tickets: QueueTicket[]) => void,
): () => void {
  const source = new EventSource(`${API_BASE_URL}/api/v1/queue/stream`, {
    withCredentials: true,
  });
  const handleSnapshot = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as
        | ApiQueueTicket[]
        | { data?: ApiQueueTicket[]; tickets?: ApiQueueTicket[] };
      const rows = Array.isArray(payload)
        ? payload
        : (payload.tickets ?? payload.data ?? []);
      onSnapshot(rows.map(mapQueueTicket));
    } catch {
      // Bỏ qua heartbeat hoặc snapshot không phải JSON.
    }
  };
  source.addEventListener("queue.snapshot", handleSnapshot as EventListener);
  return () => source.close();
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
