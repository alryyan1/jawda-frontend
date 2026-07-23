// src/components/lab/reception/PatientHistoryTable.tsx
import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";

// MUI
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

// Hooks
import { useCachedDoctorsList, useCachedCompaniesList } from "@/hooks/useCachedData";
import { useAuthorization } from "@/hooks/useAuthorization";

interface PatientHistoryTableProps {
  searchResults: PatientSearchResult[];
  isLoading: boolean;
  onSelectPatient: (patientId: number, doctorId: number, companyId?: number) => void;
  referringDoctor: DoctorStripped | null;
}

const CELL_PADDING = { padding: "4px 8px" } as const;

const POPPER_SLOT_PROPS = {
  popper: { sx: { zIndex: 9999 }, placement: "bottom-start" as const },
  paper: { sx: { zIndex: 9999, maxHeight: 200 } },
};

/** Compact autocomplete used inside a table cell (doctor / company pickers). */
function CellAutocomplete<T extends { id: number; name: string }>({
  options,
  value,
  onChange,
  loading,
  placeholder,
  disabled,
}: {
  options: T[];
  value: T | null;
  onChange: (value: T | null) => void;
  loading: boolean;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Box onClick={(e) => e.stopPropagation()} sx={{ margin: 0, padding: 0 }}>
      <Autocomplete
        options={options}
        getOptionLabel={(option) => option.name}
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        loading={loading}
        disabled={disabled}
        disableCloseOnSelect
        PaperComponent={Paper}
        slotProps={POPPER_SLOT_PROPS}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder={placeholder}
            sx={{
              "& .MuiInputBase-root": { padding: "2px 4px" },
              "& .MuiInputBase-input": { padding: "4px 8px" },
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Box>
  );
}

const PatientHistoryTable: React.FC<PatientHistoryTableProps> = ({
  searchResults,
  isLoading,
  onSelectPatient,
  referringDoctor,
}) => {
  const dateLocale = arSA;
  const { can } = useAuthorization();

  // Per-patient doctor/company overrides picked inside the table
  const [patientSelections, setPatientSelections] = useState<
    Record<number, { doctor?: DoctorStripped | null; company?: Company | null }>
  >({});

  const { data: doctors, isLoading: doctorsLoading } = useCachedDoctorsList();
  const { data: companies, isLoading: companiesLoading } = useCachedCompaniesList();

  const handleSelect = (patientId: number) => {
    const patient = searchResults.find((p) => p.id === patientId);
    if (!patient) return;

    const patientSelection = patientSelections[patientId];
    let selectedDoctor = patientSelection?.doctor;
    let selectedCompany = patientSelection?.company;

    // Fall back to the patient's last-visit doctor/company when nothing was picked
    if (!selectedDoctor && patient.last_visit_doctor_id) {
      selectedDoctor = doctors?.find((doctor) => doctor.id === patient.last_visit_doctor_id) || null;
    }
    if (!selectedCompany && patient.last_visit_company_id) {
      selectedCompany = companies?.find((company) => company.id === patient.last_visit_company_id) || null;
    }

    const doctorToUse = selectedDoctor || referringDoctor;
    if (!doctorToUse?.id) {
      toast.error("يرجى اختيار الطبيب أولاً");
      return;
    }

    onSelectPatient(patientId, doctorToUse.id, selectedCompany?.id);
  };

  const handleDoctorChange = (patientId: number, doctor: DoctorStripped | null) => {
    setPatientSelections((prev) => ({ ...prev, [patientId]: { ...prev[patientId], doctor } }));
  };

  const handleCompanyChange = (patientId: number, company: Company | null) => {
    setPatientSelections((prev) => ({ ...prev, [patientId]: { ...prev[patientId], company } }));
  };

  return (
    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 400, padding: 0, margin: 0 }}>
      <Table stickyHeader sx={{ "& .MuiTableCell-root": CELL_PADDING }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 190, fontWeight: "bold", ...CELL_PADDING }}>الاسم</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, textAlign: "center", fontWeight: "bold", ...CELL_PADDING }}>
              التاريخ
            </TableCell>
            <TableCell sx={{ width: 200, textAlign: "center", fontWeight: "bold", ...CELL_PADDING }}>الطبيب</TableCell>
            <TableCell sx={{ width: 200, textAlign: "center", fontWeight: "bold", ...CELL_PADDING }}>الشركة</TableCell>
            <TableCell sx={{ textAlign: "right", fontWeight: "bold", ...CELL_PADDING }}>الإجراءات</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} sx={{ height: 48, textAlign: "center", ...CELL_PADDING }}>
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          )}

          {!isLoading && searchResults.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} sx={{ height: 48, textAlign: "center", color: "text.secondary", ...CELL_PADDING }}>
                لم يتم العثور على تاريخ للمريض
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            searchResults.map((patient) => (
              <TableRow
                key={patient.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => handleSelect(patient.id)}
              >
                <TableCell sx={{ fontWeight: "medium", ...CELL_PADDING }}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography variant="body2" component="span" sx={{ lineHeight: 1.2 }}>
                      {patient.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                      {patient.phone}
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, textAlign: "center", ...CELL_PADDING }}>
                  {patient.last_visit_date
                    ? format(parseISO(patient.last_visit_date), "P", { locale: dateLocale })
                    : "-"}
                </TableCell>

                <TableCell sx={{ textAlign: "center", ...CELL_PADDING }}>
                  <CellAutocomplete
                    options={doctors || []}
                    value={doctors?.find((doctor) => doctor.id === patient.last_visit_doctor_id) || null}
                    onChange={(newValue) => handleDoctorChange(patient.id, newValue)}
                    loading={doctorsLoading}
                    placeholder="اختر الطبيب"
                  />
                </TableCell>

                <TableCell sx={{ textAlign: "center", ...CELL_PADDING }}>
                  <CellAutocomplete
                    options={companies || []}
                    value={companies?.find((company) => company.id === patient.last_visit_company_id) || null}
                    onChange={(newValue) => handleCompanyChange(patient.id, newValue)}
                    loading={companiesLoading}
                    placeholder="اختر الشركة"
                    disabled={companiesLoading || !can("تسجيل مريض تامين")}
                  />
                </TableCell>

                <TableCell sx={{ textAlign: "right", ...CELL_PADDING }}>
                  <Button
                    size="small"
                    variant="text"
                    disabled={!referringDoctor}
                    sx={{ minWidth: "auto", padding: "2px 4px" }}
                    title={!referringDoctor ? "يرجى اختيار الطبيب أولاً" : "إنشاء زيارة مختبر جديدة"}
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
