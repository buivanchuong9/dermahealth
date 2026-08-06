import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Laterality,
  type Lesion,
  type LesionDetailBundle,
  type MetricSource,
  type ReviewInput,
} from "../../domain/skinProgress";
import {
  ApiDermaTimelineRepository,
  createLesion as createLesionApi,
  createObservation as createObservationApi,
  submitObservation as submitObservationApi,
  type DermaTimelineRepository,
} from "../../api/lifetimeMedicalRecord";
import { ApiError } from "../../api/http";
import { uploadFile } from "../../api/uploads";

const readBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
};

export const dermaTimelineFlags = {
  enabled: readBoolean(import.meta.env.VITE_DERMA_TIMELINE_ENABLED, true),
  heatmapEnabled: readBoolean(
    import.meta.env.VITE_DERMA_TIMELINE_HEATMAP_ENABLED,
    true,
  ),
  clinicianReviewEnabled: readBoolean(
    import.meta.env.VITE_DERMA_TIMELINE_CLINICIAN_REVIEW_ENABLED,
    true,
  ),
};

const apiRepository = new ApiDermaTimelineRepository();

export interface DermaTimelineLoadError {
  message: string;
  status?: number;
  requestId?: string;
}

export interface LesionEntryInput {
  title: string;
  bodyRegion: string;
  laterality: Laterality;
  firstObservedAt: string;
  diagnosis?: string;
  currentTreatment?: string;
}

export interface ObservationEntryInput {
  file: File;
  capturedAt: string;
  patientReportedSymptoms: string[];
  itchScore?: number;
  painScore?: number;
  burningScore?: number;
  sleepImpactScore?: number;
  longestDiameterMm?: number;
  shortAxisMm?: number;
  erythemaSeverity?: number;
  scalingSeverity?: number;
  clinicianNotes?: string;
  // Distinguishes two intentionally-separate observations submitted back to
  // back (baseline vs. follow-up) whose content otherwise fingerprints
  // identically — same file re-used for both slots, same to-the-minute
  // default capture time. Without this, the idempotency cache below treats
  // the second submission as a retry of the first and returns the SAME
  // observation id for both, so the comparison request ends up comparing an
  // observation against itself and the backend rejects it.
  observationRole?: string;
}

const normalizeError = (
  cause: unknown,
  fallback: string,
): DermaTimelineLoadError => {
  if (cause instanceof ApiError) {
    const message =
      cause.status === 403
        ? "Bạn không có quyền xem dữ liệu theo dõi tổn thương của bệnh nhân này."
        : cause.status === 404
          ? "Không tìm thấy tài nguyên DermaTimeline trên backend hoặc hồ sơ không tồn tại."
          : cause.message;
    return { message, status: cause.status, requestId: cause.requestId };
  }
  return { message: cause instanceof Error ? cause.message : fallback };
};

