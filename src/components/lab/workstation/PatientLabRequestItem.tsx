// src/components/lab/workstation/PatientLabRequestItem.tsx
import React, { useMemo } from "react";
// import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Lock,
  Heart,
  Globe,
  Shield,
} from "lucide-react";
import type { PatientLabQueueItem } from "@/types/labWorkflow";

import type { ItemState, LabAppearanceSettings } from "@/lib/appearance-settings-store";

interface PatientLabRequestItemProps {
  item: PatientLabQueueItem;
  isSelected: boolean;
  onSelect: () => void;
  allRequestsPaid?: boolean;
  isResultLocked?: boolean;
  isLastResultPending?: boolean; 
  isReadyForPrint?: boolean;
  appearanceSettings: LabAppearanceSettings;
  showNewPaymentBadge?: boolean;
}

const PatientLabRequestItem: React.FC<PatientLabRequestItemProps> = ({
  appearanceSettings,
  item,
  isSelected,
  onSelect,
  allRequestsPaid,
  isLastResultPending,
  isReadyForPrint,
  showNewPaymentBadge = false,
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

 const paymentStatusBadgeStyle = useMemo(() => {
  if (allRequestsPaid === undefined) return { backgroundColor: appearanceSettings.default.badgeBackgroundColor, color: appearanceSettings.default.badgeTextColor };
  return allRequestsPaid
    ? { backgroundColor: '#10B981', color: '#FFFFFF' } // Hardcode Green for paid
    : { backgroundColor: '#EF4444', color: '#FFFFFF' }; // Hardcode Red for unpaid
}, [allRequestsPaid, appearanceSettings]);

  // console.log(item,'item')

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (item.total_result_count === 0) return 0;
    const completedCount = item.total_result_count - item.pending_result_count;
    return Math.round((completedCount / item.total_result_count) * 100);
  }, [item.total_result_count, item.pending_result_count]);

  console.log(item,'item');
//  console.log(isLastResultPending,'isLastResultPending',isSelected,'isSelected',isReadyForPrint,'isReadyForPrint')

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      // APPLY STYLES DYNAMICALLY USING CSS VARIABLES
      style={{
        '--bg-color': '#f0f5f7',
        '--border-color': currentStyle.borderColor,
        '--text-color': currentStyle.textColor,
      } as React.CSSProperties}
      className={cn(
        "w-[50px] h-[45px] border-1 border-black font-bold duration-2500! flex-shrink-0 rounded-md cursor-pointer transition-all duration-200 ease-out",
        "flex flex-col items-center justify-center relative group border",
        // "hover:scale-105 f focus:ring-2 focus:ring-offset-2 bg-[#f0f5f7]",
        item.is_printed && "bg-[#01b9ff] text-black! font-bold",
        isSelected && "bg-[#fee685]",
        "active:scale-95 transform-gpu",
        isLastResultPending &&   "animate-heartbeat",
        isLastResultPending  && "animate__animated animate__heartBeat animate__infinite animate__slow",
        isReadyForPrint && item.result_auth == false && "animate__animated animate__bounce animate__infinite animate__slow",
        isClicking && "opacity-50 cursor-not-allowed", // Visual feedback when clicking

        // Use CSS variables for dynamic styling
        " text-[var(--text-color)]",
        // isSelected && 'ring-1 ring-[var(--border-color)] shadow-lg'
      )}
      title={`${item.patient_name}\nID: ${item.patient_id}`}
    >
      <span className="text-lg leading-tight text-center px-1">
        {labIdentifier.length > 6 ? labIdentifier.substring(0, 5) + "…" : labIdentifier}
      </span>
      
      {item.test_count > 0 && (
        <div
          style={{
            backgroundColor: allRequestsPaid ? '#10B981' : 'red',
            color: paymentStatusBadgeStyle.color,
          }}
          className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1.5 text-[10px] font-bold leading-tight rounded-full shadow-sm border-2 border-[var(--bg-color)] flex items-center justify-center"
        >
          {item.test_count}
        </div>
      )}
    {item.result_auth != false && (
      <div className="absolute -bottom-1 -right-1 p-0.5 bg-[var(--bg-color)] rounded-full shadow-sm border border-[var(--border-color)]">
        <Shield className="h-3 w-3" style={{ color: 'black' }} />
      </div>
    )}
      {item.is_result_locked && (
        <div className="absolute -bottom-1 -left-1 p-0.5 bg-[var(--bg-color)] rounded-full shadow-sm border border-[var(--border-color)]">
          <Lock className="h-3 w-3" style={{ color: lockIconColor }} />
        </div>
      )}

      {Boolean(item.company) && (
        <div className="absolute -bottom-1 -right-1 p-0.5 bg-[var(--bg-color)] rounded-full shadow-sm border border-[var(--border-color)]">
          <Heart className="h-3 w-3 text-red-500 fill-red-500" />
        </div>
      )}

      {item.lab_to_lab_object_id && (
        <div className="absolute -top-1 -left-1 p-0.5 bg-[var(--bg-color)] rounded-full shadow-sm border border-[var(--border-color)]">
          <Globe className="h-3 w-3 text-blue-500" />
        </div>
      )}

      {showNewPaymentBadge && (
        <div className="absolute -top-1 -left-1 h-4 w-4 bg-green-500 rounded-full shadow-lg border-2 border-white animate-pulse">
          <div className="h-full w-full bg-green-500 rounded-full animate-ping opacity-75"></div>
        </div>
      )}

      {/* Progress Bar */}
      {item.total_result_count > 0 && (
        <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-gray-200 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}
    
    </div>
  );
};

export default PatientLabRequestItem;
