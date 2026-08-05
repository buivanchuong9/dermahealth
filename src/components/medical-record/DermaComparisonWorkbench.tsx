import { memo, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { Alert, Button, Empty, Segmented, Select, Slider, Space, Tag, Tooltip, Typography } from 'antd';
import { BrainCircuit, Expand, Layers3, RotateCcw, ScanLine, ZoomIn, ZoomOut } from 'lucide-react';
import type { ComparisonAnalysis, LesionObservation } from '../../domain/skinProgress';
import { isRegisteredProgressAnalysis, isSimulatedAnalysis } from '../../domain/skinProgress';
import { dermaTimelineFlags } from './useDermaTimeline';
import styles from './DermaTimeline.module.scss';

const { Text } = Typography;
type ViewMode =
  | 'side'
  | 'slider'
  | 'overlay'
  | 'baselineMask'
  | 'targetMask'
  | 'difference'
  | 'baselineAttention'
  | 'targetAttention';

const originalSource = (observation: LesionObservation) =>
  observation.imageAssets.find((asset) => asset.type === 'ORIGINAL')?.protectedUrl;

const alignedSource = (observation: LesionObservation) =>
  observation.imageAssets.find((asset) => asset.type === 'ALIGNED')?.protectedUrl;

// .at(-1), not .find(): imageAssets is ordered oldest-first, and a MASK type
// can have multiple rows once a clinician confirms/corrects the AI proposal
// (lesion_image_assets is append-only — a correction is always a new row).
// The most recently created row for a type is always the authoritative one.
const derivedAsset = (observation: LesionObservation, type: 'MASK' | 'DIFFERENCE_MAP' | 'HEATMAP') =>
  observation.imageAssets.filter((asset) => asset.type === type).at(-1);
const derivedSource = (observation: LesionObservation, type: 'MASK' | 'DIFFERENCE_MAP' | 'HEATMAP') =>
  derivedAsset(observation, type)?.protectedUrl;

const MASK_PROVENANCE_LABEL: Record<string, string> = {
  CLINICIAN_DRAWN: 'Mask do bác sĩ vẽ',
  CLINICIAN_CORRECTED: 'Mask đã được bác sĩ chỉnh sửa',
  CLINICIAN_CONFIRMED: 'Mask AI đề xuất, đã được bác sĩ xác nhận',
};

export const ComparisonWorkbench = memo(function ComparisonWorkbench({
  baseline,
  target,
  analysis,
  evidenceMode,
  onCorrectMask,
}: {
  baseline: LesionObservation;
  target: LesionObservation;
  analysis?: ComparisonAnalysis | null;
  evidenceMode?: 'difference' | 'mask';
  /** Doctor-only. Omit to hide the confirm/correct action entirely (e.g. patient view). */
  onCorrectMask?: (asset: { id: string; side: 'baseline' | 'target' }) => void;
}) {
  const [mode, setMode] = useState<ViewMode>(
    evidenceMode === 'difference' ? 'difference' : evidenceMode === 'mask' ? 'targetMask' : 'side',
  );
  const [sliderPosition, setSliderPosition] = useState(50);
  const [overlayOpacity, setOverlayOpacity] = useState(55);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [broken, setBroken] = useState<string[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);

  const baselineUrl = originalSource(baseline);
  const targetUrl = originalSource(target);
  const registeredProgress = isRegisteredProgressAnalysis(analysis);
  const registeredBaselineUrl = registeredProgress ? alignedSource(baseline) : undefined;
  const registeredTargetUrl = registeredProgress ? alignedSource(target) : undefined;
  const hasRegisteredPair = Boolean(registeredBaselineUrl && registeredTargetUrl);
  const differenceUrl = dermaTimelineFlags.heatmapEnabled && registeredProgress
    ? derivedSource(target, 'DIFFERENCE_MAP')
    : undefined;
  const baselineMaskAsset = dermaTimelineFlags.heatmapEnabled && registeredProgress
    ? derivedAsset(baseline, 'MASK')
    : undefined;
  const targetMaskAsset = dermaTimelineFlags.heatmapEnabled && registeredProgress
    ? derivedAsset(target, 'MASK')
    : undefined;
  const baselineMaskUrl = baselineMaskAsset?.protectedUrl;
  const targetMaskUrl = targetMaskAsset?.protectedUrl;
  const baselineAttentionUrl = derivedSource(baseline, 'HEATMAP');
  const targetAttentionUrl = derivedSource(target, 'HEATMAP');
  const transform = useMemo(
    () => `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
    [pan, zoom],
  );
  const poorQuality = analysis?.quality.registrationQuality === 'POOR';
  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSliderPosition(50);
    setOverlayOpacity(55);
  };
  const updateZoom = (next: number) => setZoom(Math.min(4, Math.max(1, next)));
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2));
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.originX + event.clientX - drag.current.x,
      y: drag.current.originY + event.clientY - drag.current.y,
    });
  };
  const onPointerUp = () => { drag.current = null; };
  const markBroken = (source?: string) => {
    if (source) setBroken((current) => current.includes(source) ? current : [...current, source]);
  };
  const image = (source: string | null | undefined, label: string, className?: string) =>
    source && !broken.includes(source) ? (
      <img
        src={source}
        alt={label}
        className={className}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => markBroken(source)}
      />
    ) : <Empty className={styles.imageUnavailable} description={`${label} không khả dụng`} />;

  return (
    <section className={styles.workbench} aria-label="Bàn so sánh hình ảnh tổn thương">
      <div className={styles.workbenchToolbar}>
        <div className={styles.workbenchModes}>
          <Segmented
            value={['side', 'slider', 'overlay'].includes(mode) ? mode : 'side'}
            onChange={(value) => setMode(value as ViewMode)}
            options={[
              { label: 'Song song', value: 'side' },
              { label: 'Thanh trượt', value: 'slider', disabled: !hasRegisteredPair },
              { label: 'Chồng ảnh', value: 'overlay', disabled: !hasRegisteredPair },
            ]}
            aria-label="Chế độ xem so sánh"
          />
          <Select
            aria-label="Lớp bằng chứng hình ảnh"
            className={styles.evidenceLayerSelect}
            value={['baselineMask', 'targetMask', 'difference', 'baselineAttention', 'targetAttention'].includes(mode) ? mode : 'none'}
            onChange={(value) => setMode(value === 'none' ? 'side' : value as ViewMode)}
            options={[
              { value: 'none', label: 'Lớp bằng chứng' },
              { value: 'baselineMask', label: 'Mask · ảnh ban đầu', disabled: !baselineMaskUrl || !hasRegisteredPair },
              { value: 'targetMask', label: 'Mask · ảnh hiện tại', disabled: !targetMaskUrl || !hasRegisteredPair },
              { value: 'difference', label: 'Heatmap thay đổi tổn thương', disabled: !differenceUrl || !hasRegisteredPair },
              { value: 'baselineAttention', label: 'Grad-CAM · ảnh ban đầu', disabled: !baselineAttentionUrl },
              { value: 'targetAttention', label: 'Grad-CAM · ảnh hiện tại', disabled: !targetAttentionUrl },
            ]}
          />
        </div>
        <Space size={4} wrap>
          {isSimulatedAnalysis(analysis) && (
            <Tag color="purple" data-testid="simulated-analysis-badge">
              Mô phỏng (demo) — không phải AI lâm sàng thật
            </Tag>
          )}
          <Tooltip title="Thu nhỏ"><Button aria-label="Thu nhỏ ảnh" icon={<ZoomOut size={15} />} disabled={zoom <= 1} onClick={() => updateZoom(zoom - 0.25)} /></Tooltip>
          <Tag>{Math.round(zoom * 100)}%</Tag>
          <Tooltip title="Phóng to"><Button aria-label="Phóng to ảnh" icon={<ZoomIn size={15} />} disabled={zoom >= 4} onClick={() => updateZoom(zoom + 0.25)} /></Tooltip>
          <Tooltip title="Đặt lại khung nhìn"><Button aria-label="Đặt lại khung nhìn" icon={<RotateCcw size={15} />} onClick={reset} /></Tooltip>
          <Tooltip title="Toàn màn hình"><Button aria-label="Mở toàn màn hình" icon={<Expand size={15} />} onClick={() => void stageRef.current?.requestFullscreen()} /></Tooltip>
        </Space>
      </div>

      {poorQuality && (
        <Alert type="warning" showIcon message="Hai ảnh khác biệt đáng kể về góc, tỷ lệ, ánh sáng hoặc vị trí. Cần thận trọng khi diễn giải kết quả." />
      )}

      {!hasRegisteredPair && (
        <Alert
          type="info"
          showIcon
          message="Chỉ hiển thị song song"
          description={analysis && !registeredProgress
            ? 'Kết quả cũ không có provenance căn chỉnh và mask hợp lệ nên các lớp tiến triển đã bị khóa. Hãy chạy lại bằng pipeline hiện tại.'
            : 'Backend chưa cung cấp cặp ảnh đã đăng ký cùng hệ tọa độ; thanh trượt và chồng ảnh được khóa để tránh diễn giải sai lệch.'}
        />
      )}

      <div
        ref={stageRef}
        className={`${styles.comparisonStage} ${zoom > 1 ? styles.stagePannable : ''}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        tabIndex={0}
        role="application"
        aria-label="Ảnh so sánh; cuộn để zoom, kéo để di chuyển khi đã zoom"
        onKeyDown={(event) => {
          if (mode === 'slider' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
            setSliderPosition((value) => Math.min(100, Math.max(0, value + (event.key === 'ArrowRight' ? 2 : -2))));
          }
        }}
      >
        {mode === 'side' && (
          <div className={styles.sideBySide}>
            <figure><div style={{ transform }}>{image(baselineUrl, 'Ảnh mốc ban đầu')}</div><figcaption>Mốc · {new Date(baseline.capturedAt).toLocaleDateString('vi-VN')}</figcaption></figure>
            <figure><div style={{ transform }}>{image(targetUrl, 'Ảnh theo dõi hiện tại')}</div><figcaption>Hiện tại · {new Date(target.capturedAt).toLocaleDateString('vi-VN')}</figcaption></figure>
          </div>
        )}
        {mode !== 'side' && (
          <div className={styles.layeredImages} style={{ transform }}>
            {image(registeredBaselineUrl, 'Ảnh mốc đã đăng ký')}
            {mode === 'slider' && <div className={styles.clippedLayer} style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}>{image(registeredTargetUrl, 'Ảnh hiện tại đã đăng ký')}</div>}
            {mode === 'overlay' && <div className={styles.opacityLayer} style={{ opacity: overlayOpacity / 100 }}>{image(registeredTargetUrl, 'Ảnh hiện tại đã đăng ký')}</div>}
            {mode === 'baselineMask' && <><div className={styles.opacityLayer} style={{ opacity: 0.72 }}>{image(registeredBaselineUrl, 'Ảnh ban đầu đã đăng ký')}</div>{image(baselineMaskUrl, 'Mask đề xuất ảnh ban đầu', styles.derivedLayer)}</>}
            {mode === 'targetMask' && <><div className={styles.opacityLayer} style={{ opacity: 0.72 }}>{image(registeredTargetUrl, 'Ảnh hiện tại đã đăng ký')}</div>{image(targetMaskUrl, 'Mask đề xuất ảnh hiện tại', styles.derivedLayer)}</>}
            {mode === 'difference' && <><div className={styles.opacityLayer} style={{ opacity: 0.55 }}>{image(registeredTargetUrl, 'Ảnh hiện tại đã đăng ký')}</div>{image(differenceUrl, 'Heatmap thay đổi tổn thương', styles.derivedLayer)}</>}
            {mode === 'baselineAttention' && <><div className={styles.opacityLayer} style={{ opacity: 0.72 }}>{image(baselineUrl, 'Ảnh ban đầu')}</div>{image(baselineAttentionUrl, 'Grad-CAM ảnh ban đầu', styles.derivedLayer)}</>}
            {mode === 'targetAttention' && <><div className={styles.opacityLayer} style={{ opacity: 0.72 }}>{image(targetUrl, 'Ảnh hiện tại')}</div>{image(targetAttentionUrl, 'Grad-CAM ảnh hiện tại', styles.derivedLayer)}</>}
            {mode === 'slider' && <span className={styles.sliderDivider} style={{ left: `${sliderPosition}%` }} aria-hidden="true" />}
          </div>
        )}
        <div className={styles.stageLabels}><Tag>MỐC</Tag><Tag color="blue">HIỆN TẠI</Tag></div>
      </div>

      <div className={styles.viewerControls}>
        {mode === 'slider' && <label><Text>Vị trí thanh trượt</Text><Slider value={sliderPosition} onChange={setSliderPosition} aria-label="Vị trí thanh so sánh" /></label>}
        {mode === 'overlay' && <label><Text>Độ mờ ảnh hiện tại</Text><Slider value={overlayOpacity} onChange={setOverlayOpacity} aria-label="Độ mờ ảnh chồng" /></label>}
        {mode === 'difference' && (
          <div className={styles.differenceLegend}>
            <Text strong><ScanLine size={14} /> Heatmap thay đổi:</Text>
            <span className={styles.legendReduced}>Giảm</span>
            <span className={styles.legendPersistent}>Còn tồn tại</span>
            <span className={styles.legendExpanded}>Mới / lan rộng</span>
            <span className={styles.legendUncertain}>Chưa chắc chắn</span>
          </div>
        )}
        {(mode === 'baselineMask' || mode === 'targetMask') && (() => {
          const asset = mode === 'baselineMask' ? baselineMaskAsset : targetMaskAsset;
          const provenance = asset?.maskProvenance;
          return (
            <Space wrap>
              <Text type="secondary">
                <Layers3 size={14} /> {provenance && provenance !== 'MODEL_PROPOSED' ? MASK_PROVENANCE_LABEL[provenance] : 'Mask đề xuất bán tự động · cần bác sĩ xác nhận'}
              </Text>
              {onCorrectMask && asset && (
                <Button
                  size="small"
                  onClick={() => onCorrectMask({ id: asset.id, side: mode === 'baselineMask' ? 'baseline' : 'target' })}
                >
                  {provenance && provenance !== 'MODEL_PROPOSED' ? 'Chỉnh sửa lại mask' : 'Xác nhận / chỉnh sửa mask'}
                </Button>
              )}
            </Space>
          );
        })()}
        {(mode === 'baselineAttention' || mode === 'targetAttention') && (
          <Text type="secondary"><BrainCircuit size={14} /> Vùng mô hình phân loại chú ý · không phải bản đồ tiến triển</Text>
        )}
        {!differenceUrl && <Text type="secondary"><ScanLine size={13} /> Heatmap thay đổi cần cặp ảnh đã căn chỉnh và hai mask hợp lệ</Text>}
      </div>
    </section>
  );
});
