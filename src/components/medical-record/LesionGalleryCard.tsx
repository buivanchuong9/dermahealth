import React from 'react';
import { Card, Typography, Empty } from 'antd';
import { Image as ImageIcon } from 'lucide-react';
import type { LifetimeMedicalRecord } from '../../api/lifetimeMedicalRecord';

const { Title, Text } = Typography;

interface LesionGalleryCardProps {
  record?: LifetimeMedicalRecord;
}

export const LesionGalleryCard: React.FC<LesionGalleryCardProps> = ({ record }) => {
  const documents = (record?.events || []).flatMap((e) =>
    e.documents.map((doc) => ({
      ...doc,
      eventTitle: e.title,
      occurredAt: e.occurredAt,
    }))
  );

  return (
    <Card
      bordered={false}
      className="emr-card"
      title={
        <div className="emr-card-header">
          <ImageIcon size={17} className="emr-card-header__icon" />
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Tài liệu & Hình ảnh đính kèm
          </Title>
        </div>
      }
    >
      {documents.length > 0 ? (
        <div className="emr-lesion-gallery">
          <div className="emr-lesion-grid">
            {documents.map((doc, idx) => (
              <div key={doc.id || idx} className="emr-lesion-item">
                <div className="emr-lesion-info" style={{ padding: 12 }}>
                  <Text strong style={{ fontSize: 12.5, display: 'block', color: '#1e293b' }}>
                    {doc.title}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    {doc.occurredAt ? new Date(doc.occurredAt).toLocaleDateString('vi-VN') : ''}
                  </Text>
                  {doc.downloadUrl && (
                    <a href={doc.downloadUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#0284c7', display: 'block', marginTop: 4 }}>
                      Tải về
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có hình ảnh / tài liệu đính kèm"
        />
      )}
    </Card>
  );
};
