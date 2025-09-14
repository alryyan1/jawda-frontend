// src/components/clinic/PatientInfoDialog.tsx
import React, { useState } from "react"; // Added useState
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  UserCircle,
  Phone,
  CalendarDays,
  MapPin,
  Building,
  IdCard,
  AlertTriangle,
  VenusAndMars,
  Edit,
} from "lucide-react"; // Added Edit
import type { Patient } from "@/types/patients";
import { getPatientById } from "@/services/patientService";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "@/components/ui/scroll-area"; // Corrected import path
import EditPatientInfoDialog from "./EditPatientInfoDialog"; // NEW IMPORT
import type { DoctorVisit } from "@/types/visits";

interface PatientInfoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  visit: DoctorVisit | null;
}

// Reusable DetailRow component (if not already in a shared file)
const DetailRowDisplay: React.FC<{
  label: string;
  value?: string | number | React.ReactNode | null;
  icon?: React.ElementType;
  titleValue?: string;
}> = ({ label, value, icon: Icon, titleValue }) => {
  return (
    <div className="grid grid-cols-[24px_1fr] items-start gap-x-3 py-1.5">
      {Icon ? (
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      ) : (
        <div className="w-4"></div>
      )}
      <div className="space-y-0.5 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className="text-sm font-medium text-foreground truncate"
          title={
            titleValue ||
            (typeof value === "string" || typeof value === "number"
              ? String(value)
              : undefined)
          }
        >
          {value || value === 0 ? (
            value
          ) : (
            <span className="text-xs italic text-slate-400 ">
              غير متوفر
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

const PatientInfoDialog: React.FC<PatientInfoDialogProps> = ({
  isOpen,
  onOpenChange,
  visit,
}) => {
  const dateLocale = "ar".startsWith("ar") ? arSA : enUS;
  const queryClient = useQueryClient();

  // NEW: State for Edit Dialog
  const [isEditPatientDialogOpen, setIsEditPatientDialogOpen] = useState(false);

  const patientQueryKey = ["patientDetailsForInfoPanel", visit?.patient.id];
  const {
    data: patient,
    isLoading,
    error,
  } = useQuery<Patient, Error>({
    queryKey: patientQueryKey,
    queryFn: () => {
      if (!visit?.patient.id) throw new Error("Patient ID is required.");
      return getPatientById(visit?.patient.id);
    },
    enabled: !!visit?.patient.id && isOpen, // Only fetch when main dialog is open and patientId exists
  });

  const getAgeString = (p?: Patient | null): string => {
    if (!p) return "غير متوفر";
    const parts = [];
    if (p.age_year !== null && p.age_year !== undefined && p.age_year >= 0)
      parts.push(`${p.age_year} سنة`);
    if (p.age_month !== null && p.age_month !== undefined && p.age_month >= 0)
      parts.push(`${p.age_month} شهر`);
    if (p.age_day !== null && p.age_day !== undefined && p.age_day >= 0)
      parts.push(`${p.age_day} يوم`);
    if (
      parts.length === 0 &&
      (p.age_year === 0 || p.age_month === 0 || p.age_day === 0)
    )
      return "0 يوم";
    return parts.length > 0 ? parts.join(" ") : "غير متوفر";
  };

  const handlePatientInfoUpdated = (updatedPatient: Patient) => {
    // Update the cache for this dialog's query
    queryClient.setQueryData(patientQueryKey, updatedPatient);
    // Potentially invalidate other lists where this patient might appear
    queryClient.invalidateQueries({ queryKey: ["activePatients"] });
    queryClient.invalidateQueries({ queryKey: ["patientVisitsSummary"] });
    setIsEditPatientDialogOpen(false); // Close edit dialog
  };

  const openEditDialog = () => {
    if (patient) setIsEditPatientDialogOpen(true);
  };

  // Ensure dialog closes cleanly
  const handleMainDialogOpenChange = (open: boolean) => {
    if (!open) {
      setIsEditPatientDialogOpen(false); // Close edit dialog if main dialog closes
    }
    onOpenChange(open);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleMainDialogOpenChange}>
        <DialogContent className="sm:max-w-xl lg:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="bg-primary/10 p-2 rounded-full">
                  <UserCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">
                    تفاصيل المريض
                  </DialogTitle>
                  {patient && (
                    <DialogDescription className="text-sm text-muted-foreground">
                      {patient.name}
                    </DialogDescription>
                  )}
                </div>
              </div>
              {patient &&
                !isLoading && ( // Show edit button only if patient data loaded
                  <Button variant="outline" size="sm" onClick={openEditDialog}>
                    <Edit className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
                    تعديل
                  </Button>
                )}
            </div>
          </DialogHeader>

          {isLoading /* Loading state for patient details */ && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                جاري تحميل التفاصيل...
              </p>
            </div>
          )}

          {error /* Error state */ && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
              <div className="bg-destructive/10 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-destructive">
                  فشل في جلب تفاصيل المريض
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  {error.message}
                </p>
              </div>
            </div>
          )}

          {patient && !isLoading && !error /* Display patient details */ && (
            <ScrollArea className="pr-3 -mx-6 px-6 max-h-[calc(90vh-200px)]">
              {" "}
              {/* Max height for scroll area */}
              <div style={{ direction: true }} className="space-y-4 py-2">
                <Card className="border-none shadow-none">
                  <CardHeader className="pb-2 pt-0">
                    <CardTitle className="text-base font-medium">
                      المعلومات الشخصية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
                    <DetailRowDisplay
                      label="رقم الهوية"
                      value={visit?.id}
                      icon={IdCard}
                    />
                    <DetailRowDisplay
                      label="الاسم"
                      value={patient.name}
                    />
                    <DetailRowDisplay
                      label="الهاتف"
                      value={patient.phone}
                      icon={Phone}
                    />
                    <DetailRowDisplay
                      label="الجنس"
                      value={patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : patient.gender}
                      icon={VenusAndMars}
                    />
                    <DetailRowDisplay
                      label="العمر"
                      value={getAgeString(patient)}
                      icon={CalendarDays}
                    />
                    <DetailRowDisplay
                      label="العنوان"
                      value={patient.address}
                      icon={MapPin}
                      titleValue={patient.address || undefined}
                    />
                  </CardContent>
                </Card>

                {patient.company_id && (
                  <Card className="border-none shadow-none">
                    <CardHeader className="pb-2 pt-2">
                      <CardTitle className="text-base font-medium">
                        معلومات التأمين
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
                      <DetailRowDisplay
                        label="الشركة"
                        value={patient.company?.name}
                        icon={Building}
                      />
                      <DetailRowDisplay
                        label="رقم التأمين"
                        value={patient.insurance_no}
                      />
                      <DetailRowDisplay
                        label="الشركة الفرعية"
                        value={patient.subcompany?.name}
                      />
                      <DetailRowDisplay
                        label="العلاقة"
                        value={patient.company_relation?.name}
                      />
                      <DetailRowDisplay
                        label="الضامن"
                        value={patient.guarantor}
                      />
                      {patient.expire_date && (
                        <DetailRowDisplay
                          label="تاريخ الانتهاء"
                          value={format(visit.visit_date, "P", {
                            locale: dateLocale,
                          })}
                          icon={CalendarDays}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="min-w-[80px]">
                إغلاق
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Info Dialog (Conditionally Rendered) */}
      {visit?.patient.id && (
        <EditPatientInfoDialog
          isOpen={isEditPatientDialogOpen}
          onOpenChange={setIsEditPatientDialogOpen}
          patientId={visit?.patient.id}
          onPatientInfoUpdated={handlePatientInfoUpdated}
        />
      )}
    </>
  );
};

export default PatientInfoDialog;
