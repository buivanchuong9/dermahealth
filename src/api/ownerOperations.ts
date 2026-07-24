import { http } from "./http";
import type { UserRole } from "../domain/core/role";

const decode = <T>(value: unknown): T => {
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error("Backend owner API trả dữ liệu không đúng định dạng JSON.");
  }
};

export interface RolePermission {
  role: UserRole;
  permissionCode: string;
}

export interface PermissionCatalogItem {
  code: string;
  description?: string;
  dangerous?: boolean;
}

export interface GrantRolePermissionRequest {
  role: UserRole;
  permissionCode: string;
}

export async function listOwnerRolePermissions(): Promise<RolePermission[]> {
  const raw = decode<unknown>(
    await http.get<unknown>("/api/v1/owner/role-permissions"),
  );
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object"),
      )
      .map((item) => ({
        role: String(item.role) as UserRole,
        permissionCode: String(item.permissionCode ?? item.code ?? ""),
      }))
      .filter((item) => item.role && item.permissionCode);
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).flatMap(
      ([role, permissions]) =>
        Array.isArray(permissions)
          ? permissions.map((permission) => ({
              role: role as UserRole,
              permissionCode:
                typeof permission === "string"
                  ? permission
                  : String(
                      (permission as Record<string, unknown>)?.permissionCode ??
                        (permission as Record<string, unknown>)?.code ??
                        "",
                    ),
            }))
          : [],
    );
  }
  return [];
}

export const grantOwnerRolePermission = (body: GrantRolePermissionRequest) =>
  http.post<unknown>("/api/v1/owner/role-permissions", body);

export const revokeOwnerRolePermission = (
  role: UserRole,
  permissionCode: string,
) =>
  http.delete<void>(
    `/api/v1/owner/role-permissions/${encodeURIComponent(role)}/${encodeURIComponent(permissionCode)}`,
  );

export async function listOwnerPermissionCatalog(): Promise<
  PermissionCatalogItem[]
> {
  const raw = decode<unknown>(
    await http.get<unknown>("/api/v1/owner/role-permissions/catalog"),
  );
  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        typeof item === "string"
          ? { code: item }
          : {
              code: String(
                (item as Record<string, unknown>)?.code ??
                  (item as Record<string, unknown>)?.permissionCode ??
                  "",
              ),
              description:
                typeof (item as Record<string, unknown>)?.description ===
                "string"
                  ? String((item as Record<string, unknown>).description)
                  : undefined,
              dangerous: Boolean((item as Record<string, unknown>)?.dangerous),
            },
      )
      .filter((item) => item.code);
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(
      ([code, value]) => ({
        code,
        description:
          value &&
          typeof value === "object" &&
          typeof (value as Record<string, unknown>).description === "string"
            ? String((value as Record<string, unknown>).description)
            : undefined,
        dangerous: Boolean(
          value &&
            typeof value === "object" &&
            (value as Record<string, unknown>).dangerous,
        ),
      }),
    );
  }
  return [];
}

export interface BreakGlassGrant {
  id: string;
  patientId: string;
  reason: string;
  requestedBy?: string;
  grantedAt?: string;
  expiresAt?: string;
  endedAt?: string | null;
  status?: string;
}

export interface CreateBreakGlassRequest {
  patientId: string;
  reason: string;
  mfaCode: string;
}

const normalizeRows = <T>(value: unknown): T[] => {
  const decoded = decode<unknown>(value);
  if (Array.isArray(decoded)) return decoded as T[];
  if (
    decoded &&
    typeof decoded === "object" &&
    Array.isArray((decoded as Record<string, unknown>).items)
  ) {
    return (decoded as { items: T[] }).items;
  }
  return [];
};

export const createOwnerBreakGlass = (body: CreateBreakGlassRequest) =>
  http.post<unknown>("/api/v1/owner/break-glass", body);

export async function listOwnerBreakGlass(): Promise<BreakGlassGrant[]> {
  return normalizeRows<BreakGlassGrant>(
    await http.get<unknown>("/api/v1/owner/break-glass"),
  );
}

export async function listMyOwnerBreakGlass(): Promise<BreakGlassGrant[]> {
  return normalizeRows<BreakGlassGrant>(
    await http.get<unknown>("/api/v1/owner/break-glass/mine"),
  );
}

export const endOwnerBreakGlass = (grantId: string) =>
  http.post<unknown>(
    `/api/v1/owner/break-glass/${encodeURIComponent(grantId)}/end`,
  );

export interface DangerousActionRequest {
  id: string;
  type: string;
  reason: string;
  payload?: Record<string, unknown>;
  status?: string;
  requestedBy?: string;
  requestedAt?: string;
  approvals?: unknown[];
}

export interface CreateDangerousActionRequest {
  type: string;
  reason: string;
  payload: Record<string, unknown>;
  mfaCode: string;
}

export interface DecideDangerousActionRequest {
  decision: "approved" | "rejected";
  reason: string;
  mfaCode: string;
}

export const createOwnerDangerousAction = (
  body: CreateDangerousActionRequest,
) => http.post<unknown>("/api/v1/owner/dangerous-actions", body);

export async function listOwnerDangerousActions(): Promise<
  DangerousActionRequest[]
> {
  return normalizeRows<DangerousActionRequest>(
    await http.get<unknown>("/api/v1/owner/dangerous-actions"),
  );
}

export const decideOwnerDangerousAction = (
  requestId: string,
  body: DecideDangerousActionRequest,
) =>
  http.post<unknown>(
    `/api/v1/owner/dangerous-actions/${encodeURIComponent(requestId)}/approvals`,
    body,
  );
