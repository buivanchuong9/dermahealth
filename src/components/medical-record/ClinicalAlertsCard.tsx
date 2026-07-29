import React from 'react';
import { Typography, Tag } from 'antd';
import { ShieldAlert, HeartPulse, CheckCircle2, PhoneCall } from 'lucide-react';
import type { LifetimeRecordClinicalItem } from '../../api/lifetimeMedicalRecord';

const { Text } = Typography;

interface ClinicalAlertsCardProps {
  allergies?: LifetimeRecordClinicalItem[];
  activeConditions?: LifetimeRecordClinicalItem[];
}

export const ClinicalAlertsCard: React.FC<ClinicalAlertsCardProps> = ({
  allergies = [],
  activeConditions = [],
}) => {
  return (
    <div className="emr-alerts-stack">
      {/* Allergy Safety Alert */}
      <div className={`emr-alert-banner ${allergies.length > 0 ? 'emr-alert-banner--danger' : 'emr-alert-banner--success'}`}>
        <div className="emr-alert-banner__icon">
          {allergies.length > 0 ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
        </div>
        <div className="emr-alert-banner__body">
          <span className="emr-alert-banner__title">CẢNH BÁO DỊ ỨNG & PHẢN VỆ</span>
          {allergies.length > 0 ? (
            allergies.map((item) => (
              <Text key={item.id || item.display} strong className="emr-alert-text--danger">
                • {item.display} {item.value ? `(${item.value})` : ''}
              </Text>
            ))
          ) : (
            <div className="emr-alert-status-row">
              <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>NKA - No Known Allergies</Tag>
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                Chưa ghi nhận tiền sử dị ứng
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Active Chronic Conditions Monitoring */}
      <div className={`emr-alert-banner ${activeConditions.length > 0 ? 'emr-alert-banner--warning' : 'emr-alert-banner--info'}`}>
        <div className="emr-alert-banner__icon">
          <HeartPulse size={18} />
        </div>
        <div className="emr-alert-banner__body">
          <span className="emr-alert-banner__title">BỆNH MẠN TÍNH ĐANG THEO DÕI</span>
          {activeConditions.length > 0 ? (
            activeConditions.map((item) => (
              <Text key={item.id || item.display} strong className="emr-alert-text--warning">
                • {item.display} {item.code ? `[${item.code}]` : ''}
              </Text>
            ))
          ) : (
            <div className="emr-alert-status-row">
              <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>Bình thường</Tag>
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                Chưa ghi nhận chẩn đoán mạn tính
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contact Bar */}
      <div className="emr-alert-banner emr-alert-banner--contact">
        <div className="emr-alert-banner__icon">
          <PhoneCall size={16} />
        </div>
        <div className="emr-alert-banner__body">
          <span className="emr-alert-banner__title">LIÊN HỆ KHẨN CẤP</span>
          <Text style={{ fontSize: 12, color: '#1e293b', fontWeight: 600 }}>
            Hỗ trợ y tế 24/7: 1900 1080 / Đường dây nóng CSYT
          </Text>
        </div>
      </div>
    </div>
  );
};
