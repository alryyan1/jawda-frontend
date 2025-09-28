// src/components/lab/workstation/PatientLabRequestItem.tsx
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Lock,
  Heart,
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
  const { t } = useTranslation(["labResults", "common", "whatsapp"]);
  const labIdentifier =
    item.lab_number ||
    `${t("labResults:patientLabItem.requestIdShort")}${
      item.lab_request_ids?.[0] || item.visit_id
    }`;



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

  // showJsonDialog(item)
//  console.log(isLastResultPending,'isLastResultPending',isSelected,'isSelected',isReadyForPrint,'isReadyForPrint')
if(item.visit_id === 34218){
  console.log(item,'item')
  console.log(progressPercentage,'progressPercentage')
}
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      // APPLY STYLES DYNAMICALLY USING CSS VARIABLES
      style={{
        '--bg-color': '#f0f5f7',
        '--border-color': currentStyle.borderColor,
        '--text-color': currentStyle.textColor,
      } as React.CSSProperties}
      className={cn(
        "w-[54px] h-[54px]  duration-1000! flex-shrink-0 rounded-lg cursor-pointer transition-all duration-200 ease-out",
        "flex flex-col items-center justify-center relative group border",
        "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-[#f0f5f7]",
        item.is_printed && "bg-[#01b9ff] text-black! font-bold",
        isSelected && "bg-[#fee685]",
        "active:scale-95 transform-gpu",
        isLastResultPending &&   "animate-heartbeat",
        isLastResultPending  && "animate__animated animate__heartBeat animate__infinite animate__slow",
        isReadyForPrint  && "animate__animated animate__bounce animate__infinite animate__slow",

        // Use CSS variables for dynamic styling
        "border-[var(--border-color)] text-[var(--text-color)]",
        currentStyle.isBold ? 'font-semibold' : 'font-normal',
        isSelected && 'ring-2 ring-[var(--border-color)] shadow-lg'
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

      {item.is_result_locked && (
        <div className="absolute -bottom-1 -left-1 p-0.5 bg-[var(--bg-color)] rounded-full shadow-sm border border-[var(--border-color)]">
          <Lock className="h-3 w-3" style={{ color: lockIconColor }} />
        </div>
      )}

      {item.company && (
        <div className="absolute -bottom-1 -right-1 p-0.5 bg-[var(--bg-color)] rounded-full shadow-sm border border-[var(--border-color)]">
          <Heart className="h-3 w-3 text-red-500 fill-red-500" />
        </div>
      )}

      {showNewPaymentBadge && (
        <div className="absolute -top-1 -left-1 h-4 w-4 bg-green-500 rounded-full shadow-lg border-2 border-white animate-pulse">
          <div className="h-full w-full bg-green-500 rounded-full animate-ping opacity-75"></div>
        </div>
      )}

      {/* Progress Bar */}
      {item.total_result_count > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
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
