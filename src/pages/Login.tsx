import { useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Button,
  Checkbox,
  Divider,
  Typography,
  Alert,
  Modal,
} from "antd";
import { ArrowRight, Shield, Zap, Heart, Eye, Flashlight } from "lucide-react";
import {
  motion,
  useMotionValue,
  useSpring,
  animate,
  AnimatePresence,
} from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { forgotPassword, login } from "../api/auth";
import { ApiError } from "../api/http";

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

interface ForgotPasswordFormValues {
  email: string;
}

/* ─── Easing ─────────────────────────────────────────── */
const E_OUT = [0.22, 1, 0.36, 1] as const;
const E_INOUT = [0.42, 0, 0.58, 1] as const;

/* ─── Variants ───────────────────────────────────────── */
const leftPanel = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delayChildren: 0.18, staggerChildren: 0.1 },
  },
};
const leftItem = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.65, ease: E_OUT } },
};
const formCard = {
  hidden: { opacity: 0, x: 60, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.75, ease: E_OUT, delay: 0.12 },
  },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.22 },
  },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: E_OUT } },
};

/* ─── Particles (seeded, stable across renders) ──────── */
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const seed = (i * 137.508) % 360;
  return {
    id: i,
    x: (seed / 360) * 100,
    y: (i * 53.13) % 100,
    size: (i % 3) + 1.5,
    delay: (i * 0.38) % 7,
    dur: 10 + (i % 8),
    opacity: 0.06 + (i % 5) * 0.04,
  };
});

/* ─── Animated counter ───────────────────────────────── */
function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [val, setVal] = useState(0);
  const ctrl = useRef<ReturnType<typeof animate> | null>(null);
  useEffect(() => {
    ctrl.current = animate(0, target, {
      duration: 1.9,
      ease: E_OUT,
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => ctrl.current?.stop();
  }, [target]);
  return (
    <>
      {val}
      {suffix}
    </>
  );
}

/* ─── Typewriter ─────────────────────────────────────── */
function Typewriter({ lines }: { lines: string[] }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const full = lines[lineIdx] ?? "";
  const shown = full.slice(0, charIdx);
  const done = charIdx >= full.length;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setCharIdx((c) => c + 1), 46);
    return () => clearTimeout(t);
  }, [charIdx, done]);

  useEffect(() => {
    if (!done || lineIdx >= lines.length - 1) return;
    const t = setTimeout(() => {
      setLineIdx((l) => l + 1);
      setCharIdx(0);
    }, 300);
    return () => clearTimeout(t);
  }, [done, lineIdx, lines.length]);

  return (
    <>
      {lines.map((line, idx) => (
        <span key={idx} style={{ display: "block" }}>
          {idx < lineIdx ? line : idx === lineIdx ? shown : ""}
          {idx === lineIdx && (
            <motion.span
              animate={{
                opacity: done && lineIdx === lines.length - 1 ? [1, 0] : 1,
              }}
              transition={{
                repeat: Infinity,
                duration: 0.55,
                ease: "easeInOut",
              }}
              style={{
                display: "inline-block",
                width: 2.5,
                height: "0.85em",
                background: "#5da9ea",
                marginLeft: 3,
                verticalAlign: "middle",
                borderRadius: 2,
              }}
            />
          )}
        </span>
      ))}
    </>
  );
}

/* ─── Spotlight (follows cursor on right panel) ──────── */
function Spotlight({ isDark }: { isDark?: boolean }) {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 120, damping: 20 });
  const sy = useSpring(y, { stiffness: 120, damping: 20 });

  const onMove = useCallback(
    (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    },
    [x, y],
  );

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [onMove]);

  return (
    <motion.div
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 0,
        width: isDark ? 550 : 420,
        height: isDark ? 550 : 420,
        borderRadius: "50%",
        background: isDark
          ? "radial-gradient(circle, rgba(93,169,234,0.20) 0%, rgba(26,84,148,0.08) 45%, transparent 70%)"
          : "radial-gradient(circle, rgba(93,169,234,0.10) 0%, transparent 70%)",
        x: sx,
        y: sy,
        translateX: "-50%",
        translateY: "-50%",
      }}
    />
  );
}

