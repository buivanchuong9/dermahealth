import { useMemo } from 'react';
import { Tag, Tooltip, Typography } from 'antd';
import { Info } from 'lucide-react';
import Highcharts, { HighchartsReact } from '../../charts/highchartsSetup';
import type {
  ImageQualityAssessment,
  LesionObservation,
} from '../../domain/skinProgress';
import styles from './DermaTimeline.module.scss';

const { Text } = Typography;

// Fixed status palette (good/warning/critical) — never themed, matches the
// GOOD/FAIR/POOR tiers already used elsewhere for registrationQuality, so a
// score's color means the same thing everywhere in this feature.
const STATUS_GOOD = '#0ca30c';
const STATUS_WARNING = '#fab219';
const STATUS_CRITICAL = '#d03b3b';
const STATUS_MUTED = '#94a3b8';

const qualityColor = (score: number | null) => {
  if (score === null) return STATUS_MUTED;
  if (score >= 80) return STATUS_GOOD;
  if (score >= 60) return STATUS_WARNING;
  return STATUS_CRITICAL;
};

export function QualityGaugeChart({
  score,
  compact = false,
}: {
  score: number | null;
  compact?: boolean;
}) {
  const size = compact ? 96 : 116;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = score !== null 
    ? circumference - (score / 100) * circumference
    : circumference;

  const color = qualityColor(score);

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: compact ? '22px' : '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
          {score ?? '—'}
        </div>
        <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8', marginTop: 2 }}>/100</div>
      </div>
    </div>
  );
}

const DIMENSION_STATUS_LABEL = {
  good: 'Tốt',
  warning: 'Cần lưu ý',
  critical: 'Không đạt',
  unavailable: 'Chưa đo được',
} as const;

const DIMENSION_STATUS_TAG_COLOR = {
  good: 'green',
  warning: 'gold',
  critical: 'red',
  unavailable: 'default',
} as const;

function dimensionStatus(score: number | null): keyof typeof DIMENSION_STATUS_LABEL {
  if (score === null) return 'unavailable';
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'critical';
}

/** Registration doesn't produce a 0-100 score today — GOOD/FAIR/POOR is
 * mapped onto the same three-tier status bucket the numeric dimensions use,
 * purely for a consistent bar/label, never presented as the real score. */
const REGISTRATION_STATUS_SCORE: Record<ImageQualityAssessment['registrationQuality'], number | null> = {
  GOOD: 92,
  FAIR: 65,
  POOR: 25,
  UNAVAILABLE: null,
};

export function QualityDimensionsChart({
  quality,
}: {
  quality: ImageQualityAssessment;
}) {
  // Fixed four-dimension structure the clinical-quality card always shows,
  // regardless of which pipeline detectors are wired up yet — angleConsistency
  // and occlusion have no detector today (see comparison.py) so they're
  // intentionally not part of this list rather than shown as empty bars.
  const dimensions = useMemo(
    () => [
      {
        key: 'sharpness',
        label: 'Độ nét',
        value: quality.sharpness,
        help: 'Ảnh có đủ nét để nhìn rõ ranh giới tổn thương hay không.',
      },
      {
        key: 'lighting',
        label: 'Ánh sáng',
        value: quality.lightingConsistency,
        help: 'Ánh sáng giữa hai lần chụp có đồng nhất hay không.',
      },
      {
        key: 'scale',
        label: 'Tỷ lệ / khoảng cách',
        value: quality.scaleConsistency,
        help: 'Khoảng cách và tỷ lệ chụp giữa hai ảnh có giống nhau hay không.',
      },
      {
        key: 'registration',
        label: 'Đăng ký ảnh',
        value: REGISTRATION_STATUS_SCORE[quality.registrationQuality],
        help: 'Hai ảnh có được căn chỉnh về cùng một hệ tọa độ để so sánh trực tiếp hay không.',
      },
    ],
    [quality],
  );

  return (
    <div className={styles.qualityDimensions}>
      {dimensions.map((dimension) => {
        const status = dimensionStatus(dimension.value);
        return (
          <div key={dimension.key} className={styles.qualityDimensionRow}>
            <Tooltip title={dimension.help}>
              <span className={styles.qualityDimensionLabel}>
                {dimension.label} <Info size={12} />
              </span>
            </Tooltip>
            <div className={styles.qualityDimensionTrack}>
              <div
                className={styles.qualityDimensionFill}
                style={{ width: `${dimension.value ?? 0}%`, background: qualityColor(dimension.value) }}
              />
            </div>
            <Text type="secondary" className={styles.qualityDimensionValue}>
              {dimension.value === null ? '—' : `${dimension.value}/100`}
            </Text>
            <Tag color={DIMENSION_STATUS_TAG_COLOR[status]}>{DIMENSION_STATUS_LABEL[status]}</Tag>
          </div>
        );
      })}
    </div>
  );
}

export function SymptomTrendChart({
  observations,
}: {
  observations: LesionObservation[];
}) {
  const points = useMemo(
    () =>
      [...observations]
        .filter((item) => Number.isFinite(Date.parse(item.capturedAt)))
        .sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt)),
    [observations],
  );
  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: { type: 'spline', height: 228, spacing: [10, 8, 4, 4] },
      accessibility: {
        description: 'Diễn biến các triệu chứng bệnh nhân tự đánh giá theo thời gian.',
      },
      xAxis: {
        categories: points.map((item) =>
          new Date(item.capturedAt).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
          }),
        ),
        tickLength: 0,
      },
      yAxis: {
        min: 0,
        max: 10,
        tickPositions: [0, 2, 4, 6, 8, 10],
        title: { text: 'Mức độ (0–10)' },
      },
      tooltip: { shared: true, valueSuffix: '/10' },
      legend: {
        align: 'left',
        verticalAlign: 'top',
        itemDistance: 16,
        symbolRadius: 6,
      },
      plotOptions: {
        series: {
          lineWidth: 2,
          marker: { enabled: true, radius: 3, symbol: 'circle' },
          connectNulls: false,
        },
      },
      series: [
        {
          type: 'spline',
          name: 'Ngứa',
          color: '#2878c8',
          data: points.map((item) => item.itchScore ?? null),
        },
        {
          type: 'spline',
          name: 'Đau',
          color: '#c83e4d',
          data: points.map((item) => item.painScore ?? null),
        },
        {
          type: 'spline',
          name: 'Nóng rát',
          color: '#b7791f',
          data: points.map((item) => item.burningScore ?? null),
        },
      ],
    }),
    [points],
  );

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
