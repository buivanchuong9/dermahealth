import { http } from './http';
import type {
  CallNextRequest,
  CompleteTicketRequest,
  GenericSuccessEnvelope,
  QueueStationSummaryResponseDto,
  QueueTicketResponseDto,
  TicketActionRequest,
} from './types';

// ── Queue Tickets: /api/v1/queue-tickets ──────────────────────────────────────

export async function listTickets(): Promise<{ success: true; data: QueueTicketResponseDto[]; meta: Record<string, any>; requestId: string }> {
  return http.get('/api/v1/queue-tickets');
}

export async function callNext(payload: CallNextRequest): Promise<{ success: true; data: QueueTicketResponseDto; meta: Record<string, any>; requestId: string }> {
  return http.post('/api/v1/queue-tickets/calls', payload);
}

export async function acknowledge(ticketId: string, payload: TicketActionRequest): Promise<{ success: true; data: QueueTicketResponseDto; meta: Record<string, any>; requestId: string }> {
  return http.post(`/api/v1/queue-tickets/${ticketId}/acknowledgements`, payload);
}

export async function startService(ticketId: string, payload: TicketActionRequest): Promise<{ success: true; data: QueueTicketResponseDto; meta: Record<string, any>; requestId: string }> {
  return http.post(`/api/v1/queue-tickets/${ticketId}/service-starts`, payload);
}

export async function skip(ticketId: string, payload: TicketActionRequest): Promise<{ success: true; data: QueueTicketResponseDto; meta: Record<string, any>; requestId: string }> {
  return http.post(`/api/v1/queue-tickets/${ticketId}/skips`, payload);
}

export async function complete(ticketId: string, payload: CompleteTicketRequest): Promise<{ success: true; data: QueueTicketResponseDto; meta: Record<string, any>; requestId: string }> {
  return http.post(`/api/v1/queue-tickets/${ticketId}/completions`, payload);
}

// ── Queue Stations: /api/v1/queue-stations ────────────────────────────────────

export async function listStations(params: { clinicLocationId: string }): Promise<{ success: true; data: QueueStationSummaryResponseDto[]; meta: Record<string, any>; requestId: string }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.append(k, String(v));
  }
  return http.get(`/api/v1/queue-stations${qs.toString() ? '?' + qs.toString() : ''}`);
}

// ── Live Queue snapshot: /api/v1/queue ────────────────────────────────────────

export async function getQueue(): Promise<GenericSuccessEnvelope> {
  return http.get('/api/v1/queue');
}

export async function stream(): Promise<void> {
  return http.get('/api/v1/queue/stream');
}
