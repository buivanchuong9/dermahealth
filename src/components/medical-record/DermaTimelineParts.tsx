import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Col,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  Activity,
  Bot,
  Camera,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  History,
  MapPin,
  Pill,
  RefreshCw,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import type {
  ClinicalAssessment,
  ComparisonSession,
  Lesion,
  ReviewDecision,
  ReviewInput,
  TimelineEvent,
  TimelineEventType,
} from "../../domain/skinProgress";
import type {
  LesionEntryInput,
  ObservationEntryInput,
} from "./useDermaTimeline";
import styles from "./DermaTimeline.module.scss";

const { Text } = Typography;

const assessmentLabel: Record<Lesion["currentAssessment"], string> = {
  IMPROVING: "Đang cải thiện",
  STABLE: "Ổn định",
  WORSENING: "Có dấu hiệu xấu đi",
  INDETERMINATE: "Chưa xác định",
};

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

const isoToLocalInputValue = (iso: string): string => {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

interface LesionFormValues {
  title: string;
  bodyRegion: string;
  laterality: Lesion["laterality"];
  firstObservedAt: string;
  diagnosis?: string;
  currentTreatment?: string;
}

export function LesionEntryDrawer({
  open,
  loading,
  doctorMode,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  doctorMode: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (input: LesionEntryInput) => Promise<void>;
}) {
  const [form] = Form.useForm<LesionFormValues>();
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      laterality: "UNKNOWN",
      firstObservedAt: localDateTimeValue(),
    });
  }, [form, open]);

  return (
    <Drawer
      title="Tạo hồ sơ tổn thương"
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      width={520}
      destroyOnHidden
      maskClosable={!loading}
    >
      <Alert
        type="info"
        showIcon
        message="Tạo định danh theo dõi dọc"
        description="Thông tin này được lưu vào hồ sơ bệnh án; chưa tạo bất kỳ kết luận đáp ứng điều trị nào."
      />
      {error && (
        <Alert
          type="error"
          showIcon
          message="Không thể tạo tổn thương"
          description={error}
          style={{ marginTop: 12 }}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          void onSubmit({
            ...values,
            firstObservedAt: asIsoDateTime(values.firstObservedAt),
          })
        }
        style={{ marginTop: 18 }}
      >
        <Form.Item
          name="title"
          label="Tên tổn thương"
          rules={[
            {
              required: true,
              whitespace: true,
              message: "Nhập tên nhận diện tổn thương.",
            },
            { max: 160 },
            {
              validator: async (_, value: string | undefined) => {
                if (value && value.trim().length < 2) {
                  throw new Error(
                    "Tên sau khi bỏ khoảng trắng phải có ít nhất 2 ký tự.",
                  );
                }
              },
            },
          ]}
        >
          <Input placeholder="Ví dụ: Mảng viêm vùng cẳng tay" maxLength={160} />
        </Form.Item>
        <Form.Item
          name="bodyRegion"
          label="Vùng cơ thể"
          rules={[
            { required: true, whitespace: true, message: "Nhập vùng cơ thể." },
            { max: 120 },
            {
              validator: async (_, value: string | undefined) => {
                if (value && value.trim().length < 2) {
                  throw new Error(
                    "Vùng cơ thể sau khi bỏ khoảng trắng phải có ít nhất 2 ký tự.",
                  );
                }
              },
            },
          ]}
        >
          <Input placeholder="Tên giải phẫu cụ thể" maxLength={120} />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} md={10}>
            <Form.Item
              name="laterality"
              label="Bên"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "LEFT", label: "Trái" },
                  { value: "RIGHT", label: "Phải" },
                  { value: "MIDLINE", label: "Đường giữa" },
                  { value: "UNKNOWN", label: "Không xác định" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={14}>
            <Form.Item
              name="firstObservedAt"
              label="Ghi nhận lần đầu"
              rules={[
                { required: true, message: "Chọn thời điểm ghi nhận lần đầu." },
                {
                  validator: async (_, value: string | undefined) => {
                    if (!value) return;
                    const timestamp = Date.parse(value);
                    if (!Number.isFinite(timestamp))
                      throw new Error("Thời điểm không hợp lệ.");
                    if (timestamp > Date.now() + 5 * 60_000) {
                      throw new Error(
                        "Thời điểm không được nằm trong tương lai.",
                      );
                    }
                  },
                },
              ]}
            >
              <Input type="datetime-local" max={localDateTimeValue()} />
            </Form.Item>
          </Col>
        </Row>
        {doctorMode && (
          <>
            <Form.Item
              name="diagnosis"
              label="Chẩn đoán lâm sàng"
              rules={[{ max: 300 }]}
            >
              <Input.TextArea
                rows={2}
                maxLength={300}
                placeholder="Không điền nếu chưa có chẩn đoán xác lập"
              />
            </Form.Item>
            <Form.Item
              name="currentTreatment"
              label="Điều trị hiện tại"
              rules={[{ max: 1000 }]}
            >
              <Input.TextArea
                rows={3}
                maxLength={1000}
                placeholder="Thuốc, liều, đường dùng hoặc chăm sóc đang áp dụng"
              />
            </Form.Item>
          </>
        )}
        {!doctorMode && (
          <Alert
            type="warning"
            showIcon
            message="Chẩn đoán và điều trị chỉ do bác sĩ nhập"
            style={{ marginBottom: 16 }}
          />
        )}
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            Tạo hồ sơ tổn thương
          </Button>
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
}

