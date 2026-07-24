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
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { Copy, UserPlus, Users, UserCheck } from "lucide-react";
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
  type ManagedUser,
  type PendingStaffInvitation,
} from "../api/users";
import { INVITABLE_ROLES, ROLE_LABEL, type UserRole } from "../domain/core/role";

const { Title, Text, Paragraph } = Typography;

const ROLE_OPTIONS = INVITABLE_ROLES.map((value) => ({
  value,
  label: ROLE_LABEL[value],
}));

const INVITATION_STATUS_LABEL: Record<string, string> = {
  pending: "Đang chờ",
  accepted: "Đã kích hoạt",
  revoked: "Đã thu hồi",
  expired: "Đã hết hạn",
};

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
  const { message } = App.useApp();

  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [clinicLocations, setClinicLocations] = useState<ClinicLocation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [homeOrganizationId, setHomeOrganizationId] = useState<string>();

  const [inviteForm] = Form.useForm();
  const inviteOrgId = Form.useWatch("organizationId", inviteForm);
  const inviteLocationId = Form.useWatch("clinicLocationId", inviteForm);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<StaffInvitationResult | null>(null);

  const [invitations, setInvitations] = useState<PendingStaffInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ManagedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [assignForm] = Form.useForm();
  const assignOrgId = Form.useWatch("organizationId", assignForm);
  const assignLocationId = Form.useWatch("clinicLocationId", assignForm);
  const [assigning, setAssigning] = useState(false);

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
      const defaultOrg = me.memberships[0]?.organizationId ?? orgs[0]?.id;
      setHomeOrganizationId(defaultOrg);
      inviteForm.setFieldsValue({ organizationId: defaultOrg });
      assignForm.setFieldsValue({ organizationId: defaultOrg });
    } catch (error) {
      setCatalogError(
        describeError(error, "Không tải được danh mục tổ chức/cơ sở/phòng ban."),
      );
    } finally {
      setCatalogLoading(false);
    }
  }, [inviteForm, assignForm]);

  const loadInvitations = useCallback(async (organizationId: string) => {
    setInvitationsLoading(true);
    setInvitationsError(null);
    try {
      setInvitations(await listInvitedUsers(organizationId));
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
    setInviting(true);
    try {
      const result = await inviteStaffAccount({
        email: values.email,
        displayName: values.displayName,
        role: values.role,
        organizationId: values.organizationId,
        clinicLocationId: values.clinicLocationId || undefined,
        departmentId: values.departmentId || undefined,
      });
      setInviteResult(result);
      inviteForm.resetFields(["email", "displayName", "role", "clinicLocationId", "departmentId"]);
      void message.success("Đã tạo lời mời.");
      void loadInvitations(values.organizationId);
    } catch (error) {
      void message.error(describeError(error, "Không tạo được lời mời."));
    } finally {
      setInviting(false);
    }
  };

  const copyActivationUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      void message.success("Đã sao chép liên kết kích hoạt.");
    } catch {
      void message.warning("Không sao chép được tự động — vui lòng chọn và sao chép thủ công.");
    }
  };

  const doRevoke = async (invitation: PendingStaffInvitation) => {
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

  const runSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      setSearchResults(await listUsers({ search: term.trim(), limit: 10 }));
    } catch (error) {
      void message.error(describeError(error, "Không tìm được người dùng."));
    } finally {
      setSearching(false);
    }
  };

  const pickUser = (user: ManagedUser) => {
    setSelectedUser(user);
    assignForm.setFieldsValue({
      organizationId: user.memberships[0]?.organizationId ?? homeOrganizationId,
    });
  };

  const submitAssign = async () => {
    if (!selectedUser) {
      void message.warning("Chọn một tài khoản trước.");
      return;
    }
    const values = await assignForm.validateFields();
    setAssigning(true);
    try {
      await assignUserRole(selectedUser.id, {
        role: values.role,
        organizationId: values.organizationId,
        clinicLocationId: values.clinicLocationId || undefined,
        departmentId: values.departmentId || undefined,
      });
      void message.success(`Đã gán vai trò cho ${selectedUser.displayName}.`);
      setSelectedUser(null);
      assignForm.resetFields(["role", "clinicLocationId", "departmentId"]);
    } catch (error) {
      void message.error(describeError(error, "Không gán được vai trò."));
    } finally {
      setAssigning(false);
    }
  };

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
      <Card size="small" title="Mời nhân viên mới">
        <Paragraph type="secondary">
          Chưa có gửi email tự động — sau khi tạo lời mời, sao chép liên kết kích hoạt và
          gửi thủ công (Zalo, email...) cho người được mời. Không thể mời vai trò Bệnh
          nhân hoặc Quản trị viên cấp cao (thêm Owner phải qua quy trình dangerous action).
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
            Tạo lời mời
          </Button>
        </Form>
      </Card>

      <Card size="small" title="Lời mời đang chờ kích hoạt">
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
                title: "Trạng thái",
                dataIndex: "status",
                render: (value: string) => (
                  <Tag color={value === "pending" ? "processing" : "default"}>
                    {INVITATION_STATUS_LABEL[value] ?? value}
                  </Tag>
                ),
              },
              { title: "Hết hạn", dataIndex: "expiresAt", render: displayTime },
              {
                title: "",
                render: (_, item: PendingStaffInvitation) =>
                  item.status === "pending" && (
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
                  ),
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );

  const assignTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card size="small" title="Tìm tài khoản đã tồn tại">
        <Input.Search
          placeholder="Tìm theo email hoặc họ tên"
          allowClear
          loading={searching}
          onSearch={(term) => void runSearch(term)}
          onChange={(e) => {
            if (!e.target.value.trim()) setSearchResults([]);
          }}
        />
        <Table
          style={{ marginTop: 12 }}
          size="small"
          rowKey="id"
          loading={searching}
          dataSource={searchResults}
          pagination={false}
          locale={{
            emptyText: searchTerm.trim()
              ? "Không tìm thấy tài khoản phù hợp"
              : "Nhập email hoặc họ tên để tìm",
          }}
          columns={[
            { title: "Email", dataIndex: "email" },
            { title: "Họ tên", dataIndex: "displayName" },
            {
              title: "Vai trò hiện tại",
              dataIndex: "memberships",
              render: (memberships: ManagedUser["memberships"]) =>
                memberships.length === 0 ? (
                  <Text type="secondary">— chưa có —</Text>
                ) : (
                  <Space size={[4, 4]} wrap>
                    {memberships.map((m, idx) => (
                      <Tag key={idx}>{ROLE_LABEL[m.role as UserRole] ?? m.role}</Tag>
                    ))}
                  </Space>
                ),
            },
            {
              title: "",
              render: (_, user: ManagedUser) => (
                <Button
                  size="small"
                  type={selectedUser?.id === user.id ? "primary" : "default"}
                  onClick={() => pickUser(user)}
                >
                  {selectedUser?.id === user.id ? "Đã chọn" : "Chọn"}
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Card size="small" title="Gán vai trò">
        {!selectedUser ? (
          <Text type="secondary">Chọn một tài khoản ở trên trước.</Text>
        ) : (
          <>
            <Paragraph>
              Gán vai trò cho <Text strong>{selectedUser.displayName}</Text> (
              {selectedUser.email})
            </Paragraph>
            <Form form={assignForm} layout="vertical">
              <Row gutter={12}>
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
                  organizationId={assignOrgId}
                  clinicLocationId={assignLocationId}
                />
              </Row>
              <Button
                type="primary"
                icon={<UserCheck size={15} />}
                loading={assigning}
                onClick={() => void submitAssign()}
              >
                Gán vai trò
              </Button>
            </Form>
          </>
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

      <div>
        <Title level={3} style={{ marginBottom: 4 }}>
          Quản lý nhân sự
        </Title>
        <Text type="secondary">
          Mời bác sĩ/nhân viên mới, theo dõi lời mời đang chờ và gán vai trò cho tài
          khoản đã tồn tại.
        </Text>
      </div>
      <Tabs
        items={[
          {
            key: "invite",
            label: (
              <Space>
                <UserPlus size={15} /> Mời nhân viên
              </Space>
            ),
            children: inviteTab,
          },
          {
            key: "assign",
            label: (
              <Space>
                <Users size={15} /> Gán vai trò cho tài khoản có sẵn
              </Space>
            ),
            children: assignTab,
          },
        ]}
      />
    </Space>
  );
}
