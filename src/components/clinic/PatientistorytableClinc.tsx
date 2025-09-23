// src/components/clinic/PatientistorytableClinc.tsx
import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";

// MUI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableContainer,
  Paper,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { Add as UserPlus } from "@mui/icons-material";
import { toast } from "sonner";

// Types
import type { PatientSearchResult } from "@/types/patients";
import type { DoctorStripped } from "@/types/doctors";
import type { Company } from "@/types/companies";

// Services
import { useCachedDoctorsList, useCachedCompaniesList } from "@/hooks/useCachedData";

interface PatientHistoryTableProps {
  searchResults: PatientSearchResult[];
  isLoading: boolean;
  onSelectPatient: (patientId: number, doctorId: number, companyId?: number) => void;
  referringDoctor: DoctorStripped | null; // The doctor selected in the main form
}

const PatientistorytableClinc: React.FC<PatientHistoryTableProps> = ({
  searchResults,
  isLoading,
  onSelectPatient,
  referringDoctor,
}) => {
  const dateLocale = arSA;

  // State for patient selections
  const [patientSelections, setPatientSelections] = useState<Record<number, { doctor?: DoctorStripped | null; company?: Company | null }>>({});

  // Queries for doctors and companies using cached data
  const { data: doctors, isLoading: doctorsLoading } = useCachedDoctorsList();
  const { data: companies, isLoading: companiesLoading } = useCachedCompaniesList();

  const handleSelect = (patientId: number) => {
    // Get the selected doctor and company for this patient
    const patientSelection = patientSelections[patientId];
    const selectedDoctor = patientSelection?.doctor;
    const selectedCompany = patientSelection?.company;
    
    // Use selected doctor if available, otherwise fall back to referring doctor
    const doctorToUse = selectedDoctor || referringDoctor;
    
    if (!doctorToUse?.id) {
      toast.error("يرجى اختيار الطبيب أولاً");
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

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 150, fontWeight: 'bold' }}>
              اسم المريض
            </TableCell>
            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center', fontWeight: 'bold' }}>
              آخر زيارة
            </TableCell>
            <TableCell sx={{ width: 200, textAlign: 'center', fontWeight: 'bold' }}>
              الطبيب
            </TableCell>
            <TableCell sx={{ width: 200, textAlign: 'center', fontWeight: 'bold' }}>
              الشركة
            </TableCell>
            <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>
              الإجراءات
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} sx={{ height: 96, textAlign: 'center' }}>
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && searchResults.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                sx={{ height: 96, textAlign: 'center', color: 'text.secondary' }}
              >
                لم يتم العثور على تاريخ للمريض
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            searchResults.map((patient) => (
              <TableRow
                key={patient.id}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
                onClick={() => handleSelect(patient.id)}
              >
                <TableCell sx={{ fontWeight: 'medium' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" component="span">
                      {patient.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {patient.phone}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                  {patient.last_visit_date
                    ? format(parseISO(patient.last_visit_date), "P", {
                        locale: dateLocale,
                      })
                    : "-"}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
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
                          placeholder="اختر الطبيب"
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
                <TableCell sx={{ textAlign: 'center' }}>
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
                          placeholder="اختر الشركة"
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
                <TableCell sx={{ textAlign: 'right' }}>
                  <Button
                    size="small"
                    variant="text"
                    disabled={!referringDoctor}
                    title={
                      !referringDoctor
                        ? "يرجى اختيار الطبيب أولاً"
                        : "إنشاء زيارة مختبر جديدة"
                    }
                  >
                    <UserPlus fontSize="small" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
export default PatientistorytableClinc;


