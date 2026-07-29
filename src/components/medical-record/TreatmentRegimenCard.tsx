import React from 'react';
import { Card, Typography, Empty, Tag } from 'antd';
import { Pill } from 'lucide-react';
import type { LifetimeMedicalRecord, LifetimeRecordClinicalItem } from '../../api/lifetimeMedicalRecord';

const { Title, Text } = Typography;

interface TreatmentRegimenCardProps {
  record?: LifetimeMedicalRecord;
}

export const TreatmentRegimenCard: React.FC<TreatmentRegimenCardProps> = ({ record }) => {
  const currentMedications = record?.summary.currentMedications || [];
  const eventMedications: LifetimeRecordClinicalItem[] = (record?.events || []).flatMap((e) => e.medications);

  const allMeds = Array.from(
    new Map([...currentMedications, ...eventMedications].map((m) => [m.id || m.display, m])).values()
  );

  return (
    <Card
      bordered={false}
      className="emr-card"
      title={
        <div className="emr-card-header">
          <Pill size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Phác đồ điều trị & Thuốc
          </Title>
        </div>
      }
    >
      <div className="emr-regimen-list">
        {allMeds.length > 0 ? (
          allMeds.map((med, idx) => (
            <div key={med.id || idx} className="emr-regimen-item">
              <div className="emr-regimen-main">
                <strong className="emr-med-name">{med.display}</strong>
                {med.note && <Text type="secondary" className="emr-med-instruction">{med.note}</Text>}
              </div>
              {med.value && <div className="emr-regimen-dose">{med.value}</div>}
              {med.status && (
                <Tag color={med.status === 'active' ? 'green' : 'default'} style={{ marginLeft: 8 }}>
                  {med.status}
                </Tag>
              )}
            </div>
          ))
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có thông tin thuốc trong hồ sơ"
          />
        )}
      </div>
    </Card>
  );
};
