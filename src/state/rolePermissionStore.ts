import { useSyncExternalStore } from "react";
import type { RolePermission } from "../api/ownerOperations";
import type { UserRole } from "../domain/core/role";

interface Snapshot {
  loaded: boolean;
  rows: RolePermission[];
}

let snapshot: Snapshot = { loaded: false, rows: [] };
const listeners = new Set<() => void>();

function emit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function replaceRolePermissions(rows: RolePermission[]) {
  emit({ loaded: true, rows });
}

export function grantRolePermissionLocally(
  role: UserRole,
  permissionCode: string,
) {
  if (
    snapshot.rows.some(
      (item) =>
        item.role === role && item.permissionCode === permissionCode,
    )
  ) {
    return;
  }
  emit({
    loaded: true,
    rows: [...snapshot.rows, { role, permissionCode }],
  });
}

export function revokeRolePermissionLocally(
  role: UserRole,
  permissionCode: string,
) {
  emit({
    loaded: true,
    rows: snapshot.rows.filter(
      (item) =>
        item.role !== role || item.permissionCode !== permissionCode,
    ),
  });
}

export function useRolePermissionSnapshot(): Snapshot {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );
}

export function hasEffectivePermission(
  rows: RolePermission[],
  roles: readonly UserRole[],
  required: readonly string[],
): boolean {
  if (required.length === 0) return true;
  const heldRoles = new Set(roles);
  return rows.some(
    (item) =>
      heldRoles.has(item.role) && required.includes(item.permissionCode),
  );
}

export function supportsModulePermissions(rows: RolePermission[]): boolean {
  return rows.some((item) => item.permissionCode.startsWith("module."));
}
