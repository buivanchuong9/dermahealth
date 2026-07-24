import { http } from "./http";
import type { UserRole } from "../domain/core/role";
import type {
  AuthUser,
  UpdateMeRequest,
  UpdatePreferencesRequest,
} from "./types";

export interface ManagedUser extends AuthUser {
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersParams {
  search?: string;
  role?: UserRole;
  status?: "pending_activation" | "active" | "suspended" | "deactivated";
  page?: number;
  limit?: number;
}

export function listUsers(params: ListUsersParams = {}): Promise<ManagedUser[]> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.role) query.set("role", params.role);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query}` : "";
  return http.get<ManagedUser[]>(`/api/v1/users${suffix}`);
}

// Distinct shape from ManagedUser/AuthUser: a pending invitation isn't a
// user yet (no memberships/version/phone — StaffInvitationsService#listPending
// selects raw staff_invitations columns, not a UserResponseDto), so reusing
// ManagedUser here would silently type fields that are always undefined.
export interface PendingStaffInvitation {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  organizationId: string;
  clinicLocationId: string | null;
  departmentId: string | null;
  invitedBy: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
}

export function listInvitedUsers(
  organizationId: string,
): Promise<PendingStaffInvitation[]> {
  const query = new URLSearchParams({ organizationId });
  return http.get<PendingStaffInvitation[]>(`/api/v1/users/invitations?${query}`);
}

export function revokeInvitation(invitationId: string): Promise<void> {
  return http.delete<void>(
    `/api/v1/users/invitations/${encodeURIComponent(invitationId)}`,
  );
}

export interface AssignUserRoleRequest {
  role: UserRole;
  organizationId: string;
  clinicLocationId?: string;
  departmentId?: string;
}

export function assignUserRole(
  userId: string,
  payload: AssignUserRoleRequest,
): Promise<unknown> {
  return http.post<unknown>(
    `/api/v1/users/${encodeURIComponent(userId)}/memberships`,
    payload,
  );
}

export function getUser(userId: string): Promise<ManagedUser> {
  return http.get<ManagedUser>(
    `/api/v1/users/${encodeURIComponent(userId)}`,
  );
}

export function updateUser(
  userId: string,
  payload: UpdateMeRequest,
): Promise<ManagedUser> {
  return http.patch<ManagedUser>(
    `/api/v1/users/${encodeURIComponent(userId)}`,
    payload,
  );
}

export function getUserPreferences(userId: string): Promise<string> {
  return http.get<string>(
    `/api/v1/users/${encodeURIComponent(userId)}/preferences`,
  );
}

export function updateUserPreferences(
  userId: string,
  payload: UpdatePreferencesRequest,
): Promise<string> {
  return http.put<string>(
    `/api/v1/users/${encodeURIComponent(userId)}/preferences`,
    payload,
  );
}

export const requestUserDeletion = (userId: string) =>
  http.post<unknown>(
    `/api/v1/users/${encodeURIComponent(userId)}/deletion-request`,
    {},
  );
