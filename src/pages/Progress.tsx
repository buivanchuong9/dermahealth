import { useState } from 'react';
import Highcharts, { HighchartsReact, chart3dDefaults } from '../charts/highchartsSetup';
import { Row, Col, Card, Progress as ProgressBar, Tag, Button, Modal, Input, Typography, Rate } from 'antd';
import { Camera, ImageIcon, ChevronRight, ArrowRight, Upload, Brain } from 'lucide-react';
import { mockProgressData, mockProgressPhotos } from '../data/mockData';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { TabPanel } from '../components/common/TabPanel';

const { Title, Text, Paragraph } = Typography;

const WEEKS = mockProgressData.map((d) => d.week);
const SCORES = mockProgressData.map((d) => d.score);

const chartOptions: Highcharts.Options = {
  chart: { type: 'column', height: 260, ...chart3dDefaults },
  xAxis: { categories: WEEKS },
  yAxis: { min: 30, max: 100 },
  plotOptions: { column: { depth: 36 } },
  accessibility: { description: 'Biểu đồ cột 3D thể hiện chỉ số phục hồi da theo tuần điều trị.' },
  series: [{ type: 'column', name: 'Chỉ số phục hồi da', data: SCORES, color: '#1e5e9e' }],
  tooltip: { valueSuffix: ' điểm' },
};

