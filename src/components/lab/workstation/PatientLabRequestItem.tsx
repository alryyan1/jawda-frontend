import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card'; // Using Card for the item's container
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale'; // For localized time ago
import { User, FlaskConical, Clock, Hash } from 'lucide-react'; // Example icons
import type { PatientLabQueueItem } from '@/types/labWorkflow';

interface PatientLabRequestItemProps {
  item: PatientLabQueueItem;
  isSelected: boolean;
  onSelect: () => void; // Callback when this item is clicked
}

const PatientLabRequestItem: React.FC<PatientLabRequestItemProps> = ({ item, isSelected, onSelect }) => {
  const { t, i18n } = useTranslation(['labResults', 'common']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const displayId = item.sample_id || `${t('labResults:patientLabItem.requestIdShort')}${item.lab_request_ids?.[0] || item.visit_id}`;
  const waitingTime = item.oldest_request_time 
    ? formatDistanceToNow(parseISO(item.oldest_request_time), { addSuffix: true, locale: dateLocale })
    : null;

  return (
    <Card
      className={cn(
        "p-2.5 rounded-md cursor-pointer transition-all duration-150 ease-in-out",
        "hover:shadow-md dark:hover:bg-slate-700/30",
        isSelected 
          ? "bg-primary/10 dark:bg-primary/20 ring-2 ring-primary shadow-lg" 
          : "bg-card dark:bg-slate-800/50 ring-1 ring-transparent hover:ring-slate-300 dark:hover:ring-slate-700"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      aria-selected={isSelected}
      aria-label={`${t('common:select')} ${item.patient_name}, ${displayId}`}
    >
      <div className="flex justify-between items-start gap-2">
        {/* Left side: Patient Info */}
        <div className="min-w-0 flex-grow">
          <div className="flex items-center gap-1.5 mb-0.5">
            <User className="h-3.5 w-3.5 text-primary flex-shrink-0"/>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title={item.patient_name}>
              {item.patient_name}
            </p>
          </div>
          <p className="text-xs text-muted-foreground truncate" title={displayId}>
            <Hash className="inline h-3 w-3 ltr:mr-0.5 rtl:ml-0.5"/> {displayId}
          </p>
        </div>

        {/* Right side: Test Count & Waiting Time */}
        <div className="text-right flex-shrink-0 space-y-0.5">
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground" title={t('common:countTests', {count: item.test_count})}>
            <FlaskConical className="h-3.5 w-3.5" />
            <span>{item.test_count}</span>
          </div>
          {waitingTime && (
            <div className="flex items-center justify-end gap-1 text-[10px] text-amber-600 dark:text-amber-500" title={t('common:waitingSince', {time: new Date(item.oldest_request_time).toLocaleString()})}>
              <Clock className="h-3 w-3" />
              <span className="whitespace-nowrap">{waitingTime}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PatientLabRequestItem;