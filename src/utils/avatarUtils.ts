/**
 * Avatar Utilities for centralized patient & user profile picture resolution
 */

export function getPatientAvatarUrl(userId?: string | null, patientId?: string | null): string | undefined {
  // A patient context must never fall back to the signed-in staff account or
  // a process-wide avatar. That can display one person's photo on another
  // patient's chart.
  if (patientId) {
    return localStorage.getItem(`patient_avatar_${patientId}`) || undefined;
  }
  if (userId) {
    return localStorage.getItem(`user_avatar_${userId}`) || undefined;
  }
  return undefined;
}

export function savePatientAvatarUrl(dataUrl: string, userId?: string | null, patientId?: string | null): void {
  try {
    if (userId) localStorage.setItem(`user_avatar_${userId}`, dataUrl);
    if (patientId) localStorage.setItem(`patient_avatar_${patientId}`, dataUrl);
  } catch {
    // Local storage is only a UI cache. The confirmed backend upload remains
    // the source of truth when the browser quota is too small for a data URL.
  }
  window.dispatchEvent(new Event('avatar_updated'));
}
