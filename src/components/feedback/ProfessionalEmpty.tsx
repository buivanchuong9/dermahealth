import { Button, Space, Typography } from 'antd';
import { ArrowRight, RefreshCw } from 'lucide-react';
const noDataImage = `${import.meta.env.BASE_URL}nodata.png`;

const { Title, Text } = Typography;

export function ProfessionalEmpty({
  title = 'Chưa có dữ liệu',
  description = 'Dữ liệu sẽ xuất hiện tại đây khi sẵn sàng.',
  primaryLabel,
  primaryHref,
  onPrimary,
  onRefresh = () => window.location.reload(),
  compact = false,
  showActions = true,
}: {
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  onPrimary?: () => void;
  onRefresh?: () => void;
  compact?: boolean;
  showActions?: boolean;
}) {
  const width = compact ? 145 : 300;
  return (
    <div role="status" style={{ textAlign: 'center', padding: compact ? '8px 4px' : '24px 16px', maxWidth: 560, margin: '0 auto' }}>
      {/* Only the illustration is shown so UI copy stays Vietnamese,
          responsive and accessible; all actions below are real controls. */}
      <div style={{ width, height: compact ? 57 : 118, overflow: 'hidden', margin: '0 auto 10px' }}>
        <img src={noDataImage} alt="Minh họa chưa có dữ liệu" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>
      <Title level={compact ? 5 : 4} style={{ margin: '0 0 5px' }}>{title}</Title>
      <Text type="secondary" style={{ display: 'block', fontSize: compact ? 12 : 13, marginBottom: showActions ? 14 : 0 }}>{description}</Text>
      {showActions && <Space wrap style={{ justifyContent: 'center' }}>
        {primaryLabel && <Button type="primary" icon={<ArrowRight size={15}/>} href={primaryHref} onClick={onPrimary}>{primaryLabel}</Button>}
        <Button icon={<RefreshCw size={15}/>} onClick={onRefresh}>Tải lại</Button>
      </Space>}
    </div>
  );
}

export function GlobalEmpty({ componentName }: { componentName?: string }) {
  const selection = ['Select', 'TreeSelect', 'Cascader', 'Transfer', 'Mentions'].includes(componentName ?? '');
  return <ProfessionalEmpty compact title="Không có kết quả" description={selection ? 'Không tìm thấy lựa chọn phù hợp.' : 'Chưa có dữ liệu để hiển thị.'} showActions={!selection} />;
}
