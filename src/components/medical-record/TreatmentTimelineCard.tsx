import React from 'react';
import { Card, Typography, Empty } from 'antd';
import { Clock } from 'lucide-react';
import type { LifetimeMedicalRecord } from '../../api/lifetimeMedicalRecord';

const { Title, Text } = Typography;

interface TreatmentTimelineCardProps {
  record?: LifetimeMedicalRecord;
}

export const TreatmentTimelineCard: React.FC<TreatmentTimelineCardProps> = ({ record }) => {
  const events = record?.events || [];

  return (
    <Card
      bordered={false}
      className="emr-card"
      title={
        <div className="emr-card-header">
          <Clock size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Dòng thời gian khám chữa bệnh
          </Title>
        </div>
      }
    >
      {events.length > 0 ? (
        <div className="emr-timeline-list">
          {events.map((item, idx) => (
            <div key={item.id || idx} className="emr-timeline-item">
              <div className="emr-timeline-badge-column">
                <span className="emr-timeline-dot" />
                {idx < events.length - 1 && <span className="emr-timeline-connector" />}
              </div>
              <div className="emr-timeline-content">
                <span className="emr-timeline-date">
                  {item.occurredAt ? new Date(item.occurredAt).toLocaleString('vi-VN') : 'Mới nhất'}
                </span>
                <strong className="emr-timeline-title">{item.title}</strong>
                {item.source?.facilityName || item.source?.organizationName ? (
                  <Text type="secondary" className="emr-timeline-desc">
                    {item.source.facilityName || item.source.organizationName}
                    {item.practitionerName ? ` · BS. ${item.practitionerName}` : ''}
                  </Text>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có dòng thời gian khám chữa bệnh"
        />
      )}
    </Card>
  );
};
