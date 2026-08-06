import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Result,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  App as AntApp,
} from "antd";
import {
  CalendarDays,
  Clock,
  Image as ImageIcon,
  Layers,
  MapPin,
  Pill,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UploadCloud,
  UserCheck,
  UserRound,
} from "lucide-react";
import type { Patient } from "../../domain/core/entities";
import {
  canReviewComparison,
  deriveReviewState,
  isValidObservationPair,
  selectDefaultObservationPair,
  selectResultSummaryState,
  validObservationsSorted,
  type EvidenceLink,
  type Lesion,
  type LesionObservation,
  type ReviewInput,
} from "../../domain/skinProgress";
import {
  dermaTimelineFlags,
  useDermaTimeline,
  type LesionEntryInput,
  type ObservationEntryInput,
} from "./useDermaTimeline";
import {
  ClinicianReviewDrawer,
  LesionEntryDrawer,
  LesionSelector,
  MaskCorrectionDrawer,
  ObservationEntryDrawer,
  UnifiedTimeline,
} from "./DermaTimelineParts";
import { ComparisonWorkbench, type ViewMode } from "./DermaComparisonWorkbench";
import {
  ExplainabilityPanel,
  ImageQualityPanel,
  MetricsPanel,
  ProvenancePanel,
  SafetyPanel,
} from "./DermaClinicalPanels";
import { DermaBaselineUploader } from "./DermaBaselineUploader";
import { ResultSummaryCard } from "./PatientRecoveryOverview";
import { PatientClinicalGPS } from "./PatientClinicalGPS";
import styles from "./DermaTimeline.module.scss";

const { Text, Title } = Typography;

const lesionStatusLabel: Record<Lesion["status"], string> = {
  ACTIVE: "Đang theo dõi",
  RESOLVED: "Đã lành",
  ARCHIVED: "Đã lưu trữ",
};

const reviewStateLabel = {
  AI_SUGGESTION: "Gợi ý từ hệ thống",
  AWAITING_CLINICIAN_REVIEW: "Đang chờ bác sĩ review",
  CLINICIAN_CONFIRMED: "Bác sĩ đã xác nhận",
  CLINICIAN_MODIFIED: "Bác sĩ đã điều chỉnh",
  CLINICIAN_REJECTED: "Bác sĩ đã từ chối",
  UNABLE_TO_DETERMINE: "Không thể xác định",
};

const observationStatusLabel: Record<LesionObservation["status"], string> = {
  DRAFT: "Bản nháp",
  SUBMITTED: "Đã gửi",
  PROCESSING: "Đang xử lý",
  READY_FOR_REVIEW: "Sẵn sàng phân tích",
  VERIFIED: "Đã xác nhận",
  REJECTED: "Không hợp lệ",
  NEEDS_RECAPTURE: "Cần chụp lại",
};

const observationPreview = (observation?: LesionObservation) =>
  observation?.imageAssets.find((asset) => asset.type === "THUMBNAIL")
    ?.protectedUrl ??
  observation?.imageAssets.find((asset) => asset.type === "ORIGINAL")
    ?.protectedUrl ??
  undefined;

interface ObservationSelectOption {
  value: string;
  label: string;
  disabled: boolean;
  item: LesionObservation;
  isNewest: boolean;
}

// excludeId is whichever observation is already picked in the OTHER column
// (baseline excludes the current target, and vice versa) — surfaced in the
// label itself so a grayed-out option explains why, instead of just looking
// unexplainedly disabled.
const buildObservationOptions = (
  observations: LesionObservation[],
  excludeId: string | undefined,
): ObservationSelectOption[] => {
  const newestId = observations.length
    ? observations.reduce((latest, item) =>
        Date.parse(item.capturedAt) > Date.parse(latest.capturedAt) ? item : latest,
      ).id
    : undefined;
  return observations.map((item) => {
    const isExcluded = item.id === excludeId;
    const isUnusable = item.imageQualityStatus === "UNUSABLE";
    const timeLabel = new Date(item.capturedAt).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const suffix = isExcluded
      ? " · đang chọn ở cột kia"
      : isUnusable
        ? " · chất lượng ảnh không đạt"
        : "";
    return {
      value: item.id,
      label: `${timeLabel} · ${observationStatusLabel[item.status]}${suffix}`,
      disabled: isExcluded || isUnusable,
      item,
      isNewest: item.id === newestId,
    };
  });
};

