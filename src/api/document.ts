import { http } from './http';

const documentPath = (documentId: string) => `/api/v1/documents/${encodeURIComponent(documentId)}`;

export const reviewDocument = (documentId: string) =>
  http.post<unknown>(`${documentPath(documentId)}/review`);

// Bare `{}` body — inferred from medicalRecordService.flagIncorrectLink.
export const flagDocumentIncorrectLink = (documentId: string, reason: string) =>
  http.post<unknown>(`${documentPath(documentId)}/flag-incorrect-link`, { reason });
