import { useEffect, useMemo, useRef, useState } from "react";
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
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { useAppState } from "../state/useAppState";
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
import { savePatientAvatarUrl, getPatientAvatarUrl } from "../utils/avatarUtils";
import "./Profile.css";

const { Title, Text } = Typography;

interface Treatment {
  id: string;
  status?: string | { name?: string; code?: string };
  type?: string | { name?: string; code?: string };
  department?: string | { name?: string; code?: string };
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
    aiQuota: 30,
    description: "Gói phổ thông — dành cho theo dõi sức khỏe thường xuyên.",
    recommended: true,
    features: [
      "Tất cả tính năng gói Free",
      "Phân tích tổn thương bằng AI (30 lượt/tháng)",
      "Cảnh báo nguy cơ & theo dõi tiến triển",
      "Hỗ trợ tư vấn bác sĩ ưu tiên"
    ],
  },
  {
    code: "pro",
    name: "Pro",
    price: 599_000,
    aiQuota: 100,
    description: "Gói nâng cao — đầy đủ công cụ theo dõi điều trị da liễu.",
    features: [
      "Tất cả tính năng gói Plus",
      "Phân tích tổn thương bằng AI (100 lượt/tháng)",
      "Báo cáo chuyên sâu cho bác sĩ",
      "Định danh bảo mật VNeID tích hợp"
    ],
  },
  {
    code: "max",
    name: "Max",
    price: 1_299_000,
    aiQuota: 9999,
    description: "Gói không giới hạn — bảo vệ toàn diện cho gia đình.",
    features: [
      "Không giới hạn phân tích AI",
      "Hồ sơ y tế điện tử trọn đời",
      "Hỗ trợ 24/7 trực tiếp từ chuyên gia",
      "Quyền truy cập tính năng mới sớm nhất"
    ],
  },
];

const calculateAge = (dobString?: string | null) => {
  if (!dobString || typeof dobString !== "string") return undefined;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age > 0 ? age : undefined;
};

const formatDate = (value?: string | null) => {
  if (!value || typeof value !== "string") return "Chưa cập nhật";
  const date = new Date(value);
  return isNaN(date.getTime()) ? "Chưa cập nhật" : date.toLocaleDateString("vi-VN");
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("vi-VN").format(amount);

const safeString = (val: unknown, fallback: string = "—"): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val.trim() || fallback;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.display === "string") return obj.display;
    if (typeof obj.code === "string") return obj.code;
  }
  return fallback;
};

