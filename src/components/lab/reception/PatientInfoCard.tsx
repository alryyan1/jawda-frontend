// src/components/lab/reception/PatientInfoCard.tsx (New File)
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle, Phone, CalendarDays, VenusAndMars, Building, IdCard } from 'lucide-react';
import type { Patient } from '@/types/patients';
import { cn } from '@/lib/utils';

// Reusable Detail Row
const DetailRow: React.FC<{label: string; value?: string | number | null; icon?: React.ElementType; className?: string}> = ({ label, value, icon: Icon, className }) => {
    const { t } = useTranslation("common");
    return (
        <div className={cn("grid grid-cols-[20px_auto] items-start gap-x-3 py-1", className)}>
            {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />}
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}:</p>
                <p className="text-sm font-medium text-foreground truncate" title={String(value || '')}>
                {value || <span className="italic text-slate-400 dark:text-slate-500">{t("notAvailable_short")}</span>}
                </p>
            </div>
        </div>
    );
};


interface PatientInfoCardProps {
  patient: Patient;
}

const PatientInfoCard: React.FC<PatientInfoCardProps> = ({ patient }) => {
  const { t } = useTranslation(['common', 'patients']);

  const getAgeString = useCallback((p: Patient): string => {
    if (!p) return t("common:notAvailable_short");
    const parts = [];
    if (p.age_year !== null && p.age_year !== undefined && p.age_year >= 0) parts.push(`${p.age_year}${t("common:years_shortInitial")}`);
    if (p.age_month !== null && p.age_month !== undefined && p.age_month >= 0) parts.push(`${p.age_month}${t("common:months_shortInitial")}`);
    if (p.age_day !== null && p.age_day !== undefined && p.age_day >= 0) parts.push(`${p.age_day}${t("common:days_shortInitial")}`);
    if (parts.length === 0 && (p.age_year === 0 || p.age_month === 0 || p.age_day === 0)) return `0${t("common:days_shortInitial")}`;
    return parts.length > 0 ? parts.join(" ") : t("common:notAvailable_short");
  }, [t]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-primary" />
          {t('patients:details.personalInfo')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DetailRow label={t("patients:fields.id")} value={patient.id} icon={IdCard} />
        <DetailRow label={t("common:phone")} value={patient.phone} icon={Phone} />
        <DetailRow label={t("common:gender")} value={t(`common:genderEnum.${patient.gender}`)} icon={VenusAndMars} />
        <DetailRow label={t("common:age")} value={getAgeString(patient)} icon={CalendarDays} />
        {patient.company && <DetailRow label={t("patients:fields.company")} value={patient.company.name} icon={Building} />}
      </CardContent>
    </Card>
  );
};
export default PatientInfoCard;