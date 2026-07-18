import type { ReactNode } from 'react';
import { Button, Card, Space, Typography } from 'antd';
import { ArrowLeft, Home } from 'lucide-react';
import { useAppState } from '../../state/useAppState';
import { hasRoleAccess, ROLE_LABEL, type UserRole } from '../../domain/core/role';

const { Title, Text } = Typography;
const noAccessImage = `${import.meta.env.BASE_URL}no%20access.png`;

export function AccessDenied({ featureName, allowedRoles }: { featureName?: string; allowedRoles?: UserRole[] }) {
  const { role } = useAppState();
  const roleDescription = allowedRoles?.length ? `Tính năng này dành cho: ${allowedRoles.map((item) => ROLE_LABEL[item]).join(', ')}.` : 'Vui lòng chuyển sang vai trò hoặc phòng ban phù hợp.';
  return (
    <Card styles={{ body: { padding: 0 } }}>
      <div style={{ minHeight: 520, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ maxWidth: 650 }}>
          <div style={{ width: 390, maxWidth: '90vw', height: 188, overflow: 'hidden', margin: '0 auto 12px' }}>
            <img src={noAccessImage} alt="Minh họa không có quyền truy cập" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <Title level={2} style={{ margin: '0 0 8px' }}>Không có quyền truy cập</Title>
          <Text type="secondary" style={{ display: 'block', fontSize: 14 }}>
            Vai trò hiện tại của bạn là <Text strong>{ROLE_LABEL[role]}</Text> và không được phép truy cập {featureName ? `“${featureName}”` : 'tính năng này'}.
          </Text>
          <Text type="secondary" style={{ display: 'block', marginTop: 5 }}>{roleDescription}</Text>
          <Space wrap style={{ marginTop: 20, justifyContent: 'center' }}>
            <Button type="primary" icon={<Home size={15}/>} href="/app/dashboard">Về trang tổng quan</Button>
            <Button icon={<ArrowLeft size={15}/>} onClick={() => window.history.back()}>Quay lại</Button>
          </Space>
        </div>
      </div>
    </Card>
  );
}

export function RoleProtectedRoute({ allowed, featureName, children }: { allowed: UserRole[]; featureName: string; children: ReactNode }) {
  const { role } = useAppState();
  if (!hasRoleAccess(role, allowed)) return <AccessDenied featureName={featureName} allowedRoles={allowed} />;
  return children;
}
