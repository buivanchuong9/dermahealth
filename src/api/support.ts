import { http } from "./http";

export interface CreateSupportTicketRequest {
  topic: "tech" | "treatment" | "billing" | "other" | string;
  message: string;
}

export const createSupportTicket = (body: CreateSupportTicketRequest) =>
  http.post<unknown>("/api/v1/support/tickets", body);
