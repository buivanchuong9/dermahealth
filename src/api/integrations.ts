import { http } from "./http";
import type {
  IntegrationConnection,
  IntegrationMessage,
} from "../domain/core/entities";
import type {
  IntegrationConnectionId,
  IntegrationMessageId,
} from "../domain/core/ids";
import type { IntegrationStatus } from "../domain/core/enums";

interface IntegrationConnectionDto {
  id: string;
  name: string;
  status: IntegrationStatus;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  pendingMessages?: number;
  retryCount?: number;
  deadLetterCount?: number;
}

interface IntegrationMessageDto {
  id: string;
  connectionId: string;
  correlationId: string;
  idempotencyKey: string;
  status: IntegrationMessage["status"];
  createdAt: string;
}

const decode = <T>(value: unknown): T => {
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error("Backend trả dữ liệu tích hợp không đúng định dạng JSON.");
  }
};

const mapConnection = (row: IntegrationConnectionDto): IntegrationConnection => ({
  id: row.id as IntegrationConnectionId,
  name: row.name,
  status: row.status,
  lastSuccessAt: row.lastSuccessAt ?? undefined,
  lastFailureAt: row.lastFailureAt ?? undefined,
  pendingMessages: row.pendingMessages ?? 0,
  retryCount: row.retryCount ?? 0,
  deadLetterCount: row.deadLetterCount ?? 0,
});

const mapMessage = (row: IntegrationMessageDto): IntegrationMessage => ({
  id: row.id as IntegrationMessageId,
  connectionId: row.connectionId as IntegrationConnectionId,
  correlationId: row.correlationId,
  idempotencyKey: row.idempotencyKey,
  status: row.status,
  createdAt: row.createdAt,
});

export async function listIntegrationConnections(): Promise<
  IntegrationConnection[]
> {
  const data = decode<IntegrationConnectionDto[]>(
    await http.get<unknown>("/api/v1/integrations/connections"),
  );
  return (Array.isArray(data) ? data : []).map(mapConnection);
}

export async function listIntegrationMessages(
  connectionId: string,
): Promise<IntegrationMessage[]> {
  const data = decode<IntegrationMessageDto[]>(
    await http.get<unknown>(
      `/api/v1/integrations/connections/${encodeURIComponent(connectionId)}/messages`,
    ),
  );
  return (Array.isArray(data) ? data : []).map(mapMessage);
}

export const retryIntegrationConnection = (connectionId: string) =>
  http.post<unknown>(
    `/api/v1/integrations/connections/${encodeURIComponent(connectionId)}/retry`,
  );

export const reconcileIntegrationConnection = (connectionId: string) =>
  http.post<unknown>(
    `/api/v1/integrations/connections/${encodeURIComponent(connectionId)}/reconcile`,
  );
