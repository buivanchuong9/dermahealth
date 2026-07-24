import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { KeyRound, ShieldAlert, UserCog } from "lucide-react";
import {
  createOwnerBreakGlass,
  createOwnerDangerousAction,
  decideOwnerDangerousAction,
  endOwnerBreakGlass,
  grantOwnerRolePermission,
  listMyOwnerBreakGlass,
  listOwnerBreakGlass,
  listOwnerDangerousActions,
  listOwnerPermissionCatalog,
  listOwnerRolePermissions,
  revokeOwnerRolePermission,
  type BreakGlassGrant,
  type DangerousActionRequest,
  type DecideDangerousActionRequest,
  type PermissionCatalogItem,
  type RolePermission,
} from "../api/ownerOperations";
import { ROLE_LABEL, type UserRole } from "../domain/core/role";

const { Title, Text, Paragraph } = Typography;

const ROLES = Object.entries(ROLE_LABEL).map(([value, label]) => ({
  value: value as UserRole,
  label,
}));

const displayTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

export default function OwnerOperations() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [grants, setGrants] = useState<BreakGlassGrant[]>([]);
  const [myGrants, setMyGrants] = useState<BreakGlassGrant[]>([]);
  const [actions, setActions] = useState<DangerousActionRequest[]>([]);
  const [role, setRole] = useState<UserRole>("patient");
  const [permissionCode, setPermissionCode] = useState<string>();
  const [breakGlassForm] = Form.useForm();
  const [dangerousForm] = Form.useForm();

  const load = useCallback(async () => {
    const [permissionRows, catalogRows, grantRows, mineRows, actionRows] =
      await Promise.all([
        listOwnerRolePermissions(),
        listOwnerPermissionCatalog(),
        listOwnerBreakGlass(),
        listMyOwnerBreakGlass(),
        listOwnerDangerousActions(),
      ]);
    setPermissions(permissionRows);
    setCatalog(catalogRows);
    setGrants(grantRows);
    setMyGrants(mineRows);
    setActions(actionRows);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
        .catch((error: unknown) => {
          void message.error(
            error instanceof Error
              ? error.message
              : "Không tải được dữ liệu owner.",
          );
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, message]);

  const permissionOptions = useMemo(
    () =>
      catalog.map((item) => ({
        value: item.code,
        label: item.name ? `${item.name} (${item.code})` : item.code,
      })),
    [catalog],
  );

  const addPermission = async () => {
    if (!permissionCode) {
      void message.warning("Chọn permission cần cấp.");
      return;
    }
    setSaving(true);
    try {
      await grantOwnerRolePermission({ role, permissionCode });
      setPermissions(await listOwnerRolePermissions());
      void message.success("Đã cấp permission.");
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : "Không cấp được permission.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removePermission = async (item: RolePermission) => {
    setSaving(true);
    try {
      await revokeOwnerRolePermission(item.role, item.permissionCode);
      setPermissions(await listOwnerRolePermissions());
      void message.success("Đã thu hồi permission.");
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : "Không thu hồi được permission.",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestBreakGlass = async () => {
    const values = await breakGlassForm.validateFields();
    setSaving(true);
    try {
      await createOwnerBreakGlass(values);
      breakGlassForm.resetFields();
      const [allRows, mineRows] = await Promise.all([
        listOwnerBreakGlass(),
        listMyOwnerBreakGlass(),
      ]);
      setGrants(allRows);
      setMyGrants(mineRows);
      void message.success("Đã tạo quyền truy cập break-glass.");
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : "Không tạo được break-glass.",
      );
    } finally {
      setSaving(false);
    }
  };

  const endGrant = async (grantId: string) => {
    setSaving(true);
    try {
      await endOwnerBreakGlass(grantId);
      const [allRows, mineRows] = await Promise.all([
        listOwnerBreakGlass(),
        listMyOwnerBreakGlass(),
      ]);
      setGrants(allRows);
      setMyGrants(mineRows);
      void message.success("Đã kết thúc quyền break-glass.");
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : "Không kết thúc được quyền.",
      );
    } finally {
      setSaving(false);
    }
  };

  const createDangerous = async () => {
    const values = await dangerousForm.validateFields();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(values.payload || "{}") as Record<string, unknown>;
    } catch {
      void message.error("Payload phải là JSON object hợp lệ.");
      return;
    }
    setSaving(true);
    try {
      await createOwnerDangerousAction({
        type: values.type,
        reason: values.reason,
        payload,
        mfaCode: values.mfaCode,
      });
      dangerousForm.resetFields();
      setActions(await listOwnerDangerousActions());
      void message.success("Đã tạo yêu cầu dangerous action.");
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : "Không tạo được yêu cầu.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openDecision = (
    request: DangerousActionRequest,
    decision: DecideDangerousActionRequest["decision"],
  ) => {
    let reason = "";
    let mfaCode = "";
    Modal.confirm({
      title:
        decision === "approved"
          ? "Phê duyệt dangerous action?"
          : "Từ chối dangerous action?",
      content: (
        <Space direction="vertical" style={{ width: "100%", marginTop: 12 }}>
          <Input.TextArea
            placeholder="Lý do quyết định"
            onChange={(event) => {
              reason = event.target.value;
            }}
          />
          <Input.Password
            placeholder="Mã MFA"
            onChange={(event) => {
              mfaCode = event.target.value;
            }}
          />
        </Space>
      ),
      okText: decision === "approved" ? "Phê duyệt" : "Từ chối",
      okButtonProps: { danger: decision === "rejected" },
      cancelText: "Hủy",
      onOk: async () => {
        if (!reason.trim() || !mfaCode.trim()) {
          throw new Error("Cần nhập lý do và mã MFA.");
        }
        await decideOwnerDangerousAction(request.id, {
          decision,
          reason: reason.trim(),
          mfaCode: mfaCode.trim(),
        });
        setActions(await listOwnerDangerousActions());
        void message.success("Đã ghi nhận quyết định.");
      },
    });
  };

  const permissionTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card size="small" title="Cấp permission cho role">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Select
              style={{ width: "100%" }}
              value={role}
              options={ROLES}
              onChange={setRole}
            />
          </Col>
          <Col xs={24} md={12}>
            <Select
              showSearch
              style={{ width: "100%" }}
              placeholder="Chọn permission"
              value={permissionCode}
              options={permissionOptions}
              onChange={setPermissionCode}
            />
          </Col>
          <Col xs={24} md={4}>
            <Button
              type="primary"
              block
              loading={saving}
              onClick={() => void addPermission()}
            >
              Cấp quyền
            </Button>
          </Col>
        </Row>
      </Card>
      <Table
        rowKey={(item) => `${item.role}:${item.permissionCode}`}
        loading={loading}
        dataSource={permissions}
        columns={[
          {
            title: "Role",
            dataIndex: "role",
            render: (value: UserRole) => ROLE_LABEL[value] ?? value,
          },
          { title: "Permission", dataIndex: "permissionCode" },
          {
            title: "",
            render: (_, item: RolePermission) => (
              <Popconfirm
                title="Thu hồi permission này?"
                okText="Thu hồi"
                cancelText="Hủy"
                onConfirm={() => removePermission(item)}
              >
                <Button danger size="small" disabled={saving}>
                  Thu hồi
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />
    </Space>
  );

  const grantTable = (rows: BreakGlassGrant[]) => (
    <Table
      size="small"
      rowKey="id"
      dataSource={rows}
      pagination={false}
      columns={[
        { title: "Grant", dataIndex: "id" },
        { title: "Patient", dataIndex: "patientId" },
        { title: "Lý do", dataIndex: "reason" },
        {
          title: "Hết hạn",
          dataIndex: "expiresAt",
          render: displayTime,
        },
        {
          title: "Trạng thái",
          dataIndex: "status",
          render: (value: string, item: BreakGlassGrant) => (
            <Tag color={item.endedAt ? "default" : "warning"}>
              {value ?? (item.endedAt ? "ended" : "active")}
            </Tag>
          ),
        },
        {
          title: "",
          render: (_, item: BreakGlassGrant) =>
            !item.endedAt && (
              <Popconfirm
                title="Kết thúc quyền break-glass này?"
                okText="Kết thúc"
                cancelText="Hủy"
                onConfirm={() => endGrant(item.id)}
              >
                <Button danger size="small" disabled={saving}>
                  Kết thúc
                </Button>
              </Popconfirm>
            ),
        },
      ]}
    />
  );

  const breakGlassTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card size="small" title="Tạo quyền break-glass">
        <Paragraph type="secondary">
          Chỉ dùng khi cần truy cập khẩn cấp. Lý do và MFA được ghi vào audit.
        </Paragraph>
        <Form form={breakGlassForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                name="patientId"
                label="Patient ID"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item
                name="reason"
                label="Lý do"
                rules={[{ required: true, min: 3 }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="mfaCode"
                label="Mã MFA"
                rules={[{ required: true }]}
              >
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
          <Button
            danger
            type="primary"
            loading={saving}
            onClick={() => void requestBreakGlass()}
          >
            Tạo break-glass
          </Button>
        </Form>
      </Card>
      <Card size="small" title="Quyền của tôi">
        {grantTable(myGrants)}
      </Card>
      <Card size="small" title="Tất cả quyền break-glass">
        {grantTable(grants)}
      </Card>
    </Space>
  );

  const dangerousTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card size="small" title="Tạo dangerous action">
        <Paragraph type="secondary">
          Yêu cầu này chưa thực thi ngay; cần người có thẩm quyền phê duyệt.
        </Paragraph>
        <Form form={dangerousForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Form.Item
                name="type"
                label="Loại"
                initialValue="add_owner"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="reason"
                label="Lý do"
                rules={[{ required: true, min: 3 }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item
                name="mfaCode"
                label="Mã MFA"
                rules={[{ required: true }]}
              >
                <Input.Password />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="payload"
                label="Payload JSON"
                initialValue="{}"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Button
            danger
            type="primary"
            loading={saving}
            onClick={() => void createDangerous()}
          >
            Tạo yêu cầu
          </Button>
        </Form>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={actions}
        columns={[
          { title: "Request", dataIndex: "id" },
          { title: "Loại", dataIndex: "type" },
          { title: "Lý do", dataIndex: "reason" },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (value: string) => <Tag>{value ?? "pending"}</Tag>,
          },
          {
            title: "Thời gian",
            dataIndex: "requestedAt",
            render: displayTime,
          },
          {
            title: "",
            render: (_, item: DangerousActionRequest) => (
              <Space>
                <Button
                  size="small"
                  type="primary"
                  disabled={item.status !== undefined && item.status !== "pending"}
                  onClick={() => openDecision(item, "approved")}
                >
                  Duyệt
                </Button>
                <Button
                  size="small"
                  danger
                  disabled={item.status !== undefined && item.status !== "pending"}
                  onClick={() => openDecision(item, "rejected")}
                >
                  Từ chối
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <div>
        <Title level={3} style={{ marginBottom: 4 }}>
          Owner Control Center
        </Title>
        <Text type="secondary">
          Phân quyền nền tảng, truy cập khẩn cấp và thao tác nguy hiểm.
        </Text>
      </div>
      <Tabs
        items={[
          {
            key: "permissions",
            label: (
              <Space>
                <UserCog size={15} /> Role permissions
              </Space>
            ),
            children: permissionTab,
          },
          {
            key: "break-glass",
            label: (
              <Space>
                <KeyRound size={15} /> Break-glass
              </Space>
            ),
            children: breakGlassTab,
          },
          {
            key: "dangerous",
            label: (
              <Space>
                <ShieldAlert size={15} /> Dangerous actions
              </Space>
            ),
            children: dangerousTab,
          },
        ]}
      />
    </Space>
  );
}
