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
}

const PatientLabRequestItem: React.FC<PatientLabRequestItemProps> = ({
  appearanceSettings,
  item,
  isSelected,
  onSelect,
  allRequestsPaid,
  isResultLocked,
  isLastResultPending,
  isReadyForPrint,
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



//  console.log(isLastResultPending,'isLastResultPending',isSelected,'isSelected',isReadyForPrint,'isReadyForPrint')

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      // APPLY STYLES DYNAMICALLY USING CSS VARIABLES
      style={{
        '--bg-color': currentStyle.backgroundColor,
        '--border-color': currentStyle.borderColor,
        '--text-color': currentStyle.textColor,
      } as React.CSSProperties}
      className={cn(
        "w-[54px] h-[54px]  flex-shrink-0 rounded-lg cursor-pointer transition-all duration-200 ease-out",
        "flex flex-col items-center justify-center relative group border",
        "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2",
        item.is_printed && "bg-[#708deb] text-white!",
        "active:scale-95 transform-gpu",
        isLastResultPending && !isSelected && "animate-heartbeat",
        isLastResultPending && !isSelected && "animate__animated animate__heartBeat animate__infinite animate__slow",
        isReadyForPrint && !isSelected && "animate__animated animate__bounce animate__infinite animate__slow",

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
            backgroundColor: '#92b7ff',
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

    
    </div>
  );
};

export default PatientLabRequestItem;
