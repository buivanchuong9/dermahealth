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

/** Super administrators are an explicit break-glass platform role and pass
 * every role gate. Keeping the override here prevents route, menu and service
 * authorization from drifting apart. */
export function hasRoleAccess(role: UserRole, allowed: readonly UserRole[]): boolean {
  return role === 'super_administrator' || allowed.includes(role);
}
