import { useEffect, useState } from "react";
import { Button, Result, Spin } from "antd";
import { Navigate, useParams } from "react-router-dom";
import { getEncounter, mapEncounter } from "../api/encounters";
import { getWorkflowInstanceForEncounter } from "../api/workflowInstance";
import { ApiError } from "../api/http";
import { encounterRepository, workflowRepository } from "../domain/repositories";
import type { MedicalEncounter, WorkflowInstance } from "../domain/core/entities";

export default function EncounterWorkflow() {
  const { encounterId } = useParams();
  const [encounter, setEncounter] = useState<MedicalEncounter>();
  const [instance, setInstance] = useState<WorkflowInstance>();
  const [loading, setLoading] = useState(Boolean(encounterId));
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!encounterId) return;
    let active = true;
    getEncounter(encounterId)
      .then(async (encounterRow) => {
        const mappedEncounter = mapEncounter(encounterRow);
        const matchingInstance = await getWorkflowInstanceForEncounter(mappedEncounter.id)
          .catch((error: unknown) => {
            if (error instanceof ApiError && error.status === 404) return undefined;
            throw error;
          });
        return { mappedEncounter, matchingInstance };
      })
      .then(({ mappedEncounter, matchingInstance }) => {
        if (!active) return;
        encounterRepository.upsert(mappedEncounter);
        if (matchingInstance) workflowRepository.instances().upsert(matchingInstance);
        setEncounter(mappedEncounter);
        setInstance(matchingInstance);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [encounterId]);

  if (loading) {
    return (
      <div style={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Spin size="large" tip="Đang tải quy trình lượt khám…" />
      </div>
    );
  }

  if (!encounterId || notFound || !encounter) {
    return <Result status="404" title="Không tìm thấy lượt khám" />;
  }

  if (instance) {
    return (
      <Navigate
        to={`/app/workflows/instances/${instance.id}`}
        replace
      />
    );
  }

  return (
    <Result
      status="info"
      title="Lượt khám chưa có quy trình"
      subTitle="Hãy chọn một quy trình đã xuất bản và kích hoạt cho lượt khám này. Hàng đợi công việc chỉ có tác vụ sau khi quy trình được kích hoạt."
      extra={
        <Button type="primary" href="/app/workflows/templates">
          Chọn quy trình khám
        </Button>
      }
    />
  );
}
