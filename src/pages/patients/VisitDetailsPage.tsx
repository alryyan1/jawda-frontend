// src/pages/patients/VisitDetailsPage.tsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Flex,
  Spin,
  Typography,
  Button,
  Card,
  Descriptions,
  Table,
  Tag,
  Row,
  Col,
  Statistic,
  Empty,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined } from "@ant-design/icons";

import { getDoctorVisitById } from "@/services/visitService";
import type { DoctorVisit, RequestedService, LabRequest } from "@/types/visits";
import type { Patient } from "@/types/patients";
import { formatNumber } from "@/lib/utils";

const { Title, Text } = Typography;

const GENDER_LABELS: Record<string, string> = {
  male: "ذكر",
  female: "أنثى",
  other: "أخرى",
};

const VISIT_STATUS_COLORS: Record<string, string> = {
  waiting: "default",
  with_doctor: "processing",
  lab_pending: "gold",
  imaging_pending: "gold",
  payment_pending: "orange",
  completed: "success",
  cancelled: "error",
  no_show: "error",
};

const formatFullAge = (patient: Patient): string => {
  const parts: string[] = [];
  if (patient.age_year && patient.age_year > 0) parts.push(`${patient.age_year} سنة`);
  if (patient.age_month && patient.age_month > 0) parts.push(`${patient.age_month} شهر`);
  if (patient.age_day && patient.age_day > 0) parts.push(`${patient.age_day} يوم`);
  return parts.length > 0 ? parts.join(" / ") : "غير محدد";
};

