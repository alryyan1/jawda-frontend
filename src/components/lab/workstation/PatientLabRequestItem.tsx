// src/components/lab/workstation/PatientLabRequestItem.tsx
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  FlaskConical,
  Hash,
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
} from "@/components/ui/context-menu"; // shadcn ContextMenu

interface PatientLabRequestItemProps {
  item: PatientLabQueueItem;
  isSelected: boolean;
  onSelect: () => void;
  allRequestsPaid?: boolean; // From backend
  isResultLocked?: boolean; // NEW: Pass this from parent (LabWorkstationPage)

  // NEW: Context Menu Action Callbacks
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
  const paymentStatusColor =
    allRequestsPaid === undefined
      ? "bg-gray-400"
      : allRequestsPaid
      ? "bg-green-500"
      : "bg-red-500";
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
    // Immediately restore pointer-events when opening a dialog
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
            "w-[50px] h-[50px] flex-shrink-0 rounded-md cursor-pointer  transition-all duration-150 bg-blue-800 ease-in-out",
            "flex flex-col items-center justify-center relative group ",
            isSelected
              ? "ring-2 ring-primary shadow-lg bg-primary/20 dark:bg-primary/30 scale-105"
              : `bg-card dark:bg-slate-800/70  ring-1 ring-transparent ring-slate-400 dark:hover:ring-slate-600 hover:scale-105 ${item.is_printed &&  'bg-blue-400'} `
          )}
          title={`${item.patient_name}\nID: ${labIdentifier}\nTests: ${item.test_count}`}
        >
          <span className="text-xs text-black font-bold dark:text-white   ">
            {labIdentifier.length > 6
              ? labIdentifier.substring(0, 5) + "…"
              : labIdentifier}
          </span>
          {item.test_count > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[9px] font-semibold leading-tight rounded-full shadow",
                paymentStatusColor,
                "text-white"
              )}
            >
              {item.test_count}
            </Badge>
          )}
          {item.is_result_locked && (
            <Lock className="absolute bottom-1 -left-1.2 h-3 w-3 text-red-500" />
          )}
      
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => handleContextMenuItemClick(() => onSendWhatsAppText(item))}>
          <MessageSquareText className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {t("labResults:contextMenu.sendTextMessage")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuItemClick(() => onSendPdfToPatient(item))}>
          <FileText className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {t("labResults:contextMenu.sendPdfToPatient")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuItemClick(() => onSendPdfToCustomNumber(item))}>
          <SendToBack className="ltr:mr-2 rtl:ml-2 h-4 w-4" />{" "}
          {/* Icon for sending to different number */}
          {t("labResults:contextMenu.sendPdfToOtherNumber")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleContextMenuItemClick(() => onToggleResultLock(item))}>
          {isResultLocked ? (
            <Unlock className="ltr:mr-2 rtl:ml-2 h-4 w-4 text-green-600" />
          ) : (
            <Lock className="ltr:mr-2 rtl:ml-2 h-4 w-4 text-red-600" />
          )}
          {isResultLocked
            ? t("labResults:contextMenu.unlockResults")
            : t("labResults:contextMenu.lockResults")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default PatientLabRequestItem;
