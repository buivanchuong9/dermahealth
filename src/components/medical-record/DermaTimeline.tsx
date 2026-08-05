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
  Statistic,
  Tag,
  Typography,
  App as AntApp,
} from "antd";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Image as ImageIcon,
  ImagePlus,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from "lucide-react";
import type { Patient } from "../../domain/core/entities";
import {
  canReviewComparison,
  deriveReviewState,
  isValidObservationPair,
  selectDefaultObservationPair,
  validObservationsSorted,
  type EvidenceLink,
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
import { ComparisonWorkbench } from "./DermaComparisonWorkbench";
import {
  ExplainabilityPanel,
  ImageQualityPanel,
  MetricsPanel,
  ProvenancePanel,
  SafetyPanel,
} from "./DermaClinicalPanels";
import { DermaBaselineUploader } from "./DermaBaselineUploader";
import { PatientRecoveryOverview } from "./PatientRecoveryOverview";
import styles from "./DermaTimeline.module.scss";

const { Text, Title } = Typography;

const assessmentLabel = {
  IMPROVING: "Cải thiện",
  STABLE: "Ổn định",
  WORSENING: "Xấu đi",
  INDETERMINATE: "Chưa xác định",
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
    correctingMask,
    error,
    mutationError,
    clearMutationError,
    retry,
    createLesion,
    createObservation,
    submitReview,
    requestComparison,
    correctMask,
  } = useDermaTimeline(patientId, actor);
  const [selection, setSelection] = useState<{
    lesionId: string;
    baselineId?: string;
    targetId?: string;
  }>();
  const [lesionEntryOpen, setLesionEntryOpen] = useState(false);
  const [observationEntryOpen, setObservationEntryOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [maskCorrectionTarget, setMaskCorrectionTarget] = useState<{
    assetId: string;
    side: "baseline" | "target";
  } | null>(null);
  const [focusedMetric, setFocusedMetric] = useState<string>();
  const [focusedEvent, setFocusedEvent] = useState<string>();
  const [evidenceMode, setEvidenceMode] = useState<"difference" | "mask">();
  const metricRef = useRef<HTMLDivElement>(null);
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
  const openObservationEntry = () => {
    clearMutationError();
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
      await createObservation(input);
      setObservationEntryOpen(false);
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
  const hasResult = Boolean(sessionMatchesPair && session?.analysis);
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
    } else {
      setFocusedEvent(evidence.targetId);
      timelineRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
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
                onClick={openObservationEntry}
              >
                Tải ảnh mới để phân tích
              </Button>
            )}
          </div>
        </Card>
      )}

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={7} xl={6}>
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
            />
          </Card>
        </Col>
        <Col xs={24} lg={17} xl={18}>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <div className={styles.summaryTitleGroup}>
                <Space wrap>
                  <Tag color="blue">{bundle.lesion.code}</Tag>
                  <Title level={4}>{bundle.lesion.title}</Title>
                </Space>
                <Text type="secondary">
                  {bundle.lesion.bodyRegion} ·{" "}
                  {bundle.lesion.diagnosis ?? "Chưa có chẩn đoán liên quan"}
                </Text>
              </div>
              <Space wrap>
                <Tag
                  color={
                    bundle.lesion.currentAssessment === "WORSENING"
                      ? "red"
                      : bundle.lesion.currentAssessment === "IMPROVING"
                        ? "green"
                        : "default"
                  }
                >
                  {assessmentLabel[bundle.lesion.currentAssessment]}
                </Tag>
                {!patient && canCreateClinicalData && (
                  <Button
                    size="small"
                    icon={<UploadCloud size={14} />}
                    onClick={openObservationEntry}
                  >
                    Tải ảnh mới
                  </Button>
                )}
              </Space>
            </div>
            <div className={styles.summaryStats}>
              <Statistic
                title="Thời gian theo dõi"
                value={durationDays}
                suffix="ngày"
              />
              <Statistic
                title="Quan sát hợp lệ"
                value={
                  bundle.observations.filter((item) =>
                    ["VERIFIED", "READY_FOR_REVIEW"].includes(item.status),
                  ).length
                }
              />
              <div>
                <Text type="secondary">Điều trị hiện tại</Text>
                <Text strong>
                  {bundle.lesion.currentTreatment ?? "Chưa ghi nhận"}
                </Text>
              </div>
              <div>
                <Text type="secondary">Bác sĩ phụ trách</Text>
                <Text strong>
                  {bundle.lesion.clinicianName ?? "Chưa phân công"}
                </Text>
              </div>
              <div>
                <Text type="secondary">Trạng thái xác nhận</Text>
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
          <Card
            title={<span className={styles.sectionTitle}><b>02</b> Thiết lập so sánh tiến triển</span>}
            extra={<Tag color="blue">{validObservationCount} ảnh đủ điều kiện</Tag>}
            className={styles.selectionCard}
          >
            {canCreateClinicalData && (
              <div className={styles.uploadCallout}>
                <span className={styles.uploadCalloutIcon}>
                  <ImagePlus size={22} />
                </span>
                <div className={styles.uploadCalloutCopy}>
                  <Text strong>Tải ảnh theo dõi mới để AI phân tích</Text>
                  <Text type="secondary">
                    Chọn ảnh JPEG, PNG hoặc WebP tối đa 10 MB. Ảnh mới sẽ được
                    thêm vào danh sách mốc so sánh bên dưới.
                  </Text>
                </div>
                <Button
                  type="primary"
                  icon={<UploadCloud size={16} />}
                  onClick={openObservationEntry}
                >
                  Chọn ảnh tải lên
                </Button>
              </div>
            )}
            <div className={styles.comparisonPair}>
              <article className={styles.observationPicker}>
                <div className={styles.observationPickerHeader}>
                  <div>
                    <span className={styles.observationStep}>MỐC 01</span>
                    <Text strong>Ảnh ban đầu</Text>
                  </div>
                  <Tag>Đối chứng</Tag>
                </div>
                <div className={styles.observationPreview}>
                  {observationPreview(baseline) ? (
                    <img src={observationPreview(baseline)} alt="Ảnh tổn thương tại mốc ban đầu" />
                  ) : (
                    <div className={styles.observationPreviewEmpty}>
                      <ImageIcon size={30} />
                      <span>Ảnh được bảo vệ</span>
                    </div>
                  )}
                  <span className={styles.previewBadge}>BASELINE</span>
                </div>
                <label className={styles.observationSelectLabel}>
                  Chọn lần theo dõi
                </label>
                <Select
                  value={baselineId}
                  onChange={setBaselineId}
                  className={styles.fullWidth}
                  options={bundle.observations.map((item) => ({
                    value: item.id,
                    label: `${new Date(item.capturedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} · ${observationStatusLabel[item.status]}`,
                    disabled:
                      item.id === targetId ||
                      item.imageQualityStatus === "UNUSABLE",
                  }))}
                />
                {baseline && (
                  <div className={styles.observationMeta}>
                    <span><CalendarDays size={14} />{new Date(baseline.capturedAt).toLocaleDateString("vi-VN")}</span>
                    <Tag color={baseline.status === "VERIFIED" ? "green" : "blue"}>
                      {observationStatusLabel[baseline.status]}
                    </Tag>
                  </div>
                )}
              </article>

              <div className={styles.comparisonDirection} aria-hidden="true">
                <span><ArrowRight size={20} /></span>
                <Text>AI đối chiếu</Text>
              </div>

              <article className={`${styles.observationPicker} ${styles.observationPickerCurrent}`}>
                <div className={styles.observationPickerHeader}>
                  <div>
                    <span className={styles.observationStep}>MỐC 02</span>
                    <Text strong>Ảnh hiện tại</Text>
                  </div>
                  <Tag color="blue">Theo dõi</Tag>
                </div>
                <div className={styles.observationPreview}>
                  {observationPreview(target) ? (
                    <img src={observationPreview(target)} alt="Ảnh tổn thương tại mốc hiện tại" />
                  ) : (
                    <div className={styles.observationPreviewEmpty}>
                      <ImageIcon size={30} />
                      <span>Ảnh được bảo vệ</span>
                    </div>
                  )}
                  <span className={`${styles.previewBadge} ${styles.previewBadgeCurrent}`}>FOLLOW-UP</span>
                </div>
                <label className={styles.observationSelectLabel}>
                  Chọn lần theo dõi
                </label>
                <Select
                  value={targetId}
                  onChange={setTargetId}
                  className={styles.fullWidth}
                  options={bundle.observations.map((item) => ({
                    value: item.id,
                    label: `${new Date(item.capturedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} · ${observationStatusLabel[item.status]}`,
                    disabled:
                      item.id === baselineId ||
                      item.imageQualityStatus === "UNUSABLE",
                  }))}
                />
                {target && (
                  <div className={styles.observationMeta}>
                    <span><CalendarDays size={14} />{new Date(target.capturedAt).toLocaleDateString("vi-VN")}</span>
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
              <>
                <Row gutter={[16, 16]} align="stretch">
                  <Col xs={24} xl={16}>
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
                    />
                  </Col>
                  <Col xs={24} xl={8}>
                    <ImageQualityPanel session={session} />
                  </Col>
                </Row>
                {!patientMode && (
                  <Row gutter={[16, 16]}>
                    <Col xs={24} xl={9}>
                      <ExplainabilityPanel
                        session={session}
                        onEvidence={onEvidence}
                      />
                    </Col>
                    <Col xs={24} xl={15}>
                      <div ref={metricRef}>
                        <MetricsPanel
                          session={session}
                          focusedMetric={focusedMetric}
                        />
                      </div>
                    </Col>
                  </Row>
                )}
              </>
            )}

          {validPair && !sessionMatchesPair && (
            <Alert
              type="info"
              showIcon
              message="Chưa có phiên phân tích cho cặp quan sát này"
              description="Yêu cầu được gửi kèm idempotency key để tránh tạo job trùng khi thử lại."
              action={
                <Button
                  loading={requestingComparison}
                  onClick={() => {
                    if (!baselineId || !targetId) return;
                    void requestComparison(baselineId, targetId).catch(
                      (cause: unknown) => {
                        void message.error(
                          cause instanceof Error
                            ? cause.message
                            : "Không thể tạo phiên so sánh.",
                        );
                      },
                    );
                  }}
                >
                  Yêu cầu phân tích
                </Button>
              }
            />
          )}

          {session?.status === "NEEDS_RECAPTURE" && (
            <Alert
              type="warning"
              showIcon
              icon={<CircleAlert />}
              message="Cần chụp lại ảnh"
              description={
                session.failureReason ??
                "Ảnh không đủ chất lượng để đưa ra nhận định đáp ứng điều trị."
              }
              action={<Button>Hướng dẫn chụp lại</Button>}
            />
          )}
          {session?.status === "FAILED" && (
            <div className={`${styles.analysisState} ${styles.analysisStateFailed}`}>
              <span className={styles.analysisStateIcon}><CircleAlert size={22} /></span>
              <div>
                <Text strong>Không thể hoàn tất phân tích tự động</Text>
                <Text type="secondary">
                  Ảnh gốc vẫn an toàn trong hồ sơ. Bạn có thể gửi lại cùng cặp ảnh mà không tạo bản ghi trùng.
                </Text>
              </div>
              <Button
                icon={<RefreshCw size={14} />}
                loading={requestingComparison}
                onClick={() => {
                  if (!baselineId || !targetId) return;
                  void requestComparison(baselineId, targetId).catch((cause: unknown) => {
                    void message.error(cause instanceof Error ? cause.message : "Không thể gửi lại phân tích.");
                  });
                }}
              >
                Phân tích lại
              </Button>
            </div>
          )}

        </>
      )}

      {patientMode && validPair && sessionMatchesPair && (
        <PatientRecoveryOverview
          lesion={bundle.lesion}
          observations={bundle.observations}
          session={session}
        />
      )}

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={!patientMode && hasResult ? 12 : 24}>
          <SafetyPanel
            lesion={bundle.lesion}
            analysis={session?.analysis}
            patientId={patientId}
            canReport={canCreateClinicalData}
            onReported={retry}
          />
        </Col>
        {/* Review is a decision panel, not a status readout — it only earns
            a slot on the page once there's an actual result to decide on.
            Before that, the step indicator above already communicates
            "not there yet"; a second empty card would be redundant. */}
        {!patientMode && hasResult && (
          <Col xs={24} lg={12}>
            {session?.status === "READY_FOR_REVIEW" && session.analysis ? (
              <Card className={styles.reviewBanner}>
                <div>
                  {reviewState === "AWAITING_CLINICIAN_REVIEW" ? (
                    <CircleAlert size={22} />
                  ) : (
                    <CheckCircle2 size={22} />
                  )}
                  <div>
                    <Title level={5}>{reviewStateLabel[reviewState]}</Title>
                    <Text>
                      Kết quả hỗ trợ không thay thế đánh giá của bác sĩ.
                    </Text>
                  </div>
                </div>
                {canReview ? (
                  <Button type="primary" onClick={() => setReviewOpen(true)}>
                    Mở review lâm sàng
                  </Button>
                ) : (
                  <Text type="secondary">
                    Tác vụ review chỉ hiển thị cho vai trò lâm sàng được phép.
                  </Text>
                )}
              </Card>
            ) : (
              <Card size="small" title="Đánh giá của bác sĩ" className={styles.panelCard}>
                <Text type="secondary">
                  Kết quả phân tích đã có nhưng chưa ở trạng thái chờ bác sĩ xác nhận.
                </Text>
              </Card>
            )}
          </Col>
        )}
      </Row>

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
