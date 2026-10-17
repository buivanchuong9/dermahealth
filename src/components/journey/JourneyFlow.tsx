import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Check,
  ClipboardCheck,
  ClipboardList,
  FileSignature,
  FileText,
  HeartPulse,
  Lock,
  MapPin,
  Route,
  Sparkles,
  Stethoscope,
  Workflow,
} from 'lucide-react';
import { Typography } from 'antd';
import {
  MILESTONE_GUIDE,
  MILESTONE_SHORT,
  stepStateOf,
  type Milestone,
  type StepState,
} from '../../domain/journeyView';
import styles from './JourneyFlow.module.scss';

const { Text, Title, Paragraph } = Typography;

const MILESTONE_ICON: Record<string, ReactNode> = {
  intake: <ClipboardList size={22} />,
  ai: <Sparkles size={22} />,
  routing: <Route size={22} />,
  review: <Stethoscope size={22} />,
  diagnosis: <FileText size={22} />,
  plan: <ClipboardCheck size={22} />,
  workflow: <Workflow size={22} />,
  discharge: <FileSignature size={22} />,
  closed: <Lock size={22} />,
  post_visit: <HeartPulse size={22} />,
};

// Geometry of the circular track, in percent of its square container.
const RADIUS = 34;
const WALK_STEP_MS = 520;
const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/** Node i sits on the circle, step 1 at the top, clockwise. Angles are in
 * screen coordinates (y grows downwards), so increasing angle = clockwise. */
