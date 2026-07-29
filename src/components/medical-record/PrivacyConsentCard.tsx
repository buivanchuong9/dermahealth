import React from 'react';
import { Card, Typography, Tag, Space } from 'antd';
import { Shield, CheckCircle2 } from 'lucide-react';

const { Title, Text } = Typography;

export const PrivacyConsentCard: React.FC = () => {
  const consents = [
    {
      title: 'Chia sẻ hồ sơ',
      description: 'Đồng ý chia sẻ cho bác sĩ điều trị',
      date: '10/11/2023',
      status: 'Đã đồng ý',
    },
    {
      title: 'Khám & tư vấn từ xa',
      description: 'Đồng ý khám & tư vấn telemedicine',
      date: '10/11/2023',
      status: 'Đã đồng ý',
    },
    {
      title: 'Chụp ảnh lâm sàng',
      description: 'Đồng ý chụp và lưu trữ ảnh lâm sàng',
      date: '10/11/2023',
      status: 'Đã đồng ý',
    },
  ];

  return (
    <Card
      bordered={false}
      className="emr-card"
      title={
        <div className="emr-card-header">
          <Shield size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Quyền riêng tư & chấp thuận
          </Title>
        </div>
      }
    >
      <div className="emr-consent-list">
        {consents.map((item, idx) => (
          <div key={idx} className="emr-consent-item">
            <div className="emr-consent-main">
              <Space size={6} align="center">
                <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
                <strong style={{ fontSize: 13, color: '#1e293b' }}>{item.title}</strong>
              </Space>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2, paddingLeft: 21 }}>
                {item.description} · {item.date}
              </Text>
            </div>
            <Tag color="green" bordered={false} style={{ fontWeight: 600 }}>{item.status}</Tag>
          </div>
        ))}
      </div>
    </Card>
  );
};
