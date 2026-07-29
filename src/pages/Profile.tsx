import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Skeleton,
  Tag,
  Typography,
  App as AntApp,
  Divider,
} from "antd";
import {
  Camera,
  ChevronRight,
  LogOut,
  Mail,
  MapPin,
  Phone,
  UserRound,
  CheckCircle2,
} from "lucide-react";
import { useAppState } from "../state/useAppState";
import { logoutCurrentSession } from "../api/auth";
import { getMe, updateMe } from "../api/me";
import {
  getHealthSummary,
  getPatientDetails,
  getReport,
  updatePatient,
  type ApiPatient,
  type HealthSummary,
} from "../api/clinical";
import { uploadFile } from "../api/uploads";
import { createSupportTicket } from "../api/support";
import { ENCOUNTER_STATUS_LABEL, type EncounterStatus } from "../domain/core/enums";
import type { AuthUser } from "../api/types";
import "./Profile.css";

const { Title, Text } = Typography;

interface Treatment {
  id: string;
  status: EncounterStatus;
  type?: string;
  department?: string;
  createdAt: string;
}

interface AiSummary {
  assessments?: Array<{ generatedAt?: string }>;
}

interface ProfileForm {
  name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  heightCm?: number;
  weightKg?: number;
}

type PlanCode = "free" | "plus" | "pro" | "max";

const PLANS: Array<{
  code: PlanCode;
  name: string;
  price: number;
  aiQuota: number;
  description: string;
  features: string[];
  recommended?: boolean;
}> = [
  {
    code: "free",
    name: "Free",
    price: 0,
    aiQuota: 3,
    description: "Bắt đầu miễn phí — phù hợp để trải nghiệm hệ thống cơ bản.",
    features: [
      "Quản lý hồ sơ sức khỏe cá nhân",
      "Lưu trữ lịch sử khám và đơn thuốc",
      "Cập nhật các chỉ số cơ thể cơ bản",
      "Nhận thông báo nhắc lịch khám định kỳ"
    ],
  },
  {
    code: "plus",
    name: "Plus",
    price: 299_000,
    aiQuota: 20,
    description: "Lý tưởng cho nhu cầu theo dõi sức khỏe thường xuyên.",
    features: [
      "Tất cả tính năng của gói Free",
      "So sánh tiến triển qua hình ảnh y tế",
      "Lịch trình nhắc nhở uống thuốc tự động",
      "Cảnh báo thông minh khi chỉ số bất thường"
    ],
  },
  {
    code: "pro",
    name: "Pro",
    price: 599_000,
    aiQuota: 60,
    description: "Theo dõi dài hạn và chăm sóc chuyên sâu với báo cáo chi tiết.",
    features: [
      "Tất cả tính năng của gói Plus",
      "Quản lý thêm 2 hồ sơ người thân gia đình",
      "Trích xuất báo cáo sức khỏe (PDF/Excel)",
      "Ưu tiên xử lý hỗ trợ và giải đáp thắc mắc"
    ],
    recommended: true,
  },
  {
    code: "max",
    name: "Max",
    price: 1_999_000,
    aiQuota: 200,
    description: "Giải pháp toàn diện cho gia đình, lưu trữ không giới hạn thời gian.",
    features: [
      "Tất cả tính năng của gói Pro",
      "Lưu trữ không giới hạn toàn bộ hình ảnh",
      "Quản lý lên đến 5 hồ sơ thành viên gia đình",
      "Kết nối tư vấn trực tiếp với bác sĩ điều trị",
      "Hỗ trợ kỹ thuật chuyên biệt ưu tiên 24/7"
    ],
  },
];

const getPlanColors = (index: number) => {
  const colors = [
    { bg: "#f1f5f9", text: "#475569", btn: "#94a3b8" }, // Free
    { bg: "#dbeedb", text: "#0f6b0f", btn: "#0f6b0f" }, // Plus
    { bg: "#cce9f8", text: "#0e5e88", btn: "#0e5e88" }, // Pro
    { bg: "#fff3d0", text: "#b87d00", btn: "#b87d00" }, // Max
  ];
  return colors[index % colors.length];
};

const GENDER_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
  unknown: "Chưa cập nhật",
};

const formatMoney = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const formatDate = (value?: string) =>
  value ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "—";

function calculateAge(dob?: string): number | undefined {
  if (!dob) return undefined;
  const birth = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : undefined;
}