export function useDermaTimeline(
  patientId: string,
  actor: { id: string; name: string; role: string },
) {
  const repository = useMemo<DermaTimelineRepository>(() => apiRepository, []);
  const [lesions, setLesions] = useState<Lesion[]>([]);
  const [selectedLesionId, setSelectedLesionId] = useState<string>();
  const [bundle, setBundle] = useState<LesionDetailBundle>();
  const [loading, setLoading] = useState(true);
  const [creatingLesion, setCreatingLesion] = useState(false);
  const [creatingObservation, setCreatingObservation] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [requestingComparison, setRequestingComparison] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [correctingMask, setCorrectingMask] = useState(false);
  const [error, setError] = useState<DermaTimelineLoadError>();
  const [mutationError, setMutationError] = useState<DermaTimelineLoadError>();
  const idempotencyKeys = useRef(new Map<string, string>());
  const observationOperations = useRef(
    new Map<string, { uploadId?: string; observationId?: string }>(),
  );
  const keyFor = useCallback((operation: string) => {
    const existing = idempotencyKeys.current.get(operation);
    if (existing) return existing;
    const created = crypto.randomUUID();
    idempotencyKeys.current.set(operation, created);
    return created;
  }, []);

  const loadLesions = useCallback(
    async (signal?: AbortSignal) => {
      const result = await repository.listLesions(patientId, signal);
      signal?.throwIfAborted();
      setLesions(result);
      if (!result.length) setBundle(undefined);
      setSelectedLesionId((current) =>
        current && result.some((item) => item.id === current)
          ? current
          : result[0]?.id,
      );
    },
    [patientId, repository],
  );

  const deleteLesionRecord = useCallback(
    async (lesionId: string) => {
      try {
        if (repository.deleteLesion) {
          await repository.deleteLesion(lesionId);
        }
        setLesions((prev) => {
          const remaining = prev.filter((item) => item.id !== lesionId);
          if (selectedLesionId === lesionId) {
            const nextId = remaining[0]?.id;
            setSelectedLesionId(nextId);
            if (!nextId) setBundle(undefined);
          }
          return remaining;
        });
      } catch (e) {
        console.error("Failed to delete lesion on backend:", e);
        // Fallback optimistically so UI deletes even if network fails
        setLesions((prev) => {
          const remaining = prev.filter((item) => item.id !== lesionId);
          if (selectedLesionId === lesionId) {
            const nextId = remaining[0]?.id;
            setSelectedLesionId(nextId);
            if (!nextId) setBundle(undefined);
          }
          return remaining;
        });
      }
    },
    [repository, selectedLesionId],
  );

  const refreshLesion = useCallback(
    async (lesionId: string) => {
      const [nextLesions, nextBundle] = await Promise.all([
        repository.listLesions(patientId),
        repository.getBundle(patientId, lesionId),
      ]);
      setLesions(nextLesions);
      setSelectedLesionId(lesionId);
      setBundle(nextBundle);
    },
    [patientId, repository],
  );

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError(undefined);
      try {
        await loadLesions(controller.signal);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            normalizeError(cause, "Không thể tải danh sách tổn thương."),
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [loadLesions]);

  useEffect(() => {
    if (!selectedLesionId) return;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await repository.getBundle(
          patientId,
          selectedLesionId,
          controller.signal,
        );
        if (!controller.signal.aborted) setBundle(result);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            normalizeError(cause, "Không thể tải tiến trình tổn thương."),
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [patientId, repository, selectedLesionId]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(undefined);
    const load = selectedLesionId
      ? repository.getBundle(patientId, selectedLesionId).then(setBundle)
      : loadLesions();
    void load
      .catch((cause: unknown) => {
        setError(normalizeError(cause, "Không thể tải lại dữ liệu."));
      })
      .finally(() => setLoading(false));
  }, [loadLesions, patientId, repository, selectedLesionId]);

  const submitReview = useCallback(
    async (input: ReviewInput) => {
      if (!bundle) throw new Error("Không có dữ liệu để review.");
      setReviewing(true);
      try {
        const mutationResult = await repository.submitReview(
          patientId,
          bundle,
          input,
          actor,
          keyFor(
            JSON.stringify([
              "review",
              bundle.comparison?.id,
              input.decision,
              input.clinicalAssessment,
              input.comment,
              input.reason,
              Object.entries(input.correctedMetrics ?? {}).sort(
                ([left], [right]) => left.localeCompare(right),
              ),
            ]),
          ),
        );
        // Mutation responses are intentionally safe to cache for idempotency and
        // therefore never carry a fresh signed image URL. Always re-read the
        // protected bundle before rendering it.
        const result = await repository.getBundle(
          patientId,
          mutationResult.lesion.id,
        );
        setBundle(result);
        setLesions((current) =>
          current.map((item) =>
            item.id === result.lesion.id ? result.lesion : item,
          ),
        );
      } finally {
        setReviewing(false);
      }
    },
    [actor, bundle, keyFor, patientId, repository],
  );

  const correctMask = useCallback(
    async (input: {
      comparisonId: string;
      assetId: string;
      action: "CONFIRM" | "CORRECT";
      file?: File;
      reason: string;
    }) => {
      if (!["doctor", "super_administrator"].includes(actor.role)) {
        throw new Error("Chỉ bác sĩ mới có thể xác nhận hoặc chỉnh sửa mask.");
      }
      if (input.action === "CORRECT" && !input.file) {
        throw new Error("Cần tải lên ảnh mask đã chỉnh sửa.");
      }
      setCorrectingMask(true);
      try {
        const uploadObjectId =
          input.action === "CORRECT"
            ? (await uploadFile(input.file!, "lesion-image")).fileId
            : undefined;
        const mutationResult = await repository.correctMask(
          input.comparisonId,
          input.assetId,
          { action: input.action, uploadObjectId, reason: input.reason },
          keyFor(
            JSON.stringify([
              "correct-mask",
              input.comparisonId,
              input.assetId,
              input.action,
              uploadObjectId,
            ]),
          ),
        );
        // Same rule as submitReview: mutation responses never carry fresh
        // signed image URLs, so always re-read the protected bundle.
        const result = await repository.getBundle(patientId, mutationResult.lesion.id);
        setBundle(result);
        setLesions((current) =>
          current.map((item) => (item.id === result.lesion.id ? result.lesion : item)),
        );
      } finally {
        setCorrectingMask(false);
      }
    },
    [actor.role, keyFor, patientId, repository],
  );

  const createLesionRecord = useCallback(
    async (input: LesionEntryInput) => {
      setMutationError(undefined);
      if (!["patient", "doctor", "nurse", "super_administrator"].includes(actor.role)) {
        const issue = new Error(
          "Vai trò hiện tại không được phép tạo hồ sơ tổn thương.",
        );
        setMutationError({ message: issue.message });
        throw issue;
      }
      setCreatingLesion(true);
      try {
        const doctorOnly =
          actor.role === "doctor" || actor.role === "super_administrator"
            ? {
                diagnosis: input.diagnosis?.trim() || undefined,
                currentTreatment: input.currentTreatment?.trim() || undefined,
              }
            : {};
        const body = {
          title: input.title.trim(),
          bodyRegion: input.bodyRegion.trim(),
          laterality: input.laterality,
          firstObservedAt: input.firstObservedAt,
          ...doctorOnly,
        };
        const created = await createLesionApi(
          patientId,
          body,
          keyFor(`create-lesion:${patientId}:${JSON.stringify(body)}`),
        );
        await refreshLesion(created.id);
        return created;
      } catch (cause) {
        const normalized = normalizeError(
          cause,
          "Không thể tạo hồ sơ tổn thương.",
        );
        setMutationError(normalized);
        throw cause;
      } finally {
        setCreatingLesion(false);
      }
    },
    [actor.role, keyFor, patientId, refreshLesion],
  );

  const createObservationRecord = useCallback(
    async (input: ObservationEntryInput) => {
      setMutationError(undefined);
      const rejectInput = (message: string): never => {
        setMutationError({ message });
        throw new Error(message);
      };
      const selectedBundle = bundle;
      if (!selectedBundle) {
        const message = "Chưa chọn tổn thương để tạo quan sát.";
        setMutationError({ message });
        throw new Error(message);
      }
      if (!["patient", "doctor", "nurse", "super_administrator"].includes(actor.role)) {
        rejectInput("Vai trò hiện tại không được phép tạo quan sát.");
      }

      const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!acceptedTypes.has(input.file.type)) {
        rejectInput("Ảnh phải có định dạng JPEG, PNG hoặc WebP.");
      }
      if (input.file.size <= 0 || input.file.size > 10 * 1024 * 1024) {
        rejectInput(
          "Ảnh phải có dung lượng lớn hơn 0 và không vượt quá 10 MB.",
        );
      }
      const capturedAtMs = Date.parse(input.capturedAt);
      if (!Number.isFinite(capturedAtMs))
        rejectInput("Thời điểm chụp ảnh không hợp lệ.");
      if (capturedAtMs > Date.now() + 5 * 60_000) {
        rejectInput("Thời điểm chụp không được nằm trong tương lai.");
      }
      if (capturedAtMs < Date.parse(selectedBundle.lesion.firstObservedAt)) {
        rejectInput(
          "Thời điểm chụp không được trước ngày bắt đầu theo dõi tổn thương.",
        );
      }

      const clinicalActor =
        actor.role === "doctor" || actor.role === "nurse" || actor.role === "super_administrator";
      const hasClinicalMeasurements = [
        input.longestDiameterMm,
        input.shortAxisMm,
        input.erythemaSeverity,
        input.scalingSeverity,
      ].some((value) => value !== undefined);
      if (!clinicalActor && hasClinicalMeasurements) {
        rejectInput("Chỉ nhân viên lâm sàng được nhập chỉ số đo trực tiếp.");
      }

      setCreatingObservation(true);
      const lesionId = selectedBundle.lesion.id;
      const symptoms = [
        ...new Set(
          input.patientReportedSymptoms
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ];
      const fingerprint = JSON.stringify([
        lesionId,
        input.observationRole,
        input.file.name,
        input.file.size,
        input.file.lastModified,
        input.capturedAt,
        symptoms,
        input.itchScore,
        input.painScore,
        input.burningScore,
        input.sleepImpactScore,
        input.longestDiameterMm,
        input.shortAxisMm,
        input.erythemaSeverity,
        input.scalingSeverity,
        input.clinicianNotes?.trim(),
      ]);
      const operation = observationOperations.current.get(fingerprint) ?? {};
      observationOperations.current.set(fingerprint, operation);

      try {
        if (!operation.uploadId) {
          const upload = await uploadFile(input.file, "lesion-image");
          operation.uploadId = upload.fileId;
        }

        const metrics: Array<{
          code: string;
          value: number;
          source: MetricSource;
          measurementMethod: string;
          observedAt: string;
        }> = [];
        const symptomSource: MetricSource = clinicalActor
          ? "CLINICIAN_REPORTED"
          : "PATIENT_REPORTED";
        const addMetric = (
          code: string,
          value: number | undefined,
          minimum: number,
          maximum: number,
          source: MetricSource,
          measurementMethod: string,
        ) => {
          if (value === undefined) return;
          if (!Number.isFinite(value) || value < minimum || value > maximum) {
            throw new Error(
              `Giá trị ${code} phải nằm trong khoảng ${minimum}–${maximum}.`,
            );
          }
          metrics.push({
            code,
            value,
            source,
            measurementMethod,
            observedAt: input.capturedAt,
          });
        };

        const symptomMethod = clinicalActor
          ? "Thang NRS 0–10 được nhân viên y tế ghi nhận"
          : "Thang NRS 0–10 do người bệnh tự báo cáo";
        addMetric(
          "itch-nrs-24h",
          input.itchScore,
          0,
          10,
          symptomSource,
          symptomMethod,
        );
        addMetric(
          "pain-nrs-24h",
          input.painScore,
          0,
          10,
          symptomSource,
          symptomMethod,
        );
        addMetric(
          "burning-nrs-24h",
          input.burningScore,
          0,
          10,
          symptomSource,
          symptomMethod,
        );
        addMetric(
          "sleep-impact-nrs-7d",
          input.sleepImpactScore,
          0,
          10,
          symptomSource,
          symptomMethod,
        );
        if (clinicalActor) {
          addMetric(
            "lesion-longest-diameter-mm",
            input.longestDiameterMm,
            0,
            1000,
            "CLINICIAN_REPORTED",
            "Đo trực tiếp bằng thước lâm sàng chia vạch milimet",
          );
          addMetric(
            "lesion-short-axis-mm",
            input.shortAxisMm,
            0,
            1000,
            "CLINICIAN_REPORTED",
            "Đo vuông góc trục dài bằng thước lâm sàng chia vạch milimet",
          );
          addMetric(
            "erythema-severity-0-4",
            input.erythemaSeverity,
            0,
            4,
            "CLINICIAN_REPORTED",
            "Đánh giá trực tiếp theo thang mức độ 0–4",
          );
          addMetric(
            "scaling-severity-0-4",
            input.scalingSeverity,
            0,
            4,
            "CLINICIAN_REPORTED",
            "Đánh giá trực tiếp theo thang mức độ 0–4",
          );
        }

        if (!operation.observationId) {
          const observation = await createObservationApi(
            lesionId,
            {
              capturedAt: input.capturedAt,
              imageAssetIds: [operation.uploadId],
              patientReportedSymptoms: symptoms,
              clinicianNotes: clinicalActor
                ? input.clinicianNotes?.trim() || undefined
                : undefined,
              clinicalMetrics: metrics,
            },
            keyFor(`create-observation:${fingerprint}`),
          );
          operation.observationId = observation.id;
        }

        const submitted = await submitObservationApi(
          operation.observationId,
          keyFor(`submit-observation:${operation.observationId}`),
        );
        await refreshLesion(lesionId);
        return submitted;
      } catch (cause) {
        const normalized = normalizeError(
          cause,
          "Không thể lưu quan sát tổn thương.",
        );
        setMutationError(normalized);
        throw cause;
      } finally {
        setCreatingObservation(false);
      }
    },
    [actor.role, bundle, keyFor, refreshLesion],
  );

  const requestComparison = useCallback(
    async (baselineObservationId: string, targetObservationId: string) => {
      if (!bundle)
        throw new Error("Không có dữ liệu tổn thương để tạo so sánh.");
      setRequestingComparison(true);
      try {
        const session = await repository.requestComparison(
          patientId,
          bundle,
          baselineObservationId,
          targetObservationId,
          keyFor(
            `comparison:${bundle.lesion.id}:${baselineObservationId}:${targetObservationId}`,
          ),
        );
        setBundle((current) =>
          current ? { ...current, comparison: session } : current,
        );
      } finally {
        setRequestingComparison(false);
      }
    },
    [bundle, keyFor, patientId, repository],
  );

  const reanalyzeComparison = useCallback(
    async (baselineObservationId: string, targetObservationId: string) => {
      if (!bundle)
        throw new Error("Không có dữ liệu tổn thương để tạo so sánh.");
      setReanalyzing(true);
      try {
        // Deliberately bypasses keyFor()'s per-pair memoized idempotency key:
        // reusing that key for a COMPLETED legacy session would hit the
        // backend's idempotency short-circuit and just return the same
        // legacy record unchanged. A fresh key forces a brand-new
        // comparison session through the current analysis pipeline.
        const session = await repository.requestComparison(
          patientId,
          bundle,
          baselineObservationId,
          targetObservationId,
          crypto.randomUUID(),
        );
        setBundle((current) =>
          current ? { ...current, comparison: session } : current,
        );
      } finally {
        setReanalyzing(false);
      }
    },
    [bundle, patientId, repository],
  );

  const visibleLesions = lesions.filter((item) => item.patientId === patientId);
  const visibleBundle =
    bundle?.lesion.patientId === patientId ? bundle : undefined;

  return {
    lesions: visibleLesions,
    selectedLesionId: visibleLesions.some(
      (item) => item.id === selectedLesionId,
    )
      ? selectedLesionId
      : undefined,
    setSelectedLesionId,
    bundle: visibleBundle,
    loading,
    creatingLesion,
    creatingObservation,
    reviewing,
    requestingComparison,
    reanalyzing,
    correctingMask,
    error,
    mutationError,
    clearMutationError: () => setMutationError(undefined),
    retry,
    deleteLesion: deleteLesionRecord,
    createLesion: createLesionRecord,
    createObservation: createObservationRecord,
    submitReview,
    requestComparison,
    reanalyzeComparison,
    correctMask,
  };
}
