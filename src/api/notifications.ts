import { http } from './http';
import type { Notification } from '../domain/core/entities';
import type {
  EncounterId,
  NotificationId,
  PatientId,
  UserId,
  WorkflowTaskId,
} from '../domain/core/ids';
import type {
  NotificationChannel,
  NotificationStatus,
} from '../domain/core/enums';
import type { UserRole } from '../domain/core/role';

interface NotificationDto {
  id: string;
  event: string;
  recipientId: string;
  recipientRole: UserRole;
  channel: NotificationChannel;
  status: NotificationStatus;
  message: string;
  relatedPatientId?: unknown;
  relatedEncounterId?: unknown;
  relatedWorkflowTaskId?: unknown;
  deliveredAt?: unknown;
  failureReason?: unknown;
  retryCount: number;
  read: boolean;
  createdAt: string;
}

const optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const mapNotification = (dto: NotificationDto): Notification => ({
  id: dto.id as NotificationId,
  event: dto.event,
  recipientId: dto.recipientId as UserId,
  recipientRole: dto.recipientRole,
  channel: dto.channel,
  status: dto.status,
  message: dto.message,
  relatedPatientId: optionalString(dto.relatedPatientId) as PatientId | undefined,
  relatedEncounterId: optionalString(dto.relatedEncounterId) as EncounterId | undefined,
  relatedWorkflowTaskId: optionalString(dto.relatedWorkflowTaskId) as WorkflowTaskId | undefined,
  deliveredAt: optionalString(dto.deliveredAt),
  failureReason: optionalString(dto.failureReason),
  retryCount: dto.retryCount ?? 0,
  read: Boolean(dto.read),
  createdAt: dto.createdAt,
});

export const listNotifications = async (userId: string, scope: string) => {
  const query = new URLSearchParams({ userId, scope });
  return (await http.get<NotificationDto[]>(`/api/v1/notifications?${query}`)).map(mapNotification);
};

export const getUnreadNotificationCount = async (userId: string) => {
  const query = new URLSearchParams({ userId });
  return http.get<{ count: number }>(`/api/v1/notifications/unread-count?${query}`);
};

export const markNotificationRead = async (notificationId: string) =>
  mapNotification(
    await http.post<NotificationDto>(
      `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`,
    ),
  );

export const retryNotification = async (notificationId: string) =>
  mapNotification(
    await http.post<NotificationDto>(
      `/api/v1/notifications/${encodeURIComponent(notificationId)}/retry`,
    ),
  );
