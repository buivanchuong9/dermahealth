import { useMemo } from 'react';
import Highcharts, { HighchartsReact } from '../../charts/highchartsSetup';
import type {
  ImageQualityAssessment,
  LesionObservation,
} from '../../domain/skinProgress';

const qualityColor = (score: number | null) => {
  if (score === null) return '#94a3b8';
  if (score >= 80) return '#16835f';
  if (score >= 60) return '#b7791f';
  return '#c83e4d';
};

export function QualityGaugeChart({
  score,
  compact = false,
}: {
  score: number | null;
  compact?: boolean;
}) {
  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: 'solidgauge',
        height: compact ? 118 : 142,
        spacing: [0, 0, 0, 0],
        animation: false,
      },
      accessibility: {
        description: `Điểm khả năng so sánh ảnh ${score ?? 'chưa khả dụng'} trên 100`,
      },
      pane: {
        center: ['50%', '72%'],
        size: '132%',
        startAngle: -90,
        endAngle: 90,
        background: {
          backgroundColor: '#e8eef3',
          borderWidth: 0,
          innerRadius: '68%',
          outerRadius: '100%',
          shape: 'arc',
        },
      },
      tooltip: { enabled: false },
      yAxis: {
        min: 0,
        max: 100,
        lineWidth: 0,
        tickPositions: [],
        stops: [
          [0.59, '#c83e4d'],
          [0.79, '#b7791f'],
          [1, '#16835f'],
        ],
      },
      plotOptions: {
        solidgauge: {
          rounded: true,
          linecap: 'round',
          dataLabels: {
            y: compact ? -15 : -20,
            borderWidth: 0,
            useHTML: true,
            format:
              '<div style="text-align:center"><span style="font-size:26px;font-weight:750;color:#172033">{y}</span><span style="font-size:12px;color:#8792a2">/100</span></div>',
          },
        },
      },
      series: [
        {
          type: 'solidgauge',
          name: 'Khả năng so sánh',
          data: score === null ? [] : [{ y: score, color: qualityColor(score) }],
        },
      ],
    }),
    [compact, score],
  );

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export function QualityDimensionsChart({
  quality,
}: {
  quality: ImageQualityAssessment;
}) {
  const dimensions = useMemo(
    () => [
      { label: 'Độ nét', value: quality.sharpness },
      { label: 'Ánh sáng', value: quality.lightingConsistency },
      { label: 'Góc chụp', value: quality.angleConsistency },
      { label: 'Khoảng cách', value: quality.scaleConsistency },
      {
        label: 'Không che khuất',
        value: quality.occlusion === null ? null : 100 - quality.occlusion,
      },
    ],
    [quality],
  );
  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: { type: 'bar', height: 176, spacing: [2, 6, 2, 0] },
      accessibility: {
        description: 'Các tiêu chí kỹ thuật dùng để đánh giá khả năng so sánh hai ảnh.',
      },
      xAxis: {
        categories: dimensions.map((item) => item.label),
        lineWidth: 0,
        tickWidth: 0,
        labels: { style: { color: '#475569', fontSize: '11px' } },
      },
      yAxis: {
        min: 0,
        max: 100,
        tickPositions: [0, 50, 100],
        gridLineWidth: 0,
        labels: { enabled: false },
      },
      legend: { enabled: false },
      tooltip: {
        pointFormat: '<b>{point.y}/100</b>',
      },
      plotOptions: {
        series: {
          borderWidth: 0,
          borderRadius: 6,
          pointWidth: 7,
          groupPadding: 0.12,
          dataLabels: {
            enabled: true,
            align: 'right',
            inside: false,
            format: '{y}',
            style: { color: '#64748b', fontSize: '10px', textOutline: 'none' },
          },
        },
      },
      series: [
        {
          type: 'bar',
          name: 'Điểm kỹ thuật',
          color: '#16835f',
          data: dimensions.map((item) => item.value),
        },
      ],
    }),
    [dimensions],
  );

  return <HighchartsReact highcharts={Highcharts} options={options} />;
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
