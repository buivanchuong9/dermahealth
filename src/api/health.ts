import { http } from './http';

export const getLiveHealth = () =>
  http.get<unknown>('/health/live', { auth: false });

export const getReadyHealth = () =>
  http.get<unknown>('/health/ready', { auth: false });
