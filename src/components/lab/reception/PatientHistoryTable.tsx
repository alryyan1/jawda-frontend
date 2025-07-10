// src/components/lab/reception/PatientHistoryTable.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

// Shadcn UI & Custom Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";
import type { PatientSearchResult } from "@/types/patients";
import type { DoctorStripped } from "@/types/doctors";
import { toast } from "sonner";

interface PatientHistoryTableProps {
  searchResults: PatientSearchResult[];
  isLoading: boolean;
  onSelectPatient: (patientId: number, doctorId: number) => void;
  referringDoctor: DoctorStripped | null; // The doctor selected in the main form
}

const PatientHistoryTable: React.FC<PatientHistoryTableProps> = ({
  searchResults,
  isLoading,
  onSelectPatient,
  referringDoctor,
}) => {
  const { t, i18n } = useTranslation(["patients", "common", "labReception"]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const handleSelect = (patientId: number) => {
    if (!referringDoctor?.id) {
      toast.error(t("labReception:validation.selectDoctorFirst"));
      return;
    }
    onSelectPatient(patientId, referringDoctor.id);
  };
  console.log(searchResults,'searchResults');
  // The component is now just the content, without its own Card or Header
  return (
    <ScrollArea className="max-h-[300px] sm:max-h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">
              {t("search.patientName")}
            </TableHead>
            <TableHead className="hidden sm:table-cell text-center">
              {t("search.lastVisit")}
            </TableHead>
            <TableHead className="text-right">
              {t("common:actions.title")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && searchResults.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-24 text-center text-muted-foreground"
              >
                {t("search.noHistoryFound")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            searchResults.map((patient) => (
              <TableRow
                key={patient.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSelect(patient.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{patient.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {patient.phone}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-center">
                  {patient.last_visit_date
                    ? format(parseISO(patient.last_visit_date), "P", {
                        locale: dateLocale,
                      })
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!referringDoctor}
                    title={
                      !referringDoctor
                        ? t("labReception:validation.selectDoctorFirst")
                        : t("labReception:createNewLabVisit")
                    }
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
export default PatientHistoryTable;
