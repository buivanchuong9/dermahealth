import { Button, Card, Col, Empty, Progress, Row, Space, Tag, Typography } from 'antd';
import { Activity, ArrowUpRight, Building2, CalendarDays, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LifetimeMedicalRecord } from '../../api/lifetimeMedicalRecord';

const { Text, Title } = Typography;

interface ClinicalProgressChartCardProps {
  record?: LifetimeMedicalRecord;
  patientId?: string;
}

export function ClinicalProgressChartCard({
  record,
  patientId,
}: ClinicalProgressChartCardProps) {
  const navigate = useNavigate();
  const events = record?.events ?? [];
  const evidenceEvents = events.filter(
    (event) => event.results.length > 0 || event.diagnoses.length > 0,
  );
  const evidenceCoverage = events.length
    ? Math.round((evidenceEvents.length / events.length) * 100)
    : 0;

  return (
    <Card
      bordered={false}
      className="emr-card"
      title={(
        <div className="emr-card-header">
          <Activity size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Tiến triển lâm sàng & AI
          </Title>
        </div>
      )}
      extra={(
        <Button
          type="link"
          icon={<ArrowUpRight size={15} />}
          disabled={!patientId}
          onClick={() => navigate('/app/progress')}
        >
          Mở so sánh ảnh
        </Button>
      )}
    >
      {record ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={2}>
              <Text type="secondary"><Stethoscope size={14} /> Lượt khám</Text>
              <Text strong style={{ fontSize: 24 }}>{record.summary.encounterCount}</Text>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={2}>
              <Text type="secondary"><Building2 size={14} /> Cơ sở liên thông</Text>
              <Text strong style={{ fontSize: 24 }}>{record.summary.facilityCount}</Text>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={2}>
              <Text type="secondary"><CalendarDays size={14} /> Ghi nhận gần nhất</Text>
              <Text strong>
                {record.summary.lastRecordedAt
                  ? new Date(record.summary.lastRecordedAt).toLocaleDateString('vi-VN')
                  : 'Chưa có'}
              </Text>
            </Space>
          </Col>
          <Col span={24}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary">Sự kiện có bằng chứng chẩn đoán/kết quả</Text>
              <Tag>{evidenceEvents.length}/{events.length}</Tag>
            </Space>
            <Progress percent={evidenceCoverage} showInfo={false} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Đây là độ phủ dữ liệu, không phải điểm hồi phục hay hiệu quả điều trị.
            </Text>
          </Col>
        </Row>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu tiến triển" />
      )}
    </Card>
  );
}
