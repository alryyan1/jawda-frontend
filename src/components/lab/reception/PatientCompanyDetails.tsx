import React from "react";
import type { Patient } from "@/types/patients";
import { Building2, Shield, Hash, Users, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientCompanyDetailsProps {
  patient?: Patient;
}

const Row = ({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between gap-2 py-1">
    <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
      {icon}
      <span className="text-[11px]">{label}</span>
    </div>
    <span className={cn("text-xs font-semibold truncate text-right", highlight ? "text-blue-700 dark:text-blue-300 text-sm" : "text-foreground")}>
      {value}
    </span>
  </div>
);

const PatientCompanyDetails: React.FC<PatientCompanyDetailsProps> = ({ patient }) => {
  if (!patient?.company) return null;

  return (
    <div className="w-full rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-blue-200 dark:border-blue-800">
        <Shield size={12} className="text-blue-600 dark:text-blue-400" />
        <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">بيانات التأمين</span>
      </div>

      <div className="flex flex-col">
        <Row icon={<Building2 size={11} />} label="الشركة" value={patient.company.name} highlight />

        {patient.subcompany?.name && (
          <Row icon={<Building2 size={11} />} label="الفرعية" value={patient.subcompany.name} />
        )}
        {patient.insurance_no && (
          <Row icon={<Hash size={11} />} label="رقم التأمين" value={patient.insurance_no} />
        )}
        {patient.guarantor && (
          <Row icon={<UserCheck size={11} />} label="الضامن" value={patient.guarantor} />
        )}
        {patient.company_relation && (
          <Row icon={<Users size={11} />} label="العلاقة" value={patient.company_relation.name} />
        )}
      </div>
    </div>
  );
};

export default PatientCompanyDetails;
