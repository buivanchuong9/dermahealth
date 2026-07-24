import { http } from "./http";

export interface CreateSupportTicketRequest {
  category: "tech" | "treatment" | "billing" | "other";
  message: string;
}

export const createSupportTicket = (body: CreateSupportTicketRequest) =>
  http.post<unknown>("/api/v1/support/tickets", body);
