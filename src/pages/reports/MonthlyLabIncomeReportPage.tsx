// src/pages/reports/MonthlyLabIncomeReportPage.tsx
import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  theme,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined,
  FileTextOutlined,
  PrinterOutlined,
} from '@ant-design/icons';

import type { MonthlyLabIncomeFilters } from '@/services/reportService';
import { getMonthlyLabIncome, downloadMonthlyLabIncomeReportPdf } from '@/services/reportService';
import type { MonthlyLabIncomeReportResponse, DailyLabIncomeData } from '@/types/reports';
import { formatNumber } from '@/lib/utils';

const { Title, Text } = Typography;

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 5 + i));
const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][i],
}));

interface FilterFormValues {
  month: string;
  year: string;
}

const MonthlyLabIncomeReportPage: React.FC = () => {
  const { token } = theme.useToken();
  const [appliedFilters, setAppliedFilters] = useState<MonthlyLabIncomeFilters>({
    month: new Date().getMonth() + 1,
    year: currentYear,
  });

  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('report.pdf');

  const reportQueryKey = ['monthlyLabIncomeReport', appliedFilters] as const;
  const { data: reportData, isLoading, error, isFetching } = useQuery<MonthlyLabIncomeReportResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getMonthlyLabIncome(appliedFilters),
    placeholderData: keepPreviousData,
  });

  const handleFilterSubmit = (values: FilterFormValues) => {
    setAppliedFilters({
      month: parseInt(values.month, 10),
      year: parseInt(values.year, 10),
    });
  };

  const handleGeneratePdf = async () => {
    if (!reportData?.daily_data.length && !reportData?.summary) return;
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setPdfFileName(`MonthlyLabIncome_${reportData?.report_period.from}_to_${reportData?.report_period.to}.pdf`);
    setIsPdfPreviewOpen(true);

    try {
      const blob = await downloadMonthlyLabIncomeReportPdf(appliedFilters);
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('فشل توليد ملف PDF', { description: errorMessage });
      setIsPdfPreviewOpen(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const dailyData = reportData?.daily_data ?? [];
  const summary = reportData?.summary;

  const columns: ColumnsType<DailyLabIncomeData> = [
    {
      title: 'التاريخ',
      dataIndex: 'date',
      key: 'date',
      align: 'center',
      render: (value: string) => format(parseISO(value), 'EEEE, MMM d, yyyy'),
    },
    {
      title: 'إجمالي المدفوع للمختبر',
      dataIndex: 'total_lab_income_paid',
      key: 'total_lab_income_paid',
      align: 'right',
      render: (value: number) => <Text strong>{formatNumber(value)}</Text>,
    },
    {
      title: 'نقداً',
      dataIndex: 'total_lab_cash_paid',
      key: 'total_lab_cash_paid',
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: 'شبكة/بنك',
      dataIndex: 'total_lab_bank_paid',
      key: 'total_lab_bank_paid',
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
  ];

  return (
    <Flex vertical gap="large" style={{ padding: 16 }}>
      <Flex justify="space-between" align="center" gap="middle" wrap="wrap">
        <Space align="center">
          <FileTextOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
          <Title level={3} style={{ margin: 0 }}>
            دخل المختبر الشهري
          </Title>
        </Space>
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          loading={isGeneratingPdf}
          disabled={isLoading || dailyData.length === 0}
          onClick={handleGeneratePdf}
        >
          توليد PDF
        </Button>
      </Flex>

      <Card title="مرشحات التقرير" size="small">
        <Form
          layout="inline"
          initialValues={{
            month: String(new Date().getMonth() + 1),
            year: String(currentYear),
          }}
          onFinish={handleFilterSubmit}
        >
          <Form.Item name="month" label="الشهر" rules={[{ required: true, message: 'الشهر مطلوب' }]}>
            <Select style={{ width: 160 }} options={months} disabled={isFetching} />
          </Form.Item>
          <Form.Item name="year" label="السنة" rules={[{ required: true, message: 'السنة مطلوبة' }]}>
            <Select
              style={{ width: 120 }}
              options={years.map((y) => ({ value: y, label: y }))}
              disabled={isFetching}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isFetching}>
              تطبيق المرشحات
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {error && (
        <Alert
          type="error"
          showIcon
          title="فشل جلب البيانات: دخل المختبر الشهري"
          description={error.message}
        />
      )}

      {summary && dailyData.length > 0 && (
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="إجمالي المدفوع للشهر" value={formatNumber(summary.total_lab_income_paid)} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="نقداً" value={formatNumber(summary.total_lab_cash_paid)} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="شبكة/بنك" value={formatNumber(summary.total_lab_bank_paid)} />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title={`تفصيل يومي لشهر ${reportData?.report_period.month_name ?? ''}`}
        size="small"
      >
        <Spin spinning={isLoading || isFetching}>
          <Table<DailyLabIncomeData>
            rowKey="date"
            size="small"
            columns={columns}
            dataSource={dailyData}
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: <Empty description="لا توجد بيانات لهذه الفترة" /> }}
            summary={() =>
              summary && dailyData.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} align="center">
                      <Text strong>إجمالي المدفوع للشهر</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong type="success">
                        {formatNumber(summary.total_lab_income_paid)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      {formatNumber(summary.total_lab_cash_paid)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      {formatNumber(summary.total_lab_bank_paid)}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        </Spin>
      </Card>

      <Modal
        open={isPdfPreviewOpen}
        onCancel={() => setIsPdfPreviewOpen(false)}
        width="80%"
        title={`دخل المختبر الشهري - ${reportData?.report_period.month_name ?? ''}`}
        footer={[
          <Button
            key="download"
            icon={<DownloadOutlined />}
            disabled={!pdfUrl}
            onClick={() => {
              if (!pdfUrl) return;
              const a = document.createElement('a');
              a.href = pdfUrl;
              a.download = pdfFileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
          >
            تنزيل
          </Button>,
          <Button key="close" type="primary" onClick={() => setIsPdfPreviewOpen(false)}>
            إغلاق
          </Button>,
        ]}
      >
        {!pdfUrl || isGeneratingPdf ? (
          <Flex align="center" justify="center" style={{ height: '75vh' }}>
            <Spin size="large" />
          </Flex>
        ) : (
          <iframe
            src={pdfUrl}
            title="monthly-lab-income"
            style={{ width: '100%', height: '75vh', border: 'none' }}
          />
        )}
      </Modal>
    </Flex>
  );
};

export default MonthlyLabIncomeReportPage;
