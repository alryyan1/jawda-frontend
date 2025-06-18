// src/components/lab/workstation/PatientLabRequestItem.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import { Badge } from "@/components/ui/badge"; // Using shadcn Badge

interface PatientLabRequestItemProps {
  item: PatientLabQueueItem;
  isSelected: boolean;
  onSelect: () => void;
  // NEW: Prop to determine payment status badge color
  allRequestsPaid?: boolean; // True if all labs for this visit_id are paid
}

const PatientLabRequestItem: React.FC<PatientLabRequestItemProps> = ({
  item,
  isSelected,
  onSelect,
  allRequestsPaid,
}) => {
  const { t } = useTranslation(["labResults", "common"]);

  // The sample_id or a generated display ID for the lab work
  const labIdentifier = item.lab_number;

  const paymentStatusColor =
    allRequestsPaid === undefined // If status is unknown (e.g., not fetched yet)
      ? "bg-gray-400"
      : allRequestsPaid
      ? "bg-green-500"
      : "bg-red-500";

  return (
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
        "w-[50px] h-[50px] flex-shrink-0   rounded-md cursor-pointer transition-all duration-150 ease-in-out",
        "flex flex-col items-center justify-center ring-slate-400 relative group",
        isSelected
          ? "ring-2 ring-primary shadow-lg bg-primary/20 dark:bg-primary/30 scale-105"
          : "bg-card  bg-primary/20 dark:bg-primary/30 dark:bg-slate-800/70 ring-1 ring-transparent  dark:hover:ring-slate-600 hover:scale-105"
      )}
      title={`${item.patient_name}\nID: ${labIdentifier}\nTests: ${item.test_count}`}
    >
      {/* Lab Identifier in the middle */}
      <span className="text-xs font-bold text-primary-foreground dark:text-primary-foreground group-hover:text-primary-foreground">
        {/* Display labIdentifier, ensure it's short enough or truncate */}
        {labIdentifier.length > 6
          ? labIdentifier.substring(0, 5) + "…"
          : labIdentifier}
      </span>

      {/* Badge for total requested lab requests */}
      {item.test_count > 0 && (
        <Badge
          className={cn(
            "absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[9px] font-semibold leading-tight rounded-full shadow",
            paymentStatusColor,
            "text-white" // Assuming white text for colored badges
          )}
        >
          {item.test_count}
        </Badge>
      )}

      {/* Patient Name Tooltip (or short name at bottom if space permits) */}
      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 text-[9px] bg-slate-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
        {item.patient_name}
      </span>
    </div>
  );
};

export default PatientLabRequestItem;
