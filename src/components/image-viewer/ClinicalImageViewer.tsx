import { useMemo, useRef, useState } from 'react';
import { Button, Card, Empty, Segmented, Space, Tag, Tooltip, Typography } from 'antd';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { SkinCaseImageResult, SkinImageRole } from '../../api/skinAnalysis';
import styles from './ClinicalImageViewer.module.scss';

const { Text } = Typography;

const ROLE_LABEL: Record<SkinImageRole, string> = {
  overview: 'Toàn vùng',
  closeup: 'Cận cảnh',
  alternate: 'Góc khác',
};

interface ClinicalImageViewerProps {
  images: SkinCaseImageResult[];
  clinicalMode: boolean;
}

export function ClinicalImageViewer({ images, clinicalMode }: ClinicalImageViewerProps) {
  const [selectedRole, setSelectedRole] = useState<SkinImageRole>('closeup');
  const [mode, setMode] = useState<'original' | 'heatmap'>('heatmap');
  const [zoom, setZoom] = useState(1);
  const viewerRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(
    () => images.find((image) => image.role === selectedRole) ?? images[0],
    [images, selectedRole],
  );

  const heatmapAvailable = Boolean(selected?.heatmap && !selected.heatmap.allZero);
  const effectiveMode = mode === 'heatmap' && heatmapAvailable ? 'heatmap' : 'original';
  const source = effectiveMode === 'heatmap'
    ? selected?.heatmap?.dataUrl
    : selected?.original?.dataUrl;
  const setSafeZoom = (value: number) => setZoom(Math.min(3, Math.max(0.5, value)));

  return (
    <Card
      className={styles.card}
      title={clinicalMode ? 'AI Image Viewer · Grad-CAM' : 'Vùng AI chú ý'}
      extra={(
        <Space size={4} wrap>
          {heatmapAvailable && (
            <Segmented
              size="small"
              value={effectiveMode}
              onChange={(value) => {
                setMode(value as 'original' | 'heatmap');
                setZoom(1);
              }}
              options={[
                { label: 'Ảnh gốc', value: 'original' },
                { label: clinicalMode ? 'Grad-CAM' : 'Vùng AI chú ý', value: 'heatmap' },
              ]}
            />
          )}
          <Tooltip title="Thu nhỏ">
            <Button size="small" icon={<ZoomOut size={14} />} disabled={zoom <= 0.5} onClick={() => setSafeZoom(zoom - 0.25)} />
          </Tooltip>
          <Tag className={styles.zoomValue}>{Math.round(zoom * 100)}%</Tag>
          <Tooltip title="Phóng to">
            <Button size="small" icon={<ZoomIn size={14} />} disabled={zoom >= 3} onClick={() => setSafeZoom(zoom + 0.25)} />
          </Tooltip>
          <Tooltip title="Về kích thước ban đầu">
            <Button size="small" icon={<RotateCcw size={14} />} onClick={() => setZoom(1)} />
          </Tooltip>
          <Tooltip title="Xem toàn màn hình">
            <Button size="small" icon={<Maximize2 size={14} />} onClick={() => void viewerRef.current?.requestFullscreen()} />
          </Tooltip>
        </Space>
      )}
      size="small"
      styles={{ body: { padding: 0 } }}
    >
      {!selected ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có ảnh để hiển thị" />
      ) : (
        <div className={styles.container} ref={viewerRef}>
          <aside className={styles.rail} aria-label="Danh sách ảnh phân tích">
            {images.map((image) => {
              const thumbnail = image.original?.dataUrl ?? image.heatmap?.dataUrl;
              return (
                <button
                  type="button"
                  key={image.role}
                  className={`${styles.thumbnail} ${image.role === selected.role ? styles.selected : ''}`}
                  onClick={() => {
                    setSelectedRole(image.role);
                    setMode(image.heatmap && !image.heatmap.allZero ? 'heatmap' : 'original');
                  }}
                >
                  {thumbnail && <img src={thumbnail} alt="" />}
                  <span>{ROLE_LABEL[image.role]}</span>
                </button>
              );
            })}
          </aside>

          <section className={styles.stage}>
            {source
              ? (
                <img
                  src={source}
                  alt={`${ROLE_LABEL[selected.role]} ${effectiveMode === 'heatmap' ? 'Grad-CAM' : 'gốc'}`}
                  style={{ transform: `scale(${zoom})` }}
                />
              )
              : <Text className={styles.missing}>Không có ảnh để hiển thị</Text>}
          </section>

          <footer className={styles.footer}>
            <div className={styles.caption}>
              <Text strong>{`Ảnh ${ROLE_LABEL[selected.role].toLowerCase()}`}</Text>
              <Text type="secondary">
                {effectiveMode === 'heatmap'
                  ? 'Lớp màu thể hiện mức ảnh hưởng đến dự đoán của model.'
                  : 'Ảnh đã chuẩn hóa và loại metadata.'}
              </Text>
            </div>

            {clinicalMode && (
              <Space size={6} wrap>
                <Tag>Quality {Math.round(selected.quality.score * 100)}%</Tag>
                <Tag>{selected.width}×{selected.height}px</Tag>
                {selected.heatmap && <Tag>{selected.heatmap.targetLayer}</Tag>}
              </Space>
            )}

            {effectiveMode === 'heatmap' && (
              <div className={styles.legend}>
                <div className={styles.gradient} />
                <div>
                  <Text type="secondary">Ít ảnh hưởng</Text>
                  <Text type="secondary">Ảnh hưởng cao</Text>
                </div>
              </div>
            )}

            <Text type="secondary" className={styles.disclaimer}>
              {clinicalMode
                ? 'Grad-CAM là bản đồ attribution, không phải segmentation mask hoặc bằng chứng chẩn đoán.'
                : 'Vùng màu không phải ranh giới bệnh và không dùng để tự điều trị.'}
            </Text>
          </footer>
        </div>
      )}
    </Card>
  );
}
