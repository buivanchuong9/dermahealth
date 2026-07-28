import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  BellRing,
  CalendarCheck,
  Check,
  Clock3,
  Keyboard,
  LogIn,
  MapPin,
  QrCode,
  RotateCcw,
  ScanLine,
  Search,
  SkipForward,
  Users,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { Appointment, QueueTicket } from "../domain/core/entities";
import { useFriendlyError } from "../components/feedback/useFriendlyError";
import { checkIn, createKioskDevice } from "../api/reception";
import { issueCheckInToken, listAppointments, revokeCheckInToken } from "../api/appointments";
import { listEncounters } from "../api/encounters";
import {
  acknowledgeQueueTicket,
  callNextQueueTicket,
  listQueueTickets,
  mergeQueueTicketSnapshot,
  skipQueueTicket,
  startQueueTicketService,
} from "../api/queue";
import { ApiError } from "../api/http";
import {
  appointmentRepository,
  encounterRepository,
  patientRepository,
  queueRepository,
} from "../domain/repositories";
import { useStore } from "../state/useStore";

const { Title, Text } = Typography;
const RECEPTION_DEVICE_ID_KEY = "dermahealth:reception-device:id";
const RECEPTION_DEVICE_SECRET_KEY = "dermahealth:reception-device:secret";
const MIN_CALLS_BEFORE_SKIP = 3;
const QUEUE_PAGE_SIZE = 6;
const localDayRange = (value = new Date()) => {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const end = new Date(value);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
};

const storedReceptionDevice = () => {
  try {
    const id = localStorage.getItem(RECEPTION_DEVICE_ID_KEY);
    const secret = localStorage.getItem(RECEPTION_DEVICE_SECRET_KEY);
    return id && secret ? { id, secret } : undefined;
  } catch {
    return undefined;
  }
};

const storeReceptionDevice = (id: string, secret: string) => {
  try {
    localStorage.setItem(RECEPTION_DEVICE_ID_KEY, id);
    localStorage.setItem(RECEPTION_DEVICE_SECRET_KEY, secret);
  } catch {
    // Trình duyệt chặn storage: credential vẫn dùng được cho lần check-in hiện tại.
  }
};

const clearStoredReceptionDevice = () => {
  try {
    localStorage.removeItem(RECEPTION_DEVICE_ID_KEY);
    localStorage.removeItem(RECEPTION_DEVICE_SECRET_KEY);
  } catch {
    // Không còn thao tác khôi phục nào khác nếu storage bị chặn.
  }
};

export function QueueResult({
  ticket,
  onReset,
}: {
  ticket: QueueTicket;
  onReset?: () => void;
}) {
  return (
    <div style={{ width: "100%", maxWidth: 620, margin: "0 auto" }}>
      <Card
        styles={{ body: { padding: 0, overflow: "hidden", borderRadius: 16 } }}
        style={{ borderRadius: 16, boxShadow: "0 18px 48px rgba(14,55,86,.14)" }}
      >
        <div style={{ padding: "18px 20px", color: "#fff", background: "linear-gradient(135deg,#0d4770 0%,#1769aa 58%,#148a91 100%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", background: "rgba(255,255,255,.18)" }}><Check size={18} /></span>
            <div>
              <Text strong style={{ display: "block", color: "#fff", fontSize: 16 }}>Check-in thành công</Text>
              <Text style={{ color: "rgba(255,255,255,.78)", fontSize: 12.5 }}>Giữ màn hình này để theo dõi lượt khám</Text>
            </div>
            <Tag style={{ marginLeft: "auto", color: "#fff", borderColor: "rgba(255,255,255,.35)", background: "rgba(255,255,255,.12)" }}>ĐANG CHỜ</Tag>
          </div>
          <div style={{ textAlign: "center", padding: "24px 0 18px" }}>
            <Text style={{ color: "rgba(255,255,255,.72)", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>Số thứ tự của bạn</Text>
            <div style={{ color: "#fff", fontSize: "clamp(64px, 17vw, 104px)", fontWeight: 800, lineHeight: 1, letterSpacing: "-.04em", marginTop: 8 }}>{ticket.number}</div>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
            <div style={{ padding: 13, borderRadius: 11, background: "#f4f8fb", border: "1px solid #e0e9f0" }}>
              <Users size={17} color="#1769aa" />
              <Text type="secondary" style={{ display: "block", fontSize: 11.5, marginTop: 7 }}>Người phía trước</Text>
              <Text strong style={{ fontSize: 22 }}>{ticket.peopleAhead}</Text>
            </div>
            <div style={{ padding: 13, borderRadius: 11, background: "#f4f8fb", border: "1px solid #e0e9f0" }}>
              <Clock3 size={17} color="#1769aa" />
              <Text type="secondary" style={{ display: "block", fontSize: 11.5, marginTop: 7 }}>Chờ dự kiến</Text>
              <Text strong style={{ fontSize: 22 }}>{ticket.estimatedWaitMinutes} <span style={{ fontSize: 13, fontWeight: 500 }}>phút</span></Text>
            </div>
          </div>

          <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "15px 2px 12px" }}>
            <MapPin size={19} color="#148a91" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <Text strong style={{ display: "block" }}>{ticket.department}</Text>
              <Text type="secondary">{ticket.waitingArea} · {ticket.room ?? "Phòng sẽ được thông báo"}</Text>
            </div>
          </div>

          {ticket.preparationInstructions.length > 0 && (
            <div style={{ padding: "11px 13px", borderRadius: 10, background: "#fff8e8", border: "1px solid #f2d791" }}>
              <Text strong style={{ fontSize: 12.5 }}>Trong lúc chờ</Text>
              {ticket.preparationInstructions.map((item) => (
                <Text key={item} style={{ display: "block", marginTop: 4, fontSize: 12.5 }}>• {item}</Text>
              ))}
            </div>
          )}

          <Text type="secondary" style={{ display: "block", textAlign: "center", fontSize: 11.5, marginTop: 14 }}>
            Theo dõi màn hình gọi số và loa thông báo. Không cần lấy thêm số giấy.
          </Text>
        </div>
      </Card>
      {onReset && (
        <Button block size="large" icon={<RotateCcw size={15} />} onClick={onReset} style={{ marginTop: 14 }}>
          Tiếp nhận bệnh nhân khác
        </Button>
      )}
    </div>
  );
}

