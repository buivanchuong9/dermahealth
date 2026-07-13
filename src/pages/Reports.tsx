import { useState } from 'react';
import Highcharts, { HighchartsReact, chart3dDefaults } from '../charts/highchartsSetup';
import { Row, Col, Card, Tabs, Table, Tag, Progress, Button, Typography, Statistic, Rate } from 'antd';
import { BarChart3, TrendingUp, Calendar, Download, FileText, Brain, Star } from 'lucide-react';
import { mockProgressData } from '../data/mockData';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';

const { Title, Text, Paragraph } = Typography;

const WEEKS = mockProgressData.map((d) => d.week);
const SCORES = mockProgressData.map((d) => d.score);

// 3D column chart — weekly skin-health score.
const barChartOptions: Highcharts.Options = {
  chart: { type: 'column', height: 280, ...chart3dDefaults },
  xAxis: { categories: WEEKS },
  yAxis: { min: 0, max: 100 },
  plotOptions: { column: { depth: 40 } },
  accessibility: { description: 'Biểu đồ cột 3D thể hiện điểm sức khỏe da theo từng tuần điều trị, từ tuần 1 đến tuần 8.' },
  series: [{ type: 'column', name: 'Điểm sức khỏe da', data: SCORES, color: '#1e5e9e' }],
};

// 3D donut chart — relative contribution of each improvement category.
const IMPROVEMENT_BREAKDOWN = [
  { name: 'Giảm mụn viêm', y: 61, color: '#c83e4d' },
  { name: 'Giảm sắc tố thâm', y: 38, color: '#b7791f' },
  { name: 'Cải thiện độ ẩm', y: 51, color: '#238a57' },
  { name: 'Đều màu da', y: 45, color: '#1e5e9e' },
];
const donutChartOptions: Highcharts.Options = {
  chart: { type: 'pie', height: 260, ...chart3dDefaults },
  accessibility: { description: 'Biểu đồ tròn 3D thể hiện tỉ trọng cải thiện theo từng hạng mục: giảm mụn viêm, giảm sắc tố thâm, cải thiện độ ẩm và đều màu da.' },
  plotOptions: {
    pie: {
      innerSize: '45%',
      depth: 42,
      dataLabels: { enabled: true, format: '{point.name}: {point.y}%', style: { fontSize: '11px', color: '#5f6b7a', textOutline: 'none' } },
    },
  },
  series: [{ type: 'pie', name: 'Tỉ trọng cải thiện', data: IMPROVEMENT_BREAKDOWN }],
};

const TREATMENT_HISTORY = [
  { week: 'Tuần 1', dx: 'Mụn trứng cá độ III', score: 42, note: 'Bắt đầu điều trị', doctor: 'Bs. Nguyễn Thị An' },
  { week: 'Tuần 2', dx: 'Mụn trứng cá độ III', score: 52, note: 'Kháng sinh phát huy', doctor: 'Bs. Nguyễn Thị An' },
  { week: 'Tuần 4', dx: 'Mụn trứng cá độ II', score: 65, note: 'Cải thiện rõ', doctor: 'Bs. Nguyễn Thị An' },
  { week: 'Tuần 6', dx: 'Mụn trứng cá độ I-II', score: 74, note: 'Tretinoin hiệu quả', doctor: 'Bs. Nguyễn Thị An' },
  { week: 'Tuần 8', dx: 'Mụn trứng cá độ I', score: 85, note: 'Tiến triển tốt', doctor: 'Bs. Nguyễn Thị An' },
];

const MEDICINE_HISTORY = [
  { name: 'Tretinoin 0.05% Cream', from: '10/10/2023', to: 'Đang dùng', compliance: 95, status: 'active' },
  { name: 'Doxycycline 100mg', from: '25/09/2023', to: '02/10/2023', compliance: 100, status: 'done' },
  { name: 'Omega-3 1000mg', from: '10/10/2023', to: 'Đang dùng', compliance: 88, status: 'active' },
  { name: 'Nước muối sinh lý 0.9%', from: '25/09/2023', to: '02/10/2023', compliance: 96, status: 'done' },
];

