// src/pages/reports/CostsReportPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import dayjs from "dayjs";
import { toast } from "sonner";

import type { CostFilters, CostCategory, CostCategoryBreakdownItem, PaginatedCostsResponse, Cost } from "@/types/finance";
import type { DoctorShiftReportItem } from "@/types/reports";
import type { User } from "@/types/users";
import type { Shift } from "@/types/shifts";
import { getCostsReportData, getCostCategoriesList, downloadCostsReportPdf, downloadCostsReportExcel, updateCostDoctorShift } from "@/services/costService";
import { getDoctorShiftsReport } from "@/services/reportService";
import { getUsers } from "@/services/userService";
import { getShiftsList } from "@/services/shiftService";
import { formatNumber } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/common";

// Ant Design components
import {
  Alert,
  Badge,
  Button,
  Card,
  DatePicker,
  Flex,
  Input,
  Modal,
  Popover,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilterOutlined,
  PrinterOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;

const getCostReportFilterSchema = () =>
  z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    cost_category_id: z.string().optional(),
    user_cost_id: z.string().optional(),
    shift_id: z.string().optional(),
    payment_method: z.enum(["all", "cash", "bank", "mixed"]).optional(),
    search_description: z.string().optional(),
  });

type CostReportFilterFormValues = z.infer<ReturnType<typeof getCostReportFilterSchema>>;

type HasData<T> = { data: T[] };

