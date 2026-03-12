import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bed, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivePatientVisit, Patient } from "@/types/patients";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";

export interface AdmissionActiveCardProps {
  visit: ActivePatientVisit;
  isSelected: boolean;
  onSelect: (patient: Patient, visitId: number) => void;
  onProfileClick?: (visit: ActivePatientVisit) => void;
  selectedPatientVisitIdInWorkspace: number | null;
  index: number;
}

/**
 * Standalone card for the admission patient registration page.
 * Uses eager-loaded admission from visit.patient.admission (clinic-active-patients API).
 */
const AdmissionActiveCard: React.FC<AdmissionActiveCardProps> = ({
  visit,
  isSelected,
  index,
  onSelect,
  onProfileClick = () => {},
}) => {
  const [clickAnimating, setClickAnimating] = useState(false);
  const [bedPopoverAnchor, setBedPopoverAnchor] = useState<HTMLElement | null>(null);

  const activeAdmission = visit.patient?.admission ?? null;
  const hasBedAssigned = activeAdmission?.bed_id != null;

  const surgeriesSummary = activeAdmission?.requested_surgeries_summary;
  const hasUnpaidSurgeries =
    surgeriesSummary != null && surgeriesSummary.balance > 0;

  const bedDetailsSummary =
    hasBedAssigned && activeAdmission
      ? [
          activeAdmission.ward?.name,
          activeAdmission.room?.room_number != null
            ? `غرفة ${activeAdmission.room.room_number}`
            : null,
          activeAdmission.bed?.bed_number != null
            ? `سرير ${activeAdmission.bed.bed_number}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

  const queueNumberOrVisitId = index + 1;

  const handleCardClick = () => {
    setClickAnimating(true);
    setTimeout(() => setClickAnimating(false), 500);
    onSelect(visit.patient as unknown as Patient, visit.id);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProfileClick(visit);
  };

  return (
    <>
      <Card
        className={cn(
          "hover:shadow-lg transition-transform duration-500 cursor-pointer flex flex-row items-center px-3 py-2 h-[52px] w-[350px]",
          isSelected
            ? "ring-2 ring-primary shadow-lg bg-primary/10"
            : `bg-card ring-1 ring-transparent hover:ring-slate-300 ${visit.company ? "ring-pink-400" : ""}`,
          clickAnimating ? "scale-105" : undefined
        )}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleCardClick();
        }}
        aria-selected={isSelected}
        aria-label={`اختيار ${visit.patient?.name ?? ""}, رقم ${queueNumberOrVisitId}`}
      >
        {/* Queue number or company badge */}
        {visit.company ? (
          <div
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center ltr:mr-3 rtl:ml-3"
            title={`رقم : ${queueNumberOrVisitId}`}
          >
            <div
              className="relative w-8 h-8 flex items-center justify-center border-2 border-pink-400 rounded"
              style={{
                background: "linear-gradient(45deg, #ec4899, #f472b6)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              <span className="text-white text-xs font-bold z-10">
                {queueNumberOrVisitId}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded text-white text-sm font-bold shadow ltr:mr-3 rtl:ml-3",
              hasUnpaidSurgeries ? "bg-red-500" : "bg-green-500"
            )}
            title={`رقم : ${queueNumberOrVisitId}`}
          >
            {queueNumberOrVisitId}
          </div>
        )}

        {/* Patient name */}
        <div className="flex-grow min-w-0 ltr:mr-2 rtl:ml-2">
          <p
            className="text-sm font-semibold text-slate-800 leading-tight truncate"
            title={visit.patient?.name ?? ""}
          >
            {visit.patient?.name ?? ""}
          </p>
        </div>

        {/* Bed icon with tooltip (hover) and popover (click) */}
        {hasBedAssigned && bedDetailsSummary && (
          <>
            <Tooltip title={bedDetailsSummary} arrow placement="top">
              <button
                type="button"
                className="flex items-center justify-center flex-shrink-0 ltr:mr-1 rtl:ml-1 p-0 border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setBedPopoverAnchor(e.currentTarget);
                }}
                aria-label={`تفاصيل السرير: ${bedDetailsSummary}`}
              >
                <Bed className="h-4 w-4" />
              </button>
            </Tooltip>
            <Popover
              open={!!bedPopoverAnchor}
              anchorEl={bedPopoverAnchor}
              onClose={() => setBedPopoverAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
              transformOrigin={{ vertical: "top", horizontal: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box sx={{ p: 1.5, minWidth: 160 }} onClick={(e) => e.stopPropagation()}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.5 }}
                >
                  تفاصيل السرير
                </Typography>
                <Typography variant="body2">{bedDetailsSummary}</Typography>
              </Box>
            </Popover>
          </>
        )}

        {/* Profile button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full flex-shrink-0 p-0 ltr:ml-0 rtl:mr-0"
          onClick={handleProfileClick}
          title="عرض الملف الشخصي"
          aria-label={`عرض الملف الشخصي لـ ${visit.patient?.name ?? ""}`}
        >
          <UserCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
        </Button>
      </Card>
    </>
  );
};

export default AdmissionActiveCard;
