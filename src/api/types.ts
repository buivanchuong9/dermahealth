export interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
  meta?: unknown;
  requestId?: string;
}

export type MembershipRole =
  | 'super_administrator'
  | 'system_administrator'
  | 'medical_administrator'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'lab_technician'
  | 'imaging_technician'
  | 'pharmacist'
  | 'care_coordinator'
  | 'customer_care_employee'
  | 'clinical_process_designer'
  | 'patient';

export interface Membership {
  organizationId: string;
  clinicLocationId?: string | null;
  departmentId?: string | null;
  role: MembershipRole;
}

export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: 'invited' | 'active' | 'suspended' | string;
  activeOrganizationId?: string | null;
  memberships: Membership[];
  version: number;
}

export interface AuthSession {
  mode?: 'registered' | 'invited' | 'existing' | string;
  accessToken: string;
  accessTokenExpiresAt: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  dob?: string;
  gender?: 'male' | 'female' | string;
  phone?: string;
  address?: string;
  organizationId?: string;
  organizationCode?: string;
}

export interface LogoutAllRequest {
  password: string;
}

export interface UpdateMeRequest {
  name?: string;
  phone?: string;
  avatarFileId?: string;
  version: number;
}

export interface NotificationChannels {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface DeviceSettings {
  biometricLogin: boolean;
  mobileNotifications: boolean;
}

export interface UserPreferences {
  userId: string;
  locale: string;
  timezone: string;
  dateFormat: string;
  theme: 'light' | 'dark' | string;
  notificationChannels: NotificationChannels;
  deviceSettings: DeviceSettings;
  version: number;
  updatedAt: string;
}

export interface UpdatePreferencesRequest {
  locale: string;
  timezone: string;
  dateFormat: string;
  theme: string;
  notificationChannels: NotificationChannels;
  deviceSettings: DeviceSettings;
  version: number;
}