export default function KioskCheckIn({
  reception = false,
}: {
  reception?: boolean;
}) {
  const { message, modal } = App.useApp();
  const showError = useFriendlyError();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initial = (location.state as { ticket?: QueueTicket } | null)?.ticket;
  const requestedAppointmentId = searchParams.get("appointmentId") ?? undefined;
  const appointments = useStore(appointmentRepository);
  const patients = useStore(patientRepository);
  const queueTickets = useStore(queueRepository);
  const [token, setToken] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | undefined>(requestedAppointmentId);
  const [ticket, setTicket] = useState<QueueTicket | undefined>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [queueActionId, setQueueActionId] = useState<string>();
  const [callCounts, setCallCounts] = useState<Record<string, number>>({});
  const [queuePage, setQueuePage] = useState(1);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraFrameRef = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(reception);
  const [eligibilityCutoff, setEligibilityCutoff] = useState(
    () => localDayRange().start,
  );
  const [eligibilityCeiling, setEligibilityCeiling] = useState(
    () => localDayRange().end,
  );

  const refreshReceptionData = useCallback(async () => {
    if (!reception) return;
    setRefreshing(true);
    const clinicLocationId = appointmentRepository
      .getAll()
      .find((item) => item.clinicLocationId)?.clinicLocationId;
    const [appointmentsResult, queueResult] = await Promise.allSettled([
      listAppointments(),
      listQueueTickets(clinicLocationId),
    ]);
    if (appointmentsResult.status === "fulfilled") {
      appointmentRepository.replaceAll(appointmentsResult.value);
    }
    if (queueResult.status === "fulfilled") {
      queueRepository.replaceAll(
        mergeQueueTicketSnapshot(
          queueResult.value,
          queueRepository.getAll(),
        ),
      );
    }
    const today = localDayRange();
    const nextCutoff = today.start;
    const nextCeiling = today.end;
    setEligibilityCutoff(nextCutoff);
    setEligibilityCeiling(nextCeiling);
    if (
      appointmentsResult.status === "fulfilled" &&
      queueResult.status === "fulfilled"
    ) {
      setSelectedAppointmentId((selectedId) => {
        if (!selectedId) return undefined;
        const selected = appointmentsResult.value.find(
          (item) => item.id === selectedId,
        );
        if (!selected?.startAt) return undefined;
        const alreadyQueued = queueResult.value.some(
          (item) =>
            item.status !== "completed" &&
            (item.appointmentId === selected.id ||
              item.patientId === selected.patientId),
        );
        const startsAt = new Date(selected.startAt).getTime();
        const endsAt = new Date(selected.endAt ?? selected.startAt).getTime();
        return !alreadyQueued &&
          startsAt <= nextCeiling &&
          endsAt >= nextCutoff
          ? selectedId
          : undefined;
      });
    }
    setRefreshing(false);
  }, [reception]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshReceptionData(), 0);
    const refreshOnFocus = () => void refreshReceptionData();
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [refreshReceptionData]);

  const receptionAppointments = useMemo(
    () =>
      appointments
        .filter(
          (item) =>
            item.status === "upcoming" &&
            Boolean(item.startAt) &&
            new Date(item.startAt!).getTime() <= eligibilityCeiling &&
            new Date(item.endAt ?? item.startAt!).getTime() >= eligibilityCutoff &&
            !queueTickets.some(
              (ticketItem) =>
                ticketItem.status !== "completed" &&
                (ticketItem.appointmentId === item.id ||
                  ticketItem.patientId === item.patientId),
            ),
        )
        .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? "")),
    [appointments, eligibilityCeiling, eligibilityCutoff, queueTickets],
  );
  const bookedReceptionAppointments = useMemo(
    () =>
      appointments
        .filter(
          (item) =>
            item.status === "upcoming" &&
            Boolean(item.startAt) &&
            new Date(item.startAt!).getTime() >= eligibilityCutoff &&
            new Date(item.startAt!).getTime() <= eligibilityCeiling &&
            !queueTickets.some(
              (ticketItem) =>
                ticketItem.appointmentId === item.id ||
                (ticketItem.patientId === item.patientId &&
                  ticketItem.status !== "completed"),
            ),
        )
        .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? "")),
    [appointments, eligibilityCeiling, eligibilityCutoff, queueTickets],
  );
  const activeReceptionTickets = useMemo(
    () => {
      const statusOrder: Record<QueueTicket["status"], number> = {
        called: 0,
        acknowledged: 1,
        waiting: 2,
        in_service: 3,
        skipped: 4,
        routed: 5,
        completed: 6,
      };
      return queueTickets
        .filter((item) => {
          const issuedAt = new Date(item.issuedAt).getTime();
          return item.status !== "completed"
            && issuedAt >= eligibilityCutoff
            && issuedAt <= eligibilityCeiling;
        })
        .sort(
          (a, b) =>
            statusOrder[a.status] - statusOrder[b.status] ||
            a.issuedAt.localeCompare(b.issuedAt) ||
            a.id.localeCompare(b.id),
        );
    },
    [eligibilityCeiling, eligibilityCutoff, queueTickets],
  );
  const firstWaitingTicketByDepartment = useMemo(() => {
    const result = new Map<string, string>();
    activeReceptionTickets.forEach((item) => {
      if (item.status === "waiting" && !result.has(item.department)) {
        result.set(item.department, item.id);
      }
    });
    return result;
  }, [activeReceptionTickets]);

  const runQueueAction = async (
    queueTicket: QueueTicket,
    action: "call" | "acknowledge" | "start" | "skip",
  ) => {
    setQueueActionId(queueTicket.id);
    try {
      let updated: QueueTicket;
      if (action === "call") {
        const appointment = appointments.find(
          (item) => item.id === queueTicket.appointmentId,
        );
        const clinicLocationId =
          appointment?.clinicLocationId ??
          appointmentRepository
            .getAll()
            .find((item) => item.clinicLocationId)?.clinicLocationId;
        if (!clinicLocationId) {
          throw new Error("Không xác định được cơ sở khám của hàng đợi.");
        }
        updated = await callNextQueueTicket({
          department: queueTicket.department,
          clinicLocationId,
        });
      } else if (action === "acknowledge") {
        updated = await acknowledgeQueueTicket(
          queueTicket.id,
          queueTicket.version ?? 0,
        );
      } else if (action === "start") {
        updated = await startQueueTicketService(
          queueTicket.id,
          queueTicket.version ?? 0,
        );
      } else {
        updated = await skipQueueTicket(
          queueTicket.id,
          queueTicket.version ?? 0,
        );
      }
      queueRepository.upsert(updated);
      if (action === "call") {
        setCallCounts((current) => ({ ...current, [updated.id]: 1 }));
        announceTicket(updated);
        message.success(`Đang gọi số ${updated.number}.`);
      } else if (action === "skip") {
        message.success(`Đã tạm hoãn số ${queueTicket.number}.`);
        const appointment = appointments.find(
          (item) => item.id === queueTicket.appointmentId,
        );
        if (appointment?.clinicLocationId) {
          try {
            const next = await callNextQueueTicket({
              department: queueTicket.department,
              clinicLocationId: appointment.clinicLocationId,
            });
            queueRepository.upsert(next);
            setCallCounts((current) => ({ ...current, [next.id]: 1 }));
            announceTicket(next);
            message.success(`Đã chuyển sang gọi số ${next.number}.`);
          } catch {
            // Hết hàng chờ là trạng thái hợp lệ sau khi tạm hoãn.
          }
        }
      }
      void refreshReceptionData();
    } catch (error) {
      showError(error, "Không cập nhật được hàng đợi");
    } finally {
      setQueueActionId(undefined);
    }
  };

  const announceTicket = (queueTicket: QueueTicket) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `Mời số ${queueTicket.number.split("").join(" ")}, đến ${
        queueTicket.room ?? queueTicket.serviceStation
      }`,
    );
    utterance.lang = "vi-VN";
    window.speechSynthesis.speak(utterance);
  };

  const recallTicket = (queueTicket: QueueTicket) => {
    announceTicket(queueTicket);
    setCallCounts((current) => {
      const nextCount = Math.min(
        (current[queueTicket.id] ?? 1) + 1,
        MIN_CALLS_BEFORE_SKIP,
      );
      message.info(
        `Đã gọi số ${queueTicket.number} lần ${nextCount}/${MIN_CALLS_BEFORE_SKIP}.`,
      );
      return { ...current, [queueTicket.id]: nextCount };
    });
  };

  const confirmSkip = (queueTicket: QueueTicket) => {
    modal.confirm({
      title: `Tạm hoãn số ${queueTicket.number}?`,
      content:
        "Bệnh nhân sẽ được đánh dấu vắng mặt và hệ thống gọi người kế tiếp cùng khoa.",
      okText: "Hoãn và gọi số kế",
      cancelText: "Tiếp tục chờ",
      okButtonProps: { danger: true },
      onOk: () => runQueueAction(queueTicket, "skip"),
    });
  };

  const syncAfterCheckIn = async () => {
    const clinicLocationId = appointmentRepository
      .getAll()
      .find((item) => item.clinicLocationId)?.clinicLocationId;
    const [appointmentsResult, encountersResult, queueResult] =
      await Promise.allSettled([
      listAppointments(),
      listEncounters(),
      listQueueTickets(clinicLocationId),
    ]);
    if (appointmentsResult.status === "fulfilled") {
      appointmentRepository.replaceAll(appointmentsResult.value);
    }
    if (encountersResult.status === "fulfilled") {
      encounterRepository.replaceAll(encountersResult.value);
    }
    if (queueResult.status === "fulfilled") {
      queueRepository.replaceAll(
        mergeQueueTicketSnapshot(
          queueResult.value,
          queueRepository.getAll(),
        ),
      );
    }
  };

  const performCheckIn = async (
    tokenValue: string,
    appointment?: Appointment,
  ) => {
    const clinicLocationId =
      appointment?.clinicLocationId ??
      import.meta.env.VITE_KIOSK_CLINIC_LOCATION_ID ??
      import.meta.env.VITE_CLINIC_LOCATION_ID ??
      "CS-HCM-01";
    // Device credentials are never baked into the app bundle (a shared
    // secret readable by every visitor would let anyone forge check-ins
    // remotely). Each physical kiosk provisions its own device secret once,
    // stored only in that browser's localStorage — same mechanism for both
    // the staff-attended and unattended kiosk routes.
    let deviceId: string | undefined;
    let deviceSecret: string | undefined;
    const stored = storedReceptionDevice();
    if (stored) {
      deviceId = stored.id;
      deviceSecret = stored.secret;
    } else if (reception) {
      const created = await createKioskDevice({
        clinicLocationId,
        label: `Quầy lễ tân · ${window.location.hostname}`,
      });
      if (!created.deviceSecret) {
        throw new Error(
          "Không nhận được khóa thiết bị từ máy chủ. Vui lòng cấu hình lại quầy lễ tân.",
        );
      }
      deviceId = created.id;
      deviceSecret = created.deviceSecret;
      storeReceptionDevice(deviceId, deviceSecret);
    }

    if (!deviceId || !deviceSecret) {
      throw new Error(
        "Thiết bị check-in này chưa được cấp khóa thiết bị. Vui lòng nhờ lễ tân đăng nhập một lần tại quầy tiếp đón trên chính máy này để cấp khóa, sau đó máy sẽ tự ghi nhớ.",
      );
    }
    const checkInPayload = {
        token: tokenValue,
        clinicLocationId,
        deviceId,
        deviceSecret,
        patientId:
          appointment?.patientId ??
          import.meta.env.VITE_KIOSK_PATIENT_ID ??
          undefined,
      };
    let result: QueueTicket;
    try {
      result = await checkIn(checkInPayload, { authenticated: reception });
    } catch (error) {
      if (!(reception && error instanceof ApiError && error.status === 403)) {
        throw error;
      }
      clearStoredReceptionDevice();
      const replacement = await createKioskDevice({
        clinicLocationId,
        label: `Quầy lễ tân · ${window.location.hostname}`,
      });
      if (!replacement.deviceSecret) throw error;
      storeReceptionDevice(replacement.id, replacement.deviceSecret);
      result = await checkIn(
        {
          ...checkInPayload,
          deviceId: replacement.id,
          deviceSecret: replacement.deviceSecret,
        },
        { authenticated: true },
      );
    }
    queueRepository.upsert(result);
    setTicket(result);
    void syncAfterCheckIn();
    if (!reception) {
      navigate("/kiosk/check-in/result", {
        replace: true,
        state: { ticket: result },
      });
    }
  };

  const submitToken = async (scannedToken = token) => {
    if (!scannedToken.trim() || submitting) return;
    setSubmitting(true);
    try {
      await performCheckIn(scannedToken.trim());
    } catch (error) {
      showError(error, "Không thể check-in");
    } finally {
      setSubmitting(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraFrameRef.current) {
      window.cancelAnimationFrame(cameraFrameRef.current);
      cameraFrameRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setCameraError(undefined);
    const BarcodeDetectorClass = (
      window as typeof window & {
        BarcodeDetector?: new (options: {
          formats: string[];
        }) => {
          detect: (
            source: CanvasImageSource,
          ) => Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;
    if (!BarcodeDetectorClass) {
      setCameraError(
        "Trình duyệt này chưa hỗ trợ đọc QR trực tiếp. Hãy dùng Chrome mới hoặc máy quét USB.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      const detector = new BarcodeDetectorClass({ formats: ["qr_code"] });
      const detectFrame = async () => {
        if (!cameraStreamRef.current || video.readyState < 2) {
          cameraFrameRef.current =
            window.requestAnimationFrame(detectFrame);
          return;
        }
        try {
          const results = await detector.detect(video);
          const value = results[0]?.rawValue?.trim();
          if (value) {
            setToken(value);
            stopCamera();
            void submitToken(value);
            return;
          }
        } catch {
          // Camera có thể đang đổi tiêu cự; tiếp tục đọc frame kế tiếp.
        }
        cameraFrameRef.current = window.requestAnimationFrame(detectFrame);
      };
      cameraFrameRef.current = window.requestAnimationFrame(detectFrame);
    } catch {
      stopCamera();
      setCameraError(
        "Không mở được camera. Kiểm tra quyền camera của trình duyệt hoặc dùng máy quét USB.",
      );
    }
  };

  useEffect(() => stopCamera, [stopCamera]);

  const checkInSelectedAppointment = async (appointmentId?: string) => {
    const targetAppointmentId = appointmentId ?? selectedAppointmentId;
    if (!targetAppointmentId || submitting) return;
    const appointment = appointments.find(
      (item) => item.id === targetAppointmentId,
    );
    if (!appointment) return;
    setSubmitting(true);
    try {
      const freshTickets = mergeQueueTicketSnapshot(
        await listQueueTickets(appointment.clinicLocationId),
        queueRepository.getAll(),
      );
      queueRepository.replaceAll(freshTickets);
      const existingTicket = freshTickets.find(
        (item) =>
          item.status !== "completed" &&
          (item.appointmentId === appointment.id ||
            item.patientId === appointment.patientId),
      );
      if (existingTicket) {
        setTicket(existingTicket);
        setSelectedAppointmentId(undefined);
        return;
      }
      // A reception check-in must not reuse the appointment's previously
      // issued QR. That token may have expired while still being marked
      // active by an older backend version.
      try {
        await revokeCheckInToken(
          appointment.id,
          "Lễ tân phát mã mới để tiếp nhận trực tiếp",
        );
      } catch {
        // No active token is a valid state; issuing below remains authoritative.
      }
      const issued = await issueCheckInToken(appointment.id);
      if (!issued.token) {
        throw new Error("Máy chủ không trả về mã check-in.");
      }
      const now = Date.now();
      const validFrom = Date.parse(issued.validFrom);
      const expiresAt = Date.parse(issued.expiresAt);
      if (!Number.isFinite(validFrom) || !Number.isFinite(expiresAt)) {
        throw new Error("Máy chủ trả về thời hạn mã check-in không hợp lệ.");
      }
      if (now < validFrom) {
        throw new Error(
          `Chưa đến thời gian tiếp nhận. Mã có hiệu lực từ ${new Date(validFrom).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.`,
        );
      }
      if (now > expiresAt) {
        throw new Error(
          "Mã vừa phát hành đã hết hạn. Cần kiểm tra đồng hồ hoặc cấu hình thời gian check-in trên máy chủ.",
        );
      }
      await performCheckIn(issued.token, appointment);
    } catch (error) {
      showError(error, "Không thể tiếp nhận bệnh nhân");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setTicket(undefined);
    setToken("");
    setSelectedAppointmentId(undefined);
    navigate(reception ? "/app/reception/qr-check-in" : "/kiosk/check-in", {
      replace: true,
    });
    void refreshReceptionData();
  };

  const manualScanner = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, .65fr)",
        gap: 20,
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          minHeight: 260,
          border: "1px solid #b8d7f5",
          borderRadius: 14,
          background:
            "linear-gradient(145deg, #f7fbff 0%, #eef7ff 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 28,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            display: cameraActive ? "block" : "none",
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {cameraActive && (
          <>
            <div
              style={{
                position: "absolute",
                width: 190,
                height: 190,
                border: "3px solid #fff",
                borderRadius: 20,
                boxShadow:
                  "0 0 0 999px rgba(4, 25, 45, .42), 0 0 24px rgba(255,255,255,.35)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                right: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Tag color="processing">Đưa QR vào giữa khung</Tag>
              <Button onClick={stopCamera}>Tắt camera</Button>
            </div>
          </>
        )}
        <Space
          direction="vertical"
          size={14}
          style={{ display: cameraActive ? "none" : "flex" }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              margin: "0 auto",
              borderRadius: 20,
              background: "#1769aa",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 12px 28px rgba(23, 105, 170, .22)",
            }}
          >
            <ScanLine size={38} />
          </div>
          <Title level={3} style={{ margin: 0 }}>
            Sẵn sàng quét
          </Title>
          <Text type="secondary">
            Hướng máy quét vào mã QR trên phiếu hẹn.
            <br />
            Hệ thống tự tiếp nhận ngay khi đọc xong.
          </Text>
          <Tag color="success">Máy quét đang chờ tín hiệu</Tag>
          <Button
            type="primary"
            ghost
            icon={<QrCode size={16} />}
            onClick={() => void startCamera()}
          >
            Mở camera quét QR
          </Button>
          {cameraError && (
            <Alert
              type="error"
              showIcon
              message={cameraError}
              style={{ textAlign: "left", maxWidth: 520 }}
            />
          )}
        </Space>
      </div>
      <Card
        size="small"
        title={
          <Space>
            <Keyboard size={17} />
            <span>Dữ liệu máy quét</span>
          </Space>
        }
        styles={{ body: { padding: 18 } }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Text type="secondary">
            Con trỏ được giữ trong ô bảo mật. Máy quét thường tự gửi phím Enter
            sau mã QR.
          </Text>
          <Input.Password
            autoFocus
            size="large"
            value={token}
            visibilityToggle={false}
            prefix={<QrCode size={17} />}
            onChange={(event) => setToken(event.target.value.trim())}
            placeholder="Quét mã QR tại đây"
            onPressEnter={() => void submitToken()}
          />
          <Button
            type="primary"
            size="large"
            block
            loading={submitting}
            disabled={!token.trim()}
            onClick={() => void submitToken()}
          >
            {submitting ? "Đang xác thực…" : "Xử lý mã"}
          </Button>
          <Alert
            type="warning"
            showIcon
            message="QR không đọc được?"
            description={
              reception
                ? "Chuyển sang tab Tra cứu lịch hẹn; không nhập mã bệnh nhân vào ô này."
                : "Liên hệ quầy lễ tân để được tra cứu lịch hẹn."
            }
          />
        </Space>
      </Card>
    </div>
  );

  return (
    <div
      style={{
        maxWidth: reception ? 1560 : 760,
        margin: reception ? "24px auto" : "40px auto",
        padding: reception ? "0 24px 32px" : 16,
      }}
    >
      <Card styles={{ body: { padding: reception ? 20 : 24 } }}>
        {ticket && !reception ? (
          <QueueResult ticket={ticket} onReset={reset} />
        ) : (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: "#eaf4ff",
                  flex: "0 0 auto",
                }}
              >
                <QrCode size={25} color="#1769aa" />
              </div>
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  {reception ? "Tiếp nhận bệnh nhân" : "Check-in khám bệnh"}
                </Title>
                <Text type="secondary">
                  {reception
                    ? "Tra cứu lịch hẹn hoặc quét QR trên phiếu hẹn."
                    : "Quét mã QR trên phiếu hẹn để nhận số thứ tự."}
                </Text>
              </div>
            </div>

            {reception ? (
              <Tabs
                defaultActiveKey="lookup"
                items={[
                  {
                    key: "lookup",
                    label: "Tra cứu lịch hẹn",
                    children: (
                      <Space
                        direction="vertical"
                        size="middle"
                        style={{ width: "100%" }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(360px, 1fr) 190px",
                            gap: 12,
                            alignItems: "end",
                          }}
                        >
                          <div>
                            <Text strong>Chọn bệnh nhân có lịch hẹn</Text>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              value={selectedAppointmentId}
                              onChange={setSelectedAppointmentId}
                              placeholder="Tìm theo tên bệnh nhân, ngày hoặc giờ khám"
                              suffixIcon={<Search size={15} />}
                              loading={refreshing}
                              disabled={refreshing}
                              size="large"
                              style={{ width: "100%", marginTop: 8 }}
                              options={receptionAppointments.map(
                                (appointment) => {
                                  const patient = patients.find(
                                    (item) =>
                                      item.id === appointment.patientId,
                                  );
                                  return {
                                    value: appointment.id,
                                    label: `${patient?.name ?? appointment.patientId} · ${appointment.time} ${appointment.date} · ${appointment.department ?? "Khám bệnh"}`,
                                  };
                                },
                              )}
                              notFoundContent={
                                refreshing
                                  ? "Đang đồng bộ danh sách…"
                                  : "Không có lịch hẹn đang chờ check-in"
                              }
                            />
                          </div>
                          <Button
                            type="primary"
                            size="large"
                            block
                            icon={<CalendarCheck size={17} />}
                            disabled={!selectedAppointmentId}
                            loading={submitting}
                            onClick={() => void checkInSelectedAppointment()}
                          >
                            Tiếp nhận
                          </Button>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Space
                            style={{
                              width: "100%",
                              justifyContent: "space-between",
                              marginBottom: 8,
                            }}
                          >
                            <Text strong>Hàng đợi hôm nay</Text>
                            <Space size={8}>
                              <Tag>
                                Chờ{" "}
                                {
                                  activeReceptionTickets.filter(
                                    (item) => item.status === "waiting",
                                  ).length
                                }
                              </Tag>
                              <Tag color="processing">
                                Đang gọi{" "}
                                {
                                  activeReceptionTickets.filter(
                                    (item) => item.status === "called",
                                  ).length
                                }
                              </Tag>
                              <Tag color="success">
                                Phục vụ{" "}
                                {
                                  activeReceptionTickets.filter(
                                    (item) =>
                                      item.status === "acknowledged" ||
                                      item.status === "in_service",
                                  ).length
                                }
                              </Tag>
                              <Tag color="blue">
                                Tổng {activeReceptionTickets.length}
                              </Tag>
                            </Space>
                          </Space>
                          <Table<QueueTicket>
                            rowKey="id"
                            size="middle"
                            tableLayout="fixed"
                            dataSource={activeReceptionTickets}
                            scroll={{ x: 1320 }}
                            locale={{
                              emptyText:
                                "Chưa có bệnh nhân nào trong hàng đợi khám.",
                            }}
                            pagination={{
                              pageSize: QUEUE_PAGE_SIZE,
                              current: queuePage,
                              onChange: setQueuePage,
                              size: "small",
                              showSizeChanger: false,
                              hideOnSinglePage: true,
                              showTotal: (total, range) =>
                                `${range[0]}–${range[1]} / ${total} bệnh nhân`,
                            }}
                            columns={[
                              {
                                title: "STT",
                                width: 64,
                                align: "center",
                                render: (_value, _row, index) => (
                                  <Text strong>
                                    {(queuePage - 1) * QUEUE_PAGE_SIZE +
                                      index +
                                      1}
                                  </Text>
                                ),
                              },
                              {
                                title: "Số khám",
                                width: 105,
                                render: (_value, row) => (
                                  <Tag
                                    color={
                                      row.status === "called"
                                        ? "blue"
                                        : "default"
                                    }
                                    style={{
                                      fontSize: 15,
                                      fontWeight: 700,
                                      padding: "4px 10px",
                                    }}
                                  >
                                    {row.number}
                                  </Tag>
                                ),
                              },
                              {
                                title: "Bệnh nhân",
                                width: 220,
                                render: (_value, row) => {
                                  const patient = patients.find(
                                    (item) => item.id === row.patientId,
                                  );
                                  return (
                                    <Space direction="vertical" size={1}>
                                      <Text strong>
                                        {patient?.name ?? row.patientId}
                                      </Text>
                                      <Text type="secondary">
                                        ID {row.id.slice(0, 8)}
                                      </Text>
                                    </Space>
                                  );
                                },
                              },
                              {
                                title: "Khoa / khu vực",
                                width: 190,
                                render: (_value, row) => (
                                  <Space direction="vertical" size={1}>
                                    <Text>{row.department}</Text>
                                    <Text type="secondary">
                                      {row.waitingArea}
                                    </Text>
                                  </Space>
                                ),
                              },
                              {
                                title: "Thời điểm đến",
                                width: 135,
                                render: (_value, row) => (
                                  <Space direction="vertical" size={1}>
                                    <Text strong>
                                      {new Date(row.issuedAt).toLocaleTimeString(
                                        "vi-VN",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        },
                                      )}
                                    </Text>
                                    {row.status === "waiting" && (
                                      <Text type="secondary">
                                        {row.peopleAhead} người trước · ~
                                        {row.estimatedWaitMinutes} phút
                                      </Text>
                                    )}
                                  </Space>
                                ),
                              },
                              {
                                title: "Trạng thái",
                                width: 130,
                                render: (_value, row) => {
                                  const status = {
                                    waiting: ["Đang chờ", "default"],
                                    called: ["Đang gọi", "processing"],
                                    acknowledged: ["Đã có mặt", "cyan"],
                                    in_service: ["Đang phục vụ", "success"],
                                    skipped: ["Tạm hoãn", "warning"],
                                    routed: ["Đã chuyển", "purple"],
                                    completed: ["Hoàn tất", "success"],
                                  }[row.status] as [string, string];
                                  return (
                                    <Tag color={status[1]}>{status[0]}</Tag>
                                  );
                                },
                              },
                              {
                                title: "Thao tác",
                                width: 460,
                                fixed: "right",
                                render: (_value, row) => {
                                  const callCount =
                                    callCounts[row.id] ??
                                    (row.status === "called" ? 1 : 0);
                                  const isFirst =
                                    firstWaitingTicketByDepartment.get(
                                      row.department,
                                    ) === row.id;
                                  return (
                                    <Space size={10} style={{ whiteSpace: "nowrap" }}>
                                      <Button
                                        type="link"
                                        onClick={() => setTicket(row)}
                                      >
                                        Chi tiết
                                      </Button>
                                      {row.status === "waiting" && (
                                        <Button
                                          type={isFirst ? "primary" : "default"}
                                          disabled={!isFirst}
                                          loading={queueActionId === row.id}
                                          icon={<BellRing size={14} />}
                                          onClick={() =>
                                            void runQueueAction(row, "call")
                                          }
                                        >
                                          {isFirst ? "Gọi tiếp" : "Chờ lượt"}
                                        </Button>
                                      )}
                                      {row.status === "called" && (
                                        <>
                                          <Button
                                            icon={<BellRing size={14} />}
                                            onClick={() => recallTicket(row)}
                                          >
                                            Gọi lại {callCount}/3
                                          </Button>
                                          <Button
                                            type="primary"
                                            loading={queueActionId === row.id}
                                            icon={<Check size={14} />}
                                            onClick={() =>
                                              void runQueueAction(
                                                row,
                                                "acknowledge",
                                              )
                                            }
                                          >
                                            Có mặt
                                          </Button>
                                          <Tooltip
                                            title={
                                              callCount < 3
                                                ? "Cần gọi đủ 3 lần"
                                                : "Hoãn và gọi số kế tiếp"
                                            }
                                          >
                                            <Button
                                              danger
                                              disabled={callCount < 3}
                                              icon={<SkipForward size={14} />}
                                              onClick={() => confirmSkip(row)}
                                            >
                                              Vắng
                                            </Button>
                                          </Tooltip>
                                        </>
                                      )}
                                      {row.status === "acknowledged" && (
                                        <Button
                                          type="primary"
                                          loading={queueActionId === row.id}
                                          icon={<LogIn size={14} />}
                                          onClick={() =>
                                            void runQueueAction(row, "start")
                                          }
                                        >
                                          Bắt đầu phục vụ
                                        </Button>
                                      )}
                                    </Space>
                                  );
                                },
                              },
                            ]}
                          />
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              margin: "28px 0 10px",
                            }}
                          >
                            <div>
                              <Text strong>Lịch hẹn hôm nay chưa tiếp nhận</Text>
                              <br />
                              <Text type="secondary">
                                Chỉ hiển thị lịch trong ngày; lịch cũ được giữ
                                trong hồ sơ và không làm dài màn vận hành
                              </Text>
                            </div>
                            <Tag color="gold">
                              {bookedReceptionAppointments.length} lịch hẹn
                            </Tag>
                          </div>
                          <Table<Appointment>
                            rowKey="id"
                            size="middle"
                            tableLayout="fixed"
                            dataSource={bookedReceptionAppointments}
                            scroll={{ x: 980 }}
                            pagination={{
                              pageSize: QUEUE_PAGE_SIZE,
                              size: "small",
                              showSizeChanger: false,
                              hideOnSinglePage: true,
                              showTotal: (total, range) =>
                                `${range[0]}–${range[1]} / ${total} lịch hẹn`,
                            }}
                            locale={{
                              emptyText:
                                "Không còn lịch hẹn nào chờ tiếp nhận.",
                            }}
                            columns={[
                              {
                                title: "Bệnh nhân",
                                width: 280,
                                render: (_value, row) => {
                                  const patient = patients.find(
                                    (item) => item.id === row.patientId,
                                  );
                                  return (
                                    <Space direction="vertical" size={1}>
                                      <Text strong>
                                        {patient?.name ?? row.patientId}
                                      </Text>
                                      <Text type="secondary">
                                        Mã lịch {row.id.slice(0, 8)}
                                      </Text>
                                    </Space>
                                  );
                                },
                              },
                              {
                                title: "Thời gian hẹn",
                                width: 200,
                                render: (_value, row) => (
                                  <Text strong>
                                    {row.time} · {row.date}
                                  </Text>
                                ),
                              },
                              {
                                title: "Khoa",
                                width: 220,
                                render: (_value, row) =>
                                  row.department ?? "Khám bệnh",
                              },
                              {
                                title: "Trạng thái",
                                width: 160,
                                render: () => (
                                  <Tag color="gold">Chưa tiếp nhận</Tag>
                                ),
                              },
                              {
                                title: "Thao tác",
                                width: 200,
                                align: "right",
                                render: (_value, row) => {
                                  const startsAt = new Date(
                                    row.startAt ?? "",
                                  ).getTime();
                                  const endsAt = new Date(
                                    row.endAt ?? row.startAt ?? "",
                                  ).getTime();
                                  const eligible =
                                    startsAt <= eligibilityCeiling &&
                                    endsAt >= eligibilityCutoff;
                                  return (
                                    <Tooltip
                                      title={
                                        eligible
                                          ? undefined
                                          : "Lịch hẹn chưa nằm trong khung thời gian tiếp nhận"
                                      }
                                    >
                                      <Button
                                        type={eligible ? "primary" : "default"}
                                        disabled={!eligible}
                                        loading={submitting}
                                        icon={<CalendarCheck size={15} />}
                                        onClick={() =>
                                          void checkInSelectedAppointment(
                                            row.id,
                                          )
                                        }
                                      >
                                        Tiếp nhận
                                      </Button>
                                    </Tooltip>
                                  );
                                },
                              },
                            ]}
                          />
                        </div>
                      </Space>
                    ),
                  },
                  {
                    key: "scanner",
                    label: "Quét QR",
                    children: manualScanner,
                  },
                ]}
              />
            ) : (
              manualScanner
            )}
          </Space>
        )}
      </Card>
      <Modal
        open={reception && Boolean(ticket)}
        footer={null}
        closable={false}
        centered
        width={640}
        styles={{ body: { padding: "8px 12px 4px" } }}
      >
        {ticket && (
          <QueueResult
            ticket={ticket}
            onReset={reset}
          />
        )}
      </Modal>
    </div>
  );
}
