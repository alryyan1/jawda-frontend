// src/components/lab/workstation/PatientLabRequestItem.tsx
import React, { useMemo } from "react";
// import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Lock, Heart, Globe, Shield, Printer } from "lucide-react";
import type { PatientLabQueueItem } from "@/types/labWorkflow";

import type {
  ItemState,
  LabAppearanceSettings,
} from "@/lib/appearance-settings-store";

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
  hasUnreadMessage?: boolean;
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
  hasUnreadMessage = false,
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
    item.lab_number || `L${item.lab_request_ids?.[0] || item.visit_id}`;

  // Determine the current state to apply styles
  const currentState: ItemState = useMemo(() => {
    if (isSelected) return "selected";
    if (item.is_printed) return "printed";
    return "default";
  }, [isSelected, item.is_printed]);
  // Get the style object for the current state
  const currentStyle = appearanceSettings[currentState];
  const lockIconColor = appearanceSettings.isLocked.iconColor;

  const paymentStatusBadgeStyle = useMemo(() => {
    if (allRequestsPaid === undefined)
      return {
        backgroundColor: appearanceSettings.default.badgeBackgroundColor,
        color: appearanceSettings.default.badgeTextColor,
      };
    return allRequestsPaid
      ? { backgroundColor: "#10B981", color: "#FFFFFF" } // Hardcode Green for paid
      : { backgroundColor: "#EF4444", color: "#FFFFFF" }; // Hardcode Red for unpaid
  }, [allRequestsPaid, appearanceSettings]);

  // console.log(item,'item')

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (item.total_result_count === 0) return 0;
    const completedCount = item.total_result_count - item.pending_result_count;
    return Math.round((completedCount / item.total_result_count) * 100);
  }, [item.total_result_count, item.pending_result_count]);

  // console.log(item,'item');
  //  console.log(isLastResultPending,'isLastResultPending',isSelected,'isSelected',isReadyForPrint,'isReadyForPrint')

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      // APPLY STYLES DYNAMICALLY USING CSS VARIABLES
      style={
        {
          "--bg-color": "#f0f5f7",
          "--border-color": currentStyle.borderColor,
          "--text-color": currentStyle.textColor,
        } as React.CSSProperties
      }
      className={cn(
        "w-[50px] h-[45px] border-1 border-black font-bold duration-2500! flex-shrink-0 rounded-md cursor-pointer transition-all duration-200 ease-out",
        "flex flex-col items-center justify-center relative group border",
        // "hover:scale-105 f focus:ring-2 focus:ring-offset-2 bg-[#f0f5f7]",
        item.is_printed && "bg-[#01b9ff] text-black! font-bold",
        item.result_auth != false && "bg-[#01b9ff] text-black! font-bold",
        isSelected && "bg-[#fee685]",
        "active:scale-95 transform-gpu",
        isLastResultPending && "animate-heartbeat",
        isLastResultPending &&
          "animate__animated animate__heartBeat animate__infinite animate__slow",
        isReadyForPrint &&
          item.result_auth == false &&
          "animate__animated animate__bounce animate__infinite animate__slow",
        isClicking && "opacity-50 cursor-not-allowed", // Visual feedback when clicking

        // Use CSS variables for dynamic styling
        " text-[var(--text-color)]",
        // isSelected && 'ring-1 ring-[var(--border-color)] shadow-lg'
      )}
      title={`${item.patient_name}\nID: ${item.patient_id}`}
    >
      <span className="text-lg leading-tight text-center px-1">
        {labIdentifier.length > 6
          ? labIdentifier.substring(0, 5) + "…"
          : labIdentifier}
      </span>

      {item.test_count > 0 && (
        <div
          style={{
            backgroundColor: allRequestsPaid ? "#10B981" : "red",
            color: paymentStatusBadgeStyle.color,
          }}
          className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1.5 text-[10px] font-bold leading-tight rounded-full shadow-sm border-2 border-[var(--bg-color)] flex items-center justify-center"
        >
          {item.test_count}
        </div>
      )}
      {item.is_printed && (
        <div className="absolute -bottom-1 -right-1 p-0.5 bg-[var(--bg-color)] rounded-full shadow-sm border border-[var(--border-color)]">
          <Printer className="h-3 w-3" style={{ color: "black" }} />
        </div>
      )}
      {item.is_result_locked && (
        <div className="absolute -bottom-1 -left-1 p-0.5 bg-[var(--bg-color)] rounded-full shadow-sm border border-[var(--border-color)]">
          <Lock className="h-3 w-3" style={{ color: lockIconColor }} />
        </div>
      )}

      {/* WhatsApp Unread Badge */}
      {hasUnreadMessage && (
        <div className="absolute -top-2 -left-2 z-50 p-0.5 bg-white rounded-full shadow-md animate-bounce">
          <div className="bg-[#25D366] rounded-full p-0.5">
            <svg
              className="w-3 h-3 text-white fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </div>
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
