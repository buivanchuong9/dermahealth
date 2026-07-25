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
  Statistic,
  Tag,
  Timeline,
  Typography,
} from "antd";
import {
  Building2,
  CalendarDays,
  FileHeart,
  Hospital,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { ApiError } from "../../api/http";
import {
  getLifetimeMedicalRecord,
  type LifetimeMedicalRecord as LifetimeMedicalRecordData,
  type LifetimeRecordEvent,
  type LifetimeRecordEventType,
} from "../../api/lifetimeMedicalRecord";
import { useAppState } from "../../state/useAppState";

const { Title, Text, Paragraph } = Typography;

const EVENT_TYPE_LABEL: Record<LifetimeRecordEventType, string> = {
  encounter: "Lượt khám",
  diagnosis: "Chẩn đoán",
  procedure: "Thủ thuật",
  prescription: "Đơn thuốc",
  laboratory: "Xét nghiệm",
  imaging: "Chẩn đoán hình ảnh",
  vaccination: "Tiêm chủng",
  allergy: "Dị ứng",
  document: "Tài liệu",
  care_plan: "Kế hoạch chăm sóc",
};

const displayDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa có";

function ClinicalList({
  title,
  items,
}: {
  title: string;
  items: LifetimeRecordEvent["diagnoses"];
}) {
  if (!items.length) return null;
  return (
    <div>
      <Text strong style={{ fontSize: 12 }}>
        {title}
      </Text>
      <Space size={[4, 4]} wrap style={{ marginTop: 5 }}>
        {items.map((item) => (
          <Tag key={item.id}>
            {item.display}
            {item.value ? `: ${item.value}` : ""}
          </Tag>
        ))}
      </Space>
    </div>
  );
}

function EventCard({ event }: { event: LifetimeRecordEvent }) {
  const detailSections = [
    { title: "Chẩn đoán", items: event.diagnoses },
    { title: "Thuốc", items: event.medications },
    { title: "Chỉ định", items: event.orders },
    { title: "Kết quả", items: event.results },
    { title: "Thủ thuật", items: event.procedures },
  ];

  return (
    <Card size="small">
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Row gutter={[12, 8]} justify="space-between">
          <Col>
            <Space size={8} wrap>
              <Tag color="blue">{EVENT_TYPE_LABEL[event.type]}</Tag>
              <Text strong>{event.title}</Text>
              {event.status && <Tag>{event.status}</Tag>}
            </Space>
          </Col>
          <Col>
            <Text type="secondary">{displayDate(event.occurredAt)}</Text>
          </Col>
        </Row>
        <Space size={6} wrap>
          <Hospital size={14} />
          <Text>{event.source.organizationName}</Text>
          {event.source.facilityName && (
            <Text type="secondary">· {event.source.facilityName}</Text>
          )}
          {event.practitionerName && (
            <Text type="secondary">· {event.practitionerName}</Text>
          )}
        </Space>
        {event.summary && <Paragraph style={{ margin: 0 }}>{event.summary}</Paragraph>}
        {detailSections.some((section) => section.items.length > 0) && (
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: "clinical-detail",
                label: "Xem chi tiết lâm sàng",
                children: (
                  <Space direction="vertical" size={12}>
                    {detailSections.map((section) => (
                      <ClinicalList
                        key={section.title}
                        title={section.title}
                        items={section.items}
                      />
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        )}
        <Text type="secondary" style={{ fontSize: 11 }}>
          Nguồn: {event.provenance.sourceSystem ?? event.source.system ?? "Hệ thống cơ sở"} ·
          Mã hồ sơ nguồn: {event.provenance.sourceRecordId}
        </Text>
      </Space>
    </Card>
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
          ? "Backend chưa triển khai API hồ sơ bệnh án trọn đời. Team BE xem tài liệu LIFETIME_MEDICAL_RECORD_API.md."
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
      if (organizationId && event.source.organizationId !== organizationId)
        return false;
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

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space align="start">
              <FileHeart size={28} color="var(--medical-blue-700)" />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Hồ sơ bệnh án trọn đời
                </Title>
                <Text type="secondary">
                  Lịch sử khám chữa bệnh hợp nhất từ các cơ sở, giữ nguyên nguồn
                  và thời điểm của từng hồ sơ.
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Tag color="green" icon={<ShieldCheck size={13} />}>
              Có truy vết nguồn dữ liệu
            </Tag>
          </Col>
        </Row>
      </Card>

      {error && <Alert type="warning" showIcon message="Chưa tải được dữ liệu hợp nhất" description={error} />}

      <Spin spinning={loading}>
        <Row gutter={[12, 12]}>
          <Col xs={12} lg={6}>
            <Card size="small">
              <Statistic title="Tổng lượt khám" value={record?.summary.encounterCount ?? 0} prefix={<Stethoscope size={17} />} />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card size="small">
              <Statistic title="Đơn vị y tế" value={record?.summary.organizationCount ?? 0} prefix={<Building2 size={17} />} />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card size="small">
              <Statistic title="Cơ sở đã khám" value={record?.summary.facilityCount ?? 0} prefix={<Hospital size={17} />} />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card size="small">
              <Statistic title="Cập nhật gần nhất" value={record?.summary.lastRecordedAt ? new Date(record.summary.lastRecordedAt).toLocaleDateString("vi-VN") : "—"} prefix={<CalendarDays size={17} />} />
            </Card>
          </Col>
        </Row>

        <Card size="small" title="Tìm trong toàn bộ lịch sử">
          <Row gutter={[10, 10]}>
            <Col xs={24} md={10}>
              <Input.Search
                allowClear
                value={search}
                placeholder="Chẩn đoán, thuốc, bác sĩ, cơ sở..."
                onChange={(event) => setSearch(event.target.value)}
              />
            </Col>
            <Col xs={24} md={6}>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder="Loại hồ sơ"
                value={eventType}
                options={Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onChange={setEventType}
              />
            </Col>
            <Col xs={24} md={6}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: "100%" }}
                placeholder="Đơn vị y tế"
                value={organizationId}
                options={organizations}
                onChange={setOrganizationId}
              />
            </Col>
            <Col xs={24} md={2}>
              <Button block icon={<RefreshCw size={14} />} onClick={() => void load()} aria-label="Tải lại hồ sơ" />
            </Col>
          </Row>
        </Card>

        <Card title={`Dòng thời gian khám chữa bệnh${record ? ` (${filteredEvents.length})` : ""}`}>
          {filteredEvents.length ? (
            <Timeline
              items={filteredEvents.map((event) => ({
                color: "blue",
                children: <EventCard event={event} />,
              }))}
            />
          ) : (
            <Empty
              description={
                error
                  ? "Chờ backend cung cấp dữ liệu"
                  : record?.events.length
                    ? "Không có hồ sơ phù hợp bộ lọc"
                    : "Chưa có lịch sử khám chữa bệnh"
              }
            />
          )}
        </Card>
      </Spin>
    </Space>
  );
}
