import type { UserRole } from './core/enums';
import { userRepository } from './repositories';
import type { UserId } from './core/ids';

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}

/** Throws PermissionError unless the given user's role is in `allowed`. Used at every
 * service boundary that the target architecture restricts to a specific role
 * (e.g. only a doctor may sign a record, only medical_administrator/doctor may
 * approve an Encounter Creation Request). */
export function assertRole(actorId: UserId, allowed: UserRole[]): UserRole {
  const user = userRepository.getById(actorId);
  if (!user) throw new PermissionError(`Không tìm thấy người dùng ${actorId}`);
  if (!allowed.includes(user.role)) {
    throw new PermissionError(`Hành động này yêu cầu vai trò [${allowed.join(', ')}], nhưng ${user.name} có vai trò "${user.role}".`);
  }
  return user.role;
}
