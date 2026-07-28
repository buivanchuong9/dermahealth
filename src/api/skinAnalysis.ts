import { http } from "./http";

export interface SkinPrediction {
  classIndex: number;
  label: string;
  probability: number;
}

export interface SkinAnalysisResult {
  model: string;
  modelVersion: string;
  labelsConfigured: boolean;
  image: { width: number; height: number };
  predictions: SkinPrediction[];
  disclaimer: string;
}

export type SkinImageRole = "overview" | "closeup" | "alternate";

export interface SkinCaseImageResult {
  role: SkinImageRole;
  width: number;
  height: number;
  quality: { usable: boolean; score: number; issues: string[] };
  original?: { width: number; height: number; mimeType: "image/jpeg"; dataUrl: string } | null;
  predictions: SkinPrediction[];
  heatmap?: {
    method: "grad_cam";
    targetLayer: string;
    targetClassIndex: number;
    width: number;
    height: number;
    mimeType: "image/png";
    dataUrl: string;
    allZero: boolean;
  } | null;
}

export interface SkinAnalysisCaseResult {
  caseId: string;
  status: "completed" | "partial" | "abstained" | "failed";
  model: string;
  modelVersion: string;
  device: string;
  labelsVersion: string;
  calibrationVersion: string | null;
  preprocessingVersion: string;
  labelsConfigured: boolean;
  generatedAt: string;
  requestId?: string;
  images: SkinCaseImageResult[];
  aggregate: {
    predictions: SkinPrediction[];
    agreement: number;
    conflictingImages: string[];
    abstained: boolean;
    abstainReasons: string[];
    aggregationMethod: string;
    validationStatus: string;
  };
  triage: {
    level: "emergency" | "urgent" | "soon" | "routine";
    reasons: string[];
    basis: string;
  };
  disclaimer: string;
}

export async function analyzeSkinImage(
  file: File,
): Promise<SkinAnalysisResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  return http.post<SkinAnalysisResult>("/api/v1/ai/skin-analysis", form);
}

export async function analyzeSkinCase(input: {
  closeup: File;
  overview?: File;
  alternate?: File;
  bodyRegion: string;
  durationDays?: number;
  symptoms?: string[];
  patientId?: string;
}): Promise<SkinAnalysisCaseResult> {
  const form = new FormData();
  form.append("closeup", input.closeup, input.closeup.name);
  if (input.overview) form.append("overview", input.overview, input.overview.name);
  if (input.alternate) form.append("alternate", input.alternate, input.alternate.name);
  form.append("bodyRegion", input.bodyRegion);
  if (input.durationDays !== undefined) form.append("durationDays", String(input.durationDays));
  if (input.symptoms?.length) form.append("symptoms", JSON.stringify(input.symptoms));
  if (input.patientId) form.append("patientId", input.patientId);
  return http.post<SkinAnalysisCaseResult>("/api/v1/ai/skin-analysis-cases", form);
}

export type SkinCaseReviewDecision =
  | "accepted"
  | "rejected"
  | "different_diagnosis"
  | "image_unsuitable";

export function reviewSkinCase(
  caseId: string,
  payload: {
    decision: SkinCaseReviewDecision;
    diagnosis?: string;
    note?: string;
  },
): Promise<string> {
  return http.post<string>(
    `/api/v1/ai/skin-analysis-cases/${encodeURIComponent(caseId)}/review`,
    payload,
  );
}
