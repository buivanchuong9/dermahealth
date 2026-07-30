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
  Slider,
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
import { ApiError } from "../api/http";
import {
  getHealthSummary,
  getCurrentPatientDetails,
  getReport,
  mapApiPatient,
  updateCurrentPatient,
  createSelfPatient,
  type ApiPatient,
  type HealthSummary,
} from "../api/clinical";
import { uploadFile } from "../api/uploads";
import {
  createAiCreditPurchaseRequest,
  createAiPlanChangeRequest,
  getMyAiEntitlement,
  type AiEntitlement,
  type AiPlan,
} from "../api/aiEntitlement";
import { ENCOUNTER_STATUS_LABEL, type EncounterStatus } from "../domain/core/enums";
import type { AuthUser } from "../api/types";
import { savePatientAvatarUrl, getPatientAvatarUrl } from "../utils/avatarUtils";
import { patientRepository } from "../domain/repositories";
import "./Profile.css";

const { Title, Text } = Typography;

interface Treatment {
  id: string;
  status?: string | { name?: string; code?: string };
  type?: string | { name?: string; code?: string };
  department?: string | { name?: string; code?: string };
  createdAt: string;
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

const formatDateTime = (value?: string | null) => {
  if (!value) return "Không rõ thời gian";
  const date = new Date(value);
  return isNaN(date.getTime())
    ? "Không rõ thời gian"
    : date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
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

const resolveProfileAvatar = (
  userId?: string | null,
  patientId?: string | null,
  backendAvatarUrl?: string | null,
): string =>
  getPatientAvatarUrl(userId, patientId) ||
  // This is the authenticated user's own profile, so falling back from the
  // owned patient key to the user key cannot leak another patient's photo.
  getPatientAvatarUrl(userId) ||
  backendAvatarUrl ||
  "";

// "No patient yet" and "haven't finished loading" and "the load failed" are
// three different situations that must never be conflated into one nullable
// value — conflating them is what let a transient load error masquerade as
// "you have no profile, click here to create one", inviting an unnecessary
// (and, if a create bug is ever reintroduced, unsafe) create attempt.
type PatientLoadState =
  | { status: "loading" }
  | { status: "ready"; patient: ApiPatient }
  | { status: "missing" }
  | { status: "error" };

export default function Profile() {
  const { message } = AntApp.useApp();
  const { refreshMe } = useAppState();
  const [form] = Form.useForm<ProfileForm>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [me, setMe] = useState<AuthUser>();
  const [patientState, setPatientState] = useState<PatientLoadState>({ status: "loading" });
  const patient = patientState.status === "ready" ? patientState.patient : undefined;
  const [health, setHealth] = useState<HealthSummary>();
  const [history, setHistory] = useState<Treatment[]>([]);
  const [aiEntitlement, setAiEntitlement] = useState<AiEntitlement>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<AiPlan>();
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [selectedCredits, setSelectedCredits] = useState(30);
  const [visitPurchaseLoading, setVisitPurchaseLoading] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatarPreview(
        resolveProfileAvatar(me?.id, patient?.id, me?.avatarUrl),
      );
    };
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, [me?.avatarUrl, me?.id, patient?.id]);

