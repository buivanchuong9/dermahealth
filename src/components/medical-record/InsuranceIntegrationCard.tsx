import React from 'react';
import { Card, Typography, Tag, Divider } from 'antd';
import { ShieldCheck, Link2, CheckCircle2 } from 'lucide-react';
import type { LifetimeMedicalRecord } from '../../api/lifetimeMedicalRecord';

const { Title, Text } = Typography;

interface InsuranceIntegrationCardProps {
  record?: LifetimeMedicalRecord;
}

export const InsuranceIntegrationCard: React.FC<InsuranceIntegrationCardProps> = ({ record }) => {
  const nationalHealthId = record?.patient.nationalHealthId;

  return (
    <Card
      bordered={false}
      className="emr-card"
      title={
        <div className="emr-card-header">
          <ShieldCheck size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            BHYT & Liên thông CSDLQG
          </Title>
        </div>
      }
    >
      <div className="emr-insurance-info">
        <div className="emr-insurance-row">
          <span className="emr-insurance-label">Định danh VNeID:</span>
          <Tag color={nationalHealthId ? 'green' : 'default'} bordered={false} style={{ fontWeight: 600 }}>
            {nationalHealthId ? `Đã xác thực (${nationalHealthId})` : 'Chưa liên kết'}
          </Tag>
        </div>
        <div className="emr-insurance-row">
          <span className="emr-insurance-label">Mã bệnh nhân:</span>
          <strong className="emr-insurance-val">{record?.patient.code || '—'}</strong>
        </div>
        <div className="emr-insurance-row">
          <span className="emr-insurance-label">Thời gian đồng bộ:</span>
          <span className="emr-insurance-val">
            {record?.synchronizedAt ? new Date(record.synchronizedAt).toLocaleString('vi-VN') : 'Đang cập nhật'}
          </span>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div className="emr-integration-actions">
          <div className="emr-integration-item">
            <CheckCircle2 size={16} className="text-success" />
            <div>
              <Text strong style={{ fontSize: 12.5, display: 'block' }}>Hệ thống EMR chuẩn quốc gia</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>Dữ liệu có truy vết nguồn gốc</Text>
            </div>
          </div>
          <div className="emr-integration-item">
            <Link2 size={16} className="text-primary" />
            <div>
              <Text strong style={{ fontSize: 12.5, display: 'block' }}>Liên thông hồ sơ trọn đời</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{record?.summary.organizationCount || 0} đơn vị kết nối</Text>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
