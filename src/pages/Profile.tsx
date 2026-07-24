import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Empty,
  List,
  Space,
  Spin,
  Statistic,
  Typography,
} from "antd";
import { LogOut } from "lucide-react";
import { useAppState } from "../state/useAppState";
import { logoutCurrentSession } from "../api/auth";
import { getMe } from "../api/me";
import {
  getHealthSummary,
  getReport,
  type HealthSummary,
} from "../api/clinical";
import type { AuthUser } from "../api/types";
const { Title } = Typography;
interface Treatment {
  id: string;
  status: string;
  createdAt: string;
}
export default function Profile() {
  const nav = useNavigate();
  const { currentPatient, resetSession } = useAppState();
  const [me, setMe] = useState<AuthUser>();
  const [health, setHealth] = useState<HealthSummary>();
  const [history, setHistory] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      getMe(),
      getHealthSummary(currentPatient.id),
      getReport<Treatment[]>(currentPatient.id, "treatment-history"),
    ])
      .then(([user, summary, rows]) => {
        setMe(user);
        setHealth(summary);
        setHistory(rows);
      })
      .finally(() => setLoading(false));
  }, [currentPatient.id]);
  if (loading) return <Spin />;
  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Title level={3}>Hồ sơ cá nhân</Title>
      <Card>
        <Space>
          <Avatar size={72}>{currentPatient.name.slice(0, 1)}</Avatar>
          <div>
            <Title level={4}>{me?.displayName ?? currentPatient.name}</Title>
            <Button
              danger
              icon={<LogOut />}
              onClick={() =>
                logoutCurrentSession().finally(() => {
                  resetSession();
                  nav("/login");
                })
              }
            >
              Đăng xuất
            </Button>
          </div>
        </Space>
      </Card>
      <Card title="Thông tin bệnh nhân">
        <Descriptions
          column={{ xs: 1, md: 2 }}
          items={[
            {
              key: "code",
              label: "Mã bệnh nhân",
              children: currentPatient.code,
            },
            {
              key: "dob",
              label: "Ngày sinh",
              children: currentPatient.profile.dob,
            },
            {
              key: "gender",
              label: "Giới tính",
              children: currentPatient.profile.gender,
            },
            {
              key: "phone",
              label: "Điện thoại",
              children: me?.phone ?? currentPatient.profile.phone,
            },
            {
              key: "email",
              label: "Email",
              children: me?.email ?? currentPatient.profile.email,
            },
            {
              key: "address",
              label: "Địa chỉ",
              children: currentPatient.profile.address,
            },
            {
              key: "blood",
              label: "Nhóm máu",
              children: currentPatient.profile.bloodType,
            },
          ]}
        />
      </Card>
      <Card>
        <Statistic
          title="Điểm sức khỏe"
          value={health?.score ?? "Chưa đánh giá"}
        />
      </Card>
      <Card title="Lịch sử điều trị">
        <List
          dataSource={history}
          locale={{
            emptyText: <Empty description="Chưa có lịch sử điều trị" />,
          }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.id}
                description={`${item.status} — ${new Date(item.createdAt).toLocaleString("vi-VN")}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