export default function Reports() {
  const [tab, setTab] = useState('overview');

  const overviewTab = (
    <Row gutter={16}>
      <Col xs={24} md={16}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Điểm sức khỏe da theo tuần" extra={<Tag color="success">+43 điểm</Tag>} size="small">
            {SCORES.length > 0
              ? <HighchartsReact highcharts={Highcharts} options={barChartOptions} />
              : <ProfessionalEmpty title="Chưa có dữ liệu theo dõi" description="Hãy hoàn thành lần đánh giá đầu tiên để tạo báo cáo." primaryLabel="Bắt đầu đánh giá" primaryHref="/app/ai-analysis" />}
          </Card>

          <Card title="Chi tiết cải thiện" size="small">
            {[
              { label: 'Giảm mụn viêm', end: 22, improvement: 78, color: 'var(--danger)' },
              { label: 'Giảm vết thâm', end: 38, improvement: 62, color: 'var(--warning)' },
              { label: 'Độ ẩm da', end: 68, improvement: 51, color: 'var(--success)' },
              { label: 'Kết cấu da', end: 72, improvement: 80, color: 'var(--medical-blue-700)' },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 13.5 }}>{m.label}</Text>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Tag color="success">+{m.improvement}%</Tag>
                    <Text strong style={{ fontSize: 13.5, color: m.color }}>{m.end}%</Text>
                  </div>
                </div>
                <Progress percent={m.end} showInfo={false} strokeColor={m.color} size="small" />
              </div>
            ))}
          </Card>

          <Card title="Tỉ trọng cải thiện theo hạng mục" size="small">
            {IMPROVEMENT_BREAKDOWN.length > 0
              ? <HighchartsReact highcharts={Highcharts} options={donutChartOptions} />
              : <ProfessionalEmpty title="Chưa có dữ liệu cải thiện" description="Kết quả sẽ được tổng hợp sau khi có dữ liệu theo dõi." primaryLabel="Theo dõi tiến triển" primaryHref="/app/progress" />}
          </Card>
        </div>
      </Col>

      <Col xs={24} sm={12} md={8}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Thống kê lịch hẹn" size="small">
            {[
              { label: 'Tổng lịch hẹn', val: '4', note: 'Trong 8 tuần' },
              { label: 'Đã tham dự', val: '4/4', note: '100% đúng hẹn' },
              { label: 'Lịch tới', val: '22/10', note: 'Bs. Trần Văn Nam' },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12.5 }}>{s.label}</Text>
                  <Text type="secondary" style={{ fontSize: 11.5, display: 'block' }}>{s.note}</Text>
                </div>
                <Text strong style={{ fontSize: 15, color: 'var(--medical-blue-700)' }}>{s.val}</Text>
              </div>
            ))}
          </Card>

          <Card title="Tuân thủ thuốc" size="small">
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <Statistic value={92} suffix="%" valueStyle={{ color: 'var(--success)', fontSize: 32 }} />
              <Text type="secondary" style={{ fontSize: 12.5 }}>Tỷ lệ tuân thủ trung bình</Text>
            </div>
            <Progress percent={92} showInfo={false} strokeColor="var(--success)" style={{ marginBottom: 12 }} />
            {[{ name: 'Tretinoin 0.05%', pct: 95 }, { name: 'Omega-3', pct: 88 }, { name: 'Kem chống nắng', pct: 91 }].map((m) => (
              <div key={m.name} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: 12 }}>{m.name}</Text>
                  <Text strong style={{ fontSize: 12 }}>{m.pct}%</Text>
                </div>
                <Progress percent={m.pct} showInfo={false} strokeColor="var(--success)" size="small" />
              </div>
            ))}
          </Card>

          <Card size="small" style={{ background: 'var(--medical-blue-700)', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Brain size={17} color="white" />
              <Text style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>AI Tóm tắt</Text>
            </div>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
              Bệnh nhân có tiến triển xuất sắc sau 8 tuần. Phác đồ hiện tại đang hiệu quả. Dự kiến hoàn thành điều trị tuần 14.
            </Paragraph>
            <Button ghost size="small" icon={<Download size={13} />}>Xuất báo cáo AI</Button>
          </Card>
        </div>
      </Col>
    </Row>
  );

  const treatmentTab = (
    <Card title="Lịch sử điều trị chi tiết" size="small">
      <Table
        size="small"
        scroll={{ x: 'max-content' }}
        rowKey="week"
        pagination={false}
        dataSource={TREATMENT_HISTORY}
        columns={[
          { title: 'Tuần', dataIndex: 'week', render: (v: string) => <Text strong>{v}</Text> },
          { title: 'Chẩn đoán', dataIndex: 'dx' },
          { title: 'Điểm AI', dataIndex: 'score', render: (v: number) => <Text strong style={{ color: v >= 80 ? 'var(--success)' : v >= 60 ? 'var(--medical-blue-700)' : 'var(--warning)' }}>{v}/100</Text> },
          { title: 'Ghi chú', dataIndex: 'note' },
          { title: 'Bác sĩ', dataIndex: 'doctor' },
        ]}
      />
    </Card>
  );

  const medicineTab = (
    <Card title="Lịch sử sử dụng thuốc" size="small">
      <Table
        size="small"
        scroll={{ x: 'max-content' }}
        rowKey="name"
        pagination={false}
        dataSource={MEDICINE_HISTORY}
        columns={[
          { title: 'Tên thuốc', dataIndex: 'name' },
          { title: 'Thời gian', render: (_, m) => `${m.from} – ${m.to}` },
          { title: 'Tuân thủ', dataIndex: 'compliance', render: (v: number) => <Text strong style={{ color: v >= 90 ? 'var(--success)' : 'var(--warning)' }}>{v}%</Text> },
          { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag color={v === 'active' ? 'blue' : 'default'}>{v === 'active' ? 'Đang dùng' : 'Hoàn thành'}</Tag> },
        ]}
      />
    </Card>
  );

  const aiReportTab = (
    <Row gutter={16}>
      <Col xs={24} md={16}>
        <Card size="small">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, background: 'var(--surface-selected)', borderRadius: 8 }}>
            <Brain size={22} color="var(--medical-blue-700)" />
            <div>
              <Text strong style={{ color: 'var(--medical-blue-700)', display: 'block' }}>Báo cáo AI tự động</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>Tạo lúc 08:30 hôm nay · Dựa trên 8 tuần dữ liệu</Text>
            </div>
          </div>
          {[
            { title: '1. Tình trạng da hiện tại', content: 'Sau 8 tuần điều trị, tình trạng mụn trứng cá đã cải thiện từ Độ III xuống Độ I. Chỉ số AI tổng thể đạt 85/100, tăng 43 điểm so với ban đầu.' },
            { title: '2. Hiệu quả phác đồ điều trị', content: 'Phác đồ kết hợp Tretinoin + Doxycycline + Omega-3 cho kết quả rất tốt. Mụn viêm giảm 61%, vết thâm giảm 38%, độ ẩm da tăng 51%.' },
            { title: '3. Tuân thủ điều trị', content: 'Tỷ lệ tuân thủ trung bình đạt 92% – Xuất sắc. Đặc biệt Doxycycline được tuân thủ 100% trong 7 ngày điều trị.' },
            { title: '4. Dự đoán & Khuyến nghị', content: 'Dự kiến hoàn thành điều trị vào tuần 14 (tháng 12/2023). Nguy cơ tái phát thấp (8%). Tiếp tục Tretinoin thêm 6 tuần và duy trì kem chống nắng.' },
          ].map((s) => (
            <div key={s.title} style={{ marginBottom: 16 }}>
              <Text strong style={{ color: 'var(--medical-blue-700)', fontSize: 13.5, display: 'block', marginBottom: 4 }}>{s.title}</Text>
              <Paragraph style={{ fontSize: 13.5 }}>{s.content}</Paragraph>
            </div>
          ))}
          <Button type="primary" block icon={<Download size={16} />}>Tải báo cáo AI (PDF)</Button>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Điểm tổng kết AI</Text>
            <div style={{ fontSize: 52, fontWeight: 700, color: 'var(--success)', lineHeight: 1, margin: '8px 0' }}>A+</div>
            <Text type="secondary" style={{ fontSize: 13 }}>Tiến triển xuất sắc</Text>
          </Card>
          <Card title="Đánh giá của bác sĩ" size="small">
            <Rate disabled defaultValue={5} style={{ marginBottom: 10 }} />
            <Paragraph italic type="secondary" style={{ fontSize: 13 }}>"Bệnh nhân rất tuân thủ phác đồ và có tiến triển nhanh. Kết quả vượt mong đợi."</Paragraph>
            <Text type="secondary" style={{ fontSize: 12 }}>— Bs. Nguyễn Thị An, 10/10/2023</Text>
          </Card>
        </div>
      </Col>
    </Row>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, color: 'var(--medical-blue-600)' }}>Báo cáo sức khỏe</Text>
          <Title level={3} style={{ margin: '4px 0 0' }}>Báo Cáo & Thống Kê</Title>
          <Text type="secondary">Tổng hợp kết quả điều trị và phân tích sức khỏe da của bạn.</Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<Download size={15} />}>Xuất PDF</Button>
          <Button type="primary" icon={<FileText size={16} />}>Báo cáo đầy đủ</Button>
        </div>
      </div>

      <Row gutter={12}>
        {[
          { label: 'Tuần điều trị', val: '8', sub: 'Tháng 9 – nay', icon: <Calendar size={18} /> },
          { label: 'Điểm phục hồi', val: '85', sub: 'Tăng từ 42 ban đầu', icon: <TrendingUp size={18} /> },
          { label: 'Tuân thủ thuốc', val: '92%', sub: 'Xuất sắc', icon: <Star size={18} /> },
          { label: 'AI Đánh giá', val: 'Tốt', sub: 'Tiếp tục phác đồ', icon: <Brain size={18} /> },
        ].map((s) => (
          <Col xs={24} sm={12} md={6} key={s.label}>
            <Card size="small"><Statistic title={s.label} value={s.val} prefix={s.icon} valueStyle={{ fontSize: 22, color: 'var(--medical-blue-700)' }} /><Text type="secondary" style={{ fontSize: 11.5 }}>{s.sub}</Text></Card>
          </Col>
        ))}
      </Row>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: <span><BarChart3 size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Tổng quan</span>, children: overviewTab },
          { key: 'treatment', label: 'Điều trị', children: treatmentTab },
          { key: 'medicine', label: 'Thuốc', children: medicineTab },
          { key: 'ai', label: 'AI Báo cáo', children: aiReportTab },
        ]}
      />
    </div>
  );
}
