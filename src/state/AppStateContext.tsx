import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { App as AntApp, Result, Spin } from "antd";
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
import { ApiError } from "../api/http";
import {
  getCurrentPatient,
  listAppointments,
  listPatients,
  listPractitioners,
} from "../api/clinical";
import { listEncounters } from "../api/encounters";
import { listQueueTickets, subscribeQueueStream } from "../api/queue";

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { notification } = AntApp.useApp();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    setLoading(true);
    try {
      const me = await getMe();
      const user: User = {
        id: me.id as UserId,
        name: me.displayName,
        role: me.memberships[0]?.role ?? "patient",
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
          me.memberships.some((membership) => membership.role === "patient")
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
          ? queueTicketsResult.value
          : [];
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
        notification.error({
          message: "Không tải được dữ liệu",
          description:
            error instanceof Error
              ? error.message
              : "Backend API không phản hồi.",
        });
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
    if (!currentUser) return;
    return subscribeQueueStream((tickets) => {
      queueRepository.replaceAll(tickets);
    });
  }, [currentUser]);

  const resetSession = useCallback(() => {
    setCurrentUser(null);
    setCurrentPatient(null);
    userRepository.replaceAll([]);
    patientRepository.replaceAll([]);
    appointmentRepository.replaceAll([]);
    encounterRepository.replaceAll([]);
    queueRepository.replaceAll([]);
  }, []);
  const setCurrentUserId = useCallback((id: UserId) => {
    void id;
  }, []);

  const value = useMemo<AppStateValue | null>(
    () =>
      currentUser && currentPatient
        ? {
            currentUserId: currentUser.id,
            currentUser,
            role: currentUser.role,
            allUsers: [currentUser],
            setCurrentUserId,
            currentPatient,
            resetToSeed: refreshMe,
            refreshMe,
            resetSession,
          }
        : null,
    [currentUser, currentPatient, refreshMe, resetSession, setCurrentUserId],
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
  // Không có currentUser nghĩa là refreshMe() đã thất bại và đang điều hướng
  // về /login (hoặc sắp thử lại) — không render children vì mọi trang dưới
  // /app đều gọi useAppState(), sẽ throw ngay khi context là null.
  if (!value)
    return (
      <div
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <Spin size="large" />
      </div>
    );
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}
