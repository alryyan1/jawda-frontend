import React from 'react';
import { useTranslation } from 'react-i18next';
import { format, type Locale } from 'date-fns';
import { 
  UserCircle, 
  X, 
  VenusAndMars, 
  CalendarDays, 
  Phone,
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DoctorVisit } from '@/types/visits';
import type { Patient } from '@/types/patients';

interface VisitHeaderProps {
  visit: DoctorVisit;
  patient: Patient;
  onClose?: () => void;
  dateLocale: Locale;
  onStatusChange: (status: string) => void;
  statusUpdatePending: boolean;
}

const VISIT_STATUSES = ['open', 'in_progress', 'completed', 'cancelled', 'no_show'];

export const VisitHeader: React.FC<VisitHeaderProps> = ({
  visit,
  patient,
  onClose,
  dateLocale,
  onStatusChange,
  statusUpdatePending
}) => {
  const { t, i18n } = useTranslation(['common', 'clinic']);

  const getAgeString = (p: Patient) => {
    const parts = [];
    if (p.age_year !== null && p.age_year !== undefined) {
      parts.push(`${p.age_year}${t("common:years_shortInitial", "Y")}`);
    }
    if (p.age_month !== null && p.age_month !== undefined) {
      parts.push(`${p.age_month}${t("common:months_shortInitial", "M")}`);
    }
    if (p.age_day !== null && p.age_day !== undefined) {
      parts.push(`${p.age_day}${t("common:days_shortInitial", "D")}`);
    }
    return parts.length > 0 ? parts.join(" ") : t("common:notAvailable_short", "N/A");
  };

  return (
    <header className="flex-shrink-0 p-3 sm:p-4 border-b bg-card sticky top-0 z-20">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <UserCircle className="h-8 w-8 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h2
              className="text-lg sm:text-xl font-semibold truncate"
              title={patient.name}
            >
              {patient.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("common:visitId", "Visit #")}
              {visit.id} -{" "}
              {visit.visit_date
                ? format(new Date(visit.visit_date), "PPP", {
                    locale: dateLocale,
                  })
                : ""}
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground items-center">
        <span className="flex items-center">
          <VenusAndMars className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5" />
          {t(`common:genderEnum.${patient.gender}`, patient.gender)}
        </span>
        <span className="flex items-center">
          <CalendarDays className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5" />
          {getAgeString(patient)}
        </span>
        <span className="flex items-center">
          <Phone className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5" />
          {patient.phone}
        </span>
        <div className="flex items-center gap-1">
          <Label htmlFor={`visit-status-${visit.id}`} className="text-xs">
            {t("common:status")}:
          </Label>
          <Select
            value={visit.status}
            onValueChange={onStatusChange}
            disabled={statusUpdatePending}
            dir={i18n.dir()}
          >
            <SelectTrigger
              id={`visit-status-${visit.id}`}
              className="h-7 text-xs px-2 py-1 w-auto min-w-[120px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIT_STATUSES.map((statusKey) => (
                <SelectItem key={statusKey} value={statusKey}>
                  {t(`clinic:workspace.status.${statusKey}`, statusKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusUpdatePending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </div>
      </div>
      {visit.doctor && (
        <p className="text-xs text-muted-foreground mt-1">
          {t("common:doctor")}: {visit.doctor.name}
        </p>
      )}
    </header>
  );
};

export default VisitHeader; 