const renderObservationOption = (option: ObservationSelectOption) => (
  <div className={styles.observationOption}>
    <span className={styles.observationOptionThumb}>
      {observationPreview(option.item) ? (
        <img src={observationPreview(option.item)} alt="" />
      ) : (
        <ImageIcon size={12} />
      )}
    </span>
    <span className={styles.observationOptionText}>{option.label}</span>
    {option.isNewest && (
      <Tag color="blue" className={styles.observationOptionTag}>
        Mới nhất
      </Tag>
    )}
  </div>
);

export function DermaTimeline({
  patientId,
  user,
  patient,
}: {
  patientId: string;
  user: { id: string; name: string; role: string; avatarUrl?: string };
  patient?: Patient | null;
}) {
  const { message } = AntApp.useApp();
  const actor = useMemo(
    () => ({ id: user.id, name: user.name, role: user.role }),
    [user.id, user.name, user.role],
  );
  const {
    lesions,
    selectedLesionId,
    setSelectedLesionId,
    bundle,
    loading,
    creatingLesion,
    creatingObservation,
    reviewing,
    requestingComparison,
    reanalyzing,
    correctingMask,
    error,
    mutationError,
    clearMutationError,
    retry,
    hideLesion,
    createLesion,
    createObservation,
    submitReview,
    requestComparison,
    reanalyzeComparison,
    correctMask,
  } = useDermaTimeline(patientId, actor);
  const [selection, setSelection] = useState<{
    lesionId: string;
    baselineId?: string;
    targetId?: string;
  }>();
  const [lesionEntryOpen, setLesionEntryOpen] = useState(false);
  const [observationEntryOpen, setObservationEntryOpen] = useState(false);
  // Which comparison column the next uploaded photo should be auto-assigned
  // to, so "upload here" and "lands here" are the same click instead of a
  // separate upload-then-pick-from-dropdown step.
  const [observationEntrySlot, setObservationEntrySlot] = useState<"baseline" | "target">();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [maskCorrectionTarget, setMaskCorrectionTarget] = useState<{
    assetId: string;
    side: "baseline" | "target";
  } | null>(null);
  const [focusedMetric, setFocusedMetric] = useState<string>();
  const [focusedEvent, setFocusedEvent] = useState<string>();
  const [evidenceMode, setEvidenceMode] = useState<ViewMode>();
  const metricRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  // super_administrator has full standing authority across every feature
  // here, same as an assigned doctor — mirrors the backend's
  // assertPatientAccess bypass in lesion-tracking.service.ts.
  const doctorMode = user.role === "doctor" || user.role === "super_administrator";
  const patientMode = user.role === "patient";
  const clinicalMode = doctorMode || user.role === "nurse";
  const canCreateClinicalData = clinicalMode || user.role === "patient";
  // `patient` is only ever passed by callers showing someone their own
  // recovery timeline (see DermaTimeline call sites) — the patients API has
  // no avatar field of its own, so the signed-in user's avatar is correct.
  const patientAvatar = user.avatarUrl;
  const patientInitials = patient?.name
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const patientAge = patient?.profile.dob
    ? Math.max(
        0,
        new Date().getFullYear() - new Date(patient.profile.dob).getFullYear() -
          (new Date() < new Date(new Date(patient.profile.dob).setFullYear(new Date().getFullYear())) ? 1 : 0),
      )
    : undefined;

  const openLesionEntry = () => {
    clearMutationError();
    setLesionEntryOpen(true);
  };
  const openObservationEntry = (slot?: "baseline" | "target") => {
    clearMutationError();
    setObservationEntrySlot(slot);
    setObservationEntryOpen(true);
  };
  const handleCreateLesion = async (input: LesionEntryInput) => {
    try {
      await createLesion(input);
      setLesionEntryOpen(false);
      void message.success(
        "Đã tạo hồ sơ tổn thương và tải lại dữ liệu từ server.",
      );
    } catch (cause) {
      void message.error(
        cause instanceof Error ? cause.message : "Không thể tạo tổn thương.",
      );
    }
  };
  const handleCreateObservation = async (input: ObservationEntryInput) => {
    try {
      const created = await createObservation(input);
      setObservationEntryOpen(false);
      if (observationEntrySlot === "baseline") setBaselineId(created.id);
      else if (observationEntrySlot === "target") setTargetId(created.id);
      setObservationEntrySlot(undefined);
      void message.success(
        "Đã lưu, gửi duyệt quan sát và tải lại dữ liệu từ server.",
      );
    } catch (cause) {
      void message.error(
        cause instanceof Error ? cause.message : "Không thể lưu quan sát.",
      );
    }
  };

  if (!dermaTimelineFlags.enabled) {
    return (
      <Alert
        type="info"
        showIcon
        message="DermaTimeline đang được tắt bằng feature flag."
      />
    );
  }

  if (loading && !bundle) {
    return (
      <Card className={styles.shell}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    );
  }

  if (error) {
    return (
      <Result
        status="warning"
        title="Không thể tải DermaTimeline"
        subTitle={`${error.message} Hồ sơ bệnh án và các tab khác vẫn hoạt động bình thường.${error.requestId ? ` Mã yêu cầu: ${error.requestId}.` : ""}`}
        extra={
          <Button icon={<RefreshCw size={15} />} onClick={retry}>
            Thử lại
          </Button>
        }
      />
    );
  }

  if (!lesions.length) {
    return (
      <Card className={styles.shell}>
        <Empty
          description={
            canCreateClinicalData
              ? "Chưa có tổn thương nào trong hồ sơ theo dõi dọc"
              : "Bệnh nhân này chưa có hồ sơ tổn thương nào được tạo"
          }
        >
          {canCreateClinicalData ? (
            <Button type="primary" onClick={openLesionEntry}>
              Tạo hồ sơ tổn thương
            </Button>
          ) : (
            <Text type="secondary" style={{ maxWidth: 420, display: "block" }}>
              Chỉ chính bệnh nhân, hoặc bác sĩ/điều dưỡng đang được phân công
              chăm sóc bệnh nhân này, mới có thể tạo hồ sơ tổn thương và tải
              ảnh so sánh trước–sau. Vai trò hiện tại ({user.role}) chỉ có
              quyền xem.
            </Text>
          )}
        </Empty>
        <LesionEntryDrawer
          open={lesionEntryOpen}
          loading={creatingLesion}
          doctorMode={doctorMode}
          error={mutationError?.message}
          onClose={() => setLesionEntryOpen(false)}
          onSubmit={handleCreateLesion}
        />
      </Card>
    );
  }

  if (!bundle) return null;
  const defaultPair = selectDefaultObservationPair(
    bundle.lesion,
    bundle.observations,
  );
  const validObservationCount = validObservationsSorted(bundle.observations).length;
  const activeSelection =
    selection?.lesionId === bundle.lesion.id ? selection : undefined;
  const baselineId = activeSelection?.baselineId ?? defaultPair?.baselineId;
  const targetId = activeSelection?.targetId ?? defaultPair?.targetId;
  const setBaselineId = (value: string) =>
    setSelection({ lesionId: bundle.lesion.id, baselineId: value, targetId });
  const setTargetId = (value: string) =>
    setSelection({ lesionId: bundle.lesion.id, baselineId, targetId: value });
  const baseline = bundle.observations.find((item) => item.id === baselineId);
  const target = bundle.observations.find((item) => item.id === targetId);
  const validPair = Boolean(
    baselineId &&
    targetId &&
    isValidObservationPair(baselineId, targetId, bundle.observations),
  );
  const session = bundle.comparison;
  const sessionMatchesPair = Boolean(
    session &&
    session.baselineObservationId === baselineId &&
    session.targetObservationId === targetId,
  );
  const reviewState = session
    ? deriveReviewState(session)
    : bundle.lesion.reviewState;
  const canReview =
    dermaTimelineFlags.clinicianReviewEnabled && canReviewComparison(user.role);
  // The two states with an obvious, specific next step get a tailored
  // primary action; everything else falls back to "view the evidence"
  // (wired inline where ResultSummaryCard is rendered, since that fallback
  // needs viewerRef which isn't declared yet at this point in the file).
  const resultPrimaryAction =
    sessionMatchesPair && session
      ? selectResultSummaryState(session, baseline, target) === "RECAPTURE_REQUIRED"
        ? { label: "Hướng dẫn chụp lại", onClick: () => openObservationEntry() }
        : canReview && session.status === "READY_FOR_REVIEW" && session.analysis
          ? { label: "Mở review lâm sàng", onClick: () => setReviewOpen(true) }
          : undefined
      : undefined;
  const latestClinicalTime = Math.max(
    Date.parse(bundle.lesion.firstObservedAt),
    ...bundle.observations.map((item) => Date.parse(item.capturedAt)),
  );
  const durationDays = Math.max(
    0,
    Math.floor(
      (latestClinicalTime - Date.parse(bundle.lesion.firstObservedAt)) /
        86_400_000,
    ),
  );
  const onEvidence = (evidence: EvidenceLink) => {
    setFocusedMetric(undefined);
    setFocusedEvent(undefined);
    setEvidenceMode(undefined);
    if (evidence.type === "METRIC") {
      setFocusedMetric(evidence.targetId);
      metricRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else if (evidence.type === "OVERLAY") {
      setEvidenceMode("difference");
      viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setFocusedEvent(evidence.targetId);
      timelineRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };
  // Same jump-to-evidence pattern as onEvidence, but for the fixed,
  // capability-gated image-evidence rows in ExplainabilityPanel (mask/
  // Grad-CAM/difference/original) rather than backend-authored EvidenceLinks.
  const jumpToEvidence = (mode: ViewMode) => {
    setFocusedMetric(undefined);
    setFocusedEvent(undefined);
    setEvidenceMode(mode);
    viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const handleReview = async (input: ReviewInput) => {
    try {
      await submitReview(input);
      setReviewOpen(false);
      void message.success("Đã lưu review và tạo audit record.");
    } catch (cause) {
      void message.error(
        cause instanceof Error ? cause.message : "Không thể lưu review.",
      );
    }
  };
  const handleCorrectMask = async (input: {
    action: "CONFIRM" | "CORRECT";
    file?: File;
    reason: string;
  }) => {
    if (!session?.id || !maskCorrectionTarget) return;
    try {
      await correctMask({
        comparisonId: session.id,
        assetId: maskCorrectionTarget.assetId,
        action: input.action,
        file: input.file,
        reason: input.reason,
      });
      setMaskCorrectionTarget(null);
      void message.success("Đã lưu mask và tính lại diện tích tương đối.");
    } catch (cause) {
      void message.error(
        cause instanceof Error ? cause.message : "Không thể lưu mask.",
      );
    }
  };

  return (
    <div className={`${styles.shell} ${patientMode ? styles.patientShell : styles.clinicalShell}`}>
      {patient && (
        <Card className={styles.patientContextCard}>
          <div className={styles.patientContextIdentity}>
            <Avatar size={54} src={patientAvatar}>
              {!patientAvatar && (patientInitials || <UserRound size={22} />)}
            </Avatar>
            <div>
              <Title level={5}>{patient.name}</Title>
              <Space size={8} wrap>
                <Text type="secondary">{patient.profile.gender || "Chưa cập nhật"}</Text>
                {patientAge !== undefined && <Text type="secondary">{patientAge} tuổi</Text>}
                <Tag>{patient.code || "Chưa có mã BN"}</Tag>
              </Space>
            </div>
          </div>
          {/* Lesion-level facts (diagnosis, doctor, treatment) live on the
              summary card below, scoped to the selected lesion — a patient
              can have several lesions with different doctors, so repeating
              one lesion's facts up here would be misleading, not just
              redundant. */}
          <div className={styles.patientContextActions}>
            <Tag icon={<ShieldCheck size={13} />}>Hồ sơ bệnh án</Tag>
            {canCreateClinicalData && (
              <Button
                type="primary"
                icon={<UploadCloud size={16} />}
                onClick={() => openObservationEntry()}
              >
                Tải ảnh mới để phân tích
              </Button>
            )}
          </div>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={<span className={styles.sectionTitle}><b>01</b> Tổn thương theo dõi</span>}
            extra={
              canCreateClinicalData ? (
                <Button size="small" onClick={openLesionEntry}>
                  Thêm tổn thương
                </Button>
              ) : null
            }
            className={styles.selectorCard}
          >
            <LesionSelector
              lesions={lesions}
              selectedId={selectedLesionId}
              onSelect={setSelectedLesionId}
              onDelete={hideLesion}
            />
          </Card>
        </Col>
        <Col span={24}>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <div className={styles.summaryTitleGroup}>
                <Space wrap align="center">
                  <Tag color="blue" className={styles.codeTag}>{bundle.lesion.code}</Tag>
                  <Title level={4}>{bundle.lesion.title}</Title>
                </Space>
                <div className={styles.summaryMetaRow}>
                  <Text type="secondary" className={styles.summaryMetaItem}>
                    <MapPin size={13} /> {bundle.lesion.bodyRegion}
                  </Text>
                  <Text type="secondary" className={styles.summaryMetaDot}>•</Text>
                  <Text type="secondary" className={styles.summaryMetaItem}>
                    <Stethoscope size={13} /> {bundle.lesion.diagnosis ?? "Chưa có chẩn đoán liên quan"}
                  </Text>
                </div>
              </div>
              <Space wrap align="center">
                <Tag color={bundle.lesion.status === "ARCHIVED" ? "default" : "processing"} className={styles.statusPill}>
                  {lesionStatusLabel[bundle.lesion.status]}
                </Tag>
                {!patient && canCreateClinicalData && (
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<UploadCloud size={14} />}
                    onClick={() => openObservationEntry()}
                  >
                    Tải ảnh mới
                  </Button>
                )}
              </Space>
            </div>

            <div className={styles.summaryStats}>
              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={`${styles.statIcon} ${styles.statIconBlue}`}><Clock size={15} /></span>
                  <Text type="secondary" className={styles.statTitle}>Thời gian theo dõi</Text>
                </div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>{durationDays}</span>
                  <span className={styles.statUnit}>ngày</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={`${styles.statIcon} ${styles.statIconTeal}`}><Layers size={15} /></span>
                  <Text type="secondary" className={styles.statTitle}>Quan sát hợp lệ</Text>
                </div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>
                    {bundle.observations.filter((item) =>
                      ["VERIFIED", "READY_FOR_REVIEW"].includes(item.status),
                    ).length}
                  </span>
                  <span className={styles.statUnit}>lần</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={`${styles.statIcon} ${styles.statIconPurple}`}><Pill size={15} /></span>
                  <Text type="secondary" className={styles.statTitle}>Điều trị hiện tại</Text>
                </div>
                <div className={styles.statBodyText}>
                  <Text strong ellipsis={{ tooltip: bundle.lesion.currentTreatment ?? undefined }}>
                    {bundle.lesion.currentTreatment ?? "Chưa ghi nhận"}
                  </Text>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={`${styles.statIcon} ${styles.statIconIndigo}`}><UserCheck size={15} /></span>
                  <Text type="secondary" className={styles.statTitle}>Bác sĩ phụ trách</Text>
                </div>
                <div className={styles.statBodyText}>
                  <Text strong ellipsis={{ tooltip: bundle.lesion.clinicianName ?? undefined }}>
                    {bundle.lesion.clinicianName ?? "Chưa phân công"}
                  </Text>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={`${styles.statIcon} ${styles.statIconGold}`}><ShieldCheck size={15} /></span>
                  <Text type="secondary" className={styles.statTitle}>Trạng thái xác nhận</Text>
                </div>
                <div className={styles.statBodyTag}>
                  <Tag
                    color={
                      reviewState === "AWAITING_CLINICIAN_REVIEW"
                        ? "gold"
                        : reviewState === "CLINICIAN_CONFIRMED"
                          ? "green"
                          : "default"
                    }
                  >
                    {reviewStateLabel[reviewState]}
                  </Tag>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {validObservationCount < 2 ? (
        canCreateClinicalData ? (
          <DermaBaselineUploader
            lesion={bundle.lesion}
            observations={bundle.observations}
            creating={creatingObservation}
            requesting={requestingComparison}
            error={mutationError?.message}
            onCreateObservation={createObservation}
            onRequestComparison={requestComparison}
          />
        ) : (
          <Card>
            <Empty description="Chưa có đủ ảnh theo dõi được tải lên cho tổn thương này">
              <Text type="secondary" style={{ maxWidth: 420, display: "block" }}>
                Chỉ chính bệnh nhân, hoặc bác sĩ/điều dưỡng đang được phân công
                chăm sóc bệnh nhân này, mới có thể tải ảnh theo dõi mới để so
                sánh tiến triển.
              </Text>
            </Empty>
          </Card>
        )
      ) : (
        <>
          {/* The answer comes before the setup UI — a returning user should
              never have to scroll past the baseline/follow-up picker to
              find out what the system concluded. */}
          <div ref={resultsRef}>
            {!patientMode && sessionMatchesPair && session ? (
              <ResultSummaryCard
                lesion={bundle.lesion}
                session={session}
                baseline={baseline}
                target={target}
                primaryAction={
                  resultPrimaryAction ??
                  (session.analysis
                    ? {
                        label: "Xem bằng chứng chi tiết",
                        onClick: () =>
                          viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                      }
                    : undefined)
                }
                onRetry={
                  session.status === "FAILED" && baselineId && targetId
                    ? () =>
                        void reanalyzeComparison(baselineId, targetId).catch((cause: unknown) => {
                          void message.error(
                            cause instanceof Error ? cause.message : "Không thể chạy lại phân tích.",
                          );
                        })
                    : undefined
                }
                retrying={reanalyzing}
              />
            ) : (
              validPair && (
                <Alert
                  type="info"
                  showIcon
                  message="Chưa có kết quả cho cặp ảnh đang chọn"
                  description='Bấm "Chạy AI đối chiếu" ở khu vực thiết lập bên dưới để xem kết quả.'
                />
              )
            )}
          </div>

          <Card
            title={<span className={styles.sectionTitle}><b>02</b> Thiết lập so sánh tiến triển</span>}
            extra={
              <Space size={10}>
                <Tag color="blue">{validObservationCount} ảnh đủ điều kiện</Tag>
                {validPair && (
                  <Button
                    type="primary"
                    icon={session?.status === "FAILED" ? <RefreshCw size={15} /> : <Sparkles size={15} />}
                    loading={requestingComparison}
                    onClick={() => {
                      if (!baselineId || !targetId) return;
                      const isRetry = session?.status === "FAILED";
                      void requestComparison(baselineId, targetId)
                        .then(() => {
                          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        })
                        .catch((cause: unknown) => {
                          void message.error(
                            cause instanceof Error
                              ? cause.message
                              : isRetry
                                ? "Không thể gửi lại phân tích."
                                : "Không thể tạo phiên so sánh.",
                          );
                        });
                    }}
                    style={{
                      fontWeight: 600,
                      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      borderColor: "#1d4ed8",
                      boxShadow: "0 3px 10px rgba(37, 99, 235, 0.35)",
                    }}
                  >
                    {requestingComparison
                      ? "Đang phân tích..."
                      : session?.status === "FAILED"
                        ? "Phân tích lại"
                        : "Chạy AI đối chiếu"}
                  </Button>
                )}
              </Space>
            }
            className={styles.selectionCard}
          >
            <div className={styles.comparisonPair}>
              <article className={styles.observationPicker}>
                <div className={styles.observationPickerHeader}>
                  <div>
                    <span className={styles.observationStep}>MỐC 01</span>
                    <Text strong>Ảnh ban đầu (Baseline)</Text>
                  </div>
                  {canCreateClinicalData && (
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      icon={<UploadCloud size={13} />}
                      onClick={() => openObservationEntry("baseline")}
                    >
                      + Tải ảnh mốc 1
                    </Button>
                  )}
                </div>

                <div className={styles.observationPreview}>
                  {observationPreview(baseline) ? (
                    <img src={observationPreview(baseline)} alt="Ảnh tổn thương tại mốc ban đầu" />
                  ) : (
                    <div className={styles.observationPreviewEmpty}>
                      <ImageIcon size={28} />
                      <span>Ảnh được bảo vệ</span>
                    </div>
                  )}
                  <span className={styles.previewBadge}>BASELINE</span>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label className={styles.observationSelectLabel}>
                    Chọn thời điểm quan sát ban đầu:
                  </label>
                  <Select
                    value={baselineId}
                    onChange={setBaselineId}
                    className={styles.fullWidth}
                    popupMatchSelectWidth={false}
                    options={buildObservationOptions(bundle.observations, targetId)}
                    optionRender={(option) =>
                      renderObservationOption(option.data as unknown as ObservationSelectOption)
                    }
                  />
                </div>

                {baseline && (
                  <div className={styles.observationMeta}>
                    <span><CalendarDays size={13} />{new Date(baseline.capturedAt).toLocaleDateString("vi-VN")}</span>
                    <Tag color={baseline.status === "VERIFIED" ? "green" : "blue"}>
                      {observationStatusLabel[baseline.status]}
                    </Tag>
                  </div>
                )}
              </article>

              <article className={`${styles.observationPicker} ${styles.observationPickerCurrent}`}>
                <div className={styles.observationPickerHeader}>
                  <div>
                    <span className={styles.observationStep}>MỐC 02</span>
                    <Text strong>Ảnh hiện tại (Follow-up)</Text>
                  </div>
                  {canCreateClinicalData && (
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      icon={<UploadCloud size={13} />}
                      onClick={() => openObservationEntry("target")}
                    >
                      + Tải ảnh mốc 2
                    </Button>
                  )}
                </div>

                <div className={styles.observationPreview}>
                  {observationPreview(target) ? (
                    <img src={observationPreview(target)} alt="Ảnh tổn thương tại mốc hiện tại" />
                  ) : (
                    <div className={styles.observationPreviewEmpty}>
                      <ImageIcon size={28} />
                      <span>Ảnh được bảo vệ</span>
                    </div>
                  )}
                  <span className={`${styles.previewBadge} ${styles.previewBadgeCurrent}`}>FOLLOW-UP</span>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label className={styles.observationSelectLabel}>
                    Chọn thời điểm quan sát hiện tại:
                  </label>
                  <Select
                    value={targetId}
                    onChange={setTargetId}
                    className={styles.fullWidth}
                    popupMatchSelectWidth={false}
                    options={buildObservationOptions(bundle.observations, baselineId)}
                    optionRender={(option) =>
                      renderObservationOption(option.data as unknown as ObservationSelectOption)
                    }
                  />
                </div>

                {target && (
                  <div className={styles.observationMeta}>
                    <span><CalendarDays size={13} />{new Date(target.capturedAt).toLocaleDateString("vi-VN")}</span>
                    <Tag color={target.status === "VERIFIED" ? "green" : "blue"}>
                      {observationStatusLabel[target.status]}
                    </Tag>
                  </div>
                )}
              </article>
            </div>
            {!validPair && (
              <Alert
                type="warning"
                showIcon
                message="Cặp quan sát không hợp lệ"
                description="Mốc hiện tại phải sau mốc ban đầu, khác nhau và có chất lượng ảnh sử dụng được."
              />
            )}
          </Card>

          {validPair &&
            baseline &&
            target &&
            sessionMatchesPair &&
            session?.analysis && (
              <div ref={viewerRef}>
                <Row gutter={[16, 16]} align="stretch">
                  <Col xs={24} xl={15} style={{ display: "flex", flexDirection: "column" }}>
                    <ComparisonWorkbench
                      key={`${baseline.id}:${target.id}:${evidenceMode ?? "default"}`}
                      baseline={baseline}
                      target={target}
                      analysis={session.analysis}
                      evidenceMode={evidenceMode}
                      onCorrectMask={
                        doctorMode
                          ? (asset) => setMaskCorrectionTarget({ assetId: asset.id, side: asset.side })
                          : undefined
                      }
                      onReanalyze={
                        doctorMode
                          ? () => {
                              if (!baselineId || !targetId) return;
                              void reanalyzeComparison(baselineId, targetId).catch((cause: unknown) => {
                                void message.error(
                                  cause instanceof Error ? cause.message : "Không thể chạy lại phân tích.",
                                );
                              });
                            }
                          : undefined
                      }
                      reanalyzing={reanalyzing}
                    />
                  </Col>
                  <Col xs={24} xl={9} style={{ display: "flex", flexDirection: "column" }}>
                    <ImageQualityPanel session={session} />
                  </Col>
                </Row>
                {!patientMode && (
                  <Row gutter={[16, 16]} align="stretch" style={{ marginTop: 16 }}>
                    <Col xs={24} xl={15} style={{ display: "flex", flexDirection: "column" }}>
                      <div ref={metricRef} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <MetricsPanel
                          session={session}
                          focusedMetric={focusedMetric}
                          patientMode={patientMode}
                        />
                      </div>
                    </Col>
                    <Col xs={24} xl={9} style={{ display: "flex", flexDirection: "column" }}>
                      <ExplainabilityPanel
                        session={session}
                        baseline={baseline}
                        target={target}
                        onEvidence={onEvidence}
                        onViewEvidence={jumpToEvidence}
                        patientMode={patientMode}
                      />
                    </Col>
                  </Row>
                )}
              </div>
            )}

          {validPair && !sessionMatchesPair && (
            <Text type="secondary" style={{ display: "block", marginTop: -4 }}>
              Bấm "Chạy AI đối chiếu" ở giữa hai ảnh phía trên — kết quả sẽ hiện ngay bên trên khi xong.
            </Text>
          )}
        </>
      )}

      {patientMode && (
        <PatientClinicalGPS
          lesion={bundle.lesion}
          observations={bundle.observations}
          session={sessionMatchesPair ? session : null}
          baseline={baseline}
          target={target}
          onViewImages={() => viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          onRecapture={() => setObservationEntryOpen(true)}
        />
      )}

      {/* Review status + "Mở review lâm sàng" now live in ResultSummaryCard
          at the top of the page — a second review card here duplicated that
          exact conclusion further down, so it's gone rather than repeated. */}
      <SafetyPanel
        lesion={bundle.lesion}
        patientId={patientId}
        canReport={canCreateClinicalData}
        onReported={retry}
      />

      <div ref={timelineRef}>
        <UnifiedTimeline events={bundle.timeline} focusedId={focusedEvent} />
      </div>

      {!patientMode && (
        <Collapse
          ghost
          className={styles.provenanceDisclosure}
          items={[
            {
              key: "provenance",
              label: "Chi tiết kỹ thuật & audit",
              children: <ProvenancePanel bundle={bundle} />,
            },
          ]}
        />
      )}

      <ClinicianReviewDrawer
        open={reviewOpen}
        loading={reviewing}
        session={session}
        onClose={() => setReviewOpen(false)}
        onSubmit={handleReview}
      />
      <MaskCorrectionDrawer
        open={Boolean(maskCorrectionTarget)}
        loading={correctingMask}
        target={maskCorrectionTarget}
        onClose={() => setMaskCorrectionTarget(null)}
        onSubmit={handleCorrectMask}
      />
      <LesionEntryDrawer
        open={lesionEntryOpen}
        loading={creatingLesion}
        doctorMode={doctorMode}
        error={mutationError?.message}
        onClose={() => setLesionEntryOpen(false)}
        onSubmit={handleCreateLesion}
      />
      <ObservationEntryDrawer
        open={observationEntryOpen}
        loading={creatingObservation}
        clinicalMode={clinicalMode}
        error={mutationError?.message}
        minCapturedAt={bundle.lesion.firstObservedAt}
        onClose={() => setObservationEntryOpen(false)}
        onSubmit={handleCreateObservation}
      />
    </div>
  );
}