interface ObservationFormValues {
  capturedAt: string;
  patientReportedSymptoms?: string[];
  itchScore?: number;
  painScore?: number;
  burningScore?: number;
  sleepImpactScore?: number;
  longestDiameterMm?: number;
  shortAxisMm?: number;
  erythemaSeverity?: number;
  scalingSeverity?: number;
  clinicianNotes?: string;
}

export function ObservationEntryDrawer({
  open,
  loading,
  clinicalMode,
  error,
  minCapturedAt,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  clinicalMode: boolean;
  error?: string;
  minCapturedAt: string;
  onClose: () => void;
  onSubmit: (input: ObservationEntryInput) => Promise<void>;
}) {
  const [form] = Form.useForm<ObservationFormValues>();
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<string>();

  const finish = (values: ObservationFormValues) => {
    if (!file) {
      setFileError("Cần chọn một ảnh gốc để tạo quan sát.");
      return;
    }
    void onSubmit({
      ...values,
      file,
      capturedAt: asIsoDateTime(values.capturedAt),
      patientReportedSymptoms: values.patientReportedSymptoms ?? [],
    });
  };

  return (
    <Drawer
      title="Tạo quan sát tổn thương"
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      width={620}
      destroyOnHidden
      maskClosable={!loading}
      afterOpenChange={(visible) => {
        if (visible) {
          form.resetFields();
          form.setFieldsValue({
            capturedAt: localDateTimeValue(),
            patientReportedSymptoms: [],
          });
          return;
        }
        setFile(undefined);
        setFileError(undefined);
      }}
    >
      <Alert
        type="info"
        showIcon
        message="Ảnh gốc được lưu trong kho bảo vệ"
        description="Chấp nhận đúng một ảnh JPEG, PNG hoặc WebP, tối đa 10 MB. Backend kiểm tra loại tệp và giữ nguyên bằng chứng gốc."
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
      <Form
        form={form}
        layout="vertical"
        onFinish={finish}
        style={{ marginTop: 18 }}
      >
        <Form.Item
          label="Ảnh tổn thương"
          required
          validateStatus={fileError ? "error" : undefined}
          help={fileError}
        >
          <Space direction="vertical" size={8}>
            <Upload
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              maxCount={1}
              showUploadList={false}
              disabled={loading}
              beforeUpload={(selected) => {
                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(
                    selected.type,
                  )
                ) {
                  setFile(undefined);
                  setFileError("Ảnh phải có định dạng JPEG, PNG hoặc WebP.");
                  return Upload.LIST_IGNORE;
                }
                if (selected.size <= 0 || selected.size > 10 * 1024 * 1024) {
                  setFile(undefined);
                  setFileError(
                    "Ảnh phải có dung lượng lớn hơn 0 và không vượt quá 10 MB.",
                  );
                  return Upload.LIST_IGNORE;
                }
                setFile(selected);
                setFileError(undefined);
                return Upload.LIST_IGNORE;
              }}
            >
              <Button icon={<UploadCloud size={16} />}>
                {file ? "Thay ảnh" : "Chọn ảnh gốc"}
              </Button>
            </Upload>
            {file && (
              <Text>
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            )}
          </Space>
        </Form.Item>
        <Form.Item
          name="capturedAt"
          label="Thời điểm chụp"
          rules={[
            { required: true, message: "Chọn thời điểm chụp." },
            {
              validator: async (_, value: string | undefined) => {
                if (!value) return;
                const timestamp = Date.parse(value);
                if (!Number.isFinite(timestamp))
                  throw new Error("Thời điểm không hợp lệ.");
                if (timestamp > Date.now() + 5 * 60_000) {
                  throw new Error(
                    "Thời điểm chụp không được nằm trong tương lai.",
                  );
                }
                if (timestamp < Date.parse(minCapturedAt)) {
                  throw new Error(
                    "Thời điểm chụp không được trước ngày bắt đầu theo dõi tổn thương.",
                  );
                }
              },
            },
          ]}
        >
          <Input
            type="datetime-local"
            min={isoToLocalInputValue(minCapturedAt)}
            max={localDateTimeValue()}
          />
        </Form.Item>
        <Form.Item
          name="patientReportedSymptoms"
          label="Triệu chứng hiện tại"
          rules={[
            { type: "array", max: 30, message: "Tối đa 30 triệu chứng." },
            {
              validator: async (_, values: string[] | undefined) => {
                if (values?.some((value) => value.trim().length > 120)) {
                  throw new Error(
                    "Mỗi triệu chứng không được vượt quá 120 ký tự.",
                  );
                }
              },
            },
          ]}
        >
          <Select
            mode="tags"
            tokenSeparators={[","]}
            placeholder="Nhập triệu chứng rồi nhấn Enter"
            options={[
              { value: "Ngứa", label: "Ngứa" },
              { value: "Đau", label: "Đau" },
              { value: "Bỏng rát", label: "Bỏng rát" },
              { value: "Chảy dịch", label: "Chảy dịch" },
              { value: "Chảy máu", label: "Chảy máu" },
            ]}
          />
        </Form.Item>
        <Text strong>
          Thang điểm do{" "}
          {clinicalMode ? "nhân viên y tế ghi nhận" : "người bệnh tự báo cáo"}
        </Text>
        <Text type="secondary" style={{ display: "block", marginBottom: 10 }}>
          NRS 0 là không có triệu chứng, 10 là mức nặng nhất; để trống khi không
          được đánh giá.
        </Text>
        <Row gutter={12}>
          {[
            ["itchScore", "Ngứa 24 giờ"],
            ["painScore", "Đau 24 giờ"],
            ["burningScore", "Bỏng rát 24 giờ"],
            ["sleepImpactScore", "Ảnh hưởng giấc ngủ 7 ngày"],
          ].map(([name, label]) => (
            <Col xs={24} sm={12} key={name}>
              <Form.Item
                name={name}
                label={label}
                rules={[{ type: "number", min: 0, max: 10 }]}
              >
                <InputNumber
                  min={0}
                  max={10}
                  precision={0}
                  addonAfter="/ 10"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          ))}
        </Row>
        {clinicalMode && (
          <>
            <Alert
              type="warning"
              showIcon
              message="Chỉ nhập số đo trực tiếp"
              description="Kích thước dùng thước chia vạch milimet; ban đỏ và bong vảy dùng đánh giá trực tiếp thang 0–4. Không ước lượng từ ảnh trong trình duyệt."
              style={{ marginBottom: 14 }}
            />
            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="longestDiameterMm"
                  label="Đường kính lớn nhất (mm)"
                  rules={[{ type: "number", min: 0, max: 1000 }]}
                >
                  <InputNumber
                    min={0}
                    max={1000}
                    precision={1}
                    addonAfter="mm"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="shortAxisMm"
                  label="Đường kính vuông góc (mm)"
                  rules={[{ type: "number", min: 0, max: 1000 }]}
                >
                  <InputNumber
                    min={0}
                    max={1000}
                    precision={1}
                    addonAfter="mm"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="erythemaSeverity"
                  label="Ban đỏ"
                  rules={[{ type: "number", min: 0, max: 4 }]}
                >
                  <InputNumber
                    min={0}
                    max={4}
                    precision={0}
                    addonAfter="/ 4"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="scalingSeverity"
                  label="Bong vảy"
                  rules={[{ type: "number", min: 0, max: 4 }]}
                >
                  <InputNumber
                    min={0}
                    max={4}
                    precision={0}
                    addonAfter="/ 4"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="clinicianNotes"
              label="Ghi chú lâm sàng"
              rules={[{ max: 4000 }]}
            >
              <Input.TextArea rows={3} maxLength={4000} />
            </Form.Item>
          </>
        )}
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            Tải ảnh và lưu quan sát
          </Button>
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
}