function pointOnCircle(index: number, total: number) {
  const angle = ((-90 + (360 / total) * index) * Math.PI) / 180;
  return {
    x: 50 + RADIUS * Math.cos(angle),
    y: 50 + RADIUS * Math.sin(angle),
    cos: Math.cos(angle),
    sin: Math.sin(angle),
  };
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

interface FlowProps {
  milestones: Milestone[];
  currentIndex: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Real overall progress (0-100) shown in the centre dial. */
  percent: number;
  /** Live, API-backed status label of the encounter. */
  statusLabel: string;
  /** Shown on the walking token: photo if available, otherwise the initial. */
  avatarUrl?: string;
  initial: string;
}

/** Ten steps around a circle with a progress dial in the middle. A token walks
 * node to node up to the real current step; steps light up as it passes. */
export function JourneyFlow({
  milestones,
  currentIndex,
  selectedIndex,
  onSelect,
  percent,
  statusLabel,
  avatarUrl,
  initial,
}: FlowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [tokenPos, setTokenPos] = useState<{ x: number; y: number }>();
  const [walkState, setWalkState] = useState(0);
  const total = milestones.length;
  // Never ahead of the real step (the encounter can move backwards).
  const walk = currentIndex < 0 ? 0 : Math.min(walkState, currentIndex);
  const arrived = currentIndex >= 0 && walk === currentIndex;

  // Walk the token forward one step at a time up to the real current step.
  useEffect(() => {
    if (currentIndex < 0 || walk >= currentIndex) return;
    const timer = window.setTimeout(
      () => setWalkState(walk + 1),
      prefersReducedMotion() ? 0 : WALK_STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [walk, currentIndex]);

  // Measure the real node position so the token follows the layout at any size.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || currentIndex < 0) return;
    const measure = () => {
      const node = nodeRefs.current[walk];
      if (!node) return;
      const t = track.getBoundingClientRect();
      const n = node.getBoundingClientRect();
      setTokenPos({ x: n.left - t.left + n.width / 2, y: n.top - t.top });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [walk, currentIndex]);

  const current = currentIndex >= 0 ? milestones[currentIndex] : undefined;

  return (
    <div className={styles.stage}>
      <div className={styles.track} ref={trackRef}>
        <svg className={styles.svg} viewBox="0 0 100 100" aria-hidden>
          <defs>
            <linearGradient id="journeyDone" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="journeyDial" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>

          <circle cx="50" cy="50" r={RADIUS - 11} className={styles.ringSoft} />
          <circle cx="50" cy="50" r={RADIUS + 9} className={styles.ringSoft} />

          {/* base track + progress: one arc between each pair of neighbours */}
          {milestones.slice(0, -1).map((milestone, i) => {
            const a = pointOnCircle(i, total);
            const b = pointOnCircle(i + 1, total);
            const d = `M ${a.x} ${a.y} A ${RADIUS} ${RADIUS} 0 0 1 ${b.x} ${b.y}`;
            const done = currentIndex >= 0 && i < walk;
            const active = arrived && i === currentIndex;
            return (
              <g key={milestone.key}>
                <path d={d} pathLength={100} className={styles.seg} />
                {done && <path d={d} pathLength={100} className={styles.segDone} />}
                {active && <path d={d} pathLength={100} className={styles.segActive} />}
              </g>
            );
          })}

          {/* centre progress dial */}
          <circle cx="50" cy="50" r="19" className={styles.dialBase} />
          <circle
            cx="50"
            cy="50"
            r="19"
            pathLength={100}
            className={styles.dialValue}
            style={{ strokeDasharray: `${Math.max(0, Math.min(100, percent))} 100` }}
            transform="rotate(-90 50 50)"
          />
        </svg>

        <div className={styles.center}>
          <span className={styles.percent}>
            {percent}
            <small>%</small>
          </span>
          <span className={styles.centerCaption}>
            {current ? `Bước ${currentIndex + 1}/${total}` : 'Cần chú ý'}
          </span>
          <span className={styles.centerTitle}>{current ? current.label : statusLabel}</span>
        </div>

        {milestones.map((milestone, index) => {
          const state = stepStateOf(index, currentIndex < 0 ? -1 : walk);
          const p = pointOnCircle(index, total);
          const classes = [
            styles.cell,
            state === 'done' ? styles.done : state === 'current' ? styles.current : styles.upcoming,
            index === selectedIndex ? styles.selected : '',
          ].join(' ');
          const vars = {
            '--x': `${p.x}%`,
            '--y': `${p.y}%`,
            '--cx': p.cos.toFixed(3),
            '--cy': p.sin.toFixed(3),
          } as CSSProperties;
          return (
            <div key={milestone.key} className={classes} style={vars}>
              <button
                type="button"
                className={styles.node}
                ref={(el) => {
                  nodeRefs.current[index] = el;
                }}
                onClick={() => onSelect(index)}
                aria-label={`Bước ${index + 1}: ${milestone.label}`}
                aria-current={state === 'current' && arrived ? 'step' : undefined}
              >
                {state === 'current' && <span className={styles.aura} aria-hidden />}
                {state === 'done' && (
                  <span className={styles.sparks} aria-hidden>
                    {SPARK_ANGLES.map((angle) => (
                      <span key={angle} className={styles.spark} style={{ '--a': `${angle}deg` } as CSSProperties} />
                    ))}
                  </span>
                )}
                {state === 'done' ? (
                  <Check size={22} strokeWidth={3} />
                ) : state === 'upcoming' ? (
                  <Lock size={16} />
                ) : (
                  index + 1
                )}
              </button>
              <button type="button" className={styles.label} onClick={() => onSelect(index)}>
                {MILESTONE_SHORT[milestone.key] ?? milestone.label}
              </button>
            </div>
          );
        })}

        {tokenPos && currentIndex >= 0 && (
          <div className={styles.token} style={{ left: tokenPos.x, top: tokenPos.y }} aria-hidden>
            <span className={styles.shadow} />
            <span key={walk} className={styles.hop}>
              <span className={styles.bob}>
                <span className={styles.pin}>
                  <span className={styles.pinFace}>
                    {avatarUrl ? <img src={avatarUrl} alt="" /> : initial}
                  </span>
                </span>
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export interface StepTask {
  id: string;
  name: string;
  department: string;
  statusLabel: string;
}

interface DetailProps {
  milestone: Milestone;
  state: StepState;
  index: number;
  total: number;
  currentStatusLabel: string;
  /** Real department/room of the encounter, shown only while this step is active. */
  livePlace?: string;
  /** Real workflow tasks, listed on the operational step. */
  tasks?: StepTask[];
  /** Extra real facts for the active step (queue number, current task...). */
  facts?: ReactNode;
}

const STATE_LABEL: Record<StepState, string> = {
  done: 'Đã hoàn thành',
  current: 'Đang diễn ra',
  upcoming: 'Sắp tới',
};

export function JourneyStepDetail({
  milestone,
  state,
  index,
  total,
  currentStatusLabel,
  livePlace,
  tasks,
  facts,
}: DetailProps) {
  const guide = MILESTONE_GUIDE[milestone.key];
  const headClass =
    state === 'done' ? styles.headDone : state === 'upcoming' ? styles.headIdle : '';
  return (
    <div>
      <div className={`${styles.detailHead} ${headClass}`}>
        <span className={styles.detailIcon}>
          {state === 'done' ? <Check size={24} strokeWidth={3} /> : MILESTONE_ICON[milestone.key]}
        </span>
        <div style={{ minWidth: 0 }}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
            Bước {index + 1}/{total} · {STATE_LABEL[state]}
          </Text>
          <Title level={5} style={{ margin: 0, color: '#fff' }}>
            {milestone.label}
          </Title>
        </div>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {state === 'current' && (
          <div>
            <span className={styles.sectionLabel}>Tình trạng hiện tại</span>
            <Text strong style={{ color: 'var(--medical-blue-700)' }}>
              {currentStatusLabel}
            </Text>
          </div>
        )}

        {guide && (
          <>
            <div>
              <span className={styles.sectionLabel}>Bước này là gì?</span>
              <Paragraph style={{ margin: 0, color: 'var(--text-primary)' }}>
                {guide.whatHappens}
              </Paragraph>
            </div>

            <div>
              <span className={styles.sectionLabel}>Thực hiện ở đâu?</span>
              <div className={styles.place}>
                {livePlace && (
                  <div className={styles.placeLive}>
                    <MapPin size={16} /> {livePlace}
                  </div>
                )}
                <div className={styles.placeRow}>
                  {!livePlace && (
                    <MapPin size={16} style={{ marginTop: 3, flexShrink: 0, color: 'var(--medical-blue-700)' }} />
                  )}
                  <span>{guide.where}</span>
                </div>
                {tasks && tasks.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    {tasks.map((task) => (
                      <div key={task.id} className={styles.taskRow}>
                        <span>
                          <Text strong>{task.name}</Text>
                          {task.department && (
                            <Text type="secondary"> · {task.department}</Text>
                          )}
                        </span>
                        <Text type="secondary">{task.statusLabel}</Text>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <span className={styles.sectionLabel}>
                {state === 'done' ? 'Bạn đã cần làm' : 'Bạn cần làm gì?'}
              </span>
              <ul className={styles.todo}>
                {guide.patientActions.map((action) => (
                  <li key={action} className={styles.todoItem}>
                    <Check
                      size={16}
                      style={{ marginTop: 2, flexShrink: 0, color: 'var(--medical-blue-700)' }}
                    />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {state === 'current' && facts}
      </div>
    </div>
  );
}
