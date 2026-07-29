import React from 'react';
import { Button, Space, Tag } from 'antd';
import { Printer, FileDown, FileSignature, Share2, ShieldCheck, UserCheck, Lock } from 'lucide-react';

interface HeaderToolbarProps {
  nationalHealthId?: string | null;
  synchronizedAt?: string;
  onPrint?: () => void;
  onExportPdf?: () => void;
  onDigitalSign?: () => void;
  onShare?: () => void;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  nationalHealthId,
  synchronizedAt,
  onPrint,
  onExportPdf,
  onDigitalSign,
  onShare,
}) => {
  const formattedSync = synchronizedAt
    ? new Date(synchronizedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Mới nhất';

  return (
    <div className="emr-header-toolbar">
      <Space size={8} wrap className="emr-header-toolbar__actions">
        <Button className="emr-action-btn" icon={<Printer size={16} className="emr-btn-icon" />} onClick={onPrint}>
          In hồ sơ
        </Button>
        <Button className="emr-action-btn" icon={<FileDown size={16} className="emr-btn-icon" />} onClick={onExportPdf}>
          Xuất PDF
        </Button>
        <Button className="emr-action-btn" icon={<FileSignature size={16} className="emr-btn-icon" />} onClick={onDigitalSign}>
          Ký số
        </Button>
        <Button className="emr-action-btn" icon={<Share2 size={16} className="emr-btn-icon" />} onClick={onShare}>
          Chia sẻ hồ sơ
        </Button>
      </Space>

      <Space size={8} wrap className="emr-header-toolbar__badges">
        <Tag className="emr-status-tag" icon={<ShieldCheck size={13} className="emr-tag-icon" />}>
          {nationalHealthId ? `VNeID: ${nationalHealthId}` : 'VNeID Chưa định danh'}
        </Tag>
        <Tag className="emr-status-tag" icon={<UserCheck size={13} className="emr-tag-icon" />}>
          Đồng bộ: {formattedSync}
        </Tag>
        <Tag className="emr-status-tag" icon={<Lock size={13} className="emr-tag-icon" />}>
          Quyền riêng tư: Đã mở
        </Tag>
      </Space>
    </div>
  );
};
