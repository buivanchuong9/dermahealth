import React from 'react';
import { Card, Typography, Avatar, Empty } from 'antd';
import { Users, UserRound } from 'lucide-react';
import type { LifetimeMedicalRecord } from '../../api/lifetimeMedicalRecord';

const { Title, Text } = Typography;

interface CareTeamCardProps {
  record?: LifetimeMedicalRecord;
}

export const CareTeamCard: React.FC<CareTeamCardProps> = ({ record }) => {
  const practitioners = Array.from(
    new Set((record?.events || []).map((e) => e.practitionerName).filter(Boolean))
  ) as string[];

  return (
    <Card bordered={false} className="emr-card emr-careteam-widget">
      <div className="emr-careteam-header">
        <div className="emr-card-header">
          <Users size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Bác sĩ & Nhóm điều trị
          </Title>
        </div>
      </div>

      {practitioners.length > 0 ? (
        <div className="emr-careteam-list" style={{ flexDirection: 'column', gap: 12 }}>
          {practitioners.map((doc, idx) => (
            <div key={idx} className="emr-careteam-member">
              <Avatar size={36} icon={<UserRound size={18} />} style={{ backgroundColor: '#0284c7' }} />
              <div className="emr-member-info">
                <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>
                  BS. {doc}
                </strong>
                <Text type="secondary" style={{ fontSize: 12 }}>Bác sĩ điều trị</Text>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có thông tin bác sĩ điều trị trong lịch sử"
        />
      )}
    </Card>
  );
};
