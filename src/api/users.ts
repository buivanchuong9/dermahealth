import { http } from "./http";
import type {
  AuthUser,
  UpdateMeRequest,
  UpdatePreferencesRequest,
} from "./types";

export interface ManagedUser extends AuthUser {
  createdAt: string;
  updatedAt: string;
}

export function listUsers(): Promise<ManagedUser[]> {
  return http.get<ManagedUser[]>("/api/v1/users");
}

export function listInvitedUsers(
  organizationId: string,
): Promise<ManagedUser[]> {
  const query = new URLSearchParams({ organizationId });
  return http.get<ManagedUser[]>(`/api/v1/users/invitations?${query}`);
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
