import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  Copy,
  RefreshCw,
  Send,
  UserPlus,
} from "lucide-react";
import { ApiError } from "../api/http";
import { getMe } from "../api/me";
import {
  listOrganizations,
  listClinicLocations,
  listDepartments,
  type Organization,
  type ClinicLocation,
  type Department,
} from "../api/catalog";
import { inviteStaffAccount, type StaffInvitationResult } from "../api/registration";
import {
  listUsers,
  listInvitedUsers,
  revokeInvitation,
  assignUserRole,
  getUser,
  type PendingStaffInvitation,
} from "../api/users";
import {
  INVITABLE_ROLES,
  ROLE_LABEL,
  type UserRole,
} from "../domain/core/role";

const { Title, Text, Paragraph } = Typography;

const ROLE_OPTIONS = INVITABLE_ROLES.map((value) => ({
  value,
  label: ROLE_LABEL[value],
}));

const INVITATION_STATUS_LABEL: Record<string, string> = {
  sending: "Đang tạo lời mời",
  pending: "Đang chờ",
  failed: "Tạo thất bại",
  accepted: "Đã kích hoạt",
  revoked: "Đã thu hồi",
  expired: "Đã hết hạn",
};

type InvitationRow = Omit<PendingStaffInvitation, "status"> & {
  status: PendingStaffInvitation["status"] | "sending" | "failed";
  clientOnly?: boolean;
  activationUrl?: string;
  errorMessage?: string;
};

type OnboardingStage =
  | "idle"
  | "verifying"
  | "scoping"
  | "applying"
  | "done"
  | "error";

const describeError = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.requestId
      ? `${error.message} (requestId: ${error.requestId})`
      : error.message;
  }
  return error instanceof Error ? error.message : fallback;
};

const displayTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

// email + displayName + role are always required by the backend for both
// forms below; organizationId/clinicLocationId/departmentId share the same
// cascading-select shape, so both tabs build their scope fields the same way
// instead of duplicating three near-identical <Select> blocks.
function ScopeFields({
  organizations,
  clinicLocations,
  departments,
  organizationId,
  clinicLocationId,
  disabled,
}: {
  organizations: Organization[];
  clinicLocations: ClinicLocation[];
  departments: Department[];
  organizationId?: string;
  clinicLocationId?: string;
  disabled?: boolean;
}) {
  const locationOptions = clinicLocations
    .filter((l) => l.organizationId === organizationId)
    .map((l) => ({ value: l.id, label: l.name }));
  const departmentOptions = departments
    .filter((d) => !clinicLocationId || d.clinicLocationId === clinicLocationId)
    .map((d) => ({ value: d.id, label: d.name }));

  return (
    <>
      <Col xs={24} md={8}>
        <Form.Item
          name="organizationId"
          label="Tổ chức"
          rules={[{ required: true, message: "Chọn tổ chức" }]}
        >
          <Select
            disabled={disabled}
            options={organizations.map((o) => ({ value: o.id, label: o.name }))}
            placeholder="Chọn tổ chức"
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="clinicLocationId" label="Cơ sở (tuỳ chọn)">
          <Select
            disabled={disabled}
            allowClear
            options={locationOptions}
            placeholder="Toàn tổ chức"
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name="departmentId" label="Phòng ban (tuỳ chọn)">
          <Select
            disabled={disabled}
            allowClear
            options={departmentOptions}
            placeholder="Không giới hạn"
          />
        </Form.Item>
      </Col>
    </>
  );
}