export default function Profile() {
  const { message } = AntApp.useApp();
  const { currentPatient, currentUser, refreshMe } = useAppState();
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
  const [avatarPreview, setAvatarPreview] = useState<string>(() =>
    getPatientAvatarUrl(currentUser?.id, currentPatient?.id) || ""
  );
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[number]>();
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatarPreview(getPatientAvatarUrl(currentUser?.id, currentPatient?.id) || "");
    };
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, [currentUser?.id, currentPatient?.id]);

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
          name: safeString(patientResult.value.name, ""),
          dob: safeString(patientResult.value.dob, ""),
          gender: safeString(patientResult.value.gender, "male"),
          phone: safeString(patientResult.value.phone, ""),
          email: safeString(patientResult.value.email, ""),
          address: safeString(patientResult.value.address, ""),
          bloodType: safeString(patientResult.value.bloodType, "unknown"),
          heightCm: typeof patientResult.value.heightCm === "number" ? patientResult.value.heightCm : undefined,
          weightKg: typeof patientResult.value.weightKg === "number" ? patientResult.value.weightKg : undefined,
        });
      }
      if (healthResult.status === "fulfilled") setHealth(healthResult.value);
      if (historyResult.status === "fulfilled" && Array.isArray(historyResult.value)) {
        setHistory(historyResult.value);
      }
      if (aiResult.status === "fulfilled" && aiResult.value) {
        const now = new Date();
        setAiUsed(
          (aiResult.value.assessments ?? []).filter((row) => {
            if (!row.generatedAt) return false;
            const date = new Date(row.generatedAt);
            return !isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
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

  const age = calculateAge(patient?.dob);
  const bmi = useMemo(() => {
    if (typeof patient?.heightCm !== "number" || typeof patient?.weightKg !== "number" || patient.heightCm <= 0) return undefined;
    return patient.weightKg / ((patient.heightCm / 100) ** 2);
  }, [patient?.heightCm, patient?.weightKg]);
  
  const currentPlan = PLANS[0];
  const usagePercent = Math.min(100, Math.round((aiUsed / currentPlan.aiQuota) * 100));

  const saveProfile = async (values: ProfileForm) => {
    setSaving(true);
    try {
      const targetPatientId = patient?.id || currentPatient.id;
      const targetUserVersion = typeof me?.version === "number" ? me.version : 1;
      const targetPatientVersion = typeof patient?.version === "number" ? patient.version : 1;

      const userUpdate = me?.id
        ? updateMe({
            displayName: String(values.name ?? "").trim(),
            phone: String(values.phone ?? "").trim(),
            version: targetUserVersion,
          }).catch((err: unknown) => {
            console.warn("Backend updateMe warning:", err);
            return null;
          })
        : Promise.resolve(null);

      const patientUpdate = updatePatient(targetPatientId, {
          name: String(values.name ?? "").trim(),
          dob: String(values.dob ?? ""),
          gender: String(values.gender ?? "male"),
          phone: String(values.phone ?? "").trim(),
          email: values.email ? String(values.email).trim() : null,
          address: values.address ? String(values.address).trim() : null,
          bloodType: String(values.bloodType ?? "unknown"),
          heightCm: typeof values.heightCm === "number" ? values.heightCm : null,
          weightKg: typeof values.weightKg === "number" ? values.weightKg : null,
          version: targetPatientVersion,
        }).catch((err: unknown) => {
          console.warn("Backend updatePatient warning:", err);
          return null;
        });

      const [updatedUser, updatedPatient] = await Promise.all([userUpdate, patientUpdate]);
      if (updatedUser) setMe(updatedUser);
      if (updatedPatient) setPatient(updatedPatient);

      await refreshMe();
      window.dispatchEvent(new Event("profile_updated"));

      void message.success("Đã cập nhật thông tin cá nhân thành công.");
    } catch (error) {
      console.error("Save profile error:", error);
      void message.error(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ cá nhân.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
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
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      savePatientAvatarUrl(dataUrl, me?.id || currentUser?.id, patient?.id || currentPatient?.id);
      setAvatarPreview(dataUrl);

      try {
        const uploaded = await uploadFile(file, "avatar");
        if (me?.version) {
          const updated = await updateMe({ avatarFileId: uploaded.fileId, version: me.version });
          setMe(updated);
        }
      } catch (uploadErr) {
        console.warn("Lưu avatar ở phía backend gặp cảnh báo, đã lưu ảnh ở local:", uploadErr);
      }

      void refreshMe();
      void message.success("Đã cập nhật ảnh đại diện thành công.");
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
        message: `Yêu cầu nâng cấp gói ${selectedPlan.name} (${formatMoney(selectedPlan.price)}đ/năm) cho bệnh nhân ${safeString(patient?.code ?? currentPatient.code)}.`,
      });
      void message.success(
        `Đã gửi yêu cầu đăng ký gói ${selectedPlan.name}. Bộ phận CSKH sẽ liên hệ hỗ trợ trong thời gian sớm nhất.`
      );
      setSelectedPlan(undefined);
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : "Không thể gửi yêu cầu nâng cấp."
      );
    } finally {
      setUpgradeLoading(false);
    }
  };

  const displayName = safeString(me?.displayName || patient?.name || currentPatient.name, "Bệnh nhân");
  const patientCode = safeString(patient?.code || currentPatient.code, "—");
  const phoneText = safeString(patient?.phone, "Chưa cập nhật");
  const emailText = safeString(patient?.email || me?.email, "Chưa cập nhật");
  const addressText = safeString(patient?.address, "Chưa cập nhật địa chỉ");
  const initialChar = displayName.trim().slice(0, 1).toUpperCase();

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 20px 40px" }}>
      <Skeleton loading={loading} active paragraph={{ rows: 10 }}>
        <Row gutter={[24, 24]}>

          {/* TRÁI: BANNER THÔNG TIN BỆNH NHÂN & FORM CẬP NHẬT */}
          <Col xs={24} lg={16}>
            
            {/* THẺ BANNER THÔNG TIN BỆNH NHÂN */}
            <Card 
              bordered={false} 
              style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: 24, overflow: 'hidden' }}
              bodyStyle={{ padding: 0 }}
            >
              <div style={{ padding: 24, display: 'flex', gap: 24, alignItems: 'center', backgroundColor: '#fff' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar
                    size={96}
                    src={avatarPreview || undefined}
                    style={{ backgroundColor: '#0f172a', fontSize: 32, fontWeight: 700 }}
                  >
                    {!avatarPreview && (initialChar || <UserRound size={36} />)}
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
                  <Title level={3} style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#1f2937' }}>{displayName}</Title>
                  <Text style={{ color: '#6b7280', fontSize: 14, display: 'block', marginBottom: 8 }}>Mã bệnh nhân: <Text strong>{patientCode}</Text></Text>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#6b7280', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> {phoneText}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} /> {emailText}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {addressText}</span>
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
                    { label: "Tuổi", value: typeof age === "number" ? age : "—" },
                    { label: "Nhóm máu", value: patient?.bloodType === "unknown" || !patient?.bloodType ? "—" : safeString(patient.bloodType) },
                    { label: "Chiều cao", value: typeof patient?.heightCm === "number" ? `${patient.heightCm} cm` : "—" },
                    { label: "Cân nặng", value: typeof patient?.weightKg === "number" ? `${patient.weightKg} kg` : "—" },
                    { label: "BMI", value: typeof bmi === "number" ? bmi.toFixed(1) : "—" },
                    { label: "Điểm sức khỏe", value: typeof health?.score === "number" ? health.score : "Chưa có" },
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
                  <Button type="primary" htmlType="submit" size="large" loading={saving} style={{ borderRadius: 8, padding: '0 32px', fontWeight: 600, background: '#0f172a' }}>
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
              style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: 24, background: '#f8fafc', border: '1px solid #e2e8f0' }}
              bodyStyle={{ padding: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <Text style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase' }}>Gói hiện tại</Text>
                 <Tag color="#0f172a" style={{ color: '#fff', fontWeight: 700, borderRadius: 20, padding: '4px 12px', margin: 0, border: 'none' }}>{currentPlan.name}</Tag>
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong style={{ color: '#1f2937' }}>Phân tích hình ảnh</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>{aiUsed}/{currentPlan.aiQuota} lượt tháng này</Text>
                </div>
                <Progress percent={usagePercent} showInfo={false} strokeColor="#0ea5e9" trailColor="#e2e8f0" style={{ marginBottom: 0 }} />
              </div>
              <Button
                block
                size="large"
                style={{ borderRadius: 8, fontWeight: 600, color: '#0f172a', borderColor: '#cbd5e1', backgroundColor: '#fff' }}
                onClick={() => setSelectedPlan(PLANS[1])}
              >
                Xem các gói dịch vụ
              </Button>
            </Card>

            {/* HOẠT ĐỘNG KHÁM GẦN ĐÂY */}
            <Card 
              title={<span style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: '#111827', letterSpacing: 0.5 }}>Hoạt động khám gần đây</span>} 
              bordered={false} 
              style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
              headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}
              bodyStyle={{ padding: history.length ? '0 24px' : 24 }}
            >
              {history.length > 0 ? (
                <div>
                  {history.slice(0, 5).map((item) => {
                    const deptText = safeString(item.department, "Khoa Da liễu");
                    const typeText = safeString(item.type, "Standard");
                    const rawStatus = safeString(item.status, "completed");
                    const statusLabel = ENCOUNTER_STATUS_LABEL[rawStatus as EncounterStatus] ?? rawStatus;
                    return (
                      <div key={item.id} style={{ padding: '16px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong style={{ display: 'block', fontSize: 14, color: '#1f2937' }}>{deptText}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(item.createdAt)} · {typeText}</Text>
                        </div>
                        <Tag color="blue" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12 }}>
                          {statusLabel}
                        </Tag>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '24px 0' }}>Chưa có lịch sử khám bệnh.</Text>
              )}
            </Card>

          </Col>

        </Row>
      </Skeleton>

      {/* MODAL NÂNG CẤP GÓI */}
      <Modal
        title={<span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Nâng cấp gói dịch vụ</span>}
        open={Boolean(selectedPlan)}
        onCancel={() => setSelectedPlan(undefined)}
        footer={null}
        width={720}
      >
        {selectedPlan && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {PLANS.map((plan) => {
                const isSelected = selectedPlan.code === plan.code;
                return (
                  <Col xs={24} sm={12} key={plan.code}>
                    <div
                      onClick={() => setSelectedPlan(plan)}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: `2px solid ${isSelected ? '#0ea5e9' : '#e5e7eb'}`,
                        backgroundColor: isSelected ? '#f0f9ff' : '#fff',
                        cursor: 'pointer',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative'
                      }}
                    >
                      {plan.recommended && (
                        <Tag color="orange" style={{ position: 'absolute', top: 12, right: 12, borderRadius: 10, margin: 0 }}>Khuyên dùng</Tag>
                      )}
                      <div>
                        <Text strong style={{ fontSize: 18, color: '#111827', display: 'block' }}>{plan.name}</Text>
                        <Title level={3} style={{ margin: '8px 0', color: '#0ea5e9' }}>
                          {plan.price === 0 ? "Miễn phí" : `${formatMoney(plan.price)}đ`}<Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>/năm</Text>
                        </Title>
                        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>{plan.description}</Text>
                        <Divider style={{ margin: '12px 0' }} />
                        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: '#4b5563' }}>
                          {plan.features.map((feat, idx) => (
                            <li key={idx} style={{ marginBottom: 4 }}>{feat}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>

            <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button size="large" style={{ borderRadius: 8 }} onClick={() => setSelectedPlan(undefined)}>Đóng</Button>
              {selectedPlan.code !== "free" && (
                <Button
                  type="primary"
                  size="large"
                  loading={upgradeLoading}
                  style={{ borderRadius: 8, fontWeight: 600, background: '#0ea5e9' }}
                  onClick={() => void requestUpgrade()}
                >
                  Xác nhận đăng ký gói {selectedPlan.name}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
