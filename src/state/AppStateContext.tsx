import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { App as AntApp, Button, Result, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import {
  appointmentRepository,
  encounterRepository,
  patientRepository,
  queueRepository,
  userRepository,
} from "../domain/repositories";
import { AppStateContext, type AppStateValue } from "./appStateContextObject";
import type { Patient, User } from "../domain/core/entities";
import type { UserId } from "../domain/core/ids";
import { getMe } from "../api/me";
import { refreshSession } from "../api/auth";
import { ApiError } from "../api/http";
import { clearAccessToken } from "../api/authToken";
import {
  getCurrentPatient,
  listAppointments,
  listPatients,
  listPractitioners,
} from "../api/clinical";
import { listEncounters } from "../api/encounters";
import {
  listQueueTickets,
  mergeQueueTicketSnapshot,
  subscribeQueueStream,
} from "../api/queue";
import { resolveOperationalRole, type UserRole } from "../domain/core/role";
import { listOwnerRolePermissions } from "../api/ownerOperations";
import { replaceRolePermissions } from "./rolePermissionStore";

const activeRoleStorageKey = (userId: string) =>
  `dermahealth:v1:auth:activeRole:${userId}`;

function readStoredActiveRole(userId: string, roles: UserRole[]): UserRole | null {
  try {
    const stored = localStorage.getItem(activeRoleStorageKey(userId));
    return stored && roles.includes(stored as UserRole) ? (stored as UserRole) : null;
  } catch {
    return null;
  }
}

function storeActiveRole(userId: string, role: UserRole): void {
  try {
    localStorage.setItem(activeRoleStorageKey(userId), role);
  } catch {
    // ignore — private mode / storage disabled
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { notification } = AntApp.useApp();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const refreshIdentity = useCallback(async () => {
    await refreshSession();
    const me = await getMe();
    const roles = [...new Set(me.memberships.map((item) => item.role))];
    if (roles.includes("super_administrator")) {
      void listOwnerRolePermissions()
        .then(replaceRolePermissions)
        .catch(() => undefined);
    }
    const refreshedDisplayName = typeof me.displayName === "string" && me.displayName.trim()
      ? me.displayName
      : String((me.displayName as any)?.name ?? me.email ?? "Bệnh nhân");
    setCurrentUser((previous) => ({
      id: me.id as UserId,
      name: refreshedDisplayName,
      roles,
      role:
        (previous?.id === me.id && previous.roles.includes(previous.role)
          ? previous.role
          : undefined) ??
        readStoredActiveRole(me.id, roles) ??
        resolveOperationalRole(roles),
    }));
  }, []);

  const refreshMe = useCallback(async () => {
    setLoading(true);
    setBootError(null);
    try {
      await refreshSession().catch(() => undefined);
      const me = await getMe();
      const roles = [...new Set(me.memberships.map((item) => item.role))];
      if (roles.includes("super_administrator")) {
        void listOwnerRolePermissions()
          .then(replaceRolePermissions)
          .catch(() => undefined);
      }
      const rawDisplayName = typeof me.displayName === "string" && me.displayName.trim()
        ? me.displayName
        : String((me.displayName as any)?.name ?? me.email ?? "Bệnh nhân");
      const storedAvatar = localStorage.getItem(`user_avatar_${me.id}`) || me.avatarUrl || undefined;
      const user: User = {
        id: me.id as UserId,
        name: rawDisplayName,
        avatarUrl: storedAvatar,
        roles,
        role: readStoredActiveRole(me.id, roles) ?? resolveOperationalRole(roles),
      };
      setCurrentUser(user);
      const [
        practitionersResult,
        appointmentsResult,
        patientsResult,
        encountersResult,
        queueTicketsResult,
      ] =
        await Promise.allSettled([
          listPractitioners(),
          listAppointments(),
          // A UAT Owner can deliberately hold every role, including
          // `patient`. Treating "has patient role" as "is a patient-only
          // account" makes that Owner call /patients/me and the whole app
          // boots with an empty patient repository. Only a genuinely
          // patient-only principal should use the self endpoint; mixed-role
          // staff accounts must use the organization-scoped patient list.
          roles.length === 1 && roles[0] === "patient"
            ? getCurrentPatient().then((patient) => [patient])
            : listPatients(),
          listEncounters(),
          listQueueTickets(),
        ]);
      const practitioners =
        practitionersResult.status === "fulfilled"
          ? practitionersResult.value
          : [];
      const appointments =
        appointmentsResult.status === "fulfilled"
          ? appointmentsResult.value
          : [];
      const patients =
        patientsResult.status === "fulfilled" ? patientsResult.value : [];
      const encounters =
        encountersResult.status === "fulfilled" ? encountersResult.value : [];
      const queueTickets =
        queueTicketsResult.status === "fulfilled"
          ? mergeQueueTicketSnapshot(
              queueTicketsResult.value,
              queueRepository.getAll(),
            )
          : queueRepository.getAll();
      userRepository.replaceAll([
        user,
        ...practitioners.filter((item) => item.id !== user.id),
      ]);
      appointmentRepository.replaceAll(appointments);
      patientRepository.replaceAll(patients);
      encounterRepository.replaceAll(encounters);
      queueRepository.replaceAll(queueTickets);
      setCurrentPatient(patients[0] ?? null);
    } catch (error) {
      setCurrentUser(null);
      setCurrentPatient(null);
      if (error instanceof ApiError && error.status === 401) {
        navigate("/login", { replace: true });
      } else {
        // Any non-401 boot failure (network hiccup, backend restart, a
        // rotated/invalid token that doesn't surface as a clean 401) used to
        // leave the app on a bare, unrecoverable <Spin> forever — the only
        // fix was manually clearing site storage. Clearing the local access
        // token here means a retry (or a plain reload) starts from a clean
        // unauthenticated state instead of replaying the same bad token, and
        // the fallback screen below gives an explicit way to retry.
        clearAccessToken();
        const description =
          error instanceof Error
            ? error.message
            : "Backend API không phản hồi.";
        setBootError(description);
        notification.error({ message: "Không tải được dữ liệu", description });
      }
    } finally {
      setLoading(false);
    }
  }, [notification, navigate]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => void refreshMe(), 0);
    return () => window.clearTimeout(refreshTimer);
  }, [refreshMe]);

  useEffect(() => {
    const handleFocus = () => {
      void refreshIdentity().catch(() => undefined);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshIdentity]);

  useEffect(() => {
    if (!currentUser) return;
    return subscribeQueueStream((tickets) => {
      queueRepository.replaceAll(
        mergeQueueTicketSnapshot(tickets, queueRepository.getAll()),
      );
    });
  }, [currentUser]);

  const resetSession = useCallback(() => {
    setCurrentUser((previous) => {
      if (previous) {
        try {
          localStorage.removeItem(activeRoleStorageKey(previous.id));
        } catch {
          // ignore — private mode / storage disabled
        }
      }
      return null;
    });
    setCurrentPatient(null);
    userRepository.replaceAll([]);
    patientRepository.replaceAll([]);
    appointmentRepository.replaceAll([]);
    encounterRepository.replaceAll([]);
    queueRepository.replaceAll([]);
    clearAccessToken();
  }, []);
  const setCurrentUserId = useCallback((id: UserId) => {
    void id;
  }, []);
  const setActiveRole = useCallback((role: UserRole) => {
    setCurrentUser((previous) => {
      if (!previous || !previous.roles.includes(role)) return previous;
      storeActiveRole(previous.id, role);
      return { ...previous, role };
    });
  }, []);

  const value = useMemo<AppStateValue | null>(
    () =>
      currentUser && currentPatient
        ? {
            currentUserId: currentUser.id,
            currentUser,
            role: currentUser.role,
            setActiveRole,
            allUsers: [currentUser],
            setCurrentUserId,
            currentPatient,
            resetToSeed: refreshMe,
            refreshMe,
            resetSession,
          }
        : null,
    [
      currentUser,
      currentPatient,
      refreshMe,
      resetSession,
      setCurrentUserId,
      setActiveRole,
    ],
  );

  if (loading)
    return (
      <div
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <Spin size="large" tip="Đang tải dữ liệu từ hệ thống…" />
      </div>
    );
  if (currentUser && !currentPatient)
    return (
      <Result
        status="info"
        title="Chưa có bệnh nhân"
        subTitle="Database chưa có hồ sơ bệnh nhân thuộc phạm vi tài khoản này."
      />
    );
  // Không có currentUser nghĩa là refreshMe() đã thất bại. Với lỗi 401 rõ
  // ràng, ta đã điều hướng sang /login ở trên. Với mọi lỗi khác (mạng chập
  // chờn, backend restart, token hỏng không rõ nguyên nhân), hiển thị màn
  // hình có nút "Thử lại" thay vì Spin vô hạn — trước đây người dùng phải
  // tự xoá site storage mới thoát được vòng lặp này.
  if (!value)
    return (
      <div
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <Result
          status="warning"
          title="Không kết nối được với hệ thống"
          subTitle={bootError ?? "Vui lòng thử lại."}
          extra={[
            <Button key="retry" type="primary" onClick={() => void refreshMe()}>
              Thử lại
            </Button>,
            <Button key="login" onClick={() => navigate("/login", { replace: true })}>
              Về trang đăng nhập
            </Button>,
          ]}
        />
      </div>
    );
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}