export default function Progress() {
  const [uploadModal, setUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const overviewTab = (
    <Row gutter={16}>
      <Col xs={24} md={16}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Biểu đồ phục hồi da theo tuần" extra={<Tag color="success">Cải thiện 43%</Tag>} size="small">
            {SCORES.length > 0
              ? <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              : <ProfessionalEmpty title="Chưa có dữ liệu theo dõi" description="Thêm lần đánh giá đầu tiên để bắt đầu biểu đồ tiến triển." primaryLabel="Thêm đánh giá" onPrimary={() => setUploadModal(true)} />}
            <Row gutter={12} style={{ marginTop: 16 }}>
              {[
                { label: 'Mụn viêm', start: 80, end: 22, color: 'var(--danger)' },
                { label: 'Vết thâm', start: 75, end: 30, color: 'var(--warning)' },
                { label: 'Độ ẩm da', start: 45, end: 68, color: 'var(--success)' },
              ].map((m) => (
                <Col xs={24} sm={12} md={8} key={m.label}>
                  <Card size="small" styles={{ body: { padding: 12 } }}>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>{m.label}</Text>
                    <ProgressBar percent={m.end} showInfo={false} strokeColor={m.color} size="small" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>{m.start}% <ArrowRight size={10} /> {m.end}%</Text>
                      <Text strong style={{ fontSize: 11, color: m.color }}>{m.label === 'Độ ẩm da' ? `+${m.end - m.start}%` : `-${m.start - m.end}%`}</Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </div>
      </Col>

      <Col xs={24} sm={12} md={8}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card size="small" style={{ background: 'var(--medical-blue-800)', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Brain size={17} color="white" />
              <Text style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>AI Nhận xét</Text>
            </div>
            <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
              Tiến triển 8 tuần rất tích cực. Mụn viêm giảm 61%, vết thâm giảm 38%. Tiếp tục phác đồ hiện tại và tăng tần suất bôi kem dưỡng ẩm.
            </Paragraph>
            <div style={{ padding: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, display: 'block' }}>Dự đoán hoàn thành điều trị</Text>
              <Text style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Tuần 14 (tháng 12/2023)</Text>
            </div>
          </Card>

          {mockProgressData.slice(-3).reverse().map((d) => (
            <Card size="small" key={d.week}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 13 }}>{d.week}</Text>
                <Text strong style={{ fontSize: 16, color: 'var(--medical-blue-700)' }}>{d.score}/100</Text>
              </div>
              <ProgressBar percent={d.score} showInfo={false} strokeColor="var(--medical-blue-600)" size="small" />
            </Card>
          ))}
        </div>
      </Col>
    </Row>
  );

  const photosTab = (
    <Row gutter={16}>
      {mockProgressPhotos.map((photo) => (
        <Col xs={24} sm={12} md={8} key={photo.week}>
          <Card size="small" hoverable styles={{ body: { padding: 12 } }}>
            <div style={{ height: 180, background: 'var(--surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <ImageIcon size={32} color="var(--text-muted)" />
              <Tag color="blue" style={{ position: 'absolute', top: 8, right: 8, fontSize: 11 }}>AI {photo.score}/100</Tag>
              <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, background: 'rgba(12,45,79,0.55)', borderRadius: 6, padding: '4px 8px' }}>
                <Text style={{ color: 'white', fontSize: 11.5, fontWeight: 600 }}>{photo.week}</Text>
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>{photo.date}</Text>
            <Paragraph style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 8px' }}>{photo.note}</Paragraph>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ProgressBar percent={photo.score} showInfo={false} strokeColor="var(--medical-blue-600)" size="small" style={{ flex: 1 }} />
              <ChevronRight size={15} color="var(--text-muted)" />
            </div>
          </Card>
        </Col>
      ))}
      <Col xs={24} sm={12} md={8}>
        <Card
          size="small"
          hoverable
          onClick={() => setUploadModal(true)}
          style={{ borderStyle: 'dashed', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          styles={{ body: { textAlign: 'center', padding: 24 } }}
        >
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--medical-blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Camera size={22} color="var(--medical-blue-700)" />
          </div>
          <Text strong style={{ color: 'var(--medical-blue-700)', display: 'block', marginBottom: 4 }}>Upload ảnh mới</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>Chụp hoặc tải ảnh da để AI phân tích tiến triển</Text>
        </Card>
      </Col>
    </Row>
  );

  const comparisonTab = (
    <Row gutter={16}>
      <Col xs={24} md={16}>
        <Card title="So sánh Trước & Sau điều trị" size="small">
          <Row gutter={12} style={{ marginBottom: 16 }}>
            {[
              { label: 'Tuần 1 (Trước)', score: 42 },
              { label: 'Tuần 8 (Sau 2 tháng)', score: 85 },
            ].map((p) => (
              <Col xs={24} md={12} key={p.label}>
                <div style={{ height: 220, background: 'var(--surface-subtle)', border: '1px solid var(--border-default)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <ImageIcon size={40} color="var(--text-muted)" />
                  <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: 'rgba(12,45,79,0.5)', borderRadius: 6, padding: '6px 10px', display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>{p.label}</Text>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>AI {p.score}/100</Text>
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          <Card size="small" style={{ background: 'var(--surface-selected)' }}>
            <Text strong style={{ color: 'var(--medical-blue-700)', fontSize: 13.5, display: 'block', marginBottom: 12 }}>
              <Brain size={15} style={{ verticalAlign: -2, marginRight: 6 }} />AI Đánh giá cải thiện tổng thể: <Text strong>+43 điểm</Text>
            </Text>
            {[
              { label: 'Giảm mụn viêm', value: 61, color: 'var(--success)' },
              { label: 'Giảm sắc tố thâm', value: 38, color: 'var(--medical-blue-700)' },
              { label: 'Cải thiện độ ẩm', value: 51, color: 'var(--medical-blue-500)' },
              { label: 'Đều màu da', value: 45, color: 'var(--warning)' },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13 }}>{m.label}</Text>
                  <Text strong style={{ fontSize: 13, color: m.color }}>+{m.value}%</Text>
                </div>
                <ProgressBar percent={m.value} showInfo={false} strokeColor={m.color} size="small" />
              </div>
            ))}
          </Card>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={8}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Đánh giá của bệnh nhân" size="small">
            {[
              { label: 'Hiệu quả điều trị', stars: 5 },
              { label: 'Dễ tuân thủ', stars: 4 },
              { label: 'Tác dụng phụ', stars: 4 },
              { label: 'Hài lòng tổng thể', stars: 5 },
            ].map((r) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                <Text style={{ fontSize: 13 }}>{r.label}</Text>
                <Rate disabled defaultValue={r.stars} style={{ fontSize: 13 }} />
              </div>
            ))}
          </Card>

          <Card title="Dự đoán AI" size="small">
            <Card size="small" style={{ background: 'var(--success-bg)', marginBottom: 8, border: 'none' }}>
              <Text strong style={{ color: 'var(--success)', fontSize: 12 }}>Hoàn thành điều trị</Text>
              <Paragraph style={{ fontSize: 13, fontWeight: 700, margin: '2px 0 0' }}>Tháng 12/2023 (Tuần 14)</Paragraph>
            </Card>
            <Card size="small" style={{ background: 'var(--info-bg)', border: 'none' }}>
              <Text strong style={{ color: 'var(--medical-blue-700)', fontSize: 12 }}>Nguy cơ tái phát</Text>
              <Paragraph style={{ fontSize: 13, fontWeight: 700, margin: '2px 0 0' }}>Thấp (8%) — Tiên lượng tốt</Paragraph>
            </Card>
          </Card>
        </div>
      </Col>
    </Row>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Theo Dõi Tiến Triển</Title>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" icon={<Upload size={16} />} onClick={() => setUploadModal(true)}>Upload ảnh mới</Button>
        </div>
      </div>

      <Row gutter={12}>
        {[
          { label: 'Điểm phục hồi', value: 85, prev: 42 },
          { label: 'Giảm viêm', value: 72, prev: 20 },
          { label: 'Đều màu da', value: 60, prev: 25 },
          { label: 'Độ ẩm da', value: 68, prev: 45 },
        ].map((m) => (
          <Col xs={24} sm={12} md={6} key={m.label}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <ProgressBar type="dashboard" percent={m.value} size={80} strokeColor="var(--medical-blue-600)" />
              <Text strong style={{ fontSize: 12.5, display: 'block', marginTop: 8 }}>{m.label}</Text>
              <Tag color="success" style={{ marginTop: 4, fontSize: 11 }}>+{m.value - m.prev}% so với đầu</Tag>
            </Card>
          </Col>
        ))}
      </Row>

      <TabPanel
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'overview', label: 'Biểu đồ', children: overviewTab },
          { key: 'photos', label: 'Ảnh tiến triển', children: photosTab },
          { key: 'comparison', label: 'So sánh AI', children: comparisonTab },
        ]}
      />

      <Modal title="Upload Ảnh Tiến Triển" open={uploadModal} onCancel={() => setUploadModal(false)} onOk={() => setUploadModal(false)} okText="Lưu & Phân tích AI" cancelText="Hủy">
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, border: '2px dashed var(--border-strong)', borderRadius: 8, background: 'var(--surface-subtle)', cursor: 'pointer', marginBottom: 16 }}
        >
          <Camera size={36} color="var(--medical-blue-700)" style={{ marginBottom: 10 }} />
          <Text strong style={{ marginBottom: 4 }}>Chụp hoặc chọn ảnh</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>PNG, JPG tối đa 10MB</Text>
          <Button type="primary" size="small" style={{ marginTop: 12 }}>Chọn ảnh</Button>
        </div>
        <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ghi chú (tùy chọn)</Text>
        <Input.TextArea rows={2} placeholder="VD: Tuần 9 – Da đã bớt viêm..." />
      </Modal>

      {mockProgressPhotos.length === 0 && <ProfessionalEmpty title="Chưa có ảnh theo dõi" description="Tải ảnh da mới để so sánh tiến triển theo thời gian." primaryLabel="Tải ảnh lên" onPrimary={() => setUploadModal(true)} />}
    </div>
  );
}