const VisitDetailsPage: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const id = visitId ? parseInt(visitId, 10) : NaN;

  const { data: visit, isLoading: isLoadingVisit } = useQuery<DoctorVisit>({
    queryKey: ["doctorVisit", id],
    queryFn: () => getDoctorVisitById(id),
    enabled: !isNaN(id),
  });

  if (isNaN(id)) {
    return (
      <Flex vertical gap="middle" style={{ padding: 16 }}>
        <Text type="danger">معرف الزيارة غير صالح</Text>
        <Link to="/patients" style={{ width: "fit-content" }}>
          <Button icon={<ArrowLeftOutlined />}>العودة</Button>
        </Link>
      </Flex>
    );
  }

  if (isLoadingVisit || !visit) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 300 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  const patient = visit.patient as Patient;
  const requestedServices = visit.requested_services ?? [];
  const labRequests = visit.lab_requests ?? [];

  const serviceColumns: ColumnsType<RequestedService> = [
    { title: "الخدمة", dataIndex: ["service", "name"], key: "service_name", align: "center" },
    { title: "الطبيب", dataIndex: "doctor_name", key: "doctor_name", align: "center", render: (v) => v || "-" },
    { title: "السعر", dataIndex: "price", key: "price", align: "center", render: (v) => formatNumber(v) },
    { title: "العدد", dataIndex: "count", key: "count", align: "center" },
    {
      title: "الخصم",
      key: "discount",
      align: "center",
      render: (_, row) => {
        const fixed = Number(row.discount || 0);
        const percent = Number(row.discount_per || 0);
        if (!fixed && !percent) return "-";
        return [fixed ? formatNumber(fixed) : null, percent ? `${percent}%` : null].filter(Boolean).join(" + ");
      },
    },
    { title: "التغطية", dataIndex: "endurance", key: "endurance", align: "center", render: (v) => (v ? formatNumber(v) : "-") },
    { title: "المدفوع", dataIndex: "amount_paid", key: "amount_paid", align: "center", render: (v) => formatNumber(v) },
    {
      title: "الحالة",
      key: "status",
      align: "center",
      render: (_, row) => (
        <Flex gap={4} justify="center" wrap="wrap">
          <Tag color={row.is_paid ? "success" : "error"}>{row.is_paid ? "مدفوع" : "غير مدفوع"}</Tag>
          <Tag color={row.done ? "blue" : "default"}>{row.done ? "منفذ" : "لم ينفذ"}</Tag>
        </Flex>
      ),
    },
  ];

  const labColumns: ColumnsType<LabRequest> = [
    { title: "التحليل", dataIndex: ["main_test", "main_test_name"], key: "main_test_name", align: "center" },
    { title: "السعر", dataIndex: "price", key: "price", align: "center", render: (v) => formatNumber(v) },
    { title: "نسبة الخصم", dataIndex: "discount_per", key: "discount_per", align: "center", render: (v) => (v ? `${v}%` : "-") },
    { title: "التغطية", dataIndex: "endurance", key: "endurance", align: "center", render: (v) => (v ? formatNumber(v) : "-") },
    { title: "المدفوع", dataIndex: "amount_paid", key: "amount_paid", align: "center", render: (v) => formatNumber(v) },
    {
      title: "حالة الدفع",
      dataIndex: "is_paid",
      key: "is_paid",
      align: "center",
      render: (v: boolean) => <Tag color={v ? "success" : "error"}>{v ? "مدفوع" : "غير مدفوع"}</Tag>,
    },
    {
      title: "حالة النتيجة",
      dataIndex: "result_status",
      key: "result_status",
      align: "center",
      render: (v) => v || "-",
    },
  ];

  return (
    <Flex vertical gap="middle" style={{ padding: 16 }}>
      <Flex align="center" gap={16}>
        <Link to="/patients">
          <Button icon={<ArrowLeftOutlined />}>العودة</Button>
        </Link>
        <Title level={4} style={{ margin: 0 }}>
          تفاصيل الزيارة #{visit.id}
        </Title>
        <Tag color={VISIT_STATUS_COLORS[visit.status] ?? "default"}>{visit.status}</Tag>
      </Flex>

      <Card title="بيانات المريض">
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="الاسم">{patient?.name || "-"}</Descriptions.Item>
          <Descriptions.Item label="رقم الهاتف">{patient?.phone || "-"}</Descriptions.Item>
          <Descriptions.Item label="النوع">{GENDER_LABELS[patient?.gender] ?? patient?.gender ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="العمر">{patient ? formatFullAge(patient) : "-"}</Descriptions.Item>
          <Descriptions.Item label="العنوان">{patient?.address || "-"}</Descriptions.Item>
          <Descriptions.Item label="الشركة">{patient?.company?.name || "نقد"}</Descriptions.Item>
          <Descriptions.Item label="رقم التأمين">{patient?.insurance_no || "-"}</Descriptions.Item>
          <Descriptions.Item label="الطبيب">{visit.doctor?.name || visit.doctor_name || "-"}</Descriptions.Item>
          <Descriptions.Item label="المستخدم المسجّل">{patient?.user?.name || "-"}</Descriptions.Item>
          <Descriptions.Item label="تاريخ الزيارة">{visit.visit_date}</Descriptions.Item>
          <Descriptions.Item label="وقت الزيارة">{visit.visit_time_formatted || visit.visit_time || "-"}</Descriptions.Item>
          <Descriptions.Item label="نوع الزيارة">{visit.visit_type || "-"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="الملخص المالي">
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Statistic title="إجمالي الخدمات" value={formatNumber(visit.total_services_amount ?? 0)} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="إجمالي المختبر" value={formatNumber(visit.total_lab_amount ?? 0)} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="إجمالي الخصم" value={formatNumber(visit.total_discount ?? 0)} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="المتبقي"
              value={formatNumber(visit.balance_due ?? 0)}
              valueStyle={{ color: (visit.balance_due ?? 0) > 0 ? "#cf1322" : "#3f8600" }}
            />
          </Col>
        </Row>
      </Card>

      <Card title="الخدمات المطلوبة">
        <Table<RequestedService>
          rowKey="id"
          size="small"
          columns={serviceColumns}
          dataSource={requestedServices}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: <Empty description="لا توجد خدمات مطلوبة" /> }}
        />
      </Card>

      <Card title="التحاليل المطلوبة">
        <Table<LabRequest>
          rowKey="id"
          size="small"
          columns={labColumns}
          dataSource={labRequests}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: <Empty description="لا توجد تحاليل مطلوبة" /> }}
        />
      </Card>
    </Flex>
  );
};

export default VisitDetailsPage;
