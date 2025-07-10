// src/components/lab/reception/PatientHistoryTable.tsx
import React, { useState } from "react";
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
import type { Company } from "@/types/companies";
import { toast } from "sonner";

// MUI Components
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";

// Services
import { getDoctorsList } from "@/services/doctorService";
import { getCompaniesList } from "@/services/companyService";
import { useQuery } from "@tanstack/react-query";

interface PatientHistoryTableProps {
  searchResults: PatientSearchResult[];
  isLoading: boolean;
  onSelectPatient: (patientId: number, doctorId: number, companyId?: number) => void;
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

  // State for patient selections
  const [patientSelections, setPatientSelections] = useState<Record<number, { doctor?: DoctorStripped | null; company?: Company | null }>>({});

  // Queries for doctors and companies
  const { data: doctors, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctorsListActive'],
    queryFn: () => getDoctorsList({ active: true }),
  });
 
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['companiesListActive'],
    queryFn: () => getCompaniesList({ status: true }),
  });

  console.log(doctors,'doctors');
  console.log(companies,'companies');

  const handleSelect = (patientId: number) => {
    // Get the selected doctor and company for this patient
    const patientSelection = patientSelections[patientId];
    const selectedDoctor = patientSelection?.doctor;
    const selectedCompany = patientSelection?.company;
    
    // Use selected doctor if available, otherwise fall back to referring doctor
    const doctorToUse = selectedDoctor || referringDoctor;
    
    if (!doctorToUse?.id) {
      toast.error(t("labReception:validation.selectDoctorFirst"));
      return;
    }
    
    // Pass the company ID if selected, otherwise undefined
    const companyId = selectedCompany?.id;
    onSelectPatient(patientId, doctorToUse.id, companyId);
  };

  const handleDoctorChange = (patientId: number, doctor: DoctorStripped | null) => {
    setPatientSelections(prev => ({
      ...prev,
      [patientId]: { ...prev[patientId], doctor }
    }));
  };

  const handleCompanyChange = (patientId: number, company: Company | null) => {
    setPatientSelections(prev => ({
      ...prev,
      [patientId]: { ...prev[patientId], company }
    }));
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
            <TableHead className="w-[200px] text-center">
              {t("common:doctor")}
            </TableHead>
            <TableHead className="w-[200px] text-center">
              {t("common:company")}
            </TableHead>
            <TableHead className="text-right">
              {t("common:actions.title")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && searchResults.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
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
                <TableCell className="text-center">
                  <Box onClick={(e) => e.stopPropagation()}>
                    <Autocomplete
                      options={doctors || []}
                      getOptionLabel={(option) => option.name}
                      value={patientSelections[patient.id]?.doctor || null}
                      onChange={(_, newValue) => handleDoctorChange(patient.id, newValue)}
                      loading={doctorsLoading}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder={t("common:selectDoctor")}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {doctorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      PaperComponent={Paper}
                      disableCloseOnSelect
                      sx={{
                        '& .MuiAutocomplete-popper': {
                          zIndex: 9999,
                        },
                        '& .MuiPaper-root': {
                          zIndex: 9999,
                        },
                      }}
                      slotProps={{
                        popper: {
                          sx: {
                            zIndex: 9999,
                          },
                          placement: 'bottom-start',
                        },
                        paper: {
                          sx: {
                            zIndex: 9999,
                            maxHeight: 200,
                          },
                        },
                      }}
                    />
                  </Box>
                </TableCell>
                <TableCell className="text-center">
                  <Box onClick={(e) => e.stopPropagation()}>
                    <Autocomplete
                      options={companies || []}
                      getOptionLabel={(option) => option.name}
                      value={patientSelections[patient.id]?.company || null}
                      onChange={(_, newValue) => handleCompanyChange(patient.id, newValue)}
                      loading={companiesLoading}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder={t("common:selectCompany")}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {companiesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      PaperComponent={Paper}
                      disableCloseOnSelect
                      sx={{
                        '& .MuiAutocomplete-popper': {
                          zIndex: 9999,
                        },
                        '& .MuiPaper-root': {
                          zIndex: 9999,
                        },
                      }}
                      slotProps={{
                        popper: {
                          sx: {
                            zIndex: 9999,
                          },
                          placement: 'bottom-start',
                        },
                        paper: {
                          sx: {
                            zIndex: 9999,
                            maxHeight: 200,
                          },
                        },
                      }}
                    />
                  </Box>
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
