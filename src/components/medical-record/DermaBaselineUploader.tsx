import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Space,
  Tag,
  Typography,
  Upload,
  App as AntApp,
} from "antd";
import { CalendarClock, Download, ImagePlus, UploadCloud } from "lucide-react";
import type { Lesion, LesionObservation } from "../../domain/skinProgress";
import { validObservationsSorted } from "../../domain/skinProgress";
import type { ObservationEntryInput } from "./useDermaTimeline";
import styles from "./DermaTimeline.module.scss";

const { Text } = Typography;

const localDateTimeValue = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const asIsoDateTime = (value: string): string => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp))
    throw new Error("Thời điểm nhập không hợp lệ.");
  return new Date(timestamp).toISOString();
};

const validateImageFile = (file: File): string | undefined => {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Ảnh phải có định dạng JPEG, PNG hoặc WebP.";
  }
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    return "Ảnh phải có dung lượng lớn hơn 0 và không vượt quá 10 MB.";
  }
  return undefined;
};

const thumbnailOf = (observation: LesionObservation): string | undefined =>
  observation.imageAssets.find(
    (asset) => asset.type === "THUMBNAIL" || asset.type === "ORIGINAL",
  )?.protectedUrl ?? undefined;

type Slot = "baseline" | "target";

/**
 * The mockup's "Chọn mốc so sánh" upload flow: two explicit slots, baseline
 * and follow-up. Rendered whenever a lesion has fewer than two comparison-
 * eligible observations (see validObservationsSorted). If a valid baseline
 * already exists, that slot shows a read-only thumbnail instead of another
 * upload control — only the missing photo is asked for.
 */
export function DermaBaselineUploader({
  observations,
  creating,
  requesting,
  error,
  onCreateObservation,
  onRequestComparison,
}: {
  lesion: Lesion;
  observations: LesionObservation[];
  creating: boolean;
  requesting: boolean;
  error?: string;
  onCreateObservation: (
    input: ObservationEntryInput,
  ) => Promise<LesionObservation>;
  onRequestComparison: (baselineId: string, targetId: string) => Promise<void>;
}) {
  const { message } = AntApp.useApp();
  const existingBaseline = validObservationsSorted(observations)[0];
  const [baselineFile, setBaselineFile] = useState<File>();
  const [targetFile, setTargetFile] = useState<File>();
  const [baselineCapturedAt, setBaselineCapturedAt] = useState(
    localDateTimeValue(),
  );
  const [targetCapturedAt, setTargetCapturedAt] = useState(
    localDateTimeValue(),
  );
  const [fileError, setFileError] = useState<{ slot: Slot; message: string }>();
  const [submitting, setSubmitting] = useState(false);

  const needBaseline = !existingBaseline;
  const canSubmit = (needBaseline ? Boolean(baselineFile) : true) && Boolean(targetFile);
  const busy = creating || requesting || submitting;

  const pickFile = (slot: Slot, selected: File) => {
    const issue = validateImageFile(selected);
    if (issue) {
      setFileError({ slot, message: issue });
      return;
    }
    setFileError(undefined);
    if (slot === "baseline") setBaselineFile(selected);
    else setTargetFile(selected);
  };

  const submit = async () => {
    if (!canSubmit || busy) return;
    setSubmitting(true);
    try {
      let baselineId = existingBaseline?.id;
      if (!baselineId && baselineFile) {
        const created = await onCreateObservation({
          file: baselineFile,
          capturedAt: asIsoDateTime(baselineCapturedAt),
          patientReportedSymptoms: [],
          observationRole: "baseline",
        });
        baselineId = created.id;
      }
      if (!targetFile || !baselineId) return;
      const target = await onCreateObservation({
        file: targetFile,
        capturedAt: asIsoDateTime(targetCapturedAt),
        patientReportedSymptoms: [],
        observationRole: "target",
      });
      if (target.id === baselineId) {
        throw new Error(
          "Ảnh sau khám trùng với ảnh ban đầu đã ghi nhận — vui lòng chọn một ảnh chụp khác cho mốc theo dõi.",
        );
      }
      await onRequestComparison(baselineId, target.id);
      setBaselineFile(undefined);
      setTargetFile(undefined);
      void message.success("Đã tải ảnh và yêu cầu phân tích so sánh.");
    } catch (cause) {
      void message.error(
        cause instanceof Error
          ? cause.message
          : "Không thể tải ảnh và tạo so sánh.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Chọn mốc so sánh" className={styles.selectionCard}>
      <Text type="secondary">
        Tải ảnh tổn thương ban đầu và ảnh sau khám để theo dõi tiến triển và
        tạo báo cáo so sánh.
      </Text>
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 12 }}
        message="Đặt thẻ đo DermaHealth cạnh tổn thương khi chụp"
        description="Đặt thẻ đo (nằm cạnh tổn thương, cùng mặt phẳng với vùng da, không nghiêng/che khuất) vào khung hình cả hai lần chụp để hệ thống đo được diện tích tổn thương chính xác theo cm² thay vì chỉ tỷ lệ tương đối. Chưa có thẻ đo? Tải mẫu in bên dưới."
        action={
          <a href="/dermahealth-calibration-card.svg" download="dermahealth-calibration-card.svg">
            <Button size="small" icon={<Download size={14} />}>
              Tải thẻ đo DermaHealth
            </Button>
          </a>
        }
      />
      {error && (
        <Alert
          type="error"
          showIcon
          message="Không thể lưu quan sát"
          description={error}
          style={{ marginTop: 12 }}
        />
      )}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <UploadSlot
            title="Ảnh ban đầu (baseline)"
            existing={existingBaseline}
            file={baselineFile}
            capturedAt={baselineCapturedAt}
            onCapturedAtChange={setBaselineCapturedAt}
            onFile={(file) => pickFile("baseline", file)}
            error={fileError?.slot === "baseline" ? fileError.message : undefined}
            disabled={busy}
          />
        </Col>
        <Col xs={24} md={12}>
          <UploadSlot
            title="Ảnh sau khám (theo dõi)"
            file={targetFile}
            capturedAt={targetCapturedAt}
            onCapturedAtChange={setTargetCapturedAt}
            onFile={(file) => pickFile("target", file)}
            error={fileError?.slot === "target" ? fileError.message : undefined}
            disabled={busy}
          />
        </Col>
      </Row>
      <Space style={{ marginTop: 16 }}>
        <Button
          type="primary"
          icon={<UploadCloud size={16} />}
          loading={busy}
          disabled={!canSubmit}
          onClick={() => void submit()}
        >
          Tải ảnh và tạo so sánh
        </Button>
      </Space>
    </Card>
  );
}

