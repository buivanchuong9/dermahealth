import { Card, Col, Row, Statistic, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/useStore";
import {
  appointmentRepository,
  queueRepository,
} from "../domain/repositories";
import { ProfessionalEmpty } from "../components/feedback/ProfessionalEmpty";
import {
  listQueueStations,
  type QueueStationSnapshot,
} from "../api/queue";

const { Title, Text } = Typography;

export default function QueueStations() {
  const tickets = useStore(queueRepository);
  const appointments = useStore(appointmentRepository);
  const clinicLocationId = appointments.find(
    (item) => item.clinicLocationId,
  )?.clinicLocationId;
  const [apiStations, setApiStations] = useState<QueueStationSnapshot[]>();

  useEffect(() => {
    if (!clinicLocationId) return;
    listQueueStations(clinicLocationId)
      .then(setApiStations)
      .catch(() => setApiStations(undefined));
  }, [clinicLocationId]);

  const stations = useMemo<QueueStationSnapshot[]>(() => {
    if (apiStations) return apiStations;
    return Array.from(new Set(tickets.map((ticket) => ticket.serviceStation))).map(
      (serviceStation) => {
        const rows = tickets.filter(
          (ticket) => ticket.serviceStation === serviceStation,
        );
        return {
          serviceStation,
          waiting: rows.filter((ticket) => ticket.status === "waiting").length,
          called: rows.filter((ticket) => ticket.status === "called").length,
          inService: rows.filter((ticket) => ticket.status === "in_service")
            .length,
        };
      },
    );
  }, [apiStations, tickets]);

  return (
    <div>
      <Text type="secondary">CẤU HÌNH VẬN HÀNH</Text>
      <Title level={3}>Các trạm phục vụ</Title>
      <Row gutter={[16, 16]}>
        {stations.map((station) => (
          <Col xs={24} md={12} lg={8} key={station.serviceStation}>
            <Link
              to={`/queue-display/station/${encodeURIComponent(station.serviceStation)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card
                hoverable
                title={station.serviceStation}
                extra={<Tag color="green">Đang hoạt động</Tag>}
              >
                <Row gutter={12}>
                  <Col span={8}>
                    <Statistic title="Đang chờ" value={station.waiting} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Đang gọi" value={station.called} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Phục vụ" value={station.inService} />
                  </Col>
                </Row>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
      {!stations.length && (
        <ProfessionalEmpty
          title="Chưa có trạm phục vụ"
          description="Trạm sẽ xuất hiện sau khi bệnh nhân được phân vào hàng đợi."
          primaryLabel="Mở hàng đợi"
          primaryHref="/app/queue"
        />
      )}
    </div>
  );
}
