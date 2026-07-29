import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from "antd";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileHeart,
  FileText,
  HeartPulse,
  Hospital,
  Image,
  Pill,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserRound,
} from "lucide-react";
import { ApiError } from "../../api/http";
import {
  getLifetimeMedicalRecord,
  type LifetimeMedicalRecord as LifetimeMedicalRecordData,
  type LifetimeRecordClinicalItem,
  type LifetimeRecordEvent,
  type LifetimeRecordEventType,
} from "../../api/lifetimeMedicalRecord";
import { useAppState } from "../../state/useAppState";

const { Title, Text, Paragraph } = Typography;

const EVENT_META: Record<
  LifetimeRecordEventType,
  { label: string; color: string; icon: typeof Activity }
> = {
  encounter: { label: "Lượt khám", color: "blue", icon: Stethoscope },
  diagnosis: { label: "Chẩn đoán", color: "purple", icon: HeartPulse },
  procedure: { label: "Thủ thuật", color: "cyan", icon: Activity },
  prescription: { label: "Đơn thuốc", color: "green", icon: Pill },
  laboratory: { label: "Xét nghiệm", color: "gold", icon: ClipboardList },
  imaging: { label: "Chẩn đoán hình ảnh", color: "geekblue", icon: Image },
  vaccination: { label: "Tiêm chủng", color: "lime", icon: Syringe },
  allergy: { label: "Dị ứng", color: "red", icon: AlertTriangle },
  document: { label: "Tài liệu", color: "default", icon: FileText },
  care_plan: { label: "Kế hoạch chăm sóc", color: "processing", icon: FileHeart },
};

const STATUS_LABEL: Record<string, string> = {
  registered: "Đã tiếp nhận",
  intake_in_progress: "Đang khai thác bệnh sử",
  intake_complete: "Đã hoàn tất khai thác",
  ai_assessed: "Đã hỗ trợ đánh giá",
  under_doctor_review: "Bác sĩ đang thăm khám",
  awaiting_results: "Chờ kết quả",
  diagnosed: "Đã xác nhận chẩn đoán",
  plan_approved: "Đã duyệt kế hoạch",
  workflow_active: "Đang điều trị",
  in_progress: "Đang thực hiện",
  completed: "Đã hoàn thành",
  confirmed: "Đã xác nhận",
  signed: "Đã ký",
  closed: "Đã kết thúc",
  requested: "Đã chỉ định",
  active: "Đang hoạt động",
  draft: "Bản nháp",
};

const displayDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Chưa có";

const displayDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Chưa có";

const displayGender = (value?: string | null) => {
  if (value === "male") return "Nam";
  if (value === "female") return "Nữ";
  if (value === "other") return "Khác";
  return value || "Chưa cập nhật";
};

const deduplicateClinicalItems = (items: LifetimeRecordClinicalItem[]) => {
  const unique = new Map<string, LifetimeRecordClinicalItem>();
  items.forEach((item) => {
    const key = (item.code || item.display)
      .toLocaleLowerCase("vi")
      .replace(/\s+v\d+$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!unique.has(key)) unique.set(key, item);
  });
  return [...unique.values()];
};

function SafetyPanel({
  icon: Icon,
  title,
  items,
  empty,
  tone,
}: {
  icon: typeof AlertTriangle;
  title: string;
  items: LifetimeRecordClinicalItem[];
  empty: string;
  tone: "danger" | "warning" | "info";
}) {
  return (
    <div className={`records-safety-panel records-safety-panel--${tone}`}>
      <div className="records-safety-panel__heading">
        <span className="records-safety-panel__icon"><Icon size={16} /></span>
        <Text strong>{title}</Text>
        <span className="records-safety-panel__count">{items.length}</span>
      </div>
      {items.length ? (
        <div className="records-chip-list">
          {items.slice(0, 4).map((item) => (
            <span className="records-clinical-chip" key={item.id || item.display}>
              {item.display}{item.value ? ` · ${item.value}` : ""}
            </span>
          ))}
          {items.length > 4 && (
            <span className="records-clinical-chip records-clinical-chip--muted">
              +{items.length - 4} mục
            </span>
          )}
        </div>
      ) : (
        <Text type="secondary" className="records-safety-panel__empty">
          {empty}
        </Text>
      )}
    </div>
  );
}

