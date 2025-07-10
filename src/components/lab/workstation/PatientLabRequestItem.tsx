// src/components/lab/workstation/PatientLabRequestItem.tsx
import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  MessageSquareText,
  FileText,
  SendToBack,
  Lock,
  Unlock,
  Heart,
} from "lucide-react";
import type { PatientLabQueueItem } from "@/types/labWorkflow";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
  // Context Menu Action Callbacks
  onSendWhatsAppText: (queueItem: PatientLabQueueItem) => void;
  onSendPdfToPatient: (queueItem: PatientLabQueueItem) => void;
  onSendPdfToCustomNumber: (queueItem: PatientLabQueueItem) => void;
  onToggleResultLock: (queueItem: PatientLabQueueItem) => void;
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
  onSendWhatsAppText,
  onSendPdfToPatient,
  onSendPdfToCustomNumber,
  onToggleResultLock,
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



  // Cleanup function to restore pointer-events
  const cleanupBodyPointerEvents = () => {
    document.body.style.removeProperty("pointer-events");
  };

  // Cleanup on component unmount
  useEffect(() => {
    
    return () => {
      cleanupBodyPointerEvents();
    };
  }, []);

  const handleContextMenuItemClick = (action: () => void) => {
    cleanupBodyPointerEvents();
    action();
  };
//  console.log(isLastResultPending,'isLastResultPending',isSelected,'isSelected',isReadyForPrint,'isReadyForPrint')

  return (
    <ContextMenu>
      <ContextMenuTrigger>
      <div
          onClick={onSelect}
          role="button"
          tabIndex={0}
          // ... onKeyDown, aria attributes ...
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
            "active:scale-95 transform-gpu",
            isLastResultPending && !isSelected && "animate-heartbeat",
            isLastResultPending && !isSelected && "animate__animated animate__heartBeat animate__infinite animate__slow",
            isReadyForPrint && !isSelected && "animate__animated animate__bounce animate__infinite animate__slow",

            // Use CSS variables for dynamic styling
            "bg-[var(--bg-color)] border-[var(--border-color)] text-[var(--text-color)]",
            currentStyle.isBold ? 'font-semibold' : 'font-normal',
            isSelected && 'ring-2 ring-[var(--border-color)] shadow-lg'
          )}
          title={`${item.patient_name}\nID: ${labIdentifier}`}
        >
          <span className="text-lg leading-tight text-center px-1">
            {labIdentifier.length > 6 ? labIdentifier.substring(0, 5) + "…" : labIdentifier}
          </span>
          
          {item.test_count > 0 && (
            <div
              style={{
                backgroundColor: paymentStatusBadgeStyle.backgroundColor,
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

          {item.is_printed && (
             <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: appearanceSettings.printed.badgeBackgroundColor}}></div>
          )}
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-64 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
        <ContextMenuItem 
          onClick={() => handleContextMenuItemClick(() => onSendWhatsAppText(item))}
          className="flex items-center px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700"
        >
          <MessageSquareText className="ltr:mr-3 rtl:ml-3 h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-medium">{t("labResults:contextMenu.sendTextMessage")}</span>
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={() => handleContextMenuItemClick(() => onSendPdfToPatient(item))}
          className="flex items-center px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700"
        >
          <FileText className="ltr:mr-3 rtl:ml-3 h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium">{t("labResults:contextMenu.sendPdfToPatient")}</span>
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={() => handleContextMenuItemClick(() => onSendPdfToCustomNumber(item))}
          className="flex items-center px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700"
        >
          <SendToBack className="ltr:mr-3 rtl:ml-3 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="font-medium">{t("labResults:contextMenu.sendPdfToOtherNumber")}</span>
        </ContextMenuItem>
        
        <ContextMenuSeparator className="my-1 bg-slate-200 dark:bg-slate-600" />
        
        <ContextMenuItem 
          onClick={() => handleContextMenuItemClick(() => onToggleResultLock(item))}
          className="flex items-center px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700"
        >
          {isResultLocked ? (
            <>
              <Unlock className="ltr:mr-3 rtl:ml-3 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-emerald-700 dark:text-emerald-300">
                {t("labResults:contextMenu.unlockResults")}
              </span>
            </>
          ) : (
            <>
              <Lock className="ltr:mr-3 rtl:ml-3 h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="font-medium text-red-700 dark:text-red-300">
                {t("labResults:contextMenu.lockResults")}
              </span>
            </>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default PatientLabRequestItem;
