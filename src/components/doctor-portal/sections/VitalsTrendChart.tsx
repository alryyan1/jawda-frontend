import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import type { VisitVital } from '@/types/vitals';

interface VitalsTrendChartProps {
  vitals: VisitVital[];
}

const GRID_COLOR = '#e1e0d9';
const AXIS_COLOR = '#898781';
const SERIES_BLUE = '#2a78d6';
const SERIES_GREEN = '#008300';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

const MiniLineChart: React.FC<{
  title: string;
  data: { date: string; value: number | null }[];
  unit: string;
  color?: string;
}> = ({ title, data, unit, color = SERIES_BLUE }) => (
  <Card>
    <CardContent className="p-3">
      <span className="text-xs font-semibold text-muted-foreground">
        {title} ({unit})
      </span>
      <div className="mt-2 h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: AXIS_COLOR }} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: AXIS_COLOR }} axisLine={false} tickLine={false} width={32} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

const VitalsTrendChart: React.FC<VitalsTrendChartProps> = ({ vitals }) => {
  if (vitals.length < 2) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          <span className="text-sm">يلزم تسجيل قراءتين على الأقل لعرض الاتجاه عبر الزيارات</span>
        </CardContent>
      </Card>
    );
  }

  const bpData = vitals.map((v) => ({
    date: formatDate(v.recorded_at),
    systolic: v.blood_pressure_systolic,
    diastolic: v.blood_pressure_diastolic,
  }));
  const hrData = vitals.map((v) => ({ date: formatDate(v.recorded_at), value: v.heart_rate }));
  const respiratoryData = vitals.map((v) => ({ date: formatDate(v.recorded_at), value: v.respiratory_rate }));
  const tempData = vitals.map((v) => ({ date: formatDate(v.recorded_at), value: v.temperature }));
  const weightData = vitals.map((v) => ({ date: formatDate(v.recorded_at), value: v.weight }));
  const painData = vitals.map((v) => ({ date: formatDate(v.recorded_at), value: v.pain_scale }));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-3">
          <span className="text-xs font-semibold text-muted-foreground">ضغط الدم (mmHg)</span>
          <div className="mt-2 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bpData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: AXIS_COLOR }} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: AXIS_COLOR }} axisLine={false} tickLine={false} width={32} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" name="انقباضي" dataKey="systolic" stroke={SERIES_BLUE} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" name="انبساطي" dataKey="diastolic" stroke={SERIES_GREEN} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MiniLineChart title="معدل ضربات القلب" data={hrData} unit="bpm" />
        <MiniLineChart title="معدل التنفس" data={respiratoryData} unit="/min" />
        <MiniLineChart title="درجة الحرارة" data={tempData} unit="°C" />
        <MiniLineChart title="الوزن" data={weightData} unit="kg" />
        <MiniLineChart title="درجة الألم" data={painData} unit="/10" />
      </div>
    </div>
  );
};

export default VitalsTrendChart;
