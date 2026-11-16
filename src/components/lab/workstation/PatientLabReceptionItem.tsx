// src/components/lab/workstation/PatientLabReceptionItem.tsx
import React, { useMemo } from "react";
// import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Lock,
  Heart,
  Globe,
  Shield,
  BedDouble,
} from "lucide-react";
import type { PatientLabQueueItem } from "@/types/labWorkflow";

import type { ItemState, LabAppearanceSettings } from "@/lib/appearance-settings-store";

interface PatientLabReceptionItemProps {
  item: PatientLabQueueItem;
  isSelected: boolean;
  onSelect: () => void;
  allRequestsPaid?: boolean;
  isResultLocked?: boolean;
  isLastResultPending?: boolean; 
  isReadyForPrint?: boolean;
  appearanceSettings: LabAppearanceSettings;
  showNewPaymentBadge?: boolean;
  /** A doctor just sent lab tests for this visit ("Send to Lab") — shows a pulsing dot for a while. */
  showNewLabRequestBadge?: boolean;
}

const PatientLabReceptionItem: React.FC<PatientLabReceptionItemProps> = ({
  appearanceSettings,
  item,
  isSelected,
  onSelect,
  allRequestsPaid,
  isLastResultPending,
  isReadyForPrint,
  showNewPaymentBadge = false,
  showNewLabRequestBadge = false,
}) => {
  // Debounce click handler to prevent rapid successive clicks
  const [isClicking, setIsClicking] = React.useState(false);
  
  const handleClick = React.useCallback(() => {
    if (isClicking) return; // Prevent multiple rapid clicks
    
    setIsClicking(true);
    onSelect();
    
    // Reset clicking state after 300ms
    setTimeout(() => {
      setIsClicking(false);
    }, 300);
  }, [onSelect, isClicking]);
  
  // const { t } = useTranslation(["labResults", "common", "whatsapp"]);
  const labIdentifier =
    item.lab_number ||
    `L${item.lab_request_ids?.[0] || item.visit_id}`;



  // Determine the current state to apply styles
  const currentState: ItemState = useMemo(() => {
    if (isSelected) return 'selected';
    if (item.is_printed) return 'printed';
    return 'default';
  }, [isSelected, item.is_printed]);
   // Get the style object for the current state
 const currentStyle = appearanceSettings[currentState];
 const lockIconColor = appearanceSettings.isLocked.iconColor;



  // console.log(item,'item')

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (item.total_result_count === 0) return 0;
    const completedCount = item.total_result_count - item.pending_result_count;
    return Math.round((completedCount / item.total_result_count) * 100);
  }, [item.total_result_count, item.pending_result_count]);

  // console.log(item,'item');
//  console.log(isLastResultPending,'isLastResultPending',isSelected,'isSelected',isReadyForPrint,'isReadyForPrint')
  const paymentBadgeColor = allRequestsPaid === undefined
    ? appearanceSettings.default.badgeBackgroundColor
    : allRequestsPaid ? '#10B981' /* emerald-500 */ : '#EF4444'; /* red-500 */

  // Small status icons (lock / insurance auth / company) are grouped into one
  // tray under the tile instead of fighting over the same corners, so any
  // combination of them can show at once without overlapping each other.
  const statusIcons: React.ReactNode[] = [];
  if (item.is_result_locked) {
    statusIcons.push(
      <Lock key="locked" className="h-2.5 w-2.5" style={{ color: lockIconColor }} />
    );
  }
  if (item.result_auth != false) {
    statusIcons.push(
      <Shield key="auth" className="h-2.5 w-2.5" style={{ color: '#10B981' }} />
    );
  }
  if (item.company) {
    statusIcons.push(
      <Heart key="company" className="h-2.5 w-2.5 text-red-500 fill-red-500" />
    );
  }
  if (item.from_admission) {
    statusIcons.push(
      <BedDouble key="admission" className="h-2.5 w-2.5 text-purple-500" />
    );
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      // Dynamic colors come from the user's appearance settings (Settings → المختبر)
      style={{
        '--tile-bg': currentStyle.backgroundColor,
        '--border-color': currentStyle.borderColor,
        '--text-color': currentStyle.textColor,
      } as React.CSSProperties}
      className={cn(
        "relative flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center gap-0.5",
        "rounded-xl border cursor-pointer select-none",
        "bg-[var(--tile-bg)] border-[var(--border-color)] text-[var(--text-color)]",
        "shadow-sm transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md hover:z-10",
        "active:translate-y-0 active:scale-95",
        currentStyle.isBold && "font-bold",
        isLastResultPending && "animate__animated animate__heartBeat animate__infinite animate__slow",
        isReadyForPrint && "animate__animated animate__bounce animate__infinite animate__slow",
        showNewLabRequestBadge && "ring-2 ring-purple-500 ring-offset-1 animate-pulse",
        isClicking && "opacity-50 cursor-not-allowed",
      )}
      title={`${item.patient_name}\nID: ${item.patient_id}`}
    >
      <span className="px-1 text-center text-sm leading-tight">
        {labIdentifier.length > 6 ? labIdentifier.substring(0, 5) + "…" : labIdentifier}
      </span>

      {item.test_count > 0 && (
        <div
          style={{ backgroundColor: paymentBadgeColor }}
          className={cn(
            "absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5",
            "text-[10px] font-bold leading-tight text-white shadow-sm border-2 border-[var(--tile-bg)]",
            showNewPaymentBadge && "ring-2 ring-green-400 ring-offset-1 ring-offset-[var(--tile-bg)] animate-pulse"
          )}
        >
          {item.test_count}
        </div>
      )}

      {item.lab_to_lab_object_id && (
        <div className="absolute -top-1 -left-1 rounded-full border border-[var(--border-color)] bg-[var(--tile-bg)] p-0.5 shadow-sm">
          <Globe className="h-2.5 w-2.5 text-blue-500" />
        </div>
      )}

      {showNewLabRequestBadge && (
        <span className="absolute -top-1.5 left-1/2 flex h-2.5 w-2.5 -translate-x-1/2" title="طلب فحوصات جديد من الطبيب">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-purple-500" />
        </span>
      )}

      {statusIcons.length > 0 && (
        <div className="absolute -bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-[var(--border-color)] bg-[var(--tile-bg)] px-1 py-0.5 shadow-sm">
          {statusIcons}
        </div>
      )}

      {/* Progress Bar */}
      {item.total_result_count > 0 && (
        <div className="absolute inset-x-1 bottom-0.5 h-0.5 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default PatientLabReceptionItem;


