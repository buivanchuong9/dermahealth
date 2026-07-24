import { http } from "./http";

export interface PresignUploadRequest {
  fileName: string;
  contentType: string;
  size: number;
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
): Promise<ConfirmedUpload> {
  const result = decode<Partial<ConfirmedUpload>>(
    await http.post<unknown>(
      `/api/v1/uploads/${encodeURIComponent(fileId)}/confirm`,
      {},
    ),
  );
  return { ...result, fileId: result.fileId ?? fileId };
}

export async function uploadFile(file: File): Promise<ConfirmedUpload> {
  const presigned = await presignUpload({
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
  });
  const uploadResponse = await fetch(presigned.uploadUrl, {
    method: presigned.method ?? "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...presigned.headers,
    },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Không tải được tệp lên kho lưu trữ (${uploadResponse.status}).`);
  }
  return confirmUpload(presigned.fileId);
}