function ClinicalList({
  title,
  items,
}: {
  title: string;
  items: LifetimeRecordClinicalItem[];
}) {
  if (!items.length) return null;
  return (
    <div className="records-event-detail">
      <Text type="secondary" className="records-event-detail__label">{title}</Text>
      <div className="records-chip-list">
        {items.map((item) => (
          <span className="records-clinical-chip" key={item.id || `${title}-${item.display}`}>
            {item.display}{item.value ? ` · ${item.value}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: LifetimeRecordEvent }) {
  const meta = EVENT_META[event.type];
  const Icon = meta.icon;
  const detailSections = [
    { title: "Chẩn đoán", items: event.diagnoses },
    { title: "Thuốc điều trị", items: event.medications },
    { title: "Chỉ định", items: event.orders },
    { title: "Kết quả", items: event.results },
    { title: "Can thiệp / thủ thuật", items: event.procedures },
  ];
  const hasClinicalDetail =
    detailSections.some((section) => section.items.length > 0) ||
    event.documents.length > 0;

  return (
    <article className="records-event-card">
      <div className="records-event-card__header">
        <div className="records-event-card__identity">
          <span className={`records-event-card__icon records-event-card__icon--${event.type}`}>
            <Icon size={17} />
          </span>
          <div>
            <Space size={7} wrap>
              <Tag color={meta.color} bordered={false}>{meta.label}</Tag>
              {event.status && (
                <Tag bordered={false}>{STATUS_LABEL[event.status] ?? "Đã ghi nhận"}</Tag>
              )}
            </Space>
            <Title level={5} className="records-event-card__title">{event.title}</Title>
          </div>
        </div>
        <div className="records-event-card__date">
          <CalendarDays size={14} />
          <span>{displayDateTime(event.occurredAt)}</span>
        </div>
      </div>

      <div className="records-event-card__provider">
        <Hospital size={14} />
        <Text strong>{event.source.facilityName || event.source.organizationName}</Text>
        {event.specialty && <Text type="secondary">· {event.specialty}</Text>}
        {event.practitionerName && <Text type="secondary">· {event.practitionerName}</Text>}
      </div>

      {event.summary && (
        <Paragraph className="records-event-card__summary">{event.summary}</Paragraph>
      )}

      {hasClinicalDetail && (
        <Collapse
          ghost
          size="small"
          className="records-event-card__collapse"
          items={[
            {
              key: "clinical-detail",
              label: "Xem dữ liệu lâm sàng",
              children: (
                <div className="records-event-detail-grid">
                  {detailSections.map((section) => (
                    <ClinicalList key={section.title} title={section.title} items={section.items} />
                  ))}
                  {event.documents.length > 0 && (
                    <ClinicalList
                      title="Tài liệu"
                      items={event.documents.map((document) => ({
                        id: document.id,
                        display: document.title,
                      }))}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <div className="records-event-card__provenance">
        <ShieldCheck size={13} />
        <span>
          Nguồn: {event.provenance.sourceSystem || event.source.system || event.source.organizationName}
          {event.provenance.lastVerifiedAt
            ? ` · Đối soát ${displayDate(event.provenance.lastVerifiedAt)}`
            : " · Có lưu vết nguồn"}
        </span>
      </div>
    </article>
  );
}

export function LifetimeMedicalRecord() {
  const { currentPatient } = useAppState();
  const [record, setRecord] = useState<LifetimeMedicalRecordData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState<LifetimeRecordEventType>();
  const [organizationId, setOrganizationId] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setRecord(await getLifetimeMedicalRecord(currentPatient.id));
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 404
          ? "Dịch vụ hồ sơ hợp nhất chưa sẵn sàng."
          : cause instanceof Error
            ? cause.message
            : "Không tải được hồ sơ bệnh án trọn đời.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentPatient.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const organizations = useMemo(() => {
    const values = new Map<string, string>();
    record?.events.forEach((event) =>
      values.set(event.source.organizationId, event.source.organizationName),
    );
    return [...values.entries()].map(([value, label]) => ({ value, label }));
  }, [record]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return (record?.events ?? []).filter((event) => {
      if (eventType && event.type !== eventType) return false;
      if (organizationId && event.source.organizationId !== organizationId) return false;
      if (!keyword) return true;
      const clinicalText = [
        ...event.diagnoses,
        ...event.medications,
        ...event.orders,
        ...event.results,
        ...event.procedures,
      ]
        .map((item) => `${item.display} ${item.code ?? ""} ${item.value ?? ""}`)
        .join(" ");
      return [
        event.title,
        event.summary,
        event.specialty,
        event.practitionerName,
        event.source.organizationName,
        event.source.facilityName,
        clinicalText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(keyword);
    });
  }, [eventType, organizationId, record?.events, search]);

  const patient = record?.patient;
  const summary = record?.summary;
  const allergies = deduplicateClinicalItems(summary?.allergies ?? []);
  const activeConditions = deduplicateClinicalItems(summary?.activeConditions ?? []);
  const currentMedications = deduplicateClinicalItems(summary?.currentMedications ?? []);
  const initials = (patient?.name || currentPatient.name)
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="records-lifetime">
      <section className="records-patient-hero">
        <div className="records-patient-hero__main">
          <div className="records-patient-avatar">{initials || <UserRound size={24} />}</div>
          <div>
            <div className="records-eyebrow">Hồ sơ sức khỏe hợp nhất</div>
            <Title level={3}>{patient?.name || currentPatient.name}</Title>
            <Space size={[8, 6]} wrap>
              <span className="records-patient-meta">Mã BN {patient?.code || currentPatient.code}</span>
              <span className="records-patient-meta">{displayGender(patient?.gender || currentPatient.profile.gender)}</span>
              <span className="records-patient-meta">Sinh {displayDate(patient?.dob || currentPatient.profile.dob)}</span>
              <span className="records-patient-meta">Nhóm máu {patient?.bloodType || currentPatient.profile.bloodType || "—"}</span>
            </Space>
          </div>
        </div>
        <div className="records-patient-hero__trust">
          <span className="records-trust-badge"><ShieldCheck size={15} /> Dữ liệu có truy vết</span>
          <Text type="secondary">
            Đồng bộ {record?.synchronizedAt ? displayDateTime(record.synchronizedAt) : "đang cập nhật"}
          </Text>
        </div>
      </section>

      {error && (
        <Alert
          type="warning"
          showIcon
          message="Chưa tải được dữ liệu hợp nhất"
          description={error}
          action={<Button size="small" onClick={() => void load()}>Thử lại</Button>}
        />
      )}

      <Spin spinning={loading}>
        <section className="records-section">
          <div className="records-section__heading">
            <div>
              <div className="records-eyebrow">An toàn người bệnh</div>
              <Title level={4}>Thông tin cần biết trước khi chỉ định</Title>
            </div>
            <Tag color={allergies.length ? "red" : "green"} bordered={false}>
              {allergies.length ? "Có cảnh báo cần chú ý" : "Chưa ghi nhận cảnh báo dị ứng"}
            </Tag>
          </div>
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={8}>
              <SafetyPanel
                icon={AlertTriangle}
                title="Dị ứng & phản ứng có hại"
                items={allergies}
                empty="Chưa ghi nhận dị ứng"
                tone="danger"
              />
            </Col>
            <Col xs={24} lg={8}>
              <SafetyPanel
                icon={HeartPulse}
                title="Bệnh đang theo dõi"
                items={activeConditions}
                empty="Chưa ghi nhận bệnh đang hoạt động"
                tone="warning"
              />
            </Col>
            <Col xs={24} lg={8}>
              <SafetyPanel
                icon={Pill}
                title="Thuốc đang sử dụng"
                items={currentMedications}
                empty="Chưa ghi nhận thuốc đang dùng"
                tone="info"
              />
            </Col>
          </Row>
        </section>

        <section className="records-metrics">
          <div className="records-metric">
            <span className="records-metric__icon"><Stethoscope size={18} /></span>
            <div><strong>{summary?.encounterCount ?? 0}</strong><span>Lượt khám</span></div>
          </div>
          <div className="records-metric">
            <span className="records-metric__icon"><Building2 size={18} /></span>
            <div><strong>{summary?.organizationCount ?? 0}</strong><span>Đơn vị y tế</span></div>
          </div>
          <div className="records-metric">
            <span className="records-metric__icon"><Hospital size={18} /></span>
            <div><strong>{summary?.facilityCount ?? 0}</strong><span>Cơ sở đã khám</span></div>
          </div>
          <div className="records-metric records-metric--wide">
            <span className="records-metric__icon"><CalendarDays size={18} /></span>
            <div><strong>{displayDate(summary?.lastRecordedAt)}</strong><span>Cập nhật lâm sàng gần nhất</span></div>
          </div>
        </section>

        <section className="records-history">
          <div className="records-history__header">
            <div>
              <div className="records-eyebrow">Dòng thời gian lâm sàng</div>
              <Title level={4}>Toàn bộ lịch sử khám chữa bệnh</Title>
              <Text type="secondary">{filteredEvents.length} sự kiện phù hợp</Text>
            </div>
            <Button icon={<RefreshCw size={14} />} onClick={() => void load()}>Đồng bộ</Button>
          </div>

          <div className="records-filterbar">
            <Input.Search
              allowClear
              value={search}
              placeholder="Tìm chẩn đoán, thuốc, bác sĩ, cơ sở..."
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              allowClear
              placeholder="Tất cả loại hồ sơ"
              value={eventType}
              options={Object.entries(EVENT_META).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
              onChange={setEventType}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Tất cả cơ sở y tế"
              value={organizationId}
              options={organizations}
              onChange={setOrganizationId}
            />
          </div>

          <div className="records-timeline">
            {filteredEvents.length ? (
              <Timeline
                items={filteredEvents.map((event) => ({
                  color: EVENT_META[event.type].color,
                  dot: <span className="records-timeline__dot"><CheckCircle2 size={13} /></span>,
                  children: <EventCard event={event} />,
                }))}
              />
            ) : (
              <Card>
                <Empty
                  description={
                    error
                      ? "Chờ dịch vụ dữ liệu sẵn sàng"
                      : record?.events.length
                        ? "Không có hồ sơ phù hợp bộ lọc"
                        : "Chưa có lịch sử khám chữa bệnh"
                  }
                />
              </Card>
            )}
          </div>
        </section>
      </Spin>
    </div>
  );
}
