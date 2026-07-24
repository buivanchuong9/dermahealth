import { useCallback, useEffect, useMemo, useState } from "react";
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
import { KeyRound, ShieldAlert, UserCog } from "lucide-react";
import { ApiError } from "../api/http";
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
import { PERMISSION_GROUP, permissionLabel } from "../domain/core/permission";
import { ROLE_LABEL, type UserRole } from "../domain/core/role";

const { Title, Text, Paragraph } = Typography;

const ROLES = Object.entries(ROLE_LABEL).map(([value, label]) => ({
  value: value as UserRole,
  label,
}));

const displayTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

const describeError = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.requestId
      ? `${error.message} (requestId: ${error.requestId})`
      : error.message;
  }
  return error instanceof Error ? error.message : fallback;
};

const sortPermissionCodes = (a: string, b: string) => {
  const groupA = PERMISSION_GROUP[a] ?? "";
  const groupB = PERMISSION_GROUP[b] ?? "";
  if (groupA !== groupB) return groupA.localeCompare(groupB, "vi");
  return permissionLabel(a).localeCompare(permissionLabel(b), "vi");
};

export default function OwnerOperations() {
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);

  // Role permissions tab: catalog and matrix are two independent sources
  // (BA spec §5, §10) — a failure in one must never masquerade as an empty
  // result in the other, and options must always come from the catalog.
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("patient");
  const [permissionCode, setPermissionCode] = useState<string>();
  const [permissionSearch, setPermissionSearch] = useState("");
  const [granting, setGranting] = useState(false);
  const [revokingKey, setRevokingKey] = useState<string | null>(null);

  const [grants, setGrants] = useState<BreakGlassGrant[]>([]);
  const [myGrants, setMyGrants] = useState<BreakGlassGrant[]>([]);
  const [actions, setActions] = useState<DangerousActionRequest[]>([]);
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [breakGlassForm] = Form.useForm();
  const [dangerousForm] = Form.useForm();

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      setCatalog(await listOwnerPermissionCatalog());
    } catch (error) {
      setCatalogError(
        describeError(error, "Không tải được catalog permission."),
      );
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadMatrix = useCallback(async () => {
    setMatrixLoading(true);
    setMatrixError(null);
    try {
      setPermissions(await listOwnerRolePermissions());
    } catch (error) {
      setMatrixError(describeError(error, "Không tải được ma trận quyền."));
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  const loadOperational = useCallback(async () => {
    try {
      const [grantRows, mineRows, actionRows] = await Promise.all([
        listOwnerBreakGlass(),
        listMyOwnerBreakGlass(),
        listOwnerDangerousActions(),
      ]);
      setGrants(grantRows);
      setMyGrants(mineRows);
      setActions(actionRows);
    } catch (error) {
      void message.error(
        describeError(error, "Không tải được dữ liệu owner."),
      );
    } finally {
      setOperationalLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCatalog();
      void loadMatrix();
      void loadOperational();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalog, loadMatrix, loadOperational]);

  const grantedCodesByRole = useMemo(() => {
    const map = new Map<UserRole, Set<string>>();
    for (const item of permissions) {
      const set = map.get(item.role) ?? new Set<string>();
      set.add(item.permissionCode);
      map.set(item.role, set);
    }
    return map;
  }, [permissions]);

  const selectablePermissions = useMemo(() => {
    const granted = grantedCodesByRole.get(role) ?? new Set<string>();
    return catalog.filter((item) => !item.dangerous && !granted.has(item.code));
  }, [catalog, grantedCodesByRole, role]);

  const permissionOptions = useMemo(
    () =>
      selectablePermissions.map((item) => ({
        value: item.code,
        label: permissionLabel(item.code, item.description),
      })),
    [selectablePermissions],
  );

  const permissionEmptyText = () => {
    if (catalogLoading) return "Đang tải...";
    if (catalogError) return catalogError;
    if (catalog.length === 0) return "Chưa có permission trong catalog";
    if (permissionSearch.trim()) return "Không tìm thấy permission phù hợp";
    if (selectablePermissions.length === 0)
      return "Vai trò này đã có tất cả quyền có thể cấp";
    return "Không tìm thấy permission phù hợp";
  };

  const permissionFilterOption = (
    input: string,
    option?: { label: string; value: string },
  ) => {
    const haystack = `${option?.label ?? ""} ${option?.value ?? ""}`.toLowerCase();
    return haystack.includes(input.toLowerCase());
  };

  const matrixRows = useMemo(
    () =>
      ROLES.map((r) => ({
        role: r.value,
        roleLabel: r.label,
        items: permissions
          .filter((item) => item.role === r.value)
          .slice()
          .sort((a, b) =>
            sortPermissionCodes(a.permissionCode, b.permissionCode),
          ),
      })),
    [permissions],
  );

  const addPermission = async () => {
    if (!permissionCode) {
      void message.warning("Chọn permission cần cấp.");
      return;
    }
    setGranting(true);
    try {
      await grantOwnerRolePermission({ role, permissionCode });
      setPermissionCode(undefined);
      setPermissionSearch("");
      await loadMatrix();
      void message.success("Đã cấp permission.");
    } catch (error) {
      void message.error(describeError(error, "Không cấp được permission."));
    } finally {
      setGranting(false);
    }
  };

  const removePermission = async (item: RolePermission) => {
    const key = `${item.role}:${item.permissionCode}`;
    setRevokingKey(key);
    try {
      await revokeOwnerRolePermission(item.role, item.permissionCode);
      await loadMatrix();
      void message.success("Đã thu hồi permission.");
    } catch (error) {
      void message.error(
        describeError(error, "Không thu hồi được permission."),
      );
    } finally {
      setRevokingKey(null);
    }
  };

  const confirmRevoke = (item: RolePermission) => {
    const label = permissionLabel(item.permissionCode);
    const roleLabel = ROLE_LABEL[item.role] ?? item.role;
    Modal.confirm({
      title: "Thu hồi permission",
      content: (
        <>
          <p>
            Thu hồi quyền &quot;{label}&quot; khỏi vai trò &quot;{roleLabel}
            &quot;?
          </p>
          <p>Thay đổi sẽ áp dụng cho toàn bộ tài khoản có vai trò này.</p>
        </>
      ),
      okText: "Thu hồi",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: () => removePermission(item),
    });
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
        {catalogError && (
          <Alert
            style={{ marginBottom: 12 }}
            type="error"
            showIcon
            message="Không tải được catalog permission"
            description={catalogError}
            action={
              <Button size="small" onClick={() => void loadCatalog()}>
                Thử lại
              </Button>
            }
          />
        )}
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Select
              style={{ width: "100%" }}
              value={role}
              options={ROLES}
              disabled={granting}
              onChange={(value) => {
                setRole(value);
                setPermissionCode(undefined);
              }}
            />
          </Col>
          <Col xs={24} md={12}>
            <Select
              showSearch
              style={{ width: "100%" }}
              placeholder="Chọn permission"
              value={permissionCode}
              options={permissionOptions}
              loading={catalogLoading}
              disabled={granting || catalogLoading || Boolean(catalogError)}
              searchValue={permissionSearch}
              onSearch={setPermissionSearch}
              onChange={setPermissionCode}
              filterOption={permissionFilterOption}
              notFoundContent={permissionEmptyText()}
            />
          </Col>
          <Col xs={24} md={4}>
            <Button
              type="primary"
              block
              loading={granting}
              disabled={
                granting ||
                catalogLoading ||
                Boolean(catalogError) ||
                !permissionCode
              }
              onClick={() => void addPermission()}
            >
              Cấp quyền
            </Button>
          </Col>
        </Row>
      </Card>
      {matrixError ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được ma trận quyền"
          description={matrixError}
          action={
            <Button size="small" onClick={() => void loadMatrix()}>
              Thử lại
            </Button>
          }
        />
      ) : (
        <Table
          rowKey={(row) => row.role}
          loading={matrixLoading}
          dataSource={matrixRows}
          pagination={false}
          columns={[
            {
              title: "Role",
              dataIndex: "roleLabel",
              width: 220,
            },
            {
              title: "Permission",
              dataIndex: "items",
              render: (items: RolePermission[]) =>
                items.length === 0 ? (
                  <Text type="secondary">— Chưa có permission —</Text>
                ) : (
                  <Space size={[8, 8]} wrap>
                    {items.map((item) => {
                      const key = `${item.role}:${item.permissionCode}`;
                      const revoking = revokingKey === key;
                      return (
                        <Tag
                          key={key}
                          closable={!revoking}
                          onClose={(event) => {
                            event.preventDefault();
                            confirmRevoke(item);
                          }}
                        >
                          {permissionLabel(item.permissionCode)}
                          {revoking ? " (đang thu hồi...)" : ""}
                        </Tag>
                      );
                    })}
                  </Space>
                ),
            },
          ]}
        />
      )}
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
        loading={operationalLoading}
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
