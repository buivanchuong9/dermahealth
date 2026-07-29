import React from 'react';
import { Card, Typography, Empty, Tag } from 'antd';
import { Activity } from 'lucide-react';
import type { LifetimeMedicalRecord, LifetimeRecordClinicalItem } from '../../api/lifetimeMedicalRecord';

const { Title, Text } = Typography;

interface LatestLabResultsCardProps {
  record?: LifetimeMedicalRecord;
}

export const LatestLabResultsCard: React.FC<LatestLabResultsCardProps> = ({ record }) => {
  const labEvents = (record?.events || []).filter(
    (e) => e.type === 'laboratory' || e.type === 'imaging' || e.results.length > 0 || e.orders.length > 0
  );

  const labItems: LifetimeRecordClinicalItem[] = labEvents.flatMap((e) =>
    e.results.length > 0 ? e.results : e.orders
  );

  return (
    <Card
      bordered={false}
      className="emr-card"
      title={
        <div className="emr-card-header">
          <Activity size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Kết quả cận lâm sàng
          </Title>
        </div>
      }
    >
      {labItems.length > 0 ? (
        <div className="emr-lab-table-wrapper">
          <table className="emr-lab-table">
            <thead>
              <tr>
                <th>Xét nghiệm / Chỉ định</th>
                <th>Giá trị kết quả</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {labItems.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="emr-lab-cell-name">
                    <strong>{item.display}</strong>
                    {item.code && <small style={{ display: 'block', color: '#64748b' }}>Mã: {item.code}</small>}
                  </td>
                  <td className="emr-lab-cell-val">
                    <span className="emr-lab-value val-normal">
                      {item.value || 'Đã thực hiện'}
                    </span>
                  </td>
                  <td>
                    <Tag color="blue" bordered={false}>{item.status || 'Hoàn tất'}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có chỉ định cận lâm sàng trong hồ sơ"
        />
      )}
    </Card>
  );
};
