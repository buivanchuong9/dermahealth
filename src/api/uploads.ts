import { http } from "./http";

export interface PresignUploadRequest {
  fileName: string;
  contentType: string;
  context:
    | "clinical-document"
    | "progress-photo"
    | "avatar"
    | "intake-image"
    | "lesion-image";
}

export interface PresignedUpload {
  fileId: string;
  uploadUrl: string;
  method?: "PUT";
  headers?: Record<string, string>;
}

export interface ConfirmedUpload {
  fileId: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  url?: string;
  status?: string;
}

const decode = <T>(value: unknown): T => {
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error("Backend upload trả dữ liệu không đúng định dạng JSON.");
  }
};

export async function presignUpload(
  body: PresignUploadRequest,
): Promise<PresignedUpload> {
  const result = decode<Record<string, unknown>>(
    await http.post<unknown>("/api/v1/uploads/presign", body),
  );
  const fileId =
    typeof result.fileId === "string" ? result.fileId : undefined;
  const uploadUrl =
    typeof result.uploadUrl === "string"
      ? result.uploadUrl
      : typeof result.url === "string"
        ? result.url
        : undefined;
  if (!fileId || !uploadUrl) {
    throw new Error("API presign phải trả fileId và uploadUrl.");
  }
  return {
    fileId,
    uploadUrl,
    method: "PUT",
    headers:
      result.headers && typeof result.headers === "object"
        ? (result.headers as Record<string, string>)
        : undefined,
  };
}

export async function confirmUpload(
  fileId: string,
  fileHash: string,
): Promise<ConfirmedUpload> {
  const result = decode<Partial<ConfirmedUpload>>(
    await http.post<unknown>(
      `/api/v1/uploads/${encodeURIComponent(fileId)}/confirm`,
      { fileHash },
    ),
  );
  return { ...result, fileId: result.fileId ?? fileId };
}

export async function uploadFile(
  file: File,
  context: PresignUploadRequest["context"] = "clinical-document",
): Promise<ConfirmedUpload> {
  const form = new FormData();
  form.append("context", context);
  form.append("file", file, file.name || "upload.jpg");
  const result = decode<Partial<ConfirmedUpload>>(
    await http.post<unknown>("/api/v1/uploads", form),
  );
  if (!result.fileId) {
    throw new Error("Backend upload không trả fileId.");
  }
  return result as ConfirmedUpload;
}
