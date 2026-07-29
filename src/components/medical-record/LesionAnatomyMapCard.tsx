import React from 'react';
import { Card, Typography, Row, Col, Statistic, Tag, Empty } from 'antd';
import { Activity, Building2, Stethoscope, FileText, CalendarDays } from 'lucide-react';
import type { LifetimeMedicalRecord } from '../../api/lifetimeMedicalRecord';

const { Title, Text } = Typography;

interface LesionAnatomyMapCardProps {
  record?: LifetimeMedicalRecord;
}

export const LesionAnatomyMapCard: React.FC<LesionAnatomyMapCardProps> = ({ record }) => {
  const summary = record?.summary;

  const formatDate = (val?: string | null) =>
    val ? new Date(val).toLocaleDateString('vi-VN') : 'Chưa có';

  return (
    <Card
      bordered={false}
      className="emr-card"
      title={
        <div className="emr-card-header">
          <Activity size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Tổng quan & Thống kê lâm sàng
          </Title>
        </div>
      }
    >
      <div className="emr-clinical-stats-container">
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <div className="emr-stat-box">
              <Stethoscope size={20} className="emr-stat-icon" />
              <div className="emr-stat-info">
                <span className="emr-stat-number">{summary?.encounterCount ?? 0}</span>
                <span className="emr-stat-label">Lượt khám chữa bệnh</span>
              </div>
            </div>
          </Col>

          <Col span={12}>
            <div className="emr-stat-box">
              <Building2 size={20} className="emr-stat-icon" />
              <div className="emr-stat-info">
                <span className="emr-stat-number">{summary?.organizationCount ?? 0}</span>
                <span className="emr-stat-label">Cơ sở y tế liên thông</span>
              </div>
            </div>
          </Col>

          <Col span={12}>
            <div className="emr-stat-box">
              <FileText size={20} className="emr-stat-icon" />
              <div className="emr-stat-info">
                <span className="emr-stat-number">{record?.events?.length ?? 0}</span>
                <span className="emr-stat-label">Sự kiện lâm sàng</span>
              </div>
            </div>
          </Col>

          <Col span={12}>
            <div className="emr-stat-box">
              <CalendarDays size={20} className="emr-stat-icon" />
              <div className="emr-stat-info">
                <span className="emr-stat-number" style={{ fontSize: 13, marginTop: 4 }}>
                  {formatDate(summary?.lastRecordedAt)}
                </span>
                <span className="emr-stat-label">Khám gần nhất</span>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Card>
  );
};