const CostsReportPage: React.FC = () => {
  const defaultDateFrom = startOfMonth(new Date());
  const defaultDateTo = endOfMonth(new Date());

  const filterForm = useForm<CostReportFilterFormValues>({
    resolver: zodResolver(getCostReportFilterSchema()),
    defaultValues: {
      date_from: format(defaultDateFrom, "yyyy-MM-dd"),
      date_to: format(defaultDateTo, "yyyy-MM-dd"),
      cost_category_id: "all", user_cost_id: "all", shift_id: "all",
      payment_method: "all", search_description: "",
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<Omit<CostFilters, "page" | "per_page">>({
    date_from: format(defaultDateFrom, "yyyy-MM-dd"),
    date_to: format(defaultDateTo, "yyyy-MM-dd"),
    cost_category_id: null, user_cost_id: null, shift_id: null,
    payment_method: null, search_description: "",
    sort_by: "created_at", sort_direction: "desc",
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('costs_report.pdf');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const { data: costCategories, isLoading: isLoadingCategories } = useQuery<CostCategory[], Error>({
    queryKey: ["costCategoriesListForReport"],
    queryFn: getCostCategoriesList,
  });

  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["usersListForCostReportFilter"],
    queryFn: () => getUsers(1, { per_page: 200 }),
  });
  const usersList = useMemo(() => (usersResponse as HasData<User> | undefined)?.data || [], [usersResponse]);

  const { data: shiftsList, isLoading: isLoadingShifts } = useQuery<Shift[], Error>({
    queryKey: ["shiftsListForCostReportFilter"],
    queryFn: () => getShiftsList({ per_page: 200, is_closed: "" }),
  });

  const reportQueryKey = ["costsReportData", currentPage, appliedFilters] as const;
  const { data: reportData, isLoading, error, isFetching } = useQuery<PaginatedCostsResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getCostsReportData({ page: currentPage, per_page: 20, ...appliedFilters }),
    placeholderData: keepPreviousData,
  });

  const handleFilterFormSubmit = (data: CostReportFilterFormValues) => {
    setCurrentPage(1);
    setAppliedFilters({
      date_from: data.date_from || undefined,
      date_to: data.date_to || undefined,
      cost_category_id: data.cost_category_id === "all" ? null : data.cost_category_id,
      user_cost_id: data.user_cost_id === "all" ? null : data.user_cost_id,
      shift_id: data.shift_id === "all" ? null : data.shift_id,
      payment_method: data.payment_method === "all" ? null : data.payment_method as CostFilters['payment_method'],
      search_description: data.search_description || undefined,
      sort_by: appliedFilters.sort_by,
      sort_direction: appliedFilters.sort_direction,
    });
  };

  const handleGeneratePdf = async () => {
    if (!reportData?.data.length) {
        toast.info('لا توجد بيانات للتصدير');
        return;
    }
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setIsPdfPreviewOpen(true);

    try {
      const blob = await downloadCostsReportPdf({
        date_from: appliedFilters.date_from,
        date_to: appliedFilters.date_to,
        cost_category_id: appliedFilters.cost_category_id,
        user_cost_id: appliedFilters.user_cost_id,
        shift_id: appliedFilters.shift_id,
        payment_method: appliedFilters.payment_method,
        search_description: appliedFilters.search_description,
        sort_by: appliedFilters.sort_by,
        sort_direction: appliedFilters.sort_direction,
      });
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
      setPdfFileName(`Costs_Report_${appliedFilters.date_from}_to_${appliedFilters.date_to}.pdf`);
    } catch (err: unknown) {
      console.error("Failed to generate PDF:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('فشل توليد ملف PDF', { description: errorMessage });
      setIsPdfPreviewOpen(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!reportData?.data.length) {
      toast.info('لا توجد بيانات للتصدير');
      return;
    }
    setIsGeneratingExcel(true);

    try {
      const blob = await downloadCostsReportExcel({
        date_from: appliedFilters.date_from,
        date_to: appliedFilters.date_to,
        cost_category_id: appliedFilters.cost_category_id,
        user_cost_id: appliedFilters.user_cost_id,
        shift_id: appliedFilters.shift_id,
        payment_method: appliedFilters.payment_method,
        search_description: appliedFilters.search_description,
        sort_by: appliedFilters.sort_by,
        sort_direction: appliedFilters.sort_direction,
      });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `Costs_Report_${appliedFilters.date_from}_to_${appliedFilters.date_to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.success('تم تصدير ملف Excel بنجاح');
    } catch (err: unknown) {
      console.error("Failed to generate Excel:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('فشل توليد ملف Excel', { description: errorMessage });
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const costs = reportData?.data || [];
  const meta = reportData?.meta;
  const summary = reportData?.meta?.summary;
  const byCategory = reportData?.meta?.by_category ?? [];
  const isLoadingDropdowns = isLoadingCategories || isLoadingUsers || isLoadingShifts;

  const activeFilterCount = [
    appliedFilters.cost_category_id, appliedFilters.user_cost_id,
    appliedFilters.shift_id, appliedFilters.payment_method,
    appliedFilters.search_description,
  ].filter(Boolean).length;

  // Doctor shifts for inline select (unassigned costs)
  const { data: doctorShiftsData } = useQuery<PaginatedResponse<DoctorShiftReportItem>, Error>({
    queryKey: ["doctorShiftsForCostAssign", appliedFilters.date_from, appliedFilters.date_to],
    queryFn: () => getDoctorShiftsReport({
      date_from: appliedFilters.date_from,
      date_to: appliedFilters.date_to,
      per_page: 100,
      include_financials: false,
    }),
    refetchOnWindowFocus: false,
  });
  const doctorShiftOptions = useMemo(() =>
    (doctorShiftsData?.data ?? []).map(ds => ({
      value: ds.id,
      label: `#${ds.id} — ${ds.doctor_name} (${ds.formatted_start_time})`,
    })), [doctorShiftsData]);

  const queryClient = useQueryClient();
  const assignMutation = useMutation({
    mutationFn: ({ costId, doctorShiftId }: { costId: number; doctorShiftId: number | null }) =>
      updateCostDoctorShift(costId, doctorShiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costsReportData"] });
      toast.success("تم تعيين وردية الطبيب");
    },
    onError: () => toast.error("فشل التعيين"),
  });

  const getPaymentMethodForDisplay = (cost: Cost): string => {
    const hasCash = cost.amount > 0;
    const hasBank = cost.amount_bankak > 0;
    if (hasCash && hasBank) return 'مختلط';
    if (hasCash) return 'نقدي';
    if (hasBank) return 'بنكي';
    return "-";
  };

  const paymentMethodTagColor = (pm: string): string => {
    if (pm === 'مختلط') return 'blue';
    if (pm === 'بنكي') return 'purple';
    if (pm === 'نقدي') return 'default';
    return 'default';
  };

  const categoryFilterOptions = [
    { value: "all", label: "كل الفئات" },
    ...(costCategories?.map(c => ({ value: String(c.id), label: c.name })) ?? []),
  ];
  const userFilterOptions = [
    { value: "all", label: "كل المستخدمين" },
    ...usersList.map(u => ({ value: String(u.id), label: u.name })),
  ];
  const shiftFilterOptions = [
    { value: "all", label: "كل المناوبات" },
    ...(shiftsList?.map(s => ({ value: String(s.id), label: s.name || `#${s.id} (${format(parseISO(s.created_at!), "P")})` })) ?? []),
  ];
  const paymentMethodFilterOptions = [
    { value: "all", label: "كل الطرق" },
    { value: "cash", label: "نقدي" },
    { value: "bank", label: "بنكي" },
    { value: "mixed", label: "مختلط" },
  ];

  const columns: ColumnsType<Cost> = [
    {
      title: "التاريخ",
      dataIndex: "created_at",
      key: "created_at",
      align: "center",
      width: 110,
      render: (value: string) => value ? format(parseISO(value), "MM-dd HH:mm") : "-",
    },
    {
      title: "الوصف",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (value: string) => <Text strong style={{ fontSize: 12 }}>{value}</Text>,
    },
    {
      title: "ملاحظة",
      dataIndex: "comment",
      key: "comment",
      align: "center",
      ellipsis: true,
      render: (value: string | null) => (
        <Text type="secondary" italic={!value} style={{ fontSize: 12 }}>{value || "—"}</Text>
      ),
    },
    {
      title: "المستخدم",
      dataIndex: "user_cost_name",
      key: "user_cost_name",
      align: "center",
      render: (value: string | undefined) => value || "-",
    },
    {
      title: "وردية الطبيب",
      key: "doctor_shift",
      align: "center",
      width: 220,
      render: (_, cost) => {
        const unassigned = !cost.doctor_shift_id;
        if (!unassigned) {
          return (
            <Text type="success" strong style={{ fontSize: 12 }}>
              #{cost.doctor_shift_id} — {cost.doctor_shift_doctor_name || ""}
            </Text>
          );
        }
        return (
          <Select
            options={doctorShiftOptions}
            placeholder="اختر وردية طبيب"
            size="small"
            showSearch
            style={{ width: 200 }}
            loading={assignMutation.isPending}
            optionFilterProp="label"
            onChange={(value) => assignMutation.mutate({ costId: cost.id, doctorShiftId: value })}
          />
        );
      },
    },
    {
      title: "الدفع",
      key: "payment_method",
      align: "center",
      width: 80,
      render: (_, cost) => {
        const pm = getPaymentMethodForDisplay(cost);
        return <Tag color={paymentMethodTagColor(pm)}>{pm}</Tag>;
      },
    },
    {
      title: "نقدًا",
      dataIndex: "amount",
      key: "amount",
      align: "center",
      render: (value: number) => formatNumber(value),
    },
    {
      title: "بنكي",
      dataIndex: "amount_bankak",
      key: "amount_bankak",
      align: "center",
      render: (value: number) => formatNumber(value),
    },
    {
      title: "الإجمالي",
      key: "total",
      align: "center",
      render: (_, cost) => <Text strong>{formatNumber(cost.amount + cost.amount_bankak)}</Text>,
    },
  ];

  const byCategoryColumns: ColumnsType<CostCategoryBreakdownItem> = [
    {
      title: "الجهة",
      dataIndex: "cost_category_name",
      key: "cost_category_name",
      render: (value: string) => <Text strong style={{ fontSize: 12 }}>{value}</Text>,
    },
    {
      title: "عدد العناصر",
      dataIndex: "items_count",
      key: "items_count",
      align: "center",
      width: 110,
    },
    {
      title: "نقدًا",
      dataIndex: "total_cash",
      key: "total_cash",
      align: "center",
      render: (value: number) => formatNumber(value),
    },
    {
      title: "بنكي",
      dataIndex: "total_bank",
      key: "total_bank",
      align: "center",
      render: (value: number) => formatNumber(value),
    },
    {
      title: "الإجمالي",
      dataIndex: "total",
      key: "total",
      align: "center",
      render: (value: number) => <Text strong>{formatNumber(value)}</Text>,
    },
  ];

  if (error && !isLoading) {
    return (
      <Alert
        type="error"
        showIcon
        message="حدث خطأ"
        description={`حدث خطأ أثناء الجلب: ${error.message}`}
        style={{ margin: 16 }}
      />
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {/* ── Toolbar ── */}
      <Flex align="center" gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
        <Popover
          open={isFilterPopoverOpen}
          onOpenChange={setIsFilterPopoverOpen}
          trigger="click"
          placement="bottomLeft"
          content={
            <form onSubmit={filterForm.handleSubmit((data) => { handleFilterFormSubmit(data); setIsFilterPopoverOpen(false); })}>
              <Space direction="vertical" size={10} style={{ width: 260, paddingTop: 4 }}>
                <Text type="secondary" strong style={{ fontSize: 12 }}>فلترة إضافية</Text>
                <Controller control={filterForm.control} name="cost_category_id" render={({ field }) => (
                  <Select
                    options={categoryFilterOptions}
                    value={field.value || "all"}
                    onChange={field.onChange}
                    disabled={isLoadingDropdowns}
                    showSearch
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    placeholder="الفئة"
                  />
                )} />
                <Controller control={filterForm.control} name="user_cost_id" render={({ field }) => (
                  <Select
                    options={userFilterOptions}
                    value={field.value || "all"}
                    onChange={field.onChange}
                    disabled={isLoadingDropdowns}
                    showSearch
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    placeholder="المستخدم"
                  />
                )} />
                <Controller control={filterForm.control} name="shift_id" render={({ field }) => (
                  <Select
                    options={shiftFilterOptions}
                    value={field.value || "all"}
                    onChange={field.onChange}
                    disabled={isLoadingDropdowns}
                    showSearch
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    placeholder="المناوبة"
                  />
                )} />
                <Controller control={filterForm.control} name="payment_method" render={({ field }) => (
                  <Select
                    options={paymentMethodFilterOptions}
                    value={field.value || "all"}
                    onChange={field.onChange}
                    style={{ width: "100%" }}
                    placeholder="طريقة الدفع"
                  />
                )} />
                <Controller control={filterForm.control} name="search_description" render={({ field }) => (
                  <Input placeholder="بحث بالوصف" allowClear {...field} />
                )} />
                <Button type="primary" htmlType="submit" block size="small">تطبيق</Button>
              </Space>
            </form>
          }
        >
          <Badge count={activeFilterCount} size="small">
            <Button icon={<FilterOutlined />} />
          </Badge>
        </Popover>

        {/* Date range always visible */}
        <form onSubmit={filterForm.handleSubmit(handleFilterFormSubmit)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Controller control={filterForm.control} name="date_from" render={({ field }) => (
            <DatePicker
              placeholder="من"
              format="YYYY-MM-DD"
              value={field.value ? dayjs(field.value) : undefined}
              onChange={(_, dateString) => field.onChange((dateString as string) || undefined)}
              disabled={isFetching}
              style={{ width: 135 }}
            />
          )} />
          <Controller control={filterForm.control} name="date_to" render={({ field }) => (
            <DatePicker
              placeholder="إلى"
              format="YYYY-MM-DD"
              value={field.value ? dayjs(field.value) : undefined}
              onChange={(_, dateString) => field.onChange((dateString as string) || undefined)}
              disabled={isFetching}
              style={{ width: 135 }}
            />
          )} />
          <Button type="primary" htmlType="submit" icon={<FilterOutlined />} loading={isFetching} disabled={isLoadingDropdowns}>
            تطبيق
          </Button>
        </form>

        <div style={{ flex: 1 }} />

        <Button onClick={handleDownloadExcel} disabled={isLoading || costs.length === 0} loading={isGeneratingExcel} icon={<FileExcelOutlined />}>
          Excel
        </Button>
        <Button onClick={handleGeneratePdf} disabled={isLoading || costs.length === 0} loading={isGeneratingPdf} type="primary" danger icon={<PrinterOutlined />}>
          PDF
        </Button>
      </Flex>

      {/* ── Cost by category ── */}
      {byCategory.length > 0 && (
        <Card size="small" title="التكلفة حسب الجهة" style={{ marginBottom: 12 }} styles={{ body: { padding: 0 } }}>
          <Table<CostCategoryBreakdownItem>
            rowKey="cost_category_id"
            size="small"
            columns={byCategoryColumns}
            dataSource={byCategory}
            loading={isLoading || isFetching}
            pagination={false}
          />
        </Card>
      )}

      {/* ── Table ── */}
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table<Cost>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={costs}
          loading={isLoading || isFetching}
          scroll={{ x: 'max-content', y: 520 }}
          sticky
          locale={{ emptyText: 'لا توجد بيانات' }}
          onRow={(record) => ({
            style: !record.doctor_shift_id ? { backgroundColor: '#FFF8E1' } : undefined,
          })}
          pagination={{
            current: currentPage,
            pageSize: 20,
            total: meta?.total ?? 0,
            showSizeChanger: false,
            onChange: (page) => setCurrentPage(page),
          }}
          summary={() =>
            summary && costs.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={6} align="center">
                    <Text strong>الإجمالي</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="center">
                    <Text strong>{formatNumber(summary.total_cash_paid)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="center">
                    <Text strong>{formatNumber(summary.total_bank_paid)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="center">
                    <Text strong>{formatNumber(summary.grand_total_paid)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null
          }
        />
      </Card>

      <Modal
        open={isPdfPreviewOpen}
        onCancel={() => setIsPdfPreviewOpen(false)}
        width="80%"
        title="تقرير التكاليف"
        footer={[
          <Button key="download" icon={<DownloadOutlined />} disabled={!pdfUrl} onClick={() => {
            if (!pdfUrl) return;
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = pdfFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}>
            تنزيل
          </Button>,
          <Button key="close" type="primary" onClick={() => setIsPdfPreviewOpen(false)}>
            إغلاق
          </Button>,
        ]}
      >
        {(!pdfUrl || isGeneratingPdf) ? (
          <Flex align="center" justify="center" style={{ height: '75vh' }}>
            <Title level={5} type="secondary">جاري التوليد...</Title>
          </Flex>
        ) : (
          <iframe src={pdfUrl} title="costs-report" style={{ width: '100%', height: '75vh', border: 'none' }} />
        )}
      </Modal>
    </div>
  );
};

export default CostsReportPage;
