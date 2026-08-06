import { memo, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { Alert, Button, Empty, Segmented, Slider, Space, Tag, Tooltip, Typography } from 'antd';
import { BrainCircuit, Expand, Layers3, RotateCcw, ScanLine, ZoomIn, ZoomOut } from 'lucide-react';
import type { ComparisonAnalysis, LesionObservation } from '../../domain/skinProgress';
import {
  canUseOverlay,
  canUseSlider,
  canViewBaselineGradCam,
  canViewBaselineMask,
  canViewBothGradCam,
  canViewBothMasks,
  canViewDifferenceMap,
  canViewFollowUpGradCam,
  canViewFollowUpMask,
  isPairRegistered,
  isRegisteredProgressAnalysis,
  isSimulatedAnalysis,
  latestImageAsset,
} from '../../domain/skinProgress';
import { dermaTimelineFlags } from './useDermaTimeline';
import styles from './DermaTimeline.module.scss';

const { Text } = Typography;
export type ViewMode =
  | 'side'
  | 'slider'
  | 'overlay'
  | 'bothMask'
  | 'bothAttention'
  | 'baselineMask'
  | 'targetMask'
  | 'difference'
  | 'baselineAttention'
  | 'targetAttention';

const DUAL_MASK_MODES: ViewMode[] = ['bothMask', 'baselineMask', 'targetMask'];
const DUAL_ATTENTION_MODES: ViewMode[] = ['bothAttention', 'baselineAttention', 'targetAttention'];

const originalSource = (observation: LesionObservation) =>
  observation.imageAssets.find((asset) => asset.type === 'ORIGINAL')?.protectedUrl;

const alignedSource = (observation: LesionObservation) =>
  latestImageAsset(observation, 'ALIGNED')?.protectedUrl;

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
  onReanalyze,
  reanalyzing,
}: {
  baseline: LesionObservation;
  target: LesionObservation;
  analysis?: ComparisonAnalysis | null;
  /** Jump target from outside (e.g. ExplainabilityPanel's evidence rows or a
   * metric's OVERLAY link). The caller is responsible for only requesting a
   * mode whose capability check already passes — DermaTimeline.tsx remounts
   * this component (via a `key` including evidenceMode) whenever it changes,
   * so this only needs to seed the initial mode, never sync mid-life. */
  evidenceMode?: ViewMode;
  /** Doctor-only. Omit to hide the confirm/correct action entirely (e.g. patient view). */
  onCorrectMask?: (asset: { id: string; side: 'baseline' | 'target' }) => void;
  /** Omit to hide the "re-run with current pipeline" action (e.g. patient view). */
  onReanalyze?: () => void;
  reanalyzing?: boolean;
}) {
  const [mode, setMode] = useState<ViewMode>(evidenceMode ?? 'side');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [overlayOpacity, setOverlayOpacity] = useState(55);
  const [derivedOpacity, setDerivedOpacity] = useState(65);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [broken, setBroken] = useState<string[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);

  const baselineUrl = originalSource(baseline);
  const targetUrl = originalSource(target);
  const registeredProgress = isRegisteredProgressAnalysis(analysis);
  const hasRegisteredPair = isPairRegistered(baseline, target, analysis);
  const registeredBaselineUrl = hasRegisteredPair ? alignedSource(baseline) : undefined;
  const registeredTargetUrl = hasRegisteredPair ? alignedSource(target) : undefined;
  // Each evidence kind gets its own capability check (skinProgress.ts) —
  // masks and Grad-CAM are per-photo evidence and, unlike slider/overlay/
  // difference-map, never depend on hasRegisteredPair. heatmapEnabled is an
  // unrelated ops rollout flag, kept as an extra AND for every non-Grad-CAM
  // layer.
  const sliderAvailable = dermaTimelineFlags.heatmapEnabled && canUseSlider(baseline, target, analysis);
  const overlayAvailable = dermaTimelineFlags.heatmapEnabled && canUseOverlay(baseline, target, analysis);
  const baselineMaskAvailable = dermaTimelineFlags.heatmapEnabled && canViewBaselineMask(baseline, analysis);
  const targetMaskAvailable = dermaTimelineFlags.heatmapEnabled && canViewFollowUpMask(target, analysis);
  const bothMaskAvailable = dermaTimelineFlags.heatmapEnabled && canViewBothMasks(baseline, target, analysis);
  const differenceAvailable = dermaTimelineFlags.heatmapEnabled && canViewDifferenceMap(baseline, target, analysis);
  const baselineAttentionAvailable = canViewBaselineGradCam(baseline);
  const targetAttentionAvailable = canViewFollowUpGradCam(target);
  const bothAttentionAvailable = canViewBothGradCam(baseline, target);
  const baselineMaskAsset = baselineMaskAvailable ? latestImageAsset(baseline, 'MASK') : undefined;
  const targetMaskAsset = targetMaskAvailable ? latestImageAsset(target, 'MASK') : undefined;
  const baselineMaskUrl = baselineMaskAsset?.protectedUrl;
  const targetMaskUrl = targetMaskAsset?.protectedUrl;
  const differenceUrl = differenceAvailable ? latestImageAsset(target, 'DIFFERENCE_MAP')?.protectedUrl : undefined;
  const baselineAttentionUrl = baselineAttentionAvailable ? latestImageAsset(baseline, 'HEATMAP')?.protectedUrl : undefined;
  const targetAttentionUrl = targetAttentionAvailable ? latestImageAsset(target, 'HEATMAP')?.protectedUrl : undefined;
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
    setDerivedOpacity(65);
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

  // Hide unsupported options rather than list them all disabled — a control
  // that isn't there yet isn't a promise the user can't act on, unlike a
  // greyed-out one sitting right next to the working ones.
  type EvidenceOption = { value: ViewMode; label: string };
  // "Ảnh gốc song song" always leads Group A and is the default mode — the
  // two dual-image modes come right after it (preferred whenever both sides
  // of a layer exist) so the viewer never has to toggle back and forth
  // between two single-image views to compare baseline vs. follow-up.
  const perImageOptions: EvidenceOption[] = [
    { value: 'side', label: 'Ảnh gốc song song' },
    bothMaskAvailable && { value: 'bothMask', label: 'Mask hai mốc' },
    bothAttentionAvailable && { value: 'bothAttention', label: 'Grad-CAM hai mốc' },
    baselineMaskAvailable && { value: 'baselineMask', label: 'Mask ảnh ban đầu' },
    targetMaskAvailable && { value: 'targetMask', label: 'Mask ảnh hiện tại' },
    baselineAttentionAvailable && { value: 'baselineAttention', label: 'Grad-CAM ảnh ban đầu' },
    targetAttentionAvailable && { value: 'targetAttention', label: 'Grad-CAM ảnh hiện tại' },
  ].filter((option): option is EvidenceOption => Boolean(option));
  const comparisonOptions: EvidenceOption[] = [
    sliderAvailable && { value: 'slider', label: 'Thanh trượt' },
    overlayAvailable && { value: 'overlay', label: 'Chồng ảnh' },
    differenceAvailable && { value: 'difference', label: 'Bản đồ thay đổi tổn thương' },
  ].filter((option): option is EvidenceOption => Boolean(option));
  const activeMaskAsset = mode === 'baselineMask' ? baselineMaskAsset : mode === 'targetMask' ? targetMaskAsset : undefined;
  const maskProvenanceLabel = (asset?: typeof baselineMaskAsset) => {
    const provenance = asset?.maskProvenance;
    if (!provenance || provenance === 'MODEL_PROPOSED') return 'Chưa được bác sĩ xác nhận';
    return MASK_PROVENANCE_LABEL[provenance];
  };

  return (
    <section className={styles.workbench} aria-label="Bàn so sánh hình ảnh tổn thương">
      <div className={styles.workbenchToolbar}>
        <div className={styles.workbenchModes}>
          <div className={styles.evidenceGroup}>
            <span className={styles.evidenceGroupLabel}>Bằng chứng từng ảnh</span>
            <Segmented
              value={perImageOptions.some((option) => option.value === mode) ? mode : undefined}
              onChange={(value) => setMode(value as ViewMode)}
              options={perImageOptions}
              aria-label="Bằng chứng từng ảnh"
            />
          </div>
          {comparisonOptions.length > 0 && (
            <div className={styles.evidenceGroup}>
              <span className={styles.evidenceGroupLabel}>Bằng chứng so sánh</span>
              <Segmented
                value={comparisonOptions.some((option) => option.value === mode) ? mode : undefined}
                onChange={(value) => setMode(value as ViewMode)}
                options={comparisonOptions}
                aria-label="Bằng chứng so sánh"
              />
            </div>
          )}
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
          message="Thanh trượt, chồng ảnh và bản đồ thay đổi chưa khả dụng"
          description={analysis && !registeredProgress
            ? 'Kết quả cũ không có provenance căn chỉnh nên các lớp so sánh trực tiếp đã bị khóa (mask và Grad-CAM trên từng ảnh riêng vẫn xem được ở trên nếu có). Hãy chạy lại bằng pipeline hiện tại.'
            : 'Hai ảnh chưa căn chỉnh được cùng hệ tọa độ nên các lớp so sánh trực tiếp bị khóa để tránh diễn giải sai lệch (mask và Grad-CAM trên từng ảnh riêng vẫn xem được ở trên nếu có).'}
          action={analysis && !registeredProgress && onReanalyze ? (
            <Button
              size="small"
              icon={<RotateCcw size={14} />}
              loading={reanalyzing}
              onClick={onReanalyze}
            >
              Chạy lại bằng pipeline hiện tại
            </Button>
          ) : undefined}
        />
      )}

      {/* stageRef wraps the stage AND its controls bar, not just the stage —
          the native Fullscreen API only shows the fullscreened element and
          its descendants, so fullscreening just the image area used to make
          the opacity slider, legend, and mask actions vanish entirely. */}
      <div ref={stageRef} className={styles.stageFrame}>
      <div
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
        {(mode === 'bothMask' || mode === 'bothAttention') && (
          <div className={styles.sideBySide}>
            <figure>
              <div style={{ transform }}>
                {image(baselineUrl, 'Ảnh ban đầu')}
                <div className={styles.opacityLayer} style={{ opacity: derivedOpacity / 100 }}>
                  {image(
                    mode === 'bothMask' ? baselineMaskUrl : baselineAttentionUrl,
                    mode === 'bothMask' ? 'Mask ảnh ban đầu' : 'Grad-CAM ảnh ban đầu',
                    styles.derivedLayer,
                  )}
                </div>
              </div>
              <figcaption>Mốc · {new Date(baseline.capturedAt).toLocaleDateString('vi-VN')}</figcaption>
            </figure>
            <figure>
              <div style={{ transform }}>
                {image(targetUrl, 'Ảnh hiện tại')}
                <div className={styles.opacityLayer} style={{ opacity: derivedOpacity / 100 }}>
                  {image(
                    mode === 'bothMask' ? targetMaskUrl : targetAttentionUrl,
                    mode === 'bothMask' ? 'Mask ảnh hiện tại' : 'Grad-CAM ảnh hiện tại',
                    styles.derivedLayer,
                  )}
                </div>
              </div>
              <figcaption>Hiện tại · {new Date(target.capturedAt).toLocaleDateString('vi-VN')}</figcaption>
            </figure>
          </div>
        )}
        {!['side', 'bothMask', 'bothAttention'].includes(mode) && (
          <div className={styles.layeredImages} style={{ transform }}>
            {mode === 'slider' && <>{image(registeredBaselineUrl, 'Ảnh mốc đã đăng ký')}<div className={styles.clippedLayer} style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}>{image(registeredTargetUrl, 'Ảnh hiện tại đã đăng ký')}</div></>}
            {mode === 'overlay' && <>{image(registeredBaselineUrl, 'Ảnh mốc đã đăng ký')}<div className={styles.opacityLayer} style={{ opacity: overlayOpacity / 100 }}>{image(registeredTargetUrl, 'Ảnh hiện tại đã đăng ký')}</div></>}
            {mode === 'baselineMask' && <>{image(baselineUrl, 'Ảnh ban đầu')}<div className={styles.opacityLayer} style={{ opacity: derivedOpacity / 100 }}>{image(baselineMaskUrl, 'Mask đề xuất ảnh ban đầu', styles.derivedLayer)}</div></>}
            {mode === 'targetMask' && <>{image(targetUrl, 'Ảnh hiện tại')}<div className={styles.opacityLayer} style={{ opacity: derivedOpacity / 100 }}>{image(targetMaskUrl, 'Mask đề xuất ảnh hiện tại', styles.derivedLayer)}</div></>}
            {mode === 'difference' && <>{image(registeredTargetUrl, 'Ảnh hiện tại đã đăng ký')}<div className={styles.opacityLayer} style={{ opacity: 0.85 }}>{image(differenceUrl, 'Bản đồ thay đổi tổn thương', styles.derivedLayer)}</div></>}
            {mode === 'baselineAttention' && <>{image(baselineUrl, 'Ảnh ban đầu')}<div className={styles.opacityLayer} style={{ opacity: derivedOpacity / 100 }}>{image(baselineAttentionUrl, 'Grad-CAM ảnh ban đầu', styles.derivedLayer)}</div></>}
            {mode === 'targetAttention' && <>{image(targetUrl, 'Ảnh hiện tại')}<div className={styles.opacityLayer} style={{ opacity: derivedOpacity / 100 }}>{image(targetAttentionUrl, 'Grad-CAM ảnh hiện tại', styles.derivedLayer)}</div></>}
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
            <Text strong><ScanLine size={14} /> Bản đồ thay đổi tổn thương:</Text>
            <span className={styles.legendReduced}>Giảm</span>
            <span className={styles.legendPersistent}>Còn tồn tại</span>
            <span className={styles.legendExpanded}>Mới / lan rộng</span>
            <span className={styles.legendUncertain}>Chưa chắc chắn</span>
          </div>
        )}
        {DUAL_MASK_MODES.includes(mode) && (
          <>
            <label className={styles.opacityControl}>
              <Text>Độ mờ vùng tổn thương</Text>
              <Slider value={derivedOpacity} onChange={setDerivedOpacity} aria-label="Độ mờ vùng tổn thương AI đề xuất" />
            </label>
            <Space wrap size={16}>
              <Text type="secondary">
                <Layers3 size={14} /> Vùng tổn thương AI đề xuất
                {mode !== 'targetMask' && ` · Ban đầu: ${maskProvenanceLabel(baselineMaskAsset)}`}
                {mode !== 'baselineMask' && ` · Hiện tại: ${maskProvenanceLabel(targetMaskAsset)}`}
              </Text>
              {onCorrectMask && activeMaskAsset && (
                <Button
                  size="small"
                  onClick={() => onCorrectMask({ id: activeMaskAsset.id, side: mode === 'baselineMask' ? 'baseline' : 'target' })}
                >
                  {maskProvenanceLabel(activeMaskAsset) === 'Chưa được bác sĩ xác nhận' ? 'Xác nhận / chỉnh sửa mask' : 'Chỉnh sửa lại mask'}
                </Button>
              )}
            </Space>
          </>
        )}
        {DUAL_ATTENTION_MODES.includes(mode) && (
          <>
            <label className={styles.opacityControl}>
              <Text>Độ mờ vùng chú ý</Text>
              <Slider value={derivedOpacity} onChange={setDerivedOpacity} aria-label="Độ mờ vùng mô hình chú ý" />
            </label>
            <span className={styles.attentionLegend} aria-hidden="true">
              <span className={styles.attentionLegendBar} /> Thấp → Cao
            </span>
            <Text type="secondary">
              <BrainCircuit size={14} /> Grad-CAM cho biết vùng mô hình phân loại tập trung chú ý. Đây không phải bản đồ hồi phục, lan rộng hoặc thay đổi của tổn thương.
            </Text>
          </>
        )}
      </div>
      </div>
    </section>
  );
});
