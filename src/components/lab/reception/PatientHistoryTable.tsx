// src/components/lab/reception/PatientHistoryTable.tsx
import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";

// MUI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
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
import { useAuthorization } from "@/hooks/useAuthorization";

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
  const dateLocale = arSA;

  // State for patient selections
  const [patientSelections, setPatientSelections] = useState<Record<number, { doctor?: DoctorStripped | null; company?: Company | null }>>({});

  // Queries for doctors and companies using cached data
  const { data: doctors, isLoading: doctorsLoading } = useCachedDoctorsList();
  const { data: companies, isLoading: companiesLoading } = useCachedCompaniesList();
  const { can } = useAuthorization();


  const handleSelect = (patientId: number) => {
    // Find the patient in search results
    const patient = searchResults.find(p => p.id === patientId);
    if (!patient) return;
    
    // Get the selected doctor and company for this patient from state
    const patientSelection = patientSelections[patientId];
    let selectedDoctor = patientSelection?.doctor;
    let selectedCompany = patientSelection?.company;
    
    // If no doctor was explicitly selected, use the last visit doctor from patient data
    if (!selectedDoctor && patient.last_visit_doctor_id) {
      selectedDoctor = doctors?.find(doctor => doctor.id === patient.last_visit_doctor_id) || null;
    }
    
    // If no company was explicitly selected, use the last visit company from patient data
    if (!selectedCompany && patient.last_visit_company_id) {
      selectedCompany = companies?.find(company => company.id === patient.last_visit_company_id) || null;
    }
    
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
// console.log(can('تسجيل مريض تامين'),'can');
  const handleCompanyChange = (patientId: number, company: Company | null) => {
    setPatientSelections(prev => ({
      ...prev,
      [patientId]: { ...prev[patientId], company }
    }));
  };
  // console.log(searchResults,'searchResults');
  // The component is now just the content, without its own Card or Header
  return (
    <TableContainer className="shadow-md" component={Paper} sx={{ maxHeight: 400, padding: 0, margin: 0 }}>
      <Table className="shadow-md" stickyHeader sx={{ '& .MuiTableCell-root': { padding: '4px 8px' } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 190, fontWeight: 'bold', padding: '4px 8px' }}>
              اسم 
            </TableCell>
            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center', fontWeight: 'bold', padding: '4px 8px' }}>
           التاريخ
            </TableCell>
            <TableCell sx={{ width: 200, textAlign: 'center', fontWeight: 'bold', padding: '4px 8px' }}>
              الطبيب
            </TableCell>
            <TableCell sx={{ width: 200, textAlign: 'center', fontWeight: 'bold', padding: '4px 8px' }}>
              الشركة
            </TableCell>
            <TableCell sx={{ textAlign: 'right', fontWeight: 'bold', padding: '4px 8px' }}>
              الإجراءات
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} sx={{ height: 48, textAlign: 'center', padding: '4px 8px' }}>
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && searchResults.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                sx={{ height: 48, textAlign: 'center', color: 'text.secondary', padding: '4px 8px' }}
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
                <TableCell sx={{ fontWeight: 'medium', padding: '4px 8px' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
                    <Typography variant="body2" component="span" sx={{ margin: 0, lineHeight: 1.2 }}>
                      {patient.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ margin: 0, lineHeight: 1.2 }}>
                      {patient.phone}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center', padding: '4px 8px' }}>
                  {patient.last_visit_date
                    ? format(parseISO(patient.last_visit_date), "P", {
                        locale: dateLocale,
                      })
                    : "-"}
                </TableCell>
                <TableCell sx={{ textAlign: 'center', padding: '4px 8px' }}>
                  <Box onClick={(e) => e.stopPropagation()} sx={{ margin: 0, padding: 0 }}>
                    <Autocomplete
                      options={doctors || []}
                      getOptionLabel={(option) => option.name}
                      value={doctors?.find(doctor => doctor.id === patient.last_visit_doctor_id) || null}
                      onChange={(_, newValue) => handleDoctorChange(patient.id, newValue)}
                      loading={doctorsLoading}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder="اختر الطبيب"
                          sx={{ 
                            '& .MuiInputBase-root': { padding: '2px 4px' },
                            '& .MuiInputBase-input': { padding: '4px 8px' }
                          }}
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
                <TableCell sx={{ textAlign: 'center', padding: '4px 8px' }}>
                  <Box onClick={(e) => e.stopPropagation()} sx={{ margin: 0, padding: 0 }}>
                    <Autocomplete
                      options={companies || []}
                      getOptionLabel={(option) => option.name}
                      value={companies?.find(company => company.id === patient.last_visit_company_id) || null}
                      onChange={(_, newValue) => handleCompanyChange(patient.id, newValue)}
                      loading={companiesLoading}
                      disabled={companiesLoading || !can('تسجيل مريض تامين')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder="اختر الشركة"
                          sx={{ 
                            '& .MuiInputBase-root': { padding: '2px 4px' },
                            '& .MuiInputBase-input': { padding: '4px 8px' }
                          }}
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
                <TableCell sx={{ textAlign: 'right', padding: '4px 8px' }}>
                  <Button
                    size="small"
                    variant="text"
                    disabled={!referringDoctor}
                    sx={{ minWidth: 'auto', padding: '2px 4px' }}
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
export default PatientHistoryTable;
