import { http } from "./http";

export interface OwnerFeatureFlag {
  key: string;
  description?: string;
  enabled: boolean;
}

const decode = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error("Backend trả feature flags không đúng định dạng JSON.");
  }
};

export async function listOwnerFeatureFlags(): Promise<OwnerFeatureFlag[]> {
  const raw = decode(await http.get<unknown>("/api/v1/owner/feature-flags"));
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map((item) => ({
        key: String(item.key ?? item.name ?? ""),
        description:
          typeof item.description === "string" ? item.description : undefined,
        enabled: Boolean(item.enabled ?? item.defaultEnabled),
      }))
      .filter((item) => item.key.length > 0);
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
      key,
      enabled:
        typeof value === "boolean"
          ? value
          : Boolean(
              value &&
                typeof value === "object" &&
                ((value as Record<string, unknown>).enabled ??
                  (value as Record<string, unknown>).defaultEnabled),
            ),
      description:
        value &&
        typeof value === "object" &&
        typeof (value as Record<string, unknown>).description === "string"
          ? String((value as Record<string, unknown>).description)
          : undefined,
    }));
  }
  return [];
}

export const setOrganizationFeatureFlag = (
  key: string,
  organizationId: string,
  enabled: boolean,
) =>
  http.put<unknown>(
    `/api/v1/owner/feature-flags/${encodeURIComponent(key)}/organizations/${encodeURIComponent(organizationId)}`,
    { enabled },
  );

export const clearOrganizationFeatureFlag = (
  key: string,
  organizationId: string,
) =>
  http.delete<void>(
    `/api/v1/owner/feature-flags/${encodeURIComponent(key)}/organizations/${encodeURIComponent(organizationId)}`,
  );