export function LesionSelector({
  lesions,
  selectedId,
  onSelect,
}: {
  lesions: Lesion[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (!lesions.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Chưa có tổn thương nào được theo dõi"
      />
    );
  }
  return (
    <nav
      className={styles.lesionList}
      aria-label="Danh sách tổn thương được theo dõi"
    >
      {lesions.map((lesion) => {
        const awaiting = lesion.reviewState === "AWAITING_CLINICIAN_REVIEW";
        const warning = lesion.currentAssessment === "WORSENING";
        return (
          <Badge
            key={lesion.id}
            dot={warning || lesion.suspectedAdverseEvent}
            color="#dc2626"
            offset={[-8, 8]}
          >
            <Button
              type="text"
              className={`${styles.lesionItem} ${selectedId === lesion.id ? styles.lesionItemSelected : ""}`}
              onClick={() => onSelect(lesion.id)}
              aria-current={selectedId === lesion.id ? "true" : undefined}
            >
              <span className={styles.lesionCode}>{lesion.code}</span>
              <Text strong ellipsis>
                {lesion.title}
              </Text>
              <span className={styles.lesionMeta}>
                <MapPin size={13} /> {lesion.bodyRegion}
              </span>
              <span className={styles.lesionMeta}>
                <Clock3 size={13} />{" "}
                {new Date(lesion.firstObservedAt).toLocaleDateString("vi-VN")}
              </span>
              <span className={styles.lesionBadges}>
                <Tag
                  color={
                    warning
                      ? "red"
                      : lesion.currentAssessment === "IMPROVING"
                        ? "green"
                        : "default"
                  }
                >
                  {assessmentLabel[lesion.currentAssessment]}
                </Tag>
                {awaiting && <Tag color="gold">Chờ bác sĩ review</Tag>}
                {lesion.suspectedAdverseEvent && (
                  <Tag color="red" icon={<CircleAlert size={11} />}>
                    Biến cố nghi ngờ
                  </Tag>
                )}
              </span>
            </Button>
          </Badge>
        );
      })}
      <Alert
        type="info"
        showIcon
        message="Mỗi mã tổn thương là định danh ổn định trong hồ sơ."
      />
    </nav>
  );
}

type TimelineFilter = "ALL" | "CLINICAL" | "TREATMENT" | "SYSTEM";
const filterTypes: Record<
  Exclude<TimelineFilter, "ALL">,
  TimelineEventType[]
> = {
  CLINICAL: ["OBSERVATION", "IMAGE", "SYMPTOM", "CLINICIAN_REVIEW"],
  TREATMENT: ["TREATMENT", "ADVERSE_EVENT"],
  SYSTEM: ["ANALYSIS", "RECAPTURE"],
};
const typeLabel: Record<TimelineEventType, string> = {
  OBSERVATION: "Quan sát",
  IMAGE: "Hình ảnh",
  TREATMENT: "Điều trị",
  SYMPTOM: "Triệu chứng",
  ANALYSIS: "Phân tích hỗ trợ",
  CLINICIAN_REVIEW: "Review bác sĩ",
  ADVERSE_EVENT: "Biến cố nghi ngờ",
  RECAPTURE: "Chụp lại",
};

const sourceLabel: Record<TimelineEvent["source"], string> = {
  IMAGE_ANALYSIS: "AI phân tích hình ảnh",
  PATIENT_REPORTED: "Người bệnh cung cấp",
  CLINICIAN_REPORTED: "Nhân viên y tế",
  DEVICE: "Thiết bị y tế",
  IMPORTED: "Dữ liệu nhập khẩu",
  SYSTEM: "Hệ thống",
};

const eventIcon = (type: TimelineEventType) => {
  switch (type) {
    case "OBSERVATION": return <Activity size={16} />;
    case "IMAGE": return <Camera size={16} />;
    case "TREATMENT": return <Pill size={16} />;
    case "SYMPTOM": return <CircleAlert size={16} />;
    case "ANALYSIS": return <Bot size={16} />;
    case "CLINICIAN_REVIEW": return <ClipboardCheck size={16} />;
    case "ADVERSE_EVENT": return <TriangleAlert size={16} />;
    case "RECAPTURE": return <RefreshCw size={16} />;
  }
};

const eventTagColor = (event: TimelineEvent) => {
  if (event.warning || event.type === "ADVERSE_EVENT") return "red";
  if (event.type === "CLINICIAN_REVIEW") return "green";
  if (event.type === "TREATMENT") return "purple";
  if (event.type === "ANALYSIS") return "geekblue";
  return "blue";
};

export function UnifiedTimeline({
  events,
  focusedId,
}: {
  events: TimelineEvent[];
  focusedId?: string;
}) {
  const [filter, setFilter] = useState<TimelineFilter>("ALL");
  const [expanded, setExpanded] = useState(false);
  const visible = useMemo(
    () =>
      filter === "ALL"
        ? events
        : events.filter((event) => filterTypes[filter].includes(event.type)),
    [events, filter],
  );
  const shown = expanded ? visible : visible.slice(0, 6);
  const grouped = shown.reduce<Array<{ key: string; label: string; events: TimelineEvent[] }>>(
    (groups, event) => {
      const date = new Date(event.occurredAt);
      const key = date.toLocaleDateString("vi-VN");
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.events.push(event);
        return groups;
      }
      const today = new Date().toLocaleDateString("vi-VN");
      groups.push({
        key,
        label: key === today
          ? "Hôm nay"
          : date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }),
        events: [event],
      });
      return groups;
    },
    [],
  );
  return (
    <Card
      title={
        <div className={styles.timelineCardTitle}>
          <span><History size={18} /></span>
          <div>
            <Text strong>Dòng thời gian chăm sóc</Text>
            <Text type="secondary">{events.length} sự kiện được ghi nhận</Text>
          </div>
        </div>
      }
      extra={
        <Segmented
          size="small"
          value={filter}
          onChange={(value) => {
            setFilter(value as TimelineFilter);
            setExpanded(false);
          }}
          options={[
            { label: "Tất cả", value: "ALL" },
            { label: "Lâm sàng", value: "CLINICAL" },
            { label: "Điều trị", value: "TREATMENT" },
            { label: "Hệ thống", value: "SYSTEM" },
          ]}
        />
      }
      className={`${styles.panelCard} ${styles.timelineCard}`}
    >
      {visible.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có sự kiện nào khớp bộ lọc này"
        />
      ) : (
        <>
          <div className={styles.timelineFeed}>
            {grouped.map((group) => (
              <section className={styles.timelineGroup} key={group.key}>
                <div className={styles.timelineDate}>
                  <Text strong>{group.label}</Text>
                  <span>{group.events.length} hoạt động</span>
                </div>
                <div className={styles.timelineItems}>
                  {group.events.map((event) => (
                    <article
                      id={`derma-event-${event.id}`}
                      key={event.id}
                      className={`${styles.timelineEvent} ${event.warning ? styles.timelineEventWarning : ""} ${event.id === focusedId ? styles.focusedEvent : ""}`}
                    >
                      <span className={styles.timelineEventIcon}>{eventIcon(event.type)}</span>
                      <div className={styles.timelineEventContent}>
                        <div className={styles.timelineEventHeader}>
                          <div>
                            <Text strong>{event.title}</Text>
                            <Tag color={eventTagColor(event)}>{typeLabel[event.type]}</Tag>
                          </div>
                          <time dateTime={event.occurredAt}>
                            {new Date(event.occurredAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          </time>
                        </div>
                        <Text className={styles.timelineEventSummary}>{event.summary}</Text>
                        <div className={styles.timelineEventFooter}>
                          <span>Nguồn: {sourceLabel[event.source]}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {visible.length > 6 && (
            <div className={styles.timelineExpand}>
              <Button
                type="text"
                icon={expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                onClick={() => setExpanded((current) => !current)}
              >
                {expanded ? "Thu gọn dòng thời gian" : `Xem thêm ${visible.length - 6} sự kiện`}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

interface CorrectableMetricConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  precision: number;
  suffix?: string;
}

/** Mirrors the ranges CLINICAL_METRIC_CATALOG enforces server-side
 * (clinical-metric.catalog.ts) so a clinician sees the same bounds before
 * submitting, not just after a 422. The server remains authoritative. */
const CORRECTABLE_METRICS: CorrectableMetricConfig[] = [
  { key: "lesion-area-index", label: "Diện tích tổn thương (chỉ số, mốc = 100%)", min: 0, max: 500, precision: 1, suffix: "%" },
  { key: "erythema-index", label: "Mức ban đỏ (chỉ số, mốc = 100%)", min: 0, max: 500, precision: 1, suffix: "%" },
  { key: "lesion-count-estimate", label: "Số vùng tổn thương phát hiện được", min: 0, max: 50, precision: 0 },
  { key: "itch-nrs-24h", label: "Ngứa NRS (24 giờ)", min: 0, max: 10, precision: 0 },
  { key: "pain-nrs-24h", label: "Đau NRS (24 giờ)", min: 0, max: 10, precision: 0 },
];

type ReviewFormValues = Omit<ReviewInput, "correctedMetrics"> &
  Record<`metric_${string}`, number | null | undefined>;

export function ClinicianReviewDrawer({
  open,
  loading,
  session,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  session?: ComparisonSession | null;
  onClose: () => void;
  onSubmit: (input: ReviewInput) => Promise<void>;
}) {
  const [form] = Form.useForm<ReviewFormValues>();
  const decision = Form.useWatch("decision", form);
  const originalByKey = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const metric of session?.analysis?.metrics ?? []) {
      map.set(metric.key, metric.current);
    }
    return map;
  }, [session]);
  const availableCorrections = CORRECTABLE_METRICS.filter((config) =>
    originalByKey.has(config.key),
  );
  useEffect(() => {
    if (open) {
      form.resetFields();
      const metricFields = Object.fromEntries(
        availableCorrections.map((config) => [
          `metric_${config.key}`,
          originalByKey.get(config.key) ?? undefined,
        ]),
      );
      form.setFieldsValue({
        comment: "",
        reason: "",
        imageLimitations: [],
        requestRecapture: false,
        ...metricFields,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, open]);
  const finish = (values: ReviewFormValues) => {
    const { decision: submittedDecision, clinicalAssessment, comment, imageLimitations, requestRecapture, reason } =
      values;
    const correctedMetrics: Record<string, number> = {};
    if (submittedDecision === "MODIFIED") {
      for (const config of availableCorrections) {
        const original = originalByKey.get(config.key);
        const submitted = values[`metric_${config.key}`];
        if (
          typeof submitted === "number" &&
          Number.isFinite(submitted) &&
          submitted !== original
        ) {
          correctedMetrics[config.key] = submitted;
        }
      }
    }
    void onSubmit({
      decision: submittedDecision,
      clinicalAssessment,
      comment,
      imageLimitations,
      requestRecapture,
      reason,
      correctedMetrics:
        Object.keys(correctedMetrics).length > 0 ? correctedMetrics : undefined,
    });
  };
  return (
    <Drawer
      title="Review lâm sàng"
      open={open}
      onClose={onClose}
      width={480}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        message="Kết quả phân tích gốc được giữ nguyên"
        description="Review tạo bản ghi lâm sàng và audit mới; không ghi đè dữ liệu ban đầu."
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={finish}
        className="derma-review-form"
      >
        <Form.Item
          name="decision"
          label="Quyết định"
          rules={[{ required: true }]}
        >
          <Select<ReviewDecision>
            options={[
              { value: "CONFIRMED", label: "Xác nhận kết quả" },
              { value: "MODIFIED", label: "Điều chỉnh đánh giá" },
              { value: "REJECTED", label: "Từ chối kết quả không tin cậy" },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="clinicalAssessment"
          label="Đánh giá lâm sàng cuối"
          rules={[{ required: true }]}
        >
          <Select<ClinicalAssessment>
            options={[
              { value: "IMPROVING", label: "Cải thiện" },
              { value: "STABLE", label: "Ổn định" },
              { value: "WORSENING", label: "Xấu đi" },
              { value: "INDETERMINATE", label: "Chưa xác định" },
            ]}
          />
        </Form.Item>
        {decision === "MODIFIED" && availableCorrections.length > 0 && (
          <Card
            size="small"
            title="Hiệu chỉnh từng chỉ số"
            style={{ marginBottom: 16 }}
          >
            <Text type="secondary" style={{ display: "block", marginBottom: 10 }}>
              Giữ nguyên ô nào không cần sửa. Chỉ những chỉ số thực sự thay đổi
              mới được gửi làm hiệu chỉnh; kết quả phân tích gốc không bị ghi
              đè.
            </Text>
            <Row gutter={[12, 12]}>
              {availableCorrections.map((config) => (
                <Col xs={24} sm={12} key={config.key}>
                  <Form.Item
                    name={`metric_${config.key}`}
                    label={`${config.label} · gốc: ${originalByKey.get(config.key) ?? "—"}${config.suffix ?? ""}`}
                    rules={[{ type: "number", min: config.min, max: config.max }]}
                  >
                    <InputNumber
                      min={config.min}
                      max={config.max}
                      precision={config.precision}
                      addonAfter={config.suffix}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Card>
        )}
        <Form.Item
          name="comment"
          label="Ghi chú lâm sàng"
          rules={[{ max: 2000 }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Giới hạn hình ảnh, nhận định hoặc chỉ dẫn tái khám…"
          />
        </Form.Item>
        <Form.Item name="imageLimitations" label="Giới hạn hình ảnh">
          <Select
            mode="tags"
            tokenSeparators={[","]}
            placeholder="Ví dụ: ánh sáng không đồng nhất"
          />
        </Form.Item>
        <Form.Item name="requestRecapture" valuePropName="checked">
          <Checkbox>Yêu cầu chụp lại ảnh trước khi kết luận</Checkbox>
        </Form.Item>
        <Form.Item
          name="reason"
          label="Lý do quyết định (bắt buộc cho audit)"
          rules={[
            {
              required: true,
              whitespace: true,
              message: "Cần ghi lý do để hoàn tất audit trail.",
            },
            { max: 500 },
          ]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>
        <Text type="secondary">
          Không cập nhật kết luận lâm sàng trước khi server xác nhận.
        </Text>
        <Space style={{ marginTop: 20 }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Lưu review có kiểm toán
          </Button>
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
}

function MaskCorrectionForm({
  loading,
  onClose,
  onSubmit,
}: {
  loading: boolean;
  onClose: () => void;
  onSubmit: (input: { action: "CONFIRM" | "CORRECT"; file?: File; reason: string }) => Promise<void>;
}) {
  // No reset-on-open effect needed: this component only mounts while the
  // drawer is open (see MaskCorrectionDrawer below), so a fresh mount is
  // always a fresh form.
  const [action, setAction] = useState<"CONFIRM" | "CORRECT">("CONFIRM");
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<string>();
  const [reason, setReason] = useState("");
  const canSubmit = reason.trim().length >= 2 && (action === "CONFIRM" || Boolean(file));
  return (
    <>
      <Alert
        type="info"
        showIcon
        message="Không ghi đè mask gốc"
        description="Xác nhận hoặc chỉnh sửa luôn tạo một bản ghi mask mới, kèm audit; mask do AI đề xuất ban đầu vẫn được giữ nguyên."
      />
      <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
        <Segmented
          block
          value={action}
          onChange={(value) => setAction(value as "CONFIRM" | "CORRECT")}
          options={[
            { label: "Xác nhận mask AI đề xuất", value: "CONFIRM" },
            { label: "Tải lên mask đã chỉnh sửa", value: "CORRECT" },
          ]}
        />
        {action === "CORRECT" && (
          <Space direction="vertical">
            <Upload
              accept=".png,.webp,image/png,image/webp"
              maxCount={1}
              showUploadList={false}
              disabled={loading}
              beforeUpload={(selected) => {
                if (!["image/png", "image/webp"].includes(selected.type)) {
                  setFile(undefined);
                  setFileError("Mask phải là ảnh PNG hoặc WebP (có kênh alpha nếu có thể).");
                  return Upload.LIST_IGNORE;
                }
                setFile(selected);
                setFileError(undefined);
                return false;
              }}
            >
              <Button icon={<UploadCloud size={16} />}>{file ? "Thay ảnh mask" : "Chọn ảnh mask đã chỉnh sửa"}</Button>
            </Upload>
            {file && <Text>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</Text>}
            {fileError && <Text type="danger">{fileError}</Text>}
            <Text type="secondary">
              Vùng có kênh alpha khác 0 (hoặc vùng sáng nếu không có alpha) được tính là vùng tổn thương. Diện tích tương đối sẽ được tính lại từ đúng các pixel này.
            </Text>
          </Space>
        )}
        <Form.Item
          label="Lý do (bắt buộc cho audit)"
          required
          validateStatus={reason.trim().length > 0 && reason.trim().length < 2 ? "error" : undefined}
        >
          <Input.TextArea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Form.Item>
        <Space>
          <Button
            type="primary"
            loading={loading}
            disabled={!canSubmit}
            onClick={() => void onSubmit({ action, file, reason: reason.trim() })}
          >
            {action === "CONFIRM" ? "Xác nhận mask" : "Lưu mask đã chỉnh sửa"}
          </Button>
          <Button onClick={onClose} disabled={loading}>Hủy</Button>
        </Space>
      </Space>
    </>
  );
}

export function MaskCorrectionDrawer({
  open,
  loading,
  target,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  target: { assetId: string; side: "baseline" | "target" } | null;
  onClose: () => void;
  onSubmit: (input: { action: "CONFIRM" | "CORRECT"; file?: File; reason: string }) => Promise<void>;
}) {
  return (
    <Drawer
      title={target?.side === "baseline" ? "Xác nhận / chỉnh sửa mask · ảnh ban đầu" : "Xác nhận / chỉnh sửa mask · ảnh hiện tại"}
      open={open}
      onClose={onClose}
      width={440}
      destroyOnHidden
    >
      {open && <MaskCorrectionForm loading={loading} onClose={onClose} onSubmit={onSubmit} />}
    </Drawer>
  );
}