  useEffect(() => {
    let active = true;
    const loadSelfProfile = async () => {
      const userResult = await getMe();
      if (!active) return;
      setMe(userResult);
      setAvatarPreview(
        resolveProfileAvatar(userResult.id, undefined, userResult.avatarUrl),
      );
      form.setFieldsValue({
        name: safeString(userResult.displayName, ""),
        phone: safeString(userResult.phone, ""),
        email: safeString(userResult.email, ""),
      });

      const hasPatientMembership = userResult.memberships.some(
        (membership) => membership.role === "patient",
      );
      if (!hasPatientMembership) {
        setPatientState({ status: "missing" });
        form.setFieldsValue({ gender: "unknown", bloodType: "unknown" });
        return;
      }

      let patientResult: ApiPatient;
      try {
        patientResult = await getCurrentPatientDetails();
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.status === 403 || error.status === 404)
        ) {
          setPatientState({ status: "missing" });
          form.setFieldsValue({ gender: "unknown", bloodType: "unknown" });
          return;
        }
        // A transient failure (network, 5xx, unexpected shape) is not the
        // same as "no patient" — treating it as "missing" would offer the
        // create-profile CTA over data that may well already exist,
        // reintroducing the exact false-conflict class of bug this flow was
        // built to eliminate.
        setPatientState({ status: "error" });
        throw error;
      }
      if (!active) return;
      if (patientResult.userId !== userResult.id) {
        // Never fall back to currentPatient/listPatients here. A mismatched
        // record is omitted while the authenticated account profile remains
        // fully usable. This is a real (if unexpected) record, not an
        // absence of one, so it must not present as "missing" either.
        console.error(
          "Self-patient ownership mismatch",
          patientResult.id,
          patientResult.userId,
          userResult.id,
        );
        setPatientState({ status: "error" });
        return;
      }
      setPatientState({ status: "ready", patient: patientResult });
      setAvatarPreview(
        resolveProfileAvatar(
          userResult.id,
          patientResult.id,
          userResult.avatarUrl,
        ),
      );
      form.setFieldsValue({
        name: safeString(patientResult.name || userResult.displayName, ""),
        dob: safeString(patientResult.dob, ""),
        gender: safeString(patientResult.gender, "male"),
        phone: safeString(patientResult.phone || userResult.phone, ""),
        email: safeString(patientResult.email || userResult.email, ""),
        address: safeString(patientResult.address, ""),
        bloodType: safeString(patientResult.bloodType, "unknown"),
        heightCm:
          typeof patientResult.heightCm === "number"
            ? patientResult.heightCm
            : undefined,
        weightKg:
          typeof patientResult.weightKg === "number"
            ? patientResult.weightKg
            : undefined,
      });

      const [healthResult, historyResult, entitlementResult] = await Promise.allSettled([
        getHealthSummary(patientResult.id),
        getReport<Treatment[]>(patientResult.id, "treatment-history"),
        getMyAiEntitlement(),
      ]);
      if (!active) return;
      if (healthResult.status === "fulfilled") setHealth(healthResult.value);
      if (historyResult.status === "fulfilled" && Array.isArray(historyResult.value)) {
        setHistory(historyResult.value);
      }
      if (entitlementResult.status === "rejected") {
        throw entitlementResult.reason;
      }
      setAiEntitlement(entitlementResult.value);
      setSelectedCredits((current) =>
        Math.min(
          entitlementResult.value.purchaseMaxCredits,
          Math.max(entitlementResult.value.purchaseMinCredits, current),
        ),
      );
    };
    void loadSelfProfile()
      .catch((error: unknown) => {
        if (!active) return;
        void message.error(
          error instanceof Error ? error.message : "Không tải được hồ sơ cá nhân.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form, message]);

  const age = calculateAge(patient?.dob);
  const bmi = useMemo(() => {
    if (typeof patient?.heightCm !== "number" || typeof patient?.weightKg !== "number" || patient.heightCm <= 0) return undefined;
    return patient.weightKg / ((patient.heightCm / 100) ** 2);
  }, [patient?.heightCm, patient?.weightKg]);
  
  const currentPlan = aiEntitlement?.plan;
  const usagePercent = aiEntitlement?.usagePercent ?? 0;
  const scrollToUpgradePlans = () => {
    document.getElementById("service-plans")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const saveProfile = async (values: ProfileForm) => {
    if (!me) return;
    if (patient && patient.userId !== me.id) {
      void message.error("Đã chặn cập nhật vì hồ sơ không thuộc tài khoản này.");
      return;
    }
    if (patientState.status === "error") {
      void message.error(
        "Chưa xác định được trạng thái hồ sơ bệnh nhân do lỗi tải trước đó. Vui lòng tải lại trang trước khi lưu.",
      );
      return;
    }
    setSaving(true);
    try {
      const updatedUser = await updateMe({
        displayName: String(values.name ?? "").trim(),
        phone: String(values.phone ?? "").trim(),
        version: me.version,
      });
      setMe(updatedUser);

      const patientPayload = {
        dob: String(values.dob ?? ""),
        gender: String(values.gender ?? "unknown"),
        phone: String(values.phone ?? "").trim(),
        address: values.address ? String(values.address).trim() : null,
        bloodType: String(values.bloodType ?? "unknown"),
        heightCm: typeof values.heightCm === "number" ? values.heightCm : null,
        weightKg: typeof values.weightKg === "number" ? values.weightKg : null,
      };

      if (patientState.status === "ready") {
        // A patient row already exists for this account — this must always
        // be an UPDATE. Never re-enter a create flow here: that is exactly
        // the bug (edit silently turning into create, tripping a spurious
        // 409) this screen was rebuilt to eliminate.
        const updatedPatient = await updateCurrentPatient({
          name: String(values.name ?? "").trim(),
          ...patientPayload,
          email: values.email ? String(values.email).trim() : null,
          version: patientState.patient.version,
        });
        if (updatedPatient.userId !== updatedUser.id) {
          throw new Error(
            "Phản hồi cập nhật không khớp tài khoản; cần kiểm tra backend ngay.",
          );
        }
        setPatientState({ status: "ready", patient: updatedPatient });
        patientRepository.upsert(mapApiPatient(updatedPatient));
      } else {
        // No patient row yet for this account — this, and only this, is a
        // CREATE. It runs once, transparently, from the same Save action;
        // every subsequent Save (patientState.status === "ready") always
        // takes the update branch above instead.
        const created = await createSelfPatient(patientPayload);
        setPatientState({ status: "ready", patient: created });
        patientRepository.upsert(mapApiPatient(created));
        const createdEntitlement = await getMyAiEntitlement();
        setAiEntitlement(createdEntitlement);
        setSelectedCredits(
          Math.min(
            createdEntitlement.purchaseMaxCredits,
            Math.max(createdEntitlement.purchaseMinCredits, selectedCredits),
          ),
        );
      }

      await refreshMe();
      void message.success("Đã cập nhật thông tin cá nhân thành công.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // The account already has a linked patient record that this screen
        // hadn't loaded yet (e.g. created from another tab/session) —
        // recover by loading it instead of leaving the user on a raw error.
        try {
          const existing = await getCurrentPatientDetails();
          setPatientState({ status: "ready", patient: existing });
          patientRepository.upsert(mapApiPatient(existing));
          await refreshMe();
          void message.info(
            "Tài khoản này đã có hồ sơ bệnh nhân — đã tải lại dữ liệu mới nhất, vui lòng kiểm tra và lưu lại.",
          );
          return;
        } catch {
          // fall through to the generic error message below
        }
      }
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
    const previousAvatar = avatarPreview;
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (!me) throw new Error("Không xác định được tài khoản đang đăng nhập.");
      if (patient && patient.userId !== me.id) {
        throw new Error("Đã chặn cập nhật vì hồ sơ không thuộc tài khoản này.");
      }
      setAvatarPreview(dataUrl);

      const uploaded = await uploadFile(file, "avatar");
      const updated = await updateMe({
        avatarFileId: uploaded.fileId,
        version: me.version,
      });
      if (!updated.avatarUrl) {
        throw new Error("Backend đã nhận tệp nhưng không trả URL ảnh đại diện.");
      }
      setMe(updated);
      savePatientAvatarUrl(dataUrl, me.id, patient?.id);
      setAvatarPreview(updated.avatarUrl);

      await refreshMe();
      void message.success("Đã cập nhật ảnh đại diện thành công.");
    } catch (error) {
      setAvatarPreview(previousAvatar);
      void message.error(error instanceof Error ? error.message : "Không thể tải ảnh đại diện.");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const requestUpgrade = async () => {
    if (!selectedPlan || selectedPlan.code === currentPlan?.code) return;
    setUpgradeLoading(true);
    try {
      await createAiPlanChangeRequest(selectedPlan.code);
      setAiEntitlement(await getMyAiEntitlement());
      void message.success(
        `Đã ghi nhận yêu cầu chuyển sang gói ${selectedPlan.name}. Gói hiện tại chỉ thay đổi sau khi thanh toán được duyệt.`
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

  const requestVisitPurchase = async () => {
    if (!aiEntitlement || !patient) return;
    setVisitPurchaseLoading(true);
    try {
      await createAiCreditPurchaseRequest(selectedCredits);
      setAiEntitlement(await getMyAiEntitlement());
      void message.success(
        "Đã ghi nhận yêu cầu mua lượt AI. Lượt chỉ được cộng sau khi thanh toán được duyệt.",
      );
      setVisitModalOpen(false);
    } catch (error) {
      void message.error(
        error instanceof Error
          ? error.message
          : "Không thể gửi yêu cầu mua lượt AI.",
      );
    } finally {
      setVisitPurchaseLoading(false);
    }
  };

  const recentActivities = useMemo(
    () =>
      [
        ...history.map((item) => ({
          kind: "encounter" as const,
          id: item.id,
          occurredAt: item.createdAt,
          treatment: item,
        })),
        ...(aiEntitlement?.usageHistory ?? []).map((item) => ({
          kind: "ai" as const,
          id: item.id,
          occurredAt: item.occurredAt,
          usage: item,
        })),
      ]
        .sort(
          (left, right) =>
            new Date(right.occurredAt).getTime() -
            new Date(left.occurredAt).getTime(),
        )
        .slice(0, 10),
    [aiEntitlement?.usageHistory, history],
  );
  const purchaseTotal =
    selectedCredits * (aiEntitlement?.purchaseUnitPriceVnd ?? 0);

  const displayName = safeString(patient?.name || me?.displayName, "Người dùng");
  const patientCode = safeString(patient?.code, "—");
  const phoneText = safeString(patient?.phone || me?.phone, "Chưa cập nhật");
  const emailText = safeString(
    patient?.email || me?.email,
    "Chưa cập nhật",
  );
  const addressText = patient
    ? safeString(patient.address, "Chưa cập nhật địa chỉ")
    : "Hồ sơ tài khoản";
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
                  <Text style={{ color: '#6b7280', fontSize: 14, display: 'block', marginBottom: 8 }}>
                    {patient ? (
                      <>Mã bệnh nhân: <Text strong>{patientCode}</Text></>
                    ) : (
                      <>Tài khoản: <Text strong>{safeString(me?.email)}</Text></>
                    )}
                  </Text>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#6b7280', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> {phoneText}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} /> {emailText}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {addressText}</span>
                  </div>
                </div>
              </div>

              {patient && (
                <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                     <Text strong style={{ fontSize: 15, color: '#374151' }}>Tình trạng sức khỏe cơ bản</Text>
                     <Text type="secondary" style={{ fontSize: 13 }}>Cập nhật gần nhất {formatDate(patient.updatedAt)}</Text>
                  </div>
                  <Row gutter={[16, 16]}>
                    {[
                      { label: "Tuổi", value: typeof age === "number" ? age : "—" },
                      { label: "Nhóm máu", value: patient.bloodType === "unknown" || !patient.bloodType ? "—" : safeString(patient.bloodType) },
                      { label: "Chiều cao", value: typeof patient.heightCm === "number" ? `${patient.heightCm} cm` : "—" },
                      { label: "Cân nặng", value: typeof patient.weightKg === "number" ? `${patient.weightKg} kg` : "—" },
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
              )}
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
                  <Col xs={24} md={12}><Form.Item name="phone" label={<Text strong>Điện thoại</Text>} rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}><Input size="large" style={{ borderRadius: 8 }} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="email" label={<Text strong>Email</Text>}><Input type="email" size="large" style={{ borderRadius: 8 }} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="dob" label={<Text strong>Ngày sinh</Text>} rules={[{ required: true, message: "Vui lòng nhập ngày sinh" }]}><Input type="date" size="large" style={{ borderRadius: 8 }} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="gender" label={<Text strong>Giới tính</Text>}><Select size="large" style={{ borderRadius: 8 }} options={[{ value: "male", label: "Nam" }, { value: "female", label: "Nữ" }, { value: "other", label: "Khác" }, { value: "unknown", label: "Chưa cập nhật" }]} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="bloodType" label={<Text strong>Nhóm máu</Text>}><Select size="large" style={{ borderRadius: 8 }} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"].map((value) => ({ value, label: value === "unknown" ? "Chưa biết" : value }))} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="heightCm" label={<Text strong>Chiều cao (cm)</Text>}><InputNumber size="large" min={50} max={250} precision={1} style={{ width: "100%", borderRadius: 8 }} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="weightKg" label={<Text strong>Cân nặng (kg)</Text>}><InputNumber size="large" min={2} max={500} precision={1} style={{ width: "100%", borderRadius: 8 }} /></Form.Item></Col>
                  <Col span={24}><Form.Item name="address" label={<Text strong>Địa chỉ</Text>}><Input size="large" style={{ borderRadius: 8 }} /></Form.Item></Col>
                </Row>
                <div style={{ textAlign: 'right', marginTop: 16 }}>
                  <Button type="primary" htmlType="submit" size="large" loading={saving} style={{ borderRadius: 8, padding: '0 32px', fontWeight: 600, background: '#0f172a' }}>
                    Lưu thay đổi
                  </Button>
                </div>
              </Form>
            </Card>

            {patientState.status === "missing" && (
              <Card
                bordered={false}
                style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginTop: 24, background: '#f0f9ff', border: '1px solid #bae6fd' }}
                bodyStyle={{ padding: 24 }}
              >
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Tài khoản này hiện chỉ quản lý hệ thống. Điền thông tin bên trên và bấm "Lưu thay đổi" để tạo hồ sơ bệnh nhân của chính bạn — hồ sơ này tách biệt với tài khoản quản trị, chỉ bạn mới xem/sửa được.
                </Text>
              </Card>
            )}

            {patientState.status === "error" && (
              <Card
                bordered={false}
                style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginTop: 24, background: '#fef2f2', border: '1px solid #fecaca' }}
                bodyStyle={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
              >
                <div>
                  <Text strong style={{ display: 'block', fontSize: 15, color: '#0f172a', marginBottom: 4 }}>Không tải được hồ sơ bệnh nhân</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Có lỗi khi tải hồ sơ bệnh nhân của bạn. Đây có thể chỉ là sự cố tạm thời — vui lòng tải lại trang thay vì tạo hồ sơ mới.
                  </Text>
                </div>
                <Button size="large" style={{ borderRadius: 8, fontWeight: 600, flexShrink: 0 }} onClick={() => window.location.reload()}>
                  Tải lại trang
                </Button>
              </Card>
            )}

          </Col>

          {/* PHẢI: GÓI HIỆN TẠI & LỊCH SỬ KHÁM (chỉ áp dụng cho tài khoản bệnh nhân) */}
          {patient && aiEntitlement && currentPlan && (
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
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {aiEntitlement.includedQuota === null
                        ? `${aiEntitlement.includedUsed} lượt đã dùng · Không giới hạn`
                        : `${aiEntitlement.includedUsed}/${aiEntitlement.includedQuota} lượt trong gói`}
                    </Text>
                  </div>
                  <Progress percent={usagePercent} showInfo={false} strokeColor="#0ea5e9" trailColor="#e2e8f0" style={{ marginBottom: 0 }} />
                  {aiEntitlement.extraCreditBalance > 0 && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                      Còn thêm {aiEntitlement.extraCreditBalance} lượt đã mua
                    </Text>
                  )}
                </div>
                <Button
                  block
                  size="large"
                  style={{ borderRadius: 8, fontWeight: 600, color: '#0f172a', borderColor: '#cbd5e1', backgroundColor: '#fff' }}
                  onClick={scrollToUpgradePlans}
                >
                  Xem các gói dịch vụ
                </Button>
              </Card>

              {/* MUA THÊM LƯỢT AI - giữ nguyên gói dịch vụ hiện tại */}
              <Card
                bordered={false}
                style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', marginBottom: 24, border: '1px solid #e2e8f0' }}
                bodyStyle={{ padding: 24 }}
              >
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    Mua thêm lượt phân tích da bằng AI
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                    Chọn số lượt — gói hiện tại không thay đổi
                  </Text>
                </div>

                {aiEntitlement.includedQuota === null ? (
                  <div style={{ padding: '14px 16px', marginBottom: 16, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <Text style={{ color: '#166534', fontSize: 13 }}>
                      Gói {currentPlan.name} đã có lượt AI không giới hạn, không cần mua thêm.
                    </Text>
                  </div>
                ) : (
                  <div style={{ padding: '4px 4px 22px' }}>
                    <Slider
                      min={aiEntitlement.purchaseMinCredits}
                      max={aiEntitlement.purchaseMaxCredits}
                      step={1}
                      value={selectedCredits}
                      onChange={setSelectedCredits}
                      tooltip={{ formatter: (value) => `${value ?? selectedCredits} lượt` }}
                      marks={{
                        [aiEntitlement.purchaseMinCredits]: {
                          label: `${aiEntitlement.purchaseMinCredits} lượt`,
                        },
                        [Math.round(
                          (aiEntitlement.purchaseMinCredits +
                            aiEntitlement.purchaseMaxCredits) /
                            2,
                        )]: {
                          label: `${Math.round(
                            (aiEntitlement.purchaseMinCredits +
                              aiEntitlement.purchaseMaxCredits) /
                              2,
                          )} lượt`,
                        },
                        [aiEntitlement.purchaseMaxCredits]: {
                          label: `${aiEntitlement.purchaseMaxCredits} lượt`,
                        },
                      }}
                    />
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 14,
                    border: '1px solid #bae6fd',
                  }}
                >
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Bạn chọn</Text>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
                      {selectedCredits} lượt
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Thanh toán</Text>
                    <div style={{ fontWeight: 800, fontSize: 20, color: '#0ea5e9' }}>
                      {formatMoney(purchaseTotal)}
                      <span style={{ fontSize: 13, fontWeight: 500 }}>đ</span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatMoney(aiEntitlement.purchaseUnitPriceVnd)}đ/lượt
                    </Text>
                  </div>
                </div>

                <Button
                  type="primary"
                  block
                  size="large"
                  style={{ borderRadius: 8, fontWeight: 600, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', border: 'none' }}
                  disabled={aiEntitlement.includedQuota === null}
                  onClick={() => setVisitModalOpen(true)}
                >
                  {aiEntitlement.includedQuota === null
                    ? "Gói hiện tại không giới hạn"
                    : `Mua ${selectedCredits} lượt`}
                </Button>
                {aiEntitlement.pendingRequests.some(
                  (request) => request.type === "credit_purchase",
                ) && (
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                    Đang có yêu cầu mua lượt chờ xác nhận.
                  </Text>
                )}
              </Card>

              {/* LỊCH KHÁM VÀ LƯỢT DÙNG AI THỰC TẾ */}
              <Card
                title={<span style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: '#111827', letterSpacing: 0.5 }}>Hoạt động gần đây</span>}
                bordered={false}
                style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}
                bodyStyle={{ padding: recentActivities.length ? '0 24px' : 24 }}
              >
                {recentActivities.length > 0 ? (
                  <div>
                    {recentActivities.map((activity) => {
                      if (activity.kind === "ai") {
                        return (
                          <div key={`ai-${activity.id}`} style={{ padding: '16px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <div>
                              <Text strong style={{ display: 'block', fontSize: 14, color: '#1f2937' }}>
                                Phân tích da bằng AI
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {formatDateTime(activity.occurredAt)} · {safeString(activity.usage.bodyRegion, "Vùng da")}
                              </Text>
                            </div>
                            <Tag color={activity.usage.allowanceKind === "purchased" ? "purple" : "cyan"} style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12, margin: 0, flexShrink: 0 }}>
                              {activity.usage.allowanceKind === "purchased" ? "Lượt mua thêm" : "Trong gói"}
                            </Tag>
                          </div>
                        );
                      }

                      const item = activity.treatment;
                      const deptText = safeString(item.department, "Khoa Da liễu");
                      const typeText = safeString(item.type, "Standard");
                      const rawStatus = safeString(item.status, "completed");
                      const statusLabel = ENCOUNTER_STATUS_LABEL[rawStatus as EncounterStatus] ?? rawStatus;
                      return (
                        <div key={`encounter-${item.id}`} style={{ padding: '16px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                          <div>
                            <Text strong style={{ display: 'block', fontSize: 14, color: '#1f2937' }}>{deptText}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{formatDateTime(item.createdAt)} · {typeText}</Text>
                          </div>
                          <Tag color="blue" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12, margin: 0, flexShrink: 0 }}>
                            {statusLabel}
                          </Tag>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '24px 0' }}>Chưa có lịch khám hoặc lượt phân tích AI.</Text>
                )}
              </Card>

            </Col>
          )}

        </Row>
      </Skeleton>

      {/* CÁC GÓI DỊCH VỤ */}
      {aiEntitlement && currentPlan && (
      <section id="service-plans" style={{ marginTop: 32, scrollMarginTop: 88 }}>
        <div style={{ marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0, color: '#111827', fontWeight: 700 }}>
            Nâng cấp gói dịch vụ
          </Title>
          <Text type="secondary">
            So sánh quyền lợi và chọn gói phù hợp với nhu cầu theo dõi sức khỏe.
          </Text>
        </div>

        <Row gutter={[20, 20]}>
          {aiEntitlement.availablePlans.map((plan) => {
            const isCurrent = plan.code === currentPlan.code;
            const isRecommended = plan.code === "plus";
            return (
              <Col xs={24} sm={12} xl={6} key={plan.code}>
                <Card
                  bordered={false}
                  style={{
                    height: '100%',
                    borderRadius: 16,
                    border: isRecommended ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                    boxShadow: isRecommended
                      ? '0 10px 28px rgba(14, 165, 233, 0.14)'
                      : '0 4px 18px rgba(15, 23, 42, 0.05)',
                  }}
                  bodyStyle={{
                    padding: 22,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ minHeight: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 18, color: '#111827' }}>{plan.name}</Text>
                    {isRecommended && (
                      <Tag color="orange" style={{ margin: 0, borderRadius: 10 }}>Khuyên dùng</Tag>
                    )}
                  </div>

                  <div style={{ margin: '12px 0 10px' }}>
                    <Text style={{ color: '#0ea5e9', fontSize: 28, fontWeight: 800 }}>
                      {plan.annualPriceVnd === 0 ? "Miễn phí" : `${formatMoney(plan.annualPriceVnd)}đ`}
                    </Text>
                    {plan.annualPriceVnd > 0 && <Text type="secondary" style={{ fontSize: 13 }}>/năm</Text>}
                  </div>

                  <Text type="secondary" style={{ minHeight: 44, fontSize: 13 }}>
                    {plan.description}
                  </Text>

                  <Divider style={{ margin: '16px 0' }} />

                  <ul style={{ flex: 1, margin: '0 0 20px', paddingLeft: 18, color: '#4b5563', fontSize: 13 }}>
                    {plan.features.map((feature) => (
                      <li key={feature} style={{ marginBottom: 8 }}>{feature}</li>
                    ))}
                  </ul>

                  <Button
                    type={isRecommended ? "primary" : "default"}
                    block
                    size="large"
                    disabled={isCurrent}
                    style={{
                      borderRadius: 8,
                      fontWeight: 600,
                      ...(isRecommended ? { background: '#0ea5e9' } : {}),
                    }}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    {isCurrent ? "Đang sử dụng" : "Đăng ký ngay"}
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      </section>
      )}

      {/* MODAL XÁC NHẬN NÂNG CẤP */}
      <Modal
        title={<span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Xác nhận nâng cấp gói</span>}
        open={Boolean(selectedPlan)}
        onCancel={() => setSelectedPlan(undefined)}
        onOk={() => void requestUpgrade()}
        okText="Gửi yêu cầu nâng cấp"
        cancelText="Để sau"
        confirmLoading={upgradeLoading}
        centered
        width={520}
      >
        {selectedPlan && (
          <div style={{ paddingTop: 8 }}>
            <div style={{ padding: 18, borderRadius: 12, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <Text strong style={{ display: 'block', fontSize: 18, color: '#0f172a' }}>
                Gói {selectedPlan.name}
              </Text>
              <Title level={3} style={{ margin: '8px 0 4px', color: '#0ea5e9' }}>
                {selectedPlan.annualPriceVnd === 0
                  ? "Miễn phí"
                  : `${formatMoney(selectedPlan.annualPriceVnd)}đ`}
                {selectedPlan.annualPriceVnd > 0 && (
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>/năm</Text>
                )}
              </Title>
              <Text type="secondary">
                Hạn mức {selectedPlan.monthlyIncludedCredits === null
                  ? "không giới hạn"
                  : selectedPlan.monthlyIncludedCredits} lượt phân tích AI mỗi tháng.
              </Text>
            </div>
            <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
              Yêu cầu sẽ được chuyển tới bộ phận thanh toán. Gói chỉ được kích hoạt sau khi giao dịch được xác nhận.
            </Text>
          </div>
        )}
      </Modal>

      {/* MODAL XÁC NHẬN MUA LƯỢT AI */}
      <Modal
        title={<span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Xác nhận mua lượt phân tích AI</span>}
        open={visitModalOpen}
        onCancel={() => setVisitModalOpen(false)}
        onOk={() => void requestVisitPurchase()}
        okText="Gửi yêu cầu mua"
        cancelText="Để sau"
        confirmLoading={visitPurchaseLoading}
        centered
        width={480}
      >
        <div style={{ paddingTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 16, borderRadius: 10, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                Số lượt
              </Text>
              <Text strong style={{ fontSize: 20, color: '#0f172a' }}>
                {selectedCredits} lượt
              </Text>
            </div>
            <div style={{ padding: 16, borderRadius: 10, background: '#faf5ff', border: '1px solid #e9d5ff' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                Thanh toán
              </Text>
              <Text strong style={{ fontSize: 20, color: '#6366f1' }}>
                {formatMoney(purchaseTotal)}đ
              </Text>
            </div>
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Lượt phân tích AI sẽ được cộng sau khi giao dịch xác nhận. Gói dịch vụ hiện tại của bạn không thay đổi.
          </Text>
        </div>
      </Modal>

    </div>
  );
}
