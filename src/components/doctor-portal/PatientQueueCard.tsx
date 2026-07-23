import React from 'react';
import { cn, formatNumber } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Mars, Venus, Phone, ClipboardList, ShieldCheck, FolderOpen } from 'lucide-react';
import type { ActivePatientVisit } from '@/types/patients';

interface PatientQueueCardProps {
  visit: ActivePatientVisit;
  isSelected: boolean;
  onSelect: (visit: ActivePatientVisit) => void;
  /** Just arrived via realtime — flash an entrance animation + a pulsing "new" dot. */
  isNew?: boolean;
}

type StatusKey =
  | 'waiting'
  | 'with_doctor'
  | 'lab_pending'
  | 'imaging_pending'
  | 'payment_pending'
  | 'completed'
  | 'cancelled'
  | 'no_show';

const STATUS_CONFIG: Record<StatusKey, { label: string; badgeClassName: string; dot: string }> = {
  waiting:         { label: 'انتظار',      badgeClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',       dot: 'bg-blue-400' },
  with_doctor:     { label: 'مع الطبيب',  badgeClassName: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100', dot: 'bg-orange-400' },
  lab_pending:     { label: 'مختبر',       badgeClassName: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100', dot: 'bg-purple-400' },
  imaging_pending: { label: 'تصوير',       badgeClassName: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100', dot: 'bg-indigo-400' },
  payment_pending: { label: 'دفع',         badgeClassName: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100', dot: 'bg-yellow-400' },
  completed:       { label: 'مكتملة',      badgeClassName: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',   dot: 'bg-green-400' },
  cancelled:       { label: 'ملغاة',       badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',           dot: 'bg-red-400' },
  no_show:         { label: 'غائب',        badgeClassName: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',       dot: 'bg-gray-400' },
};

const formatAge = (visit: ActivePatientVisit): string => {
  const p = visit.patient;
  if (p.full_age) return p.full_age;
  const parts: string[] = [];
  if (p.age_year) parts.push(`${p.age_year}س`);
  if (p.age_month) parts.push(`${p.age_month}ش`);
  if (p.age_day) parts.push(`${p.age_day}ي`);
  return parts.join(' ') || '—';
};

const PatientQueueCard: React.FC<PatientQueueCardProps> = ({ visit, isSelected, onSelect, isNew = false }) => {
  const status = (visit.status as StatusKey) || 'waiting';
  const cfg = STATUS_CONFIG[status] ?? { label: status, badgeClassName: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100', dot: 'bg-slate-400' };
  const hasCompany = !!visit.patient.company_id;
  const isPaid = visit.balance_due <= 0;
  const queueNumber = visit.number || visit.queue_number || '—';

  return (
    <Card
      onClick={() => onSelect(visit)}
      className={cn(
        'relative cursor-pointer p-0 mb-2 gap-0 overflow-hidden border flex-row items-stretch transition-colors duration-150',
        isSelected
          ? 'border-primary/60 bg-primary/[0.06] shadow-sm'
          : 'border-border/70 hover:border-border hover:bg-muted/40',
        isNew && 'animate__animated animate__fadeInDown border-sky-400/60'
      )}
    >
      {/* "New patient" indicator — a dot with an expanding circular wave */}
      {isNew && (
        <span className="absolute -top-1 -right-1 z-10 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500" />
        </span>
      )}

      {/* Status accent bar */}
      <div className={cn('w-1 shrink-0', cfg.dot)} />

      {/* Queue number */}
      <div className="flex items-center justify-center w-11 shrink-0">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 bg-background',
            isPaid ? 'border-green-600 text-green-700 dark:text-green-400' : 'border-destructive text-destructive'
          )}
        >
          {queueNumber}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 py-2 pe-3 flex flex-col gap-1">
        {/* Name row */}
        <div className="flex items-center gap-1.5">
          {visit.patient.gender === 'male' ? (
            <Mars size={13} className="text-blue-500 shrink-0" />
          ) : (
            <Venus size={13} className="text-rose-400 shrink-0" />
          )}
          <span className="flex-1 min-w-0 text-[0.82rem] font-semibold leading-tight truncate" title={visit.patient.name}>
            {visit.patient.name}
          </span>
        
        </div>

        {/* Meta row: age, phone, file id */}
        <div className="flex items-center gap-2 text-[0.68rem] text-muted-foreground">
          {/* <span>{formatAge(visit)}</span> */}
          {/* {visit.patient.phone && (
            <span className="flex items-center gap-0.5 truncate">
              <Phone size={10} className="shrink-0" />
              {visit.patient.phone}
            </span>
          )} */}
          {visit.file_id != null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5">
                  <FolderOpen size={10} className="shrink-0" />
                  {visit.file_id}
                </span>
              </TooltipTrigger>
              <TooltipContent>رقم الملف</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Badge row: status, insurance, services, balance */}
        <div className="flex items-center gap-1 flex-wrap">
        

          {hasCompany && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="h-4 px-1.5 gap-0.5 text-[0.62rem] font-medium border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300">
                  <ShieldCheck size={9} />
                  تأمين
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{visit.patient.company?.name ?? 'شركة تأمين'}</TooltipContent>
            </Tooltip>
          )}

          {visit.requested_services_count > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="h-4 px-1.5 gap-0.5 text-[0.62rem] font-medium text-muted-foreground">
                  <ClipboardList size={9} />
                  {visit.requested_services_count}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>عدد الخدمات المطلوبة</TooltipContent>
            </Tooltip>
          )}

          {!isPaid && (
            <span className="ms-auto text-[0.65rem] font-bold text-destructive whitespace-nowrap">
              {formatNumber(visit.balance_due)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PatientQueueCard;