export default function StaffManagement() {
  const { message, modal } = App.useApp();

  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [clinicLocations, setClinicLocations] = useState<ClinicLocation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [homeOrganizationId, setHomeOrganizationId] = useState<string>();
  const [actorUserId, setActorUserId] = useState<string>();

  const [inviteForm] = Form.useForm();
  const inviteOrgId = Form.useWatch("organizationId", inviteForm);
  const inviteLocationId = Form.useWatch("clinicLocationId", inviteForm);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<StaffInvitationResult | null>(null);
  const [assignmentReceipt, setAssignmentReceipt] = useState<{
    displayName: string;
    email: string;
    role: UserRole;
    organizationName: string;
  } | null>(null);

  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [onboardingStage, setOnboardingStage] =
    useState<OnboardingStage>("idle");

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const [me, orgs, locations, depts] = await Promise.all([
        getMe(),
        listOrganizations(),
        listClinicLocations(),
        listDepartments(),
      ]);
      setOrganizations(orgs);
      setClinicLocations(locations);
      setDepartments(depts);
      setActorUserId(me.id);
      const defaultOrg = me.memberships[0]?.organizationId ?? orgs[0]?.id;
      setHomeOrganizationId(defaultOrg);
      inviteForm.setFieldsValue({ organizationId: defaultOrg, role: "doctor" });
    } catch (error) {
      setCatalogError(
        describeError(error, "Không tải được danh mục tổ chức/cơ sở/phòng ban."),
      );
    } finally {
      setCatalogLoading(false);
    }
  }, [inviteForm]);

  const loadInvitations = useCallback(async (organizationId: string) => {
    setInvitationsLoading(true);
    setInvitationsError(null);
    try {
      const persisted = await listInvitedUsers(organizationId);
      setInvitations((current) => [
        ...current.filter(
          (item) =>
            item.clientOnly &&
            !persisted.some((saved) => saved.id === item.id),
        ),
        ...persisted,
      ]);
    } catch (error) {
      setInvitationsError(describeError(error, "Không tải được danh sách lời mời."));
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalog]);

  useEffect(() => {
    if (!homeOrganizationId) return;
    const timer = window.setTimeout(() => void loadInvitations(homeOrganizationId), 0);
    return () => window.clearTimeout(timer);
  }, [homeOrganizationId, loadInvitations]);

  const submitInvite = async () => {
    const values = await inviteForm.validateFields();
    const normalizedEmail = String(values.email).trim().toLowerCase();
    const attemptId = `attempt:${crypto.randomUUID()}`;
    const attempt = {
      id: attemptId,
      email: normalizedEmail,
      displayName: values.displayName,
      role: values.role as UserRole,
      organizationId: values.organizationId,
      clinicLocationId: values.clinicLocationId || null,
      departmentId: values.departmentId || null,
      invitedBy: actorUserId ?? "",
      status: "sending",
      expiresAt: "",
      createdAt: new Date().toISOString(),
      clientOnly: true,
    } as InvitationRow;
    setInvitations((current) => [attempt, ...current]);
    setOnboardingStage("verifying");
    setInviting(true);
    try {
      const matches = await listUsers({ search: normalizedEmail, limit: 10 });
      const existing = matches.find(
        (user) => user.email.trim().toLowerCase() === normalizedEmail,
      );
      if (existing) {
        if (existing.id === actorUserId) {
          throw new Error(
            "Không thể tự cấp thêm vai trò cho chính tài khoản đang thao tác. Hãy dùng một quản trị viên độc lập để bảo đảm nguyên tắc bốn mắt.",
          );
        }
        const duplicate = existing.memberships.some(
          (membership) =>
            membership.role === values.role &&
            membership.organizationId === values.organizationId &&
            (membership.clinicLocationId ?? undefined) ===
              (values.clinicLocationId || undefined) &&
            (membership.departmentId ?? undefined) ===
              (values.departmentId || undefined),
        );
        if (duplicate) {
          setInvitations((current) =>
            current.filter((item) => item.id !== attemptId),
          );
          setOnboardingStage("done");
          void message.info(
            `${existing.displayName} đã có vai trò và phạm vi này.`,
          );
          return;
        }
        const confirmed = await new Promise<boolean>((resolve) => {
          modal.confirm({
            title: "Tài khoản đã tồn tại",
            content: (
              <Space direction="vertical" size={6}>
                <Text>
                  <Text strong>{existing.displayName}</Text> · {existing.email}
                </Text>
                <Text type="secondary">
                  Hệ thống sẽ cấp thêm membership vào tài khoản hiện có, không
                  tạo lời mời hoặc hồ sơ nhân sự trùng.
                </Text>
              </Space>
            ),
            okText: "Xác minh và cấp vai trò",
            cancelText: "Kiểm tra lại",
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (!confirmed) {
          setInvitations((current) =>
            current.filter((item) => item.id !== attemptId),
          );
          setOnboardingStage("idle");
          return;
        }
        setOnboardingStage("scoping");
        await assignUserRole(existing.id, {
          role: values.role,
          organizationId: values.organizationId,
          clinicLocationId: values.clinicLocationId || undefined,
          departmentId: values.departmentId || undefined,
        });
        const verified = await getUser(existing.id);
        const membershipApplied = verified.memberships.some(
          (membership) =>
            membership.role === values.role &&
            membership.organizationId === values.organizationId &&
            (membership.clinicLocationId ?? undefined) ===
              (values.clinicLocationId || undefined) &&
            (membership.departmentId ?? undefined) ===
              (values.departmentId || undefined),
        );
        if (!membershipApplied) {
          throw new Error(
            "Backend trả thành công nhưng hồ sơ đọc lại chưa có membership vừa cấp.",
          );
        }
        setAssignmentReceipt({
          displayName: verified.displayName,
          email: verified.email,
          role: values.role as UserRole,
          organizationName:
            organizations.find(
              (organization) => organization.id === values.organizationId,
            )?.name ?? "Tổ chức đã chọn",
        });
        setInvitations((current) =>
          current.filter((item) => item.id !== attemptId),
        );
        setOnboardingStage("done");
        inviteForm.resetFields([
          "email",
          "displayName",
          "role",
          "clinicLocationId",
          "departmentId",
        ]);
        void message.success(
          `Đã cấp vai trò ${ROLE_LABEL[values.role as UserRole]} cho ${existing.displayName}.`,
        );
        return;
      }
      setOnboardingStage("scoping");
      setOnboardingStage("applying");
      const result = await inviteStaffAccount({
        email: normalizedEmail,
        displayName: values.displayName,
        role: values.role,
        organizationId: values.organizationId,
        clinicLocationId: values.clinicLocationId || undefined,
        departmentId: values.departmentId || undefined,
      });
      setInviteResult(result);
      setInvitations((current) => [
        {
          ...attempt,
          id: result.invitationId,
          status: "pending",
          expiresAt: result.expiresAt,
          activationUrl: result.activationUrl,
          clientOnly: true,
        },
        ...current.filter(
          (item) =>
            item.id !== attemptId && item.id !== result.invitationId,
        ),
      ]);
      setOnboardingStage("done");
      inviteForm.resetFields(["email", "displayName", "role", "clinicLocationId", "departmentId"]);
      void message.success("Đã tạo lời mời.");
      void loadInvitations(values.organizationId);
    } catch (error) {
      const errorMessage = describeError(error, "Không tạo được lời mời.");
      setInvitations((current) =>
        current.map((item) =>
          item.id === attemptId
            ? {
                ...item,
                status: "failed",
                errorMessage,
              } as InvitationRow
            : item,
        ),
      );
      setOnboardingStage("error");
      void message.error(errorMessage);
    } finally {
      setInviting(false);
    }
  };

  const retryInvitation = (item: InvitationRow) => {
    inviteForm.setFieldsValue({
      email: item.email,
      displayName: item.displayName,
      role: item.role,
      organizationId: item.organizationId,
      clinicLocationId: item.clinicLocationId || undefined,
      departmentId: item.departmentId || undefined,
    });
    setInvitations((current) =>
      current.filter((row) => row.id !== item.id),
    );
    setOnboardingStage("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyActivationUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      void message.success("Đã sao chép liên kết kích hoạt.");
    } catch {
      void message.warning("Không sao chép được tự động — vui lòng chọn và sao chép thủ công.");
    }
  };

  const doRevoke = async (invitation: InvitationRow) => {
    setRevokingId(invitation.id);
    try {
      await revokeInvitation(invitation.id);
      await loadInvitations(invitation.organizationId);
      void message.success("Đã thu hồi lời mời.");
    } catch (error) {
      void message.error(describeError(error, "Không thu hồi được lời mời."));
    } finally {
      setRevokingId(null);
    }
  };

  const pendingInvitationCount = invitations.filter(
    (item) => item.status === "pending",
  ).length;
  const failedInvitationCount = invitations.filter(
    (item) => item.status === "failed",
  ).length;
  const onboardingCurrent = {
    idle: 0,
    verifying: 1,
    scoping: 2,
    applying: 3,
    done: 3,
    error: 0,
  }[onboardingStage];

  const inviteTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {catalogError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được danh mục"
          description={catalogError}
          action={
            <Button size="small" onClick={() => void loadCatalog()}>
              Thử lại
            </Button>
          }
        />
      )}
      <Card size="small" title="Thêm nhân sự">
        <Paragraph type="secondary">
          Nhập email chính xác. Hệ thống tự kiểm tra danh tính: tài khoản đã có
          sẽ được cấp thêm vai trò; tài khoản chưa có mới nhận liên kết kích
          hoạt. Không tạo hồ sơ nhân sự trùng.
        </Paragraph>
        <Form form={inviteForm} layout="vertical" disabled={catalogLoading}>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Nhập email" },
                  { type: "email", message: "Email không hợp lệ" },
                ]}
              >
                <Input placeholder="bacsi@dermahealth.vn" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="displayName"
                label="Họ tên"
                rules={[{ required: true, min: 2, message: "Nhập họ tên" }]}
              >
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="role"
                label="Vai trò"
                rules={[{ required: true, message: "Chọn vai trò" }]}
              >
                <Select options={ROLE_OPTIONS} placeholder="Chọn vai trò" />
              </Form.Item>
            </Col>
            <ScopeFields
              organizations={organizations}
              clinicLocations={clinicLocations}
              departments={departments}
              organizationId={inviteOrgId}
              clinicLocationId={inviteLocationId}
              disabled={catalogLoading}
            />
          </Row>
          <Button
            type="primary"
            icon={<UserPlus size={15} />}
            loading={inviting}
            disabled={catalogLoading || Boolean(catalogError)}
            onClick={() => void submitInvite()}
          >
            Thêm nhân sự
          </Button>
        </Form>
      </Card>

      <Card
        size="small"
        title="Lời mời kích hoạt"
        extra={
          <Space size={8}>
            <Tag color="processing">{pendingInvitationCount} đang chờ</Tag>
            {failedInvitationCount > 0 && (
              <Tag color="error">{failedInvitationCount} thất bại</Tag>
            )}
          </Space>
        }
      >
        {invitationsError ? (
          <Alert
            type="error"
            showIcon
            message="Không tải được danh sách lời mời"
            description={invitationsError}
            action={
              <Button
                size="small"
                onClick={() => homeOrganizationId && void loadInvitations(homeOrganizationId)}
              >
                Thử lại
              </Button>
            }
          />
        ) : (
          <Table
            size="small"
            rowKey="id"
            loading={invitationsLoading}
            dataSource={invitations}
            pagination={false}
            columns={[
              { title: "Email", dataIndex: "email" },
              { title: "Họ tên", dataIndex: "displayName" },
              {
                title: "Vai trò",
                dataIndex: "role",
                render: (value: UserRole) => ROLE_LABEL[value] ?? value,
              },
              {
                title: "Phạm vi",
                render: (_, item: InvitationRow) => (
                  <Space direction="vertical" size={0}>
                    <Text>
                      {organizations.find(
                        (organization) =>
                          organization.id === item.organizationId,
                      )?.name ?? "Tổ chức"}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {clinicLocations.find(
                        (location) =>
                          location.id === item.clinicLocationId,
                      )?.name ?? "Toàn tổ chức"}
                      {" · "}
                      {departments.find(
                        (department) =>
                          department.id === item.departmentId,
                      )?.name ?? "Không giới hạn phòng ban"}
                    </Text>
                  </Space>
                ),
              },
              {
                title: "Kết quả",
                dataIndex: "status",
                render: (value: string, item: InvitationRow) => (
                  <Space direction="vertical" size={2}>
                    <Tag
                      icon={value === "sending" ? <Send size={12} /> : undefined}
                      color={
                        value === "pending"
                          ? "processing"
                          : value === "failed"
                            ? "error"
                            : "default"
                      }
                    >
                      {INVITATION_STATUS_LABEL[value] ?? value}
                    </Tag>
                    {value === "pending" && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Cần gửi liên kết kích hoạt thủ công
                      </Text>
                    )}
                    {item.errorMessage && (
                      <Text type="danger" style={{ fontSize: 12 }}>
                        {item.errorMessage}
                      </Text>
                    )}
                  </Space>
                ),
              },
              { title: "Tạo lúc", dataIndex: "createdAt", render: displayTime },
              { title: "Hết hạn", dataIndex: "expiresAt", render: displayTime },
              {
                title: "Thao tác",
                render: (_, item: InvitationRow) => (
                  <Space wrap>
                    {item.activationUrl && (
                      <Button
                        size="small"
                        icon={<Copy size={13} />}
                        onClick={() =>
                          void copyActivationUrl(item.activationUrl!)
                        }
                      >
                        Sao chép link
                      </Button>
                    )}
                    {item.status === "failed" && (
                      <Button
                        size="small"
                        icon={<RefreshCw size={13} />}
                        onClick={() => retryInvitation(item)}
                      >
                        Thử lại
                      </Button>
                    )}
                    {item.status === "pending" && (
                      <Popconfirm
                        title="Thu hồi lời mời này?"
                        okText="Thu hồi"
                        cancelText="Hủy"
                        onConfirm={() => void doRevoke(item)}
                      >
                        <Button danger size="small" loading={revokingId === item.id}>
                          Thu hồi
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Modal
        title="Đã tạo lời mời"
        open={Boolean(inviteResult)}
        footer={null}
        onCancel={() => setInviteResult(null)}
      >
        {inviteResult && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Alert
              type="success"
              showIcon
              message={`Đã mời ${inviteResult.email} — vai trò ${ROLE_LABEL[inviteResult.role] ?? inviteResult.role}`}
              description={`Hết hạn lúc ${displayTime(inviteResult.expiresAt)}. Chưa có gửi email tự động — hãy sao chép liên kết bên dưới và gửi cho người được mời.`}
            />
            <Input.Group compact style={{ display: "flex" }}>
              <Input readOnly value={inviteResult.activationUrl} style={{ flex: 1 }} />
              <Button
                icon={<Copy size={14} />}
                onClick={() => void copyActivationUrl(inviteResult.activationUrl)}
              >
                Sao chép
              </Button>
            </Input.Group>
          </Space>
        )}
      </Modal>
      <Modal
        title="Đã xác minh cấp quyền"
        open={Boolean(assignmentReceipt)}
        okText="Đã hiểu"
        cancelButtonProps={{ style: { display: "none" } }}
        onOk={() => setAssignmentReceipt(null)}
        onCancel={() => setAssignmentReceipt(null)}
      >
        {assignmentReceipt && (
          <Alert
            type="success"
            showIcon
            message={`${assignmentReceipt.displayName} · ${ROLE_LABEL[assignmentReceipt.role]}`}
            description={
              <Space direction="vertical" size={3}>
                <Text>{assignmentReceipt.email}</Text>
                <Text type="secondary">
                  Membership đã được đọc lại và xác nhận tại{" "}
                  {assignmentReceipt.organizationName}. Người dùng cần quay lại
                  ứng dụng hoặc đăng nhập lại để nhận access token mới.
                </Text>
              </Space>
            }
          />
        )}
      </Modal>

      <div>
        <Title level={3} style={{ marginBottom: 4 }}>
          Quản lý nhân sự
        </Title>
        <Text type="secondary">
          Onboarding nhân sự theo vai trò và phạm vi làm việc, có bước xác nhận
          trước khi quyền được áp dụng.
        </Text>
      </div>
      <Card
        size="small"
        className={`staff-onboarding staff-onboarding--${onboardingStage}`}
      >
        <Steps
          responsive
          current={onboardingCurrent}
          status={
            onboardingStage === "error"
              ? "error"
              : onboardingStage === "done"
                ? "finish"
                : "process"
          }
          progressDot
          items={[
            {
              title: "Có tài khoản",
              description: "Bác sĩ tự đăng ký hoặc nhận lời mời",
            },
            { title: "Xác minh", description: "Đối chiếu email và danh tính" },
            {
              title: "Cấp phạm vi",
              description: "Vai trò, cơ sở và phòng ban",
            },
            {
              title: "Kế thừa quyền",
              description: "Áp bộ quyền của vai trò",
            },
          ]}
        />
      </Card>
      {inviteTab}
    </Space>
  );
}
