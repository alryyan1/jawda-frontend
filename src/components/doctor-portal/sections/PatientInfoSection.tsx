import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DoctorVisit } from '@/types/visits';

interface PatientInfoSectionProps {
  visit: DoctorVisit | undefined;
}

interface InfoRowProps {
  label: string;
  value?: string | number | null;
  className?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, className }) => (
  <div className={cn('mb-1', className)}>
    <span className="block text-[0.68rem] text-muted-foreground mb-0.5">
      {label}
    </span>
    <span className="block text-[0.8rem] font-medium">
      {value ?? '—'}
    </span>
  </div>
);

const GENDER_MAP: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
  other: 'آخر',
};

const SOCIAL_STATUS_MAP: Record<string, string> = {
  single: 'أعزب',
  married: 'متزوج',
  widowed: 'أرمل',
  divorced: 'مطلق',
};

const PatientInfoSection: React.FC<PatientInfoSectionProps> = ({ visit }) => {
  if (!visit) {
    return (
      <div className="p-6 text-center text-muted-foreground/60">
        <p>لم يتم تحديد مريض</p>
      </div>
    );
  }

  const p = visit.patient;
  const hasInsurance = !!p.company_id;

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Demographics */}
      <Card className="p-4 gap-0 rounded-2xl shadow-none">
        <h3 className="text-sm font-bold mb-3">البيانات الشخصية</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <InfoRow label="الاسم" value={p.name} />
          <InfoRow label="رقم الهاتف" value={p.phone} />
          <InfoRow label="الجنس" value={GENDER_MAP[p.gender] ?? p.gender} />
          <InfoRow label="العمر" value={p.full_age ?? (p.age_year ? `${p.age_year} سنة` : null)} />
          <InfoRow label="الرقم الوطني" value={p.gov_id} />
          <InfoRow label="الحالة الاجتماعية" value={p.social_status ? SOCIAL_STATUS_MAP[p.social_status] : null} />
          {p.address && <InfoRow label="العنوان" value={p.address} className="col-span-2 sm:col-span-3" />}
          {p.email && <InfoRow label="البريد الإلكتروني" value={p.email} />}
          {p.nationality && <InfoRow label="الجنسية" value={p.nationality} />}
          {p.dob && <InfoRow label="تاريخ الميلاد" value={p.dob} />}
        </div>
      </Card>

      {/* Insurance */}
      {hasInsurance && (
        <Card className="p-4 gap-0 rounded-2xl shadow-none">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold">التأمين والشركة</h3>
            <Badge className="bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30">
              {(p.company as any)?.name ?? 'شركة'}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <InfoRow label="رقم التأمين" value={p.insurance_no} />
            <InfoRow label="الكفيل" value={p.guarantor} />
            <InfoRow label="تاريخ الانتهاء" value={p.expire_date} />
            {p.subcompany && <InfoRow label="الشركة الفرعية" value={(p.subcompany as any)?.name} />}
            {p.company_relation && <InfoRow label="العلاقة" value={(p.company_relation as any)?.name} />}
          </div>
        </Card>
      )}

      {/* Visit info */}
      <Card className="p-4 gap-0 rounded-2xl shadow-none">
        <h3 className="text-sm font-bold mb-3">بيانات الزيارة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <InfoRow label="رقم الملف" value={visit.file_id} />
          <InfoRow label="رقم الزيارة" value={visit.number} />
          <InfoRow label="تاريخ الزيارة" value={visit.visit_date} />
          <InfoRow label="وقت الزيارة" value={visit.visit_time_formatted} />
          <InfoRow label="نوع الزيارة" value={visit.visit_type ?? (visit.is_new ? 'جديد' : 'متابعة')} />
        </div>
      </Card>
    </div>
  );
};

export default PatientInfoSection;
