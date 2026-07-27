// src/components/clinic/ActivePatientCard.tsx
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserCircle, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

import type { ActivePatientVisit, Patient } from "@/types/patients";
import Badge from "@mui/material/Badge";

interface ActivePatientCardProps {
  visit: ActivePatientVisit;
  isSelected: boolean;
  onSelect: (patient: Patient, visitId: number) => void;
  onProfileClick: (visit: any) => void;
  selectedPatientVisitIdInWorkspace: number | null; // kept for API parity
}

const ActivePatientCard: React.FC<ActivePatientCardProps> = ({
  visit,
  isSelected,
  onSelect,
  onProfileClick,
  selectedPatientVisitIdInWorkspace,
}) => {
  const [isClickAnimating, setIsClickAnimating] = useState(false);
  const handleCardClick = () => {
    // Trigger scale animation for 0.5s
    setIsClickAnimating(true);
    setTimeout(() => setIsClickAnimating(false), 500);
    onSelect(visit.patient, visit.id);
  };

  const handleProfileButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onProfileClick(visit);
  };

  const queueNumberOrVisitId = visit.number || visit.id;

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-transform duration-500 cursor-pointer flex flex-row items-center px-3 py-2 h-[42px] w-[310px]",
        isSelected
          ? "ring-2 ring-primary shadow-lg bg-primary/10"
          : `bg-card ring-1 ring-transparent hover:ring-slate-300 ${visit.company ? "ring-pink-400" : ""}`
      , isClickAnimating ? "scale-105" : undefined)}
      data-selected-in-workspace={(selectedPatientVisitIdInWorkspace === visit.id).toString()}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleCardClick();
      }}
      aria-selected={isSelected}
      aria-label={`اختيار ${visit.patient.name}, رقم ${queueNumberOrVisitId}`}
    >
      {/* Queue number or Heart for company patients */}
      {visit.company ? (
        <div
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center ltr:mr-3 rtl:ml-3 "
          title={`رقم : ${queueNumberOrVisitId}`}
        >
          {/* Custom heart shape with solid background */}
          <div
            className="relative w-8 h-8 flex items-center justify-center border-2 border-pink-400 rounded"
            style={{
              background: 'linear-gradient(45deg, #ec4899, #f472b6)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
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
            "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded text-sm font-bold shadow ltr:mr-3 rtl:ml-3",
            visit.requested_services_count > 0
              ? cn("text-white", visit.balance_due > 0 ? "bg-red-500" : "bg-green-500")
              : "text-foreground"
          )}
          title={`رقم : ${queueNumberOrVisitId}`}
        >
          {queueNumberOrVisitId}
        </div>
      )}

      {/* Patient info and status */}
      <div className="flex-grow min-w-0 ltr:mr-2 rtl:ml-2">
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold text-slate-800 leading-tight truncate">
            {visit.patient.name}
          </p>
          {visit.is_online && (
            <span title="حجز إلكتروني">
              <Smartphone className="h-3 w-3 flex-shrink-0 text-blue-500" />
            </span>
          )}
        </div>
      </div>

      {/* Profile button with badge */}
      <Badge
        badgeContent={
          visit.requested_services_count > 0
            ? visit.requested_services_count
            : null
        }
        color="secondary"
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        sx={{
          "& .MuiBadge-badge": {
            fontSize: "0.5rem",
            height: "12px",
            minWidth: "12px",
            padding: "0 3px",
            ...(visit.requested_services_count > 0
              ? {
                  backgroundColor:
                    visit.status === "payment_pending" ? "#ef4444" : "#16a34a",
                  color: "#fff",
                }
              : {}),
          },
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full flex-shrink-0 p-0"
          onClick={handleProfileButtonClick}
          title="عرض الملف الشخصي"
          aria-label={`عرض الملف الشخصي لـ ${visit.patient.name}`}
        >
          <UserCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
        </Button>
      </Badge>
    </Card>
  );
};

export default ActivePatientCard;
