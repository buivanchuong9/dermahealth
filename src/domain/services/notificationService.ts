import { notificationRepository } from '../repositories';
import { nextId } from '../core/ids';
import type { Notification } from '../core/entities';
import type { UserId, PatientId, EncounterId, WorkflowTaskId } from '../core/ids';
import type { NotificationChannel } from '../core/enums';

function send(input: {
  event: string; recipientId: UserId; recipientRole: Notification['recipientRole']; channel: NotificationChannel; message: string;
  relatedPatientId?: PatientId; relatedEncounterId?: EncounterId; relatedWorkflowTaskId?: WorkflowTaskId;
}): Notification {
  const notification: Notification = { id: nextId('NOTIF'), status: 'queued', createdAt: new Date().toISOString(), retryCount: 0, read: false, ...input };
  notificationRepository.upsert(notification);
  // Simulated async delivery — deterministic-ish "mostly succeeds" outcome so the
  // notification center has a realistic mix of delivered/failed items to show.
  const willFail = notification.channel === 'sms' && notification.id.endsWith('3');
  const delivered: Notification = willFail
    ? { ...notification, status: 'failed', failureReason: 'Không thể kết nối tới nhà mạng/gateway (mô phỏng)' }
    : { ...notification, status: 'delivered', deliveredAt: new Date().toISOString() };
  return notificationRepository.upsert(delivered);
}

function retry(notificationId: string): Notification {
  const notification = notificationRepository.getById(notificationId);
  if (!notification) throw new Error(`Không tìm thấy thông báo ${notificationId}`);
  return notificationRepository.upsert({ ...notification, status: 'delivered', deliveredAt: new Date().toISOString(), retryCount: notification.retryCount + 1, failureReason: undefined });
}

function markRead(notificationId: string): Notification {
  const notification = notificationRepository.getById(notificationId);
  if (!notification) throw new Error(`Không tìm thấy thông báo ${notificationId}`);
  return notificationRepository.upsert({ ...notification, read: true });
}

function listForUser(userId: UserId): Notification[] {
  return notificationRepository.getAll().filter((n) => n.recipientId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function unreadCount(userId: UserId): number {
  return listForUser(userId).filter((n) => !n.read).length;
}

function listAll(): Notification[] {
  return [...notificationRepository.getAll()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const notificationService = { send, retry, markRead, listForUser, unreadCount, listAll };
