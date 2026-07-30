import React, { useState, useEffect } from 'react';
import { Card, Avatar, Tag, Space, Typography, Row, Col, Divider } from 'antd';
import { FileText, UserRound } from 'lucide-react';
import type { Patient, PatientProfile } from '../../domain/core/entities';
import type { LifetimeMedicalRecord } from '../../api/lifetimeMedicalRecord';
import { getPatientAvatarUrl } from '../../utils/avatarUtils';

const { Title, Text } = Typography;

interface PatientHeaderCardProps {
  patient?: Patient | null;
  record?: LifetimeMedicalRecord;
  avatarUrl?: string;
}

export const PatientHeaderCard: React.FC<PatientHeaderCardProps> = ({
  patient,
  record,
  avatarUrl: propAvatarUrl,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    propAvatarUrl || getPatientAvatarUrl(undefined, patient?.id || record?.patient?.id)
  );

  useEffect(() => {
    const handleAvatarUpdate = () => {
      const updated = getPatientAvatarUrl(undefined, patient?.id || record?.patient?.id);
      setAvatarUrl(updated);
    };
    window.addEventListener('avatar_updated', handleAvatarUpdate);
    return () => window.removeEventListener('avatar_updated', handleAvatarUpdate);
  }, [patient?.id, record?.patient?.id]);

  // Never merge identity fields from two different patients. When the live
  // patient repository and the clinical record refer to the same patient,
  // the live Patient row is canonical; the record is only a fallback for
  // direct/shared record views.
  const livePatient =
    patient && (!record?.patient.id || patient.id === record.patient.id)
      ? patient
      : undefined;
  const profile: Partial<PatientProfile> = livePatient?.profile ?? {};
  const displayName = livePatient?.name || record?.patient.name || 'Bệnh nhân';
  const initials = displayName
    .split(' ')
    .slice(-2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const dob = profile.dob || record?.patient.dob;
  const formattedDob = dob
    ? new Date(dob).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Chưa cập nhật';

  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return '';
    const birth = new Date(dobString);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age > 0 ? ` (${age} tuổi)` : '';
  };

  const gender = profile.gender || record?.patient.gender;
  const genderDisplay = gender === 'male'
    ? 'Nam'
    : gender === 'female'
    ? 'Nữ'
    : 'Khác';

  const bloodType = profile.bloodType || record?.patient.bloodType || 'Chưa cập nhật';
  const phone = profile.phone || record?.patient.phone || 'Chưa cập nhật';
  const address = profile.address || record?.patient.address || 'Chưa cập nhật';
  const allergies = record?.summary.allergies || [];
  const activeConditions = record?.summary.activeConditions || [];
  const currentMedications = record?.summary.currentMedications || [];

  return (
    <Card bordered={false} className="emr-card emr-patient-header-card">
      <Row gutter={[20, 20]} align="stretch">
        {/* Patient Identity */}
        <Col xs={24} lg={10}>
          <div className="emr-patient-identity">
            <Avatar
              size={88}
              src={avatarUrl}
              shape="square"
              style={{ borderRadius: 10, backgroundColor: '#334155', fontSize: 26, fontWeight: 600 }}
            >
              {!avatarUrl && (initials || <UserRound size={28} />)}
            </Avatar>
            <div className="emr-patient-identity__info">
              <Space align="center" size={8}>
                <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                  {displayName}
                </Title>
              </Space>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                Mã BN: <strong style={{ color: '#334155' }}>{livePatient?.code || record?.patient.code || '—'}</strong>
              </Text>
              <Space size={4} wrap style={{ marginBottom: 4 }}>
                {record?.patient.nationalHealthId && <Tag className="emr-subtle-tag">Đã định danh VNeID</Tag>}
                {allergies.length > 0 ? (
                  <Tag color="error">{allergies.length} Dị ứng</Tag>
                ) : (
                  <Tag className="emr-subtle-tag">NKA - Chưa dị ứng</Tag>
                )}
                <Tag className="emr-subtle-tag">{record?.summary.encounterCount || 0} Lượt khám</Tag>
              </Space>
            </div>
          </div>

          <Divider style={{ margin: '12px 0 8px 0' }} />

          <div className="emr-patient-details-grid">
            <div className="emr-patient-detail-item">
              <span className="emr-detail-label">Ngày sinh:</span>
              <span className="emr-detail-val">{formattedDob}{calculateAge(dob)}</span>
            </div>
            <div className="emr-patient-detail-item">
              <span className="emr-detail-label">Giới tính:</span>
              <span className="emr-detail-val">{genderDisplay}</span>
            </div>
            <div className="emr-patient-detail-item">
              <span className="emr-detail-label">Nhóm máu:</span>
              <span className="emr-detail-val">{bloodType}</span>
            </div>
            <div className="emr-patient-detail-item">
              <span className="emr-detail-label">Điện thoại:</span>
              <span className="emr-detail-val">{phone}</span>
            </div>
            <div className="emr-patient-detail-item emr-detail-full">
              <span className="emr-detail-label">Địa chỉ:</span>
              <span className="emr-detail-val">{address}</span>
            </div>
          </div>
        </Col>

        {/* Real Clinical Summary */}
        <Col xs={24} lg={14}>
          <div className="emr-clinical-summary-box">
            <div className="emr-summary-heading">
              <FileText size={16} className="emr-summary-icon" />
              <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Tóm tắt bệnh án hợp nhất</Title>
            </div>

            <div className="emr-summary-rows">
              <div className="emr-summary-row">
                <span className="emr-summary-label">Bệnh đang theo dõi:</span>
                <span className="emr-summary-value">
                  {activeConditions.length > 0
                    ? activeConditions.map((c) => c.display).join('; ')
                    : 'Chưa ghi nhận bệnh mạn tính'}
                </span>
              </div>
              <div className="emr-summary-row">
                <span className="emr-summary-label">Cảnh báo dị ứng:</span>
                <span className="emr-summary-value warning-text">
                  {allergies.length > 0
                    ? allergies.map((a) => a.display).join('; ')
                    : 'Chưa có ghi nhận dị ứng'}
                </span>
              </div>
              <div className="emr-summary-row">
                <span className="emr-summary-label">Thuốc đang dùng:</span>
                <span className="emr-summary-value">
                  {currentMedications.length > 0
                    ? currentMedications.map((m) => m.display).join('; ')
                    : 'Chưa có thông tin thuốc active'}
                </span>
              </div>
              <div className="emr-summary-row">
                <span className="emr-summary-label">Cơ sở y tế đã khám:</span>
                <span className="emr-summary-value">
                  {record?.summary.facilityCount ? `${record.summary.facilityCount} cơ sở` : 'Chưa có thông tin'}
                </span>
              </div>
            </div>

            <div className="emr-summary-footer">
              <Text type="secondary" style={{ fontSize: 12 }}>
                Cập nhật lâm sàng gần nhất:{' '}
                <strong>
                  {record?.summary.lastRecordedAt
                    ? new Date(record.summary.lastRecordedAt).toLocaleDateString('vi-VN')
                    : 'Chưa có dữ liệu'}
                </strong>
              </Text>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
};