function UploadSlot({
  title,
  existing,
  file,
  capturedAt,
  onCapturedAtChange,
  onFile,
  error,
  disabled,
}: {
  title: string;
  existing?: LesionObservation;
  file?: File;
  capturedAt: string;
  onCapturedAtChange: (value: string) => void;
  onFile: (file: File) => void;
  error?: string;
  disabled: boolean;
}) {
  if (existing) {
    const thumb = thumbnailOf(existing);
    return (
      <Card size="small" title={title} className={styles.uploadSlot}>
        <div className={styles.uploadThumb}>
          {thumb ? (
            <img src={thumb} alt={title} />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có ảnh xem trước"
            />
          )}
        </div>
        <Tag color="green">
          Đã ghi nhận · {new Date(existing.capturedAt).toLocaleDateString("vi-VN")}
        </Tag>
      </Card>
    );
  }
  return (
    <Card size="small" title={title} className={styles.uploadSlot}>
      <Upload.Dragger
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        maxCount={1}
        showUploadList={false}
        disabled={disabled}
        beforeUpload={(selected) => {
          onFile(selected);
          return Upload.LIST_IGNORE;
        }}
      >
        <p>
          <ImagePlus size={22} />
        </p>
        <p>{file ? file.name : "Kéo thả hoặc bấm để chọn ảnh"}</p>
      </Upload.Dragger>
      {file && (
        <Text type="secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Text>
      )}
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginTop: 8 }} />
      )}
      <label className={styles.captureAtLabel}>
        <CalendarClock size={14} /> Thời điểm chụp
        <Input
          type="datetime-local"
          value={capturedAt}
          max={localDateTimeValue()}
          onChange={(event) => onCapturedAtChange(event.target.value)}
          disabled={disabled}
        />
      </label>
    </Card>
  );
}