/* ─── Ripple on click ────────────────────────────────── */
function RippleButton({
  onClick,
  children,
  style,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [ripples, setRipples] = useState<
    { id: number; x: number; y: number }[]
  >([]);
  const ref = useRef<HTMLDivElement>(null);

  const addRipple = (e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const id = Date.now();
    setRipples((r) => [
      ...r,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 600);
    onClick?.();
  };

  return (
    <div
      ref={ref}
      onClick={addRipple}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.58, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.55)",
              transform: "translate(-50%,-50%)",
              pointerEvents: "none",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Social Button (no y-lift, just shadow + scale) ─── */
function SocialBtn({
  label,
  icon,
  isDark,
}: {
  label: string;
  icon: React.ReactNode;
  isDark?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.035, boxShadow: "0 6px 22px rgba(16,34,90,0.13)" }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.18 }}
      style={{
        flex: 1,
        height: 50,
        borderRadius: 14,
        background: isDark ? "rgba(32,45,70,0.8)" : "rgba(255,255,255,0.92)",
        border: isDark
          ? "1.5px solid rgba(147,180,225,0.20)"
          : "1.5px solid rgba(16,34,90,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        fontWeight: 600,
        fontSize: 14,
        color: isDark ? "#ffffff" : "#1a1a2e",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(16,34,90,0.06)",
        transition: "border-color 0.7s ease, background 0.7s ease, color 0.7s ease",
      }}
    >
      {icon} {label}
    </motion.button>
  );
}

/* ─── Feature card for left panel ───────────────────── */
function FeatureCard({
  icon,
  title,
  desc,
  delay,
  isDark,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: number;
  isDark?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: E_OUT }}
      whileHover={{
        x: 6,
        background: isDark
          ? "rgba(93,169,234,0.12)"
          : "rgba(255,255,255,0.12)",
      }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "12px 16px",
        borderRadius: 14,
        background: isDark ? "rgba(26,38,62,0.8)" : "rgba(255,255,255,0.06)",
        border: isDark
          ? "1px solid rgba(147,180,225,0.18)"
          : "1px solid rgba(255,255,255,0.1)",
        transition: "background 0.7s ease, border-color 0.7s ease",
        cursor: "default",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: isDark
            ? "rgba(93,169,234,0.18)"
            : "rgba(93,169,234,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 13.5,
            color: isDark ? "#ffffff" : "rgba(255,255,255,0.92)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: isDark ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.52)",
            marginTop: 3,
            lineHeight: 1.4,
          }}
        >
          {desc}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Password with flashlight reveal overlay ────────── */