export default function Profile() {
  const nav = useNavigate();
  const { message } = AntApp.useApp();
  const { currentPatient, resetSession, refreshMe } = useAppState();
  const [form] = Form.useForm<ProfileForm>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [me, setMe] = useState<AuthUser>();
  const [patient, setPatient] = useState<ApiPatient>();
  const [health, setHealth] = useState<HealthSummary>();
  const [history, setHistory] = useState<Treatment[]>([]);
  const [aiUsed, setAiUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>();
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[number]>();
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getMe(),
      getPatientDetails(currentPatient.id),
      getHealthSummary(currentPatient.id),
      getReport<Treatment[]>(currentPatient.id, "treatment-history"),
      getReport<AiSummary>(currentPatient.id, "ai-summary"),
    ]).then(([userResult, patientResult, healthResult, historyResult, aiResult]) => {
      if (!active) return;
      if (userResult.status === "fulfilled") setMe(userResult.value);
      if (patientResult.status === "fulfilled") {
        setPatient(patientResult.value);
        form.setFieldsValue({
          name: patientResult.value.name,
          dob: patientResult.value.dob,
          gender: patientResult.value.gender,
          phone: patientResult.value.phone,
          email: patientResult.value.email ?? "",
          address: patientResult.value.address ?? "",
          bloodType: patientResult.value.bloodType,
          heightCm: patientResult.value.heightCm ?? undefined,
          weightKg: patientResult.value.weightKg ?? undefined,
        });
      }
      if (healthResult.status === "fulfilled") setHealth(healthResult.value);
      if (historyResult.status === "fulfilled") setHistory(historyResult.value);
      if (aiResult.status === "fulfilled") {
        const now = new Date();
        setAiUsed(
          (aiResult.value.assessments ?? []).filter((row) => {
            if (!row.generatedAt) return false;
            const date = new Date(row.generatedAt);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
          }).length,
        );
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [currentPatient.id, form]);

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  const age = calculateAge(patient?.dob);
  const bmi = useMemo(() => {
    if (!patient?.heightCm || !patient.weightKg) return undefined;
    return patient.weightKg / ((patient.heightCm / 100) ** 2);
  }, [patient?.heightCm, patient?.weightKg]);
  
  const currentPlan = PLANS[0];
  const usagePercent = Math.min(100, Math.round((aiUsed / currentPlan.aiQuota) * 100));

  const saveProfile = async (values: ProfileForm) => {
    if (!patient || !me) return;
    setSaving(true);
    try {
      const [updatedUser, updatedPatient] = await Promise.all([
        updateMe({ displayName: values.name.trim(), phone: values.phone.trim(), version: me.version }),
        updatePatient(patient.id, {
          name: values.name.trim(),
          dob: values.dob,
          gender: values.gender,
          phone: values.phone.trim(),
          email: values.email.trim() || null,
          address: values.address.trim() || null,
          bloodType: values.bloodType,
          heightCm: values.heightCm ?? null,
          weightKg: values.weightKg ?? null,
          version: patient.version,
        }),
      ]);
      setMe(updatedUser);
      setPatient(updatedPatient);
      void refreshMe();
      void message.success("Đã cập nhật hồ sơ cá nhân thành công.");
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file || !me) return;
    if (!file.type.startsWith("image/")) {
      void message.error("Vui lòng chọn tệp ảnh.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      void message.error("Ảnh đại diện không được vượt quá 5 MB.");
      return;
    }
    setAvatarLoading(true);
    try {
      const uploaded = await uploadFile(file, "avatar");
      const updated = await updateMe({ avatarFileId: uploaded.fileId, version: me.version });
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(URL.createObjectURL(file));
      setMe(updated);
      void message.success("Đã cập nhật ảnh đại diện.");
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "Không thể tải ảnh đại diện.");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const requestUpgrade = async () => {
    if (!selectedPlan || selectedPlan.code === "free") return;
    setUpgradeLoading(true);
    try {
      await createSupportTicket({
        topic: "billing",
        message: `Yêu cầu nâng cấp gói ${selectedPlan.name} (${formatMoney(selectedPlan.price)}đ/năm) cho bệnh nhân ${patient?.code ?? currentPatient.code}.`,
      });
      setSelectedPlan(undefined);
      void message.success("Đã gửi yêu cầu nâng cấp. Bộ phận hỗ trợ sẽ liên hệ để xác nhận thanh toán.");
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "Không thể gửi yêu cầu nâng cấp.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  if (loading) {
    return <Card style={{ margin: 24, borderRadius: 16 }}><Skeleton active avatar paragraph={{ rows: 8 }} /></Card>;
  }

  const avatarSrc = avatarPreview ?? me?.avatarUrl;

  return (
    <div className="profile-page-wrapper">
      <div style={{ width: '100%', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: 32 }}>Hồ sơ cá nhân</Title>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>Quản lý thông tin định danh, chỉ số sức khỏe và gói dịch vụ.</Text>
          </div>
          <Button 
            size="large" 
            icon={<LogOut size={16} />} 
            style={{ borderRadius: 8, fontWeight: 600, color: '#4b5563', borderColor: '#d1d5db' }}
            onClick={() => logoutCurrentSession().finally(() => { resetSession(); nav("/login"); })}
          >
            Đăng xuất
          </Button>
        </div>

        <Row gutter={[24, 24]}>
          {/* TRÁI: THÔNG TIN CÁ NHÂN & SỨC KHỎE */}
          <Col xs={24} lg={16}>
            
            {/* THÔNG TIN CƠ BẢN & CHỈ SỐ */}
            <Card 
              bordered={false} 
              style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: 24 }}
              bodyStyle={{ padding: 0 }}
            >
              <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 24, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar 
                    size={100} 
                    src={avatarSrc} 
                    icon={!avatarSrc && <UserRound size={40} />} 
                    style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', fontSize: 32, border: '2px solid #e5e7eb' }}
                  >
                    {(me?.displayName ?? patient?.name ?? currentPatient.name).slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Button 
                    type="primary"
                    shape="circle" 
                    icon={<Camera size={16} />} 
                    size="small"
                    style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0ea5e9', border: '2px solid #fff', width: 32, height: 32 }}
                    disabled={avatarLoading}
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(event) => void uploadAvatar(event.target.files?.[0])}
                  />
                </div>
                <div>
                  <Title level={3} style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#1f2937' }}>{me?.displayName ?? patient?.name ?? currentPatient.name}</Title>
                  <Text style={{ color: '#6b7280', fontSize: 14, display: 'block', marginBottom: 8 }}>Mã bệnh nhân: <Text strong>{patient?.code ?? currentPatient.code}</Text></Text>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#6b7280', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> {patient?.phone || "Chưa cập nhật"}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} /> {patient?.email || me?.email || "Chưa cập nhật"}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {patient?.address || "Chưa cập nhật địa chỉ"}</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                   <Text strong style={{ fontSize: 15, color: '#374151' }}>Tình trạng sức khỏe cơ bản</Text>
                   <Text type="secondary" style={{ fontSize: 13 }}>Cập nhật gần nhất {formatDate(patient?.updatedAt)}</Text>
                </div>
                <Row gutter={[16, 16]}>
                  {[
                    { label: "Tuổi", value: age ?? "—" },
                    { label: "Nhóm máu", value: patient?.bloodType === "unknown" ? "—" : patient?.bloodType },
                    { label: "Chiều cao", value: patient?.heightCm ? `${patient.heightCm} cm` : "—" },
                    { label: "Cân nặng", value: patient?.weightKg ? `${patient.weightKg} kg` : "—" },
                    { label: "BMI", value: bmi ? bmi.toFixed(1) : "—" },
                    { label: "Điểm sức khỏe", value: health?.score ?? "Chưa có" },
                  ].map((stat, idx) => (
                    <Col span={8} sm={4} key={idx}>
                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <Text strong style={{ fontSize: 20, color: '#111827', lineHeight: 1.2 }}>{stat.value}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>{stat.label}</Text>
                       </div>
                    </Col>
                  ))}
                </Row>
              </div>
            </Card>

            {/* THÔNG TIN CÁ NHÂN (FORM) */}
            <Card 
              title={<span style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: '#111827', letterSpacing: 0.5 }}>Thông tin cá nhân</span>} 
              bordered={false} 
              style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
              headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}
              bodyStyle={{ padding: 24 }}
            >
              <Form form={form} layout="vertical" onFinish={saveProfile}>
                <Row gutter={24}>
                  <Col xs={24} md={12}><Form.Item name="name" label={<Text strong>Họ và tên</Text>} rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}><Input size="large" style={{ borderRadius: 8 }} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="dob" label={<Text strong>Ngày sinh</Text>} rules={[{ required: true, message: "Vui lòng nhập ngày sinh" }]}><Input type="date" size="large" style={{ borderRadius: 8 }} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="gender" label={<Text strong>Giới tính</Text>}><Select size="large" style={{ borderRadius: 8 }} options={[{ value: "male", label: "Nam" }, { value: "female", label: "Nữ" }, { value: "other", label: "Khác" }, { value: "unknown", label: "Chưa cập nhật" }]} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="bloodType" label={<Text strong>Nhóm máu</Text>}><Select size="large" style={{ borderRadius: 8 }} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"].map((value) => ({ value, label: value === "unknown" ? "Chưa biết" : value }))} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="heightCm" label={<Text strong>Chiều cao (cm)</Text>}><InputNumber size="large" min={50} max={250} precision={1} style={{ width: "100%", borderRadius: 8 }} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="weightKg" label={<Text strong>Cân nặng (kg)</Text>}><InputNumber size="large" min={2} max={500} precision={1} style={{ width: "100%", borderRadius: 8 }} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="phone" label={<Text strong>Điện thoại</Text>} rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}><Input size="large" style={{ borderRadius: 8 }} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="email" label={<Text strong>Email</Text>}><Input type="email" size="large" style={{ borderRadius: 8 }} /></Form.Item></Col>
                  <Col span={24}><Form.Item name="address" label={<Text strong>Địa chỉ</Text>}><Input size="large" style={{ borderRadius: 8 }} /></Form.Item></Col>
                </Row>
                <div style={{ textAlign: 'right', marginTop: 16 }}>
                  <Button type="primary" htmlType="submit" size="large" loading={saving} style={{ borderRadius: 8, padding: '0 32px', fontWeight: 600, background: '#0e5e88' }}>
                    Lưu thay đổi
                  </Button>
                </div>
              </Form>
            </Card>

          </Col>

          {/* PHẢI: GÓI HIỆN TẠI & LỊCH SỬ KHÁM */}
          <Col xs={24} lg={8}>
            
            {/* GÓI HIỆN TẠI */}
            <Card 
              bordered={false} 
              style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: 24, background: '#cce9f8' }}
              bodyStyle={{ padding: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <Text style={{ fontSize: 15, fontWeight: 600, color: '#0e5e88', textTransform: 'uppercase' }}>Gói hiện tại</Text>
                 <Tag color="#fff" style={{ color: '#0e5e88', fontWeight: 700, borderRadius: 20, padding: '4px 12px', margin: 0, border: 'none' }}>{currentPlan.name}</Tag>
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong style={{ color: '#1f2937' }}>Phân tích hình ảnh</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>{aiUsed}/{currentPlan.aiQuota} lượt tháng này</Text>
                </div>
                <Progress percent={usagePercent} showInfo={false} strokeColor="#0e5e88" trailColor="rgba(255,255,255,0.5)" />
              </div>
              <Button size="large" block style={{ borderRadius: 8, fontWeight: 600, color: '#0e5e88', borderColor: '#0e5e88' }} onClick={() => document.getElementById("service-plans")?.scrollIntoView({ behavior: "smooth" })}>
                Xem các gói dịch vụ
              </Button>
            </Card>

            {/* HOẠT ĐỘNG KHÁM */}
            <Card 
              title={<span style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: '#111827', letterSpacing: 0.5 }}>Hoạt động khám gần đây</span>} 
              bordered={false} 
              style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
              headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}
              bodyStyle={{ padding: '8px 24px 24px 24px' }}
            >
              {history.length === 0 && <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>Chưa có lịch sử điều trị.</Text>}
              {history.slice(0, 4).map((item, index) => (
                <div key={item.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                    <div>
                       <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.department || "Lượt khám chuyên khoa"}</div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(item.createdAt)}</Text>
                          <span style={{ color: '#d1d5db' }}>•</span>
                          <Text type="secondary" style={{ fontSize: 12 }}>{item.type || "Khám bệnh"}</Text>
                       </div>
                    </div>
                    <Tag color="blue" style={{ margin: 0, borderRadius: 16 }}>{ENCOUNTER_STATUS_LABEL[item.status] ?? item.status}</Tag>
                  </div>
                  {index < 3 && <Divider style={{ margin: 0 }} />}
                </div>
              ))}
            </Card>

          </Col>
        </Row>

        {/* PRICING PLANS */}
        <div id="service-plans" style={{ marginTop: 40, marginBottom: 24 }}>
           <Title level={3} style={{ fontWeight: 700, color: '#111827', margin: 0 }}>Thông tin các gói dịch vụ</Title>
           <Text style={{ color: '#6b7280', fontSize: 15 }}>Lựa chọn gói dịch vụ phù hợp với nhu cầu theo dõi sức khỏe của bạn.</Text>
        </div>
        
        <Row gutter={[24, 24]}>
          {PLANS.map((plan, index) => {
            const c = getPlanColors(index);
            return (
              <Col xs={24} sm={12} lg={6} key={plan.code}>
                <div style={{ 
                  background: '#fff', 
                  borderRadius: 16, 
                  padding: 24, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  position: 'relative',
                  border: plan.recommended ? `2px solid ${c.btn}` : '1px solid #e5e7eb',
                  boxShadow: plan.recommended ? `0 8px 24px ${c.btn}20` : '0 2px 8px rgba(0,0,0,0.02)',
                  transition: 'all 0.3s ease',
                }}>
                  {plan.recommended && (
                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: c.btn, color: '#fff', padding: '4px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                      Khuyên dùng
                    </div>
                  )}
                  
                  <div style={{ background: c.bg, color: c.text, alignSelf: 'flex-start', padding: '6px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                    {plan.name}
                  </div>
                  
                  <div style={{ marginTop: 24, fontSize: 32, fontWeight: 800, color: '#111827' }}>
                    {plan.price === 0 ? "Miễn phí" : formatMoney(plan.price)}
                    {plan.price > 0 && <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280', marginLeft: 4 }}>đ/năm</span>}
                  </div>

                  <div style={{ margin: '16px 0', fontSize: 14, color: '#4b5563', minHeight: 44, lineHeight: 1.5 }}>
                    {plan.description}
                  </div>

                  <Divider style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />

                  <div style={{ flex: 1, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, fontSize: 14, color: '#1f2937' }}>
                       <CheckCircle2 size={18} color={c.btn} style={{ flexShrink: 0, marginTop: 2 }} />
                       <span><Text strong>{plan.aiQuota}</Text> lượt phân tích hình ảnh / tháng</span>
                    </div>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, fontSize: 14, color: '#1f2937' }}>
                        <CheckCircle2 size={18} color={c.btn} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    type={plan.recommended ? "primary" : "default"} 
                    size="large" 
                    block 
                    style={{ 
                      borderRadius: 8, 
                      fontWeight: 600, 
                      background: plan.recommended ? c.btn : (plan.code === 'free' ? '#f3f4f6' : '#fff'),
                      borderColor: plan.recommended ? c.btn : '#d1d5db',
                      color: plan.recommended ? '#fff' : '#374151'
                    }} 
                    onClick={() => setSelectedPlan(plan)}
                    disabled={plan.code === 'free'}
                  >
                    {plan.code === 'free' ? 'Đang sử dụng' : 'Đăng ký ngay'}
                  </Button>
                </div>
              </Col>
            );
          })}
        </Row>

      </div>

      <Modal
        title={`Xác nhận nâng cấp ${selectedPlan?.name ?? ""}`}
        open={Boolean(selectedPlan)}
        onCancel={() => setSelectedPlan(undefined)}
        onOk={() => void requestUpgrade()}
        okText="Gửi yêu cầu nâng cấp"
        cancelText="Để sau"
        confirmLoading={upgradeLoading}
        centered
        styles={{ content: { borderRadius: 16 } }}
      >
        {selectedPlan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            <div>
               <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Phí dịch vụ</Text>
               <Title level={3} style={{ margin: 0, color: '#111827' }}>{formatMoney(selectedPlan.price)}đ/năm</Title>
            </div>
            <div>
               <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Hạn mức</Text>
               <Text strong style={{ fontSize: 16 }}>{selectedPlan.aiQuota} lượt phân tích mỗi tháng</Text>
            </div>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, color: '#475569', fontSize: 14 }}>
               Yêu cầu sẽ được chuyển tới bộ phận thanh toán. Gói chỉ được kích hoạt sau khi giao dịch được xác nhận.
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
