import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Flex,
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
import {
  Check,
  ChevronDown,
  KeyRound,
  Plus,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  X,
} from "lucide-react";
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
import {
  PERMISSION_GROUP,
  permissionColor,
  permissionLabel,
} from "../domain/core/permission";
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
  const [selectedMatrixRole, setSelectedMatrixRole] =
    useState<UserRole>("patient");
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

  const permissionGroups = (items: RolePermission[]) => {
    const groups = new Map<string, RolePermission[]>();
    for (const item of items) {
      const group = PERMISSION_GROUP[item.permissionCode] ?? "Khác";
      groups.set(group, [...(groups.get(group) ?? []), item]);
    }
    return [...groups.entries()];
  };

  const selectedMatrixRow =
    matrixRows.find((row) => row.role === selectedMatrixRole) ?? matrixRows[0];
  const selectedPermissionGroups = permissionGroups(
    selectedMatrixRow?.items ?? [],
  );
  const selectedDangerousCount = (selectedMatrixRow?.items ?? []).filter(
    (item) => permissionColor(item.permissionCode) === "error",
  ).length;

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
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Card
        title={
          <Flex align="center" gap={10}>
            <Flex
              align="center"
              justify="center"
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--radius-sm)",
                background: "var(--medical-blue-50)",
                color: "var(--medical-blue-700)",
              }}
            >
              <Plus size={17} />
            </Flex>
            <div>
              <Text strong style={{ display: "block" }}>
                Thêm quyền truy cập
              </Text>
              <Text
                type="secondary"
                style={{ display: "block", fontSize: 12, fontWeight: 400 }}
              >
                Quyền mới được áp dụng ngay cho toàn bộ tài khoản thuộc vai trò
              </Text>
            </div>
          </Flex>
        }
        styles={{ body: { padding: 16 } }}
        style={{
          borderColor: "var(--border-default)",
          boxShadow: "var(--shadow-card)",
        }}
      >
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
              suffixIcon={<ChevronDown size={15} />}
              disabled={granting}
              onChange={(value) => {
                setRole(value);
                setSelectedMatrixRole(value);
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
              suffixIcon={<ChevronDown size={15} />}
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
              icon={<Check size={16} />}
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
        <Card
          loading={matrixLoading}
          styles={{ body: { padding: 0 } }}
          style={{
            overflow: "hidden",
            borderColor: "var(--border-default)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <Flex
            align="center"
            justify="space-between"
            wrap
            gap={12}
            style={{
              minHeight: 68,
              padding: "14px 18px",
              borderBottom: "1px solid var(--border-default)",
              background: "var(--surface-card)",
            }}
          >
            <div>
              <Text strong style={{ display: "block", fontSize: 15 }}>
                Ma trận phân quyền
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Kiểm soát quyền truy cập theo từng vai trò hệ thống
              </Text>
            </div>
            <Flex align="center" gap={8}>
              <Tag
                bordered={false}
                style={{
                  margin: 0,
                  padding: "4px 9px",
                  color: "var(--medical-blue-700)",
                  background: "var(--medical-blue-50)",
                  fontWeight: 600,
                }}
              >
                {ROLES.length} vai trò
              </Tag>
              <Tag
                bordered={false}
                style={{
                  margin: 0,
                  padding: "4px 9px",
                  color: "var(--success)",
                  background: "var(--success-bg)",
                  fontWeight: 600,
                }}
              >
                {permissions.length} lượt cấp quyền
              </Tag>
            </Flex>
          </Flex>

          <Row>
            <Col
              xs={24}
              lg={6}
              style={{
                padding: 12,
                background: "var(--surface-subtle)",
                borderRight: "1px solid var(--border-default)",
              }}
            >
              <Text
                type="secondary"
                style={{
                  display: "block",
                  padding: "4px 8px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                VAI TRÒ HỆ THỐNG
              </Text>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                {matrixRows.map((row) => {
                  const selected = row.role === selectedMatrixRole;
                  return (
                    <Button
                      key={row.role}
                      type="text"
                      block
                      onClick={() => {
                        setSelectedMatrixRole(row.role);
                        setRole(row.role);
                        setPermissionCode(undefined);
                      }}
                      style={{
                        height: 48,
                        paddingInline: 10,
                        color: selected
                          ? "var(--medical-blue-800)"
                          : "var(--text-primary)",
                        background: selected
                          ? "var(--surface-selected)"
                          : "transparent",
                        border: selected
                          ? "1px solid var(--medical-blue-200)"
                          : "1px solid transparent",
                        fontWeight: selected ? 650 : 500,
                        textAlign: "left",
                      }}
                    >
                      <Flex
                        align="center"
                        justify="space-between"
                        style={{ width: "100%", minWidth: 0 }}
                      >
                        <Flex align="center" gap={9} style={{ minWidth: 0 }}>
                          <UserCog
                            size={16}
                            style={{
                              flex: "0 0 auto",
                              color: selected
                                ? "var(--medical-blue-700)"
                                : "var(--text-muted)",
                            }}
                          />
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {row.roleLabel}
                          </span>
                        </Flex>
                        <span
                          style={{
                            minWidth: 26,
                            padding: "1px 7px",
                            borderRadius: 10,
                            color: selected
                              ? "var(--medical-blue-700)"
                              : "var(--text-muted)",
                            background: selected
                              ? "var(--medical-blue-100)"
                              : "var(--surface-card)",
                            fontSize: 11,
                            textAlign: "center",
                          }}
                        >
                          {row.items.length}
                        </span>
                      </Flex>
                    </Button>
                  );
                })}
              </Space>
            </Col>

            <Col xs={24} lg={18} style={{ minHeight: 520 }}>
              <Flex
                align="center"
                justify="space-between"
                wrap
                gap={12}
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border-default)",
                  background:
                    "linear-gradient(90deg, var(--medical-blue-50) 0%, var(--surface-card) 56%)",
                }}
              >
                <Flex align="center" gap={12}>
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "var(--radius-md)",
                      color: "var(--medical-blue-700)",
                      background: "var(--medical-blue-50)",
                    }}
                  >
                    <ShieldCheck size={19} />
                  </Flex>
                  <div>
                    <Text strong style={{ display: "block", fontSize: 16 }}>
                      {selectedMatrixRow?.roleLabel}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Chính sách truy cập áp dụng cho toàn bộ thành viên thuộc
                      vai trò
                    </Text>
                  </div>
                </Flex>
                <Flex align="center" gap={8} wrap>
                  <Tag
                    bordered={false}
                    style={{
                      margin: 0,
                      padding: "4px 9px",
                      color: "var(--medical-blue-700)",
                      background: "var(--medical-blue-100)",
                      fontWeight: 600,
                    }}
                  >
                    {selectedMatrixRow?.items.length ?? 0} quyền
                  </Tag>
                  <Tag
                    bordered={false}
                    color={selectedDangerousCount ? "error" : "success"}
                    style={{ margin: 0, padding: "4px 9px", fontWeight: 600 }}
                  >
                    {selectedDangerousCount
                      ? `${selectedDangerousCount} quyền rủi ro cao`
                      : "Không có quyền rủi ro cao"}
                  </Tag>
                </Flex>
              </Flex>

              <div style={{ padding: 18, background: "var(--surface-subtle)" }}>
                {!selectedMatrixRow?.items.length ? (
                  <Flex
                    vertical
                    align="center"
                    justify="center"
                    gap={8}
                    style={{ minHeight: 280 }}
                  >
                    <ShieldCheck
                      size={32}
                      style={{ color: "var(--text-muted)" }}
                    />
                    <Text strong>Vai trò này chưa có quyền</Text>
                    <Text type="secondary">
                      Chọn “Thêm quyền” để bắt đầu cấu hình
                    </Text>
                  </Flex>
                ) : (
                  <Row gutter={[14, 14]}>
                    {selectedPermissionGroups.map(([group, groupItems]) => (
                        <Col xs={24} md={12} xxl={8} key={group}>
                          <div
                            style={{
                              height: "100%",
                              overflow: "hidden",
                              border: "1px solid var(--border-default)",
                              borderRadius: "var(--radius-md)",
                              background: "var(--surface-card)",
                              boxShadow: "0 1px 2px rgba(16, 24, 40, 0.03)",
                            }}
                          >
                            <Flex
                              align="center"
                              justify="space-between"
                              style={{
                                padding: "9px 12px",
                                borderBottom:
                                  "1px solid var(--border-default)",
                                background: "var(--surface-card)",
                              }}
                            >
                              <Flex align="center" gap={7}>
                                <span
                                  style={{
                                    width: 3,
                                    height: 15,
                                    borderRadius: 2,
                                    background: "var(--medical-blue-600)",
                                  }}
                                />
                                <Text strong style={{ fontSize: 12 }}>
                                  {group}
                                </Text>
                              </Flex>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {groupItems.length} quyền
                              </Text>
                            </Flex>
                            {groupItems.map((item, index) => {
                              const key = `${item.role}:${item.permissionCode}`;
                              const revoking = revokingKey === key;
                              const dangerous =
                                permissionColor(item.permissionCode) === "error";
                              return (
                                <Flex
                                  key={key}
                                  align="center"
                                  justify="space-between"
                                  gap={10}
                                  style={{
                                    minHeight: 45,
                                    padding: "8px 8px 8px 12px",
                                    borderBottom:
                                      index < groupItems.length - 1
                                        ? "1px solid var(--border-default)"
                                        : undefined,
                                  }}
                                >
                                  <Flex
                                    align="center"
                                    gap={9}
                                    style={{ minWidth: 0 }}
                                  >
                                    <span
                                      style={{
                                        width: 7,
                                        height: 7,
                                        flex: "0 0 7px",
                                        borderRadius: "50%",
                                        background: dangerous
                                          ? "var(--danger)"
                                          : "var(--success)",
                                      }}
                                    />
                                    <div style={{ minWidth: 0 }}>
                                      <Text
                                        style={{
                                          display: "block",
                                          overflow: "hidden",
                                          color: dangerous
                                            ? "var(--danger)"
                                            : "var(--text-primary)",
                                          fontSize: 12,
                                          fontWeight: 500,
                                          lineHeight: 1.35,
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {permissionLabel(item.permissionCode)}
                                      </Text>
                                    </div>
                                  </Flex>
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    loading={revoking}
                                    disabled={Boolean(revokingKey) && !revoking}
                                    aria-label={`Thu hồi ${permissionLabel(item.permissionCode)}`}
                                    icon={<X size={14} />}
                                    onClick={() => confirmRevoke(item)}
                                    style={{ flex: "0 0 auto" }}
                                  />
                                </Flex>
                              );
                            })}
                          </div>
                        </Col>
                      ))}
                  </Row>
                )}
              </div>
            </Col>
          </Row>
        </Card>
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
      <Flex align="center" gap={14}>
        <Flex
          align="center"
          justify="center"
          style={{
            width: 44,
            height: 44,
            flex: "0 0 44px",
            borderRadius: "var(--radius-lg)",
            color: "var(--text-inverse)",
            background: "var(--medical-blue-800)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <ShieldCheck size={23} />
        </Flex>
        <div>
          <Title level={3} style={{ marginBottom: 2 }}>
            Owner Control Center
          </Title>
          <Text type="secondary">
            Phân quyền nền tảng, truy cập khẩn cấp và thao tác nguy hiểm.
          </Text>
        </div>
      </Flex>
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
