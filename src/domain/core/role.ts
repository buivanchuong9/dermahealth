// Roles and role-based access control live here, separate from the status
// vocabularies in `enums.ts`, so permission rules (route/menu/service gating,
// per-role scopes, etc.) have one dedicated place to grow into.

export type UserRole =
  | 'super_administrator'
  | 'patient'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'lab_technician'
  | 'imaging_technician'
  | 'pharmacist'
  | 'care_coordinator'
  | 'customer_care_employee'
  | 'medical_administrator'
  | 'system_administrator'
  | 'clinical_process_designer';

export const ROLE_LABEL: Record<UserRole, string> = {
  super_administrator: 'Quản trị viên cấp cao',
  patient: 'Bệnh nhân',
  doctor: 'Bác sĩ',
  nurse: 'Điều dưỡng',
  receptionist: 'Lễ tân',
  lab_technician: 'Kỹ thuật viên xét nghiệm',
  imaging_technician: 'Kỹ thuật viên chẩn đoán hình ảnh',
  pharmacist: 'Dược sĩ',
  care_coordinator: 'Điều phối viên chăm sóc',
  customer_care_employee: 'Nhân viên chăm sóc khách hàng',
  medical_administrator: 'Quản trị viên y tế',
  system_administrator: 'Quản trị viên hệ thống',
  clinical_process_designer: 'Chuyên viên thiết kế quy trình',
};

/**
 * Product copy for onboarding previews only. The backend role-permission
 * matrix remains the authorization source of truth.
 */
export const ROLE_CAPABILITY_SUMMARY: Partial<Record<UserRole, readonly string[]>> = {
  doctor: [
    'Xem bệnh nhân và lượt khám trong phạm vi được phân công',
    'Tiếp nhận, chẩn đoán và cập nhật hồ sơ lâm sàng',
    'Tạo chỉ định, kế hoạch điều trị và ký hồ sơ',
    'Theo dõi hàng đợi và thực hiện tác vụ trong quy trình khám',
  ],
  nurse: [
    'Xem bệnh nhân trong phạm vi được phân công',
    'Cập nhật thông tin chăm sóc và thực hiện tác vụ điều dưỡng',
    'Theo dõi, gọi và chuyển lượt trong hàng đợi',
  ],
  receptionist: [
    'Quản lý lịch hẹn và check-in',
    'Điều phối hàng đợi tại cơ sở được cấp',
    'Cập nhật thông tin hành chính của bệnh nhân',
  ],
  medical_administrator: [
    'Điều hành hoạt động khám chữa bệnh trong tổ chức',
    'Quản lý nhân sự và phạm vi làm việc',
    'Xem nhật ký kiểm toán nghiệp vụ',
  ],
  system_administrator: [
    'Quản trị cấu hình và tích hợp hệ thống',
    'Quản lý trạng thái tài khoản theo chính sách được cấp',
    'Xem nhật ký kiểm toán kỹ thuật',
  ],
};

/**
 * Exact role gate. Privileged roles do not implicitly inherit clinical
 * permissions: every break-glass or cross-role capability must be declared
 * explicitly at the call site and enforced again by the backend.
 */
export function hasRoleAccess(role: UserRole, allowed: readonly UserRole[]): boolean {
  return role === 'super_administrator' || allowed.includes(role);
}

/**
 * Patient is the self-service baseline membership. Once an account is also
 * onboarded as staff, the staff membership becomes its operational role.
 * Preserve backend order between staff memberships until an explicit active
 * role selector is available.
 */
export function resolveOperationalRole(
  roles: readonly UserRole[],
): UserRole {
  return roles.find((role) => role !== 'patient') ?? roles[0] ?? 'patient';
}

/** Roles that can be granted through staff invitation or membership
 * assignment — mirrors backend INVITABLE_ROLES (invite-staff.dto.ts).
 * Excludes `patient` (self-register only) and `super_administrator`
 * (adding an Owner is a dangerous_action, never a plain invite/assign —
 * see StaffInvitationsService#inviteOwner). Kept in sync manually since the
 * backend enum is the source of truth and this list is UI-only; the server
 * rejects any other role regardless of what this array contains. */
export const INVITABLE_ROLES: UserRole[] = [
  'doctor',
  'nurse',
  'receptionist',
  'lab_technician',
  'imaging_technician',
  'pharmacist',
  'care_coordinator',
  'customer_care_employee',
  'medical_administrator',
  'system_administrator',
  'clinical_process_designer',
];
