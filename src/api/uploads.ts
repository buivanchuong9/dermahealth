import { http } from "./http";

export interface PresignUploadRequest {
  fileName: string;
  contentType: string;
  context: "clinical-document" | "progress-photo" | "avatar" | "intake-image";
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

function resolveContentType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

export async function uploadFile(
  file: File,
  context: PresignUploadRequest["context"] = "clinical-document",
): Promise<ConfirmedUpload> {
  const contentType = resolveContentType(file);
  const fileName = file.name || "upload.jpg";

  const presigned = await presignUpload({
    fileName,
    contentType,
    context,
  });

  try {
    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: presigned.method ?? "PUT",
      headers: {
        "Content-Type": contentType,
        ...presigned.headers,
      },
      body: file,
    });
    if (!uploadResponse.ok) {
      console.warn("Storage upload response status:", uploadResponse.status);
    }
  } catch (err) {
    console.warn("Storage endpoint fetch error (local dev fallback):", err);
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const fileHash = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return confirmUpload(presigned.fileId, fileHash);
}
