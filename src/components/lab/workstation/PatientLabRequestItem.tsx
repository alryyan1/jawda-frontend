// src/components/lab/workstation/PatientLabRequestItem.tsx
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  MessageSquareText,
  FileText,
  SendToBack,
  Lock,
  Unlock,
} from "lucide-react";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface PatientLabRequestItemProps {
  item: PatientLabQueueItem;
  isSelected: boolean;
  onSelect: () => void;
  allRequestsPaid?: boolean;
  isResultLocked?: boolean;

  // Context Menu Action Callbacks
  onSendWhatsAppText: (queueItem: PatientLabQueueItem) => void;
  onSendPdfToPatient: (queueItem: PatientLabQueueItem) => void;
  onSendPdfToCustomNumber: (queueItem: PatientLabQueueItem) => void;
  onToggleResultLock: (queueItem: PatientLabQueueItem) => void;
}

const PatientLabRequestItem: React.FC<PatientLabRequestItemProps> = ({
  item,
  isSelected,
  onSelect,
  allRequestsPaid,
  isResultLocked,
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

  // Professional Material Design color scheme
  const getPaymentStatusColor = () => {
    if (allRequestsPaid === undefined) return "bg-slate-400 dark:bg-slate-500";
    return allRequestsPaid 
      ? "bg-emerald-500 dark:bg-emerald-600" 
      : "bg-red-500 dark:bg-red-600";
  };

  const getCardStyles = () => {
    if (isSelected) {
      return "ring-2 ring-blue-500 dark:ring-blue-400 shadow-lg bg-blue-50 dark:bg-blue-950/50 scale-105 border-blue-200 dark:border-blue-800";
    }
    
    if (item.is_printed) {
      return "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-200 dark:hover:bg-indigo-900/50";
    }
    
    return "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/70 hover:shadow-md";
  };

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

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={onSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelect();
          }}
          aria-selected={isSelected}
          aria-label={`${t("common:select")} ${
            item.patient_name
          }, ${labIdentifier}`}
          className={cn(
            "w-[54px] h-[54px] flex-shrink-0 rounded-lg cursor-pointer transition-all duration-200 ease-out",
            "flex flex-col items-center justify-center relative group border",
            "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "active:scale-95 transform-gpu",
            getCardStyles()
          )}
          title={`${item.patient_name}\nID: ${labIdentifier}\nTests: ${item.test_count}`}
        >
          {/* Lab Identifier */}
          <span className={cn(
            "text-xs font-semibold leading-tight text-center px-1",
            isSelected 
              ? "text-blue-700 dark:text-blue-300" 
              : item.is_printed
              ? "text-indigo-700 dark:text-indigo-300"
              : "text-slate-700 dark:text-slate-300"
          )}>
            {labIdentifier.length > 6
              ? labIdentifier.substring(0, 5) + "…"
              : labIdentifier}
          </span>

          {/* Test Count Badge */}
          {item.test_count > 0 && (
            <Badge
              className={cn(
                "absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                "leading-tight rounded-full shadow-sm border-2 border-white dark:border-slate-800",
                getPaymentStatusColor(),
                "text-white"
              )}
            >
              {item.test_count}
            </Badge>
          )}

          {/* Lock Status Indicator */}
          {item.is_result_locked && (
            <div className="absolute -bottom-1 -left-1 p-0.5 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-600">
              <Lock className="h-3 w-3 text-red-500 dark:text-red-400" />
            </div>
          )}

          {/* Printed Status Indicator */}
          {item.is_printed && (
            <div className="absolute top-0.5 left-0.5 w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full shadow-sm"></div>
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
