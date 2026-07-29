/**
 * Avatar Utilities for centralized patient & user profile picture resolution
 */

export function getPatientAvatarUrl(userId?: string | null, patientId?: string | null): string | undefined {
  if (userId) {
    const userAvatar = localStorage.getItem(`user_avatar_${userId}`);
    if (userAvatar) return userAvatar;
  }
  if (patientId) {
    const patientAvatar = localStorage.getItem(`patient_avatar_${patientId}`);
    if (patientAvatar) return patientAvatar;
  }
  return localStorage.getItem('user_avatar_global') || undefined;
}

export function savePatientAvatarUrl(dataUrl: string, userId?: string | null, patientId?: string | null): void {
  if (userId) localStorage.setItem(`user_avatar_${userId}`, dataUrl);
  if (patientId) localStorage.setItem(`patient_avatar_${patientId}`, dataUrl);
  localStorage.setItem('user_avatar_global', dataUrl);
  window.dispatchEvent(new Event('avatar_updated'));
}
