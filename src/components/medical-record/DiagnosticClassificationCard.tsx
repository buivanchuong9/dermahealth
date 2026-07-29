import React from 'react';
import { Card, Typography, Tag, Divider, Empty } from 'antd';
import { Stethoscope } from 'lucide-react';
import type { LifetimeMedicalRecord, LifetimeRecordClinicalItem } from '../../api/lifetimeMedicalRecord';

const { Title, Text } = Typography;

interface DiagnosticClassificationCardProps {
  record?: LifetimeMedicalRecord;
}

export const DiagnosticClassificationCard: React.FC<DiagnosticClassificationCardProps> = ({ record }) => {
  // Extract all diagnoses from all events in the lifetime record
  const allDiagnoses: LifetimeRecordClinicalItem[] = (record?.events || []).flatMap((e) => e.diagnoses);

  // Deduplicate by display name or code
  const uniqueDiagnoses = Array.from(
    new Map(allDiagnoses.map((d) => [d.code || d.display, d])).values()
  );

  return (
    <Card
      bordered={false}
      className="emr-card"
      title={
        <div className="emr-card-header">
          <Stethoscope size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Chẩn đoán & phân loại bệnh
          </Title>
        </div>
      }
    >
      <div className="emr-diagnosis-details">
        {uniqueDiagnoses.length > 0 ? (
          uniqueDiagnoses.map((dx, idx) => (
            <div key={dx.id || idx} className="emr-diagnosis-section" style={{ marginBottom: 12 }}>
              <div className="emr-diagnosis-row">
                <span className="emr-diagnosis-label">Chẩn đoán:</span>
                <strong className="emr-diagnosis-title">{dx.display}</strong>
              </div>
              {dx.code && (
                <div className="emr-diagnosis-row">
                  <span className="emr-diagnosis-label">Mã ICD-10:</span>
                  <Tag color="geekblue" style={{ fontWeight: 600 }}>{dx.code}</Tag>
                </div>
              )}
              {dx.note && (
                <div className="emr-diagnosis-row">
                  <span className="emr-diagnosis-label">Ghi chú:</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{dx.note}</Text>
                </div>
              )}
              {idx < uniqueDiagnoses.length - 1 && <Divider style={{ margin: '8px 0' }} />}
            </div>
          ))
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có chẩn đoán xác định trong hệ thống"
          />
        )}
      </div>
    </Card>
  );
};