// Native input text is hidden in dark mode; this overlay draws each char as a
// bullet or the real char, cross-fading by opacity only (no layout change).
function PasswordReveal({
  value,
  onChange,
  id,
  isDark,
  lit,
  cellRefs,
  renderInput,
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  isDark: boolean;
  lit: boolean[];
  cellRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
  renderInput: (p: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    id?: string;
    styles?: { input?: React.CSSProperties };
  }) => React.ReactNode;
}) {
  const chars = Array.from(value ?? "");
  cellRefs.current.length = chars.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Native bullet width vs overlay cell width: the native caret sits after the
  // native bullets, so both must advance by the same amount per character.
  const [metrics, setMetrics] = useState({ cell: 8.68, spacing: 0 });

  useLayoutEffect(() => {
    const input = wrapRef.current?.querySelector("input");
    if (!input) return;
    // Measure with the overlay's own font (what the revealed glyphs render in)
    const cs = getComputedStyle(overlayRef.current ?? input);
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const bullet = ctx.measureText("•").width;
    // Cell pitch must fit the widest real glyph (m, W, @ …) so none collide;
    // it stays uniform so bullets don't leak per-char widths and the native
    // caret (same pitch via letter-spacing) lands after the last char.
    const widest = Array.from(value ?? "").reduce(
      (w, ch) => Math.max(w, ctx.measureText(ch).width),
      0,
    );
    const cell = Math.max(bullet, parseFloat(cs.fontSize) * 0.8, widest * 1.1);
    setMetrics((m) =>
      m.cell === cell && m.spacing === cell - bullet
        ? m
        : { cell, spacing: cell - bullet },
    );
  }, [isDark, value]);

  // Light ↔ Dark: re-seat the caret at the end of the real password
  useLayoutEffect(() => {
    const input = wrapRef.current?.querySelector("input");
    if (!input || document.activeElement !== input) return;
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, [isDark, metrics]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {renderInput({
        value,
        onChange,
        id,
        styles: isDark
          ? {
              input: {
                color: "transparent",
                caretColor: "#ffffff",
                letterSpacing: `${metrics.spacing}px`,
              },
            }
          : undefined,
      })}
      {isDark && (
        <div
          ref={overlayRef}
          aria-hidden
          style={{
            position: "absolute",
            left: 15.5,
            right: 46,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            fontSize: 14,
            color: "#ffffff",
          }}
        >
          {chars.map((ch, i) => (
            <span
              key={i}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
              style={{
                position: "relative",
                display: "inline-block",
                width: metrics.cell,
                height: "1.4em",
                lineHeight: "1.4em",
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: lit[i] ? 0 : 1,
                  transition: "opacity 0.35s ease",
                }}
              >
                •
              </span>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: lit[i] ? 1 : 0,
                  color: "#ffffff",
                  // hairline dark edge keeps glyphs crisp against the amber beam
                  textShadow: "0 1px 1px rgba(7,14,28,0.55)",
                  WebkitFontSmoothing: "antialiased",
                  transition: "opacity 0.35s ease",
                }}
              >
                {ch}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────── */
export default function Login() {
  const nav = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [flashAngle, setFlashAngle] = useState(0);
  const flashRef = useRef<HTMLSpanElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const charCellRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const revealAnchorRef = useRef(-1);
  const fullRevealRef = useRef(false);
  const entryHitRef = useRef(-1);
  const enteredFromLeftRef = useRef(false);
  const [litChars, setLitChars] = useState<boolean[]>([]);
  const sessionExpired =
    new URLSearchParams(window.location.search).get("reason") ===
    "session-expired";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDark) {
      revealAnchorRef.current = -1;
      fullRevealRef.current = false;
      enteredFromLeftRef.current = false;
      setLitChars((prev) => (prev.length ? [] : prev));
      return;
    }
    const onMove = (e: MouseEvent) => {
      const el = flashRef.current;
      const beam = beamRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      // Icon rotation
      const radL = Math.atan2(dy, -dx);
      const degL = radL * (180 / Math.PI);
      const clamped = Math.max(-90, Math.min(90, degL));
      setFlashAngle(-90 - clamped);
      // Beam via direct DOM — no re-render
      if (beam) {
        const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
        const beamLength = clamp(dist * 1.65, 160, 1600);
        const beamHeight = beamLength * 0.38;
        // Beam heading = the flashlight's own (clamped) heading, so it only shines
        // forward within the same 180° the icon can face; identical to
        // atan2(dy, dx) whenever the cursor is on the icon's facing side
        const angleRad = ((180 - clamped) * Math.PI) / 180;
        const angleDeg = angleRad * (180 / Math.PI);
        // Offset origin 13px forward along beam direction so beam starts at flashlight tip
        const originX = cx + Math.cos(angleRad) * 13;
        const originY = cy + Math.sin(angleRad) * 13;
        // transformOrigin "0 50%" means rotation pivot is at left-center of the div
        beam.style.left = `${originX}px`;
        beam.style.top = `${originY - beamHeight / 2}px`;
        beam.style.width = `${beamLength}px`;
        beam.style.height = `${beamHeight}px`;
        beam.style.transform = `rotate(${angleDeg}deg)`;
        beam.style.opacity = "1";

        // Password reveal: char under the cursor + the 2 chars to its left
        const cells = charCellRefs.current;
        const hit = cells.findIndex((cell) => {
          if (!cell) return false;
          const r = cell.getBoundingClientRect();
          return (
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top - 8 &&
            e.clientY <= r.bottom + 8
          );
        });
        // Cumulative right→left: anchor = first char touched; moving right never moves it
        if (hit < 0) {
          revealAnchorRef.current = -1;
          // Remember if the cursor is left of the field: re-entering from there must not start a reveal
          const first = cells[0]?.getBoundingClientRect();
          enteredFromLeftRef.current = !!first && e.clientX < first.left;
        } else if (revealAnchorRef.current < 0 && !enteredFromLeftRef.current) {
          // First touch anywhere: reveal from that char through the end (right side)
          revealAnchorRef.current = cells.length - 1;
          entryHitRef.current = hit;
        }
        const anchor = revealAnchorRef.current;
        const groupLit = cells.map(
          (_, i) =>
            hit >= 0 &&
            anchor >= 0 &&
            i >= (hit === entryHitRef.current ? hit : hit - 2) &&
            i <= anchor,
        );
        // Beam cone covering the whole password → show it all; beam leaving → hide
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const inBeam = cells.map((cell) => {
          if (!cell) return false;
          const r = cell.getBoundingClientRect();
          const vx = r.left + r.width / 2 - originX;
          const vy = r.top + r.height / 2 - originY;
          const along = vx * cos + vy * sin;
          const across = Math.abs(-vx * sin + vy * cos);
          return (
            along >= -8 &&
            along <= beamLength &&
            across <= Math.max(along, 0) * 0.19 + 9
          );
        });
        // A cursor resting on a char only gets the 3-char group, never the full reveal
        const groupAll = groupLit.length > 0 && groupLit.every(Boolean);
        if (inBeam.length && inBeam.every(Boolean) && (hit < 0 || groupAll))
          fullRevealRef.current = true;
        else if ((hit >= 0 && !groupAll) || !inBeam.some(Boolean))
          fullRevealRef.current = false;
        const next = fullRevealRef.current ? groupLit.map(() => true) : groupLit;
        setLitChars((prev) =>
          prev.length === next.length && prev.every((v, i) => v === next[i])
            ? prev
            : next,
        );
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [isDark]);

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    setLoading(true);
    try {
      await login({
        email: values.email,
        password: values.password,
        rememberMe: values.remember,
      });
      let returnTo = "/app/dashboard";
      try {
        const stored = sessionStorage.getItem("dermahealth:returnTo");
        if (stored?.startsWith("/app/")) returnTo = stored;
        sessionStorage.removeItem("dermahealth:returnTo");
      } catch {
        // Fall back to the dashboard when session storage is unavailable.
      }
      window.location.assign(returnTo);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Đăng nhập thất bại. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async ({
    email,
  }: ForgotPasswordFormValues) => {
    setForgotLoading(true);
    setForgotError(null);
    try {
      // The backend deliberately never reveals whether the email matched an
      // account (avoids leaking which emails are registered) — its response
      // body carries no user-facing text, so the message shown here must
      // always be this fixed string, never something derived from the
      // response itself.
      await forgotPassword({ email });
      setForgotResult(
        "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.",
      );
    } catch (err) {
      setForgotError(
        err instanceof ApiError
          ? err.message
          : "Không thể gửi yêu cầu. Vui lòng thử lại.",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        height: "100vh",
        width: "100vw",
        fontFamily: "var(--font-system)",
        overflow: "hidden",
        background: isDark
          ? "linear-gradient(135deg, #0c1322 0%, #15213a 100%)"
          : "linear-gradient(135deg, #eef2ff 0%, #e8f0fe 100%)",
        transition: "background 0.7s ease",
      }}
    >
      <Modal
        title="Quên mật khẩu"
        open={forgotOpen}
        footer={null}
        destroyOnHidden
        styles={
          isDark
            ? {
                container: {
                  background: "rgb(22,33,54)",
                  border: "1px solid rgba(147,180,225,0.16)",
                },
                title: { background: "transparent", color: "#ffffff" },
                close: { color: "rgba(255,255,255,0.65)" },
              }
            : undefined
        }
        onCancel={() => {
          setForgotOpen(false);
          setForgotResult(null);
          setForgotError(null);
        }}
      >
        {forgotResult ? (
          <Alert
            type="success"
            showIcon
            message={forgotResult}
            style={
              isDark
                ? {
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.35)",
                    color: "#ffffff",
                  }
                : undefined
            }
          />
        ) : (
          <Form<ForgotPasswordFormValues>
            layout="vertical"
            onFinish={handleForgotPassword}
          >
            {forgotError && (
              <Alert
                type="error"
                showIcon
                message={forgotError}
                style={{
                  marginBottom: 16,
                  ...(isDark
                    ? {
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.35)",
                        color: "#ffffff",
                      }
                    : {}),
                }}
              />
            )}
            <Form.Item
              label={
                <span style={{ color: isDark ? "rgba(255,255,255,0.85)" : undefined }}>
                  Email tài khoản
                </span>
              }
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email!" },
                { type: "email", message: "Email không hợp lệ!" },
              ]}
            >
              <Input
                size="large"
                placeholder="user@dermahealth.vn"
                style={
                  isDark
                    ? {
                        background: "rgba(32,45,70,0.75)",
                        border: "1.5px solid rgba(147,180,225,0.22)",
                        color: "#ffffff",
                      }
                    : undefined
                }
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={forgotLoading}
              block
            >
              Gửi hướng dẫn đặt lại mật khẩu
            </Button>
          </Form>
        )}
      </Modal>
      <Spotlight isDark={isDark} />

      {/* ── Flashlight beam ── */}
      {isDark && (
        <div
          ref={beamRef}
          style={{
            position: "fixed",
            zIndex: 5,
            pointerEvents: "none",
            transformOrigin: "0 50%",
            filter: "blur(12px)",
            opacity: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg," +
                "rgba(255,224,156,0.754) 0%," +
                "rgba(255,219,145,0.559) 16%," +
                "rgba(255,214,140,0.325) 35%," +
                "rgba(255,207,130,0.143) 55%," +
                "rgba(255,202,124,0.039) 75%," +
                "rgba(255,202,124,0) 96%," +
                "transparent 100%)",
              clipPath: "polygon(0 50%, 100% 0%, 100% 100%)",
            }}
          />
        </div>
      )}

      {/* ── Ambient blobs ── */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        {[
          {
            w: 520,
            h: 520,
            bg: "rgba(93,169,234,0.20)",
            blur: 130,
            style: { left: "-8%", top: "-12%" },
            ax: [0, 20, 0] as [number, number, number],
            ay: [0, 14, 0] as [number, number, number],
            dur: 20,
          },
          {
            w: 400,
            h: 400,
            bg: "rgba(26,84,148,0.15)",
            blur: 110,
            style: { right: "-5%", bottom: "-10%" },
            ax: [0, -14, 0] as [number, number, number],
            ay: [0, -10, 0] as [number, number, number],
            dur: 24,
          },
          {
            w: 300,
            h: 300,
            bg: "rgba(93,169,234,0.12)",
            blur: 90,
            style: { right: "32%", top: "18%" },
            ax: [0, 10, 0] as [number, number, number],
            ay: [0, 16, 0] as [number, number, number],
            dur: 16,
          },
        ].map((b, i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              width: b.w,
              height: b.h,
              borderRadius: "50%",
              background: b.bg,
              filter: `blur(${b.blur}px)`,
              ...b.style,
            }}
            animate={{ x: b.ax, y: b.ay }}
            transition={{ repeat: Infinity, duration: b.dur, ease: E_INOUT }}
          />
        ))}

        {/* Aurora sweep */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(210deg, rgba(93,169,234,0.07) 0%, transparent 50%, rgba(26,84,148,0.07) 100%)",
            pointerEvents: "none",
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 8, ease: E_INOUT }}
        />

        {/* Floating particles */}
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: "rgba(26,84,148,0.55)",
              opacity: p.opacity,
            }}
            animate={{
              y: [0, -26, 0],
              opacity: [p.opacity, p.opacity * 2.5, p.opacity],
            }}
            transition={{
              repeat: Infinity,
              duration: p.dur,
              delay: p.delay,
              ease: E_INOUT,
            }}
          />
        ))}
      </motion.div>

      {/* ══════════ LEFT PANEL ══════════ */}
      <motion.div
        variants={leftPanel}
        initial="hidden"
        animate="visible"
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: isDark
            ? "linear-gradient(152deg, #0d1525 0%, #121d33 48%, #1a2a47 100%)"
            : "linear-gradient(152deg, #071e35 0%, #0c3060 48%, #174d8a 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          padding: "44px 60px",
          transition: "background 0.7s ease",
        }}
      >
        {/* Shimmer sweep */}
        <motion.div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "40%",
            height: "140%",
            background:
              "linear-gradient(108deg, transparent 28%, rgba(255,255,255,0.04) 50%, transparent 72%)",
            transform: "skewX(-16deg)",
            pointerEvents: "none",
          }}
          animate={{ x: ["0%", "340%"] }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "linear",
            repeatDelay: 4,
          }}
        />

        {/* Grid lines decoration */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            pointerEvents: "none",
          }}
        />

        {/* Glow orb */}
        <div
          style={{
            position: "absolute",
            right: -60,
            top: "15%",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: isDark
              ? "radial-gradient(circle, rgba(93,169,234,0.24) 0%, transparent 68%)"
              : "radial-gradient(circle, rgba(93,169,234,0.16) 0%, transparent 68%)",
            pointerEvents: "none",
            transition: "background 0.7s ease",
          }}
        />

        {/* Logo */}
        <motion.div
          variants={leftItem}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: "auto",
            zIndex: 1,
          }}
        >
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              overflow: "hidden",
              border: "1.5px solid rgba(255,255,255,0.15)",
              flexShrink: 0,
            }}
          >
            <img
              src="/logo-mark.png"
              alt="DermaHealth"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </motion.div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15.5,
                letterSpacing: "0.01em",
              }}
            >
              DermaHealth
            </div>
            <div style={{ fontSize: 11, opacity: 0.45, marginTop: 1 }}>
              Chuỗi hệ thống trạm chăm sóc da
            </div>
          </div>
        </motion.div>

        {/* Hero text */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <motion.div variants={leftItem}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(93,169,234,0.18)",
                border: "1px solid rgba(93,169,234,0.32)",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 11.5,
                fontWeight: 600,
                color: "#8ecdf5",
                marginTop: 20,
                marginBottom: 18,
                letterSpacing: "0.04em",
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: E_INOUT }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#5da9ea",
                    display: "inline-block",
                  }}
                />
              </motion.span>
              AI-POWERED SKINCARE
            </div>
            <Title
              style={{
                color: "white",
                fontSize: "clamp(26px, 3.2vw, 40px)",
                lineHeight: 1.16,
                marginBottom: 16,
                fontWeight: 800,
              }}
            >
              <Typewriter lines={["Chăm Sóc Da", "Thông Minh Hơn"]} />
            </Title>
          </motion.div>

          <motion.div variants={leftItem}>
            <p
              style={{
                color: isDark
                  ? "rgba(255,255,255,0.8)"
                  : "rgba(255,255,255,0.65)",
                fontSize: 15,
                lineHeight: 1.78,
                marginBottom: 0,
                maxWidth: 400,
              }}
            >
              Kết hợp AI tiên tiến và chuyên môn y tế để mang lại kết quả điều
              trị da liễu tốt nhất cho bạn.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={leftItem}
            style={{
              display: "flex",
              gap: 0,
              marginTop: 32,
              borderRadius: 16,
              overflow: "hidden",
              border: isDark
                ? "1px solid rgba(147,180,225,0.20)"
                : "1px solid rgba(255,255,255,0.1)",
              background: isDark
                ? "rgba(16,25,42,0.7)"
                : "rgba(255,255,255,0.04)",
              transition: "background 0.7s ease, border-color 0.7s ease",
            }}
          >
            {[
              { target: 50, suffix: "K+", label: "Bệnh nhân" },
              { target: 98, suffix: "%", label: "Hài lòng" },
              { target: 200, suffix: "+", label: "Bác sĩ" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                whileHover={{ background: "rgba(93,169,234,0.12)" }}
                transition={{ duration: 0.2 }}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  textAlign: "center",
                  borderRight:
                    i < 2
                      ? isDark
                        ? "1px solid rgba(147,180,225,0.18)"
                        : "1px solid rgba(255,255,255,0.1)"
                      : "none",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#5da9ea",
                    lineHeight: 1,
                  }}
                >
                  <AnimatedCounter target={s.target} suffix={s.suffix} />
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    opacity: isDark ? 0.75 : 0.5,
                    marginTop: 4,
                    letterSpacing: "0.03em",
                  }}
                >
                  {s.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Feature cards */}
          <motion.div
            variants={leftItem}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 20,
            }}
          >
            <FeatureCard
              icon={<Zap size={16} color="#5da9ea" />}
              title="AI Phân tích da"
              desc="Nhận diện vấn đề da chính xác 98%"
              delay={0.8}
              isDark={isDark}
            />
            <FeatureCard
              icon={<Shield size={16} color="#5da9ea" />}
              title="Bảo mật dữ liệu"
              desc="Mã hóa end-to-end chuẩn y tế"
              delay={0.92}
              isDark={isDark}
            />
            <FeatureCard
              icon={<Heart size={16} color="#5da9ea" />}
              title="Theo dõi tiến triển"
              desc="Lịch sử điều trị toàn diện"
              delay={1.04}
              isDark={isDark}
            />
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          variants={leftItem}
          style={{ opacity: 0.3, fontSize: 11.5, zIndex: 1, marginTop: 20 }}
        >
          © 2026 DermaHealth · All rights reserved
        </motion.div>
      </motion.div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div
        style={{
          width: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "28px 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <motion.div
          variants={formCard}
          initial="hidden"
          animate="visible"
          style={{ width: "100%", maxWidth: 400, position: "relative" }}
        >
          {/* Card glow pulse */}
          <motion.div
            style={{
              position: "absolute",
              inset: -2,
              borderRadius: 30,
              pointerEvents: "none",
              zIndex: -1,
            }}
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(93,169,234,0)",
                "0 0 0 4px rgba(93,169,234,0.15)",
                "0 0 0 0 rgba(93,169,234,0)",
              ],
            }}
            transition={{
              repeat: Infinity,
              duration: 3.8,
              ease: "easeInOut",
              repeatDelay: 2,
            }}
          />

          <div
            style={{
              padding: "38px 36px 30px",
              background: isDark
                ? "rgba(22,33,54,0.88)"
                : "rgba(255,255,255,0.86)",
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              borderRadius: 28,
              border: isDark
                ? "1px solid rgba(147,180,225,0.16)"
                : "1px solid rgba(255,255,255,0.92)",
              boxShadow: isDark
                ? "0 8px 32px rgba(0,0,0,0.32), 0 0 20px rgba(93,169,234,0.06)"
                : "0 4px 24px rgba(16,34,90,0.08), 0 1px 4px rgba(16,34,90,0.05), inset 0 1px 0 rgba(255,255,255,1)",
              transition: "all 0.7s ease",
            }}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5, ease: E_OUT }}
            >
              <div style={{ textAlign: "center", marginBottom: 26 }}>
                <Title
                  level={3}
                  style={{
                    marginBottom: 4,
                    color: isDark ? "#ffffff" : undefined,
                    background: isDark
                      ? "none"
                      : "linear-gradient(135deg, #071e35, #1a5494)",
                    WebkitBackgroundClip: isDark ? "unset" : "text",
                    WebkitTextFillColor: isDark ? "#ffffff" : "transparent",
                    fontWeight: 800,
                  }}
                >
                  Đăng nhập
                </Title>
                <Text
                  type="secondary"
                  style={{
                    fontSize: 13.5,
                    color: isDark ? "rgba(255,255,255,0.65)" : undefined,
                  }}
                >
                  Chào mừng trở lại! Vui lòng nhập thông tin của bạn.
                </Text>
              </div>
            </motion.div>

            {/* Form */}
            <Form<LoginFormValues>
              layout="vertical"
              onFinish={handleLogin}
              initialValues={{ remember: true }}
            >
              <motion.div variants={stagger} initial="hidden" animate="visible">
                {error && (
                  <motion.div variants={fadeUp}>
                    <Alert
                      type="error"
                      message={error}
                      showIcon
                      style={{ marginBottom: 16, borderRadius: 12 }}
                    />
                  </motion.div>
                )}
                {sessionExpired && !error && (
                  <motion.div variants={fadeUp}>
                    <Alert
                      type="info"
                      message="Phiên đăng nhập đã hết hạn"
                      description="Vui lòng đăng nhập lại. Sau đó hệ thống sẽ đưa bạn về màn hình đang làm việc."
                      showIcon
                      style={{ marginBottom: 16, borderRadius: 12 }}
                    />
                  </motion.div>
                )}

                <motion.div variants={fadeUp}>
                  <Form.Item
                    label={
                      <span
                        style={{
                          color: isDark ? "rgba(255,255,255,0.85)" : undefined,
                        }}
                      >
                        Email
                      </span>
                    }
                    name="email"
                    rules={[
                      { required: true, message: "Vui lòng nhập Email!" },
                      { type: "email", message: "Email không hợp lệ!" },
                    ]}
                  >
                    <Input
                      size="large"
                      placeholder="email@example.com"
                      style={{
                        borderRadius: 13,
                        padding: "11px 14px",
                        fontSize: 14,
                        background: isDark
                          ? "rgba(32,45,70,0.75)"
                          : "rgba(248,250,255,0.9)",
                        border: isDark
                          ? "1.5px solid rgba(147,180,225,0.22)"
                          : "1.5px solid rgba(16,34,90,0.11)",
                        color: isDark ? "#ffffff" : undefined,
                        transition: "all 0.7s ease",
                      }}
                    />
                  </Form.Item>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Form.Item
                    label={
                      <span
                        style={{
                          color: isDark ? "rgba(255,255,255,0.85)" : undefined,
                        }}
                      >
                        Mật khẩu
                      </span>
                    }
                    name="password"
                    rules={[
                      { required: true, message: "Vui lòng nhập mật khẩu!" },
                    ]}
                  >
                    <PasswordReveal
                      isDark={isDark}
                      lit={litChars}
                      cellRefs={charCellRefs}
                      renderInput={(p) => (
                          <Input.Password
                              {...p}
                            size="large"
                            placeholder="••••••••"
                            visibilityToggle={{ visible: false }}
                            iconRender={() =>
                              isDark ? (
                                <span
                                  ref={flashRef}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDark(false);
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transform: `rotate(${flashAngle}deg)`,
                                    transition: "transform 0.08s linear",
                                  }}
                                >
                                  <Flashlight
                                    size={16}
                                    style={{ color: "#5da9ea", cursor: "pointer" }}
                                  />
                                </span>
                              ) : (
                                <span
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDark(true);
                                  }}
                                >
                                  <Eye
                                    size={16}
                                    style={{ color: "#6b7280", cursor: "pointer" }}
                                  />
                                </span>
                              )
                            }
                            style={{
                              borderRadius: 13,
                              padding: "11px 14px",
                              fontSize: 14,
                              background: isDark
                                ? "rgba(32,45,70,0.75)"
                                : "rgba(248,250,255,0.9)",
                              border: isDark
                                ? "1.5px solid rgba(147,180,225,0.22)"
                                : "1.5px solid rgba(16,34,90,0.11)",
                              color: isDark ? "#ffffff" : undefined,
                              transition: "all 0.7s ease",
                            }}
                          />
                      )}
                    />
                  </Form.Item>
                </motion.div>

                <motion.div
                  variants={fadeUp}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 18,
                  }}
                >
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox
                      style={{
                        fontSize: 13,
                        color: isDark ? "rgba(255,255,255,0.85)" : undefined,
                      }}
                    >
                      Ghi nhớ đăng nhập
                    </Checkbox>
                  </Form.Item>
                  <motion.a
                    href="#"
                    style={{
                      color: isDark ? "#5da9ea" : "#1a5494",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                    whileHover={{ color: "#5da9ea" }}
                    onClick={(e) => {
                      e.preventDefault();
                      setForgotOpen(true);
                    }}
                  >
                    Quên mật khẩu?
                  </motion.a>
                </motion.div>

                {/* Submit with ripple */}
                <motion.div variants={fadeUp}>
                  <RippleButton>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.16 }}
                    >
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        size="large"
                        loading={loading}
                        icon={<ArrowRight size={16} />}
                        iconPosition="end"
                        style={{
                          height: 52,
                          borderRadius: 14,
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                          background:
                            "linear-gradient(135deg, #174d8a 0%, #071e35 100%)",
                          border: "none",
                          boxShadow: "0 4px 18px rgba(7,30,53,0.32)",
                          fontSize: 15,
                        }}
                      >
                        Đăng nhập
                      </Button>
                    </motion.div>
                  </RippleButton>
                </motion.div>
              </motion.div>
            </Form>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.5, ease: E_OUT, delay: 0.58 }}
              style={{ transformOrigin: "center" }}
            >
              <Divider
                plain
                style={{
                  fontSize: 12,
                  color: isDark ? "rgba(255,255,255,0.45)" : "#9ca3af",
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : undefined,
                  margin: "20px 0",
                }}
              >
                Hoặc tiếp tục với
              </Divider>
            </motion.div>

            {/* Social buttons — no y-lift, just scale + shadow */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.45, ease: E_OUT }}
              style={{ display: "flex", gap: 10 }}
            >
              <SocialBtn
                label="Google"
                isDark={isDark}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                }
              />
              <SocialBtn
                label="Apple"
                isDark={isDark}
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={isDark ? "#ffffff" : "#000000"}
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.67-.82 1.13-1.96.99-3.11-.97.04-2.15.65-2.85 1.46-.62.72-1.16 1.88-1.01 3 .1.01 2.2-.68 2.87-1.35z" />
                  </svg>
                }
              />
            </motion.div>

            {/* Register link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
            >
              <Text
                type="secondary"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: 22,
                  fontSize: 13.5,
                  color: isDark ? "rgba(255,255,255,0.6)" : undefined,
                }}
              >
                Chưa có tài khoản?{" "}
                <motion.a
                  href="/register"
                  style={{
                    color: isDark ? "#5da9ea" : "#1a5494",
                    fontWeight: 700,
                  }}
                  whileHover={{ color: "#5da9ea" }}
                  onClick={(e) => {
                    e.preventDefault();
                    nav("/register");
                  }}
                >
                  Đăng ký ngay →
                </motion.a>
              </Text>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
