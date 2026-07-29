import React from 'react';
import { Card, Typography, Tag, Empty } from 'antd';
import { FileText } from 'lucide-react';
import type { LifetimeMedicalRecord } from '../../api/lifetimeMedicalRecord';

const { Title, Text } = Typography;

interface RecentPrescriptionsCardProps {
  record?: LifetimeMedicalRecord;
}

export const RecentPrescriptionsCard: React.FC<RecentPrescriptionsCardProps> = ({ record }) => {
  const rxEvents = (record?.events || []).filter(
    (e) => e.type === 'prescription' || e.medications.length > 0
  );

  return (
    <Card
      bordered={false}
      className="emr-card"
      title={
        <div className="emr-card-header">
          <FileText size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Lịch sử đơn thuốc
          </Title>
        </div>
      }
    >
      <div className="emr-prescriptions-grid">
        {rxEvents.length > 0 ? (
          rxEvents.map((ev) => (
            <div key={ev.id} className="emr-rx-card">
              <div className="emr-rx-card__header">
                <div>
                  <strong className="emr-rx-code">{ev.title}</strong>
                  <Text type="secondary" style={{ fontSize: 11.5, display: 'block' }}>
                    {ev.occurredAt ? new Date(ev.occurredAt).toLocaleDateString('vi-VN') : 'Mới nhất'}
                  </Text>
                </div>
                <Tag color="green" bordered={false}>{ev.status || 'Đã ghi nhận'}</Tag>
              </div>
              <div className="emr-rx-card__body">
                {ev.medications.map((item, itemIdx) => (
                  <div key={item.id || itemIdx} className="emr-rx-item">
                    <span className="emr-rx-item-name">• {item.display}</span>
                    {item.value && <span className="emr-rx-item-qty">{item.value}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có lịch sử kê đơn thuốc"
          />
        )}
      </div>
    </Card>
  );
};
