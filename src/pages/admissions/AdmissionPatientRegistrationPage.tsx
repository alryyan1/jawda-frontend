import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import {
  LayoutDashboard,
  ClipboardList,
  UserPlus,
  Bed,
  X,
  Calculator,
  FileText,
  DoorOpen,
} from "lucide-react";
import { getAdmissionPatientsByDate } from "@/services/clinicService";
import { getAdmissions, getPatientActiveAdmission, createAdmission, updateAdmission, getAdmissionRequestedSurgeriesSummary, dischargeAdmission, vacateBedAdmission } from "@/services/admissionService";
import { searchExistingPatients } from "@/services/patientService";
import type {
  ActivePatientVisit,
  Patient,
  PatientSearchResult,
} from "@/types/patients";
import AdmissionActiveCard from "@/components/admissions/AdmissionActiveCard";
import QuickAddPatientDialog, {
  useQuickAddPatient,
  QuickAddPatientFormFields,
} from "@/components/admissions/QuickAddPatientDialog";
import dayjs from "dayjs";
import AdmissionFormPage from "@/pages/admissions/AdmissionFormPage";
import BedMap, { type BedSelection } from "@/components/admissions/BedMap";
import { RequestedSurgeriesPanel } from "@/components/admissions/RequestedSurgeriesPanel";
import { getSurgicalOperations, type SurgicalOperation } from "@/services/surgicalOperationService";
import apiClient from "@/services/api";

export default function AdmissionPatientRegistrationPage() {
  const queryClient = useQueryClient();

  const [selectedVisit, setSelectedVisit] =
    useState<ActivePatientVisit | null>(null);
  const [showQuickAddForm, setShowQuickAddForm] = useState<boolean>(true);
  const [admissionDialogOpen, setAdmissionDialogOpen] = useState(false);
  /** When set, the admission dialog opens in edit mode for this admission id. */
  const [admissionDialogEditId, setAdmissionDialogEditId] = useState<number | null>(null);
  const [bedMapOpen, setBedMapOpen] = useState(false);
  const [calculatorDialogOpen, setCalculatorDialogOpen] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
  const [selectedBedSummary, setSelectedBedSummary] = useState<string | null>(
    null,
  );
  const [admittedPatientIds, setAdmittedPatientIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [selectedSurgery, setSelectedSurgery] = useState<SurgicalOperation | null>(null);
  const [editPatientDialogOpen, setEditPatientDialogOpen] = useState(false);
  const [editPatientId, setEditPatientId] = useState<number | null>(null);
  const [admissionSearchDate, setAdmissionSearchDate] = useState<string | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");

  const { data: searchResults = [], isFetching: isSearchingPatients } = useQuery({
    queryKey: ["patientSearch", patientSearchQuery],
    queryFn: () => searchExistingPatients(patientSearchQuery),
    enabled: patientSearchQuery.length >= 2,
  });

  const sortedSearchResults = useMemo(() => {
    return [...searchResults].sort((a, b) => b.id - a.id);
  }, [searchResults]);

  const {
    theme,
    quickAddFormData,
    setQuickAddFormData,
    quickAddPatientMutation,
    handleQuickAddSubmit,
    handleFormKeyDown,
  } = useQuickAddPatient({
    onPatientAdded: () => {
      queryClient.invalidateQueries({
        queryKey: ["admissionPatientsByDate"],
      });
    },
    fromAdmissionPage: true,
  });

  const effectiveDate = admissionSearchDate ?? dayjs().format("YYYY-MM-DD");

  const {
    data: visits,
    isLoading: isLoadingVisits,
    isError: isVisitsError,
  } = useQuery<ActivePatientVisit[]>({
    queryKey: ["admissionPatientsByDate", effectiveDate],
    queryFn: () => getAdmissionPatientsByDate(effectiveDate),
  });

  const handleClinicPatientSelect = (patient: Patient, visitId: number) => {
    const visit = visits?.find((v) => v.id === visitId) || null;
    if (visit) {
      // Ensure patient details on the visit are up to date with the selection (loosen typing)
      setSelectedVisit({ ...(visit as any), patient: patient as any });
      setShowQuickAddForm(false);
    }
  };

  const handlePatientSearchSelect = (patient: PatientSearchResult | null) => {
    if (patient) {
      // Create a "virtual" visit to satisfy the page components that rely on selectedVisit
      setSelectedVisit({
        id: -(patient.id), // Use negative ID to distinguish virtual visits
        patient: {
          id: patient.id,
          name: patient.name,
          phone: patient.phone ?? undefined,
          gender: patient.gender,
          age_year: patient.age_year,
        } as any,
        created_at: new Date().toISOString(),
      } as any);
      setShowQuickAddForm(false);
    } else {
      setSelectedVisit(null);
    }
  };

  const selectedPatientId = selectedVisit?.patient?.id ?? null;

  const { data: activeAdmission } = useQuery({
    queryKey: ["admissions", "active", selectedPatientId],
    queryFn: () => getPatientActiveAdmission(selectedPatientId!),
    enabled: !!selectedPatientId,
  });

  const hasActiveAdmission =
    !!selectedPatientId &&
    (admittedPatientIds.has(selectedPatientId) || !!activeAdmission);

  const activeAdmissionId = activeAdmission?.id ?? null;

  const saveBedMutation = useMutation({
    mutationFn: async ({
      bedId,
      isUpdate,
      admissionId,
    }: {
      bedId: number;
      isUpdate: boolean;
      admissionId: number | null;
    }) => {
      if (!selectedPatientId) throw new Error("No patient selected");
      if (isUpdate && admissionId) {
        return updateAdmission(admissionId, { bed_id: String(bedId) });
      }
      return createAdmission({
        patient_id: String(selectedPatientId),
        bed_id: String(bedId),
      });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isUpdate ? "تم تحديث السرير بنجاح" : "تم حفظ السرير في ملف التنويم"
      );
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["admissionPatientsByDate"] });
      queryClient.invalidateQueries({ queryKey: ["ward"] });
      queryClient.invalidateQueries({ queryKey: ["wardsList"] });
      if (!variables.isUpdate && selectedPatientId) {
        setAdmittedPatientIds((prev) => new Set([...prev, selectedPatientId]));
      }
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "فشل حفظ السرير");
    },
  });

  const assignBedToPatientMutation = useMutation({
    mutationFn: async ({
      patientId,
      bedId,
    }: {
      patientId: number;
      bedId: number;
    }) => {
      const { data } = await getAdmissions(1, {
        patient_id: patientId,
        status: "admitted",
      });
      const activeAdmission = data?.length ? data[0] : null;
      if (activeAdmission?.id) {
        return updateAdmission(activeAdmission.id, { bed_id: String(bedId) });
      }
      return createAdmission({
        patient_id: String(patientId),
        bed_id: String(bedId),
      });
    },
    onSuccess: (_, variables) => {
      toast.success("تم تعيين السرير للمريض بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["admissionPatientsByDate"] });
      queryClient.invalidateQueries({ queryKey: ["ward"] });
      queryClient.invalidateQueries({ queryKey: ["wardsList"] });
      setAdmittedPatientIds((prev) => new Set([...prev, variables.patientId]));
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "فشل تعيين السرير");
    },
  });

  const vacateBedMutation = useMutation({
    mutationFn: (admissionId: number) => vacateBedAdmission(admissionId),
    onSuccess: () => {
      toast.success("تم إخلاء السرير بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["admissionPatientsByDate"] });
      queryClient.invalidateQueries({ queryKey: ["ward"] });
      queryClient.invalidateQueries({ queryKey: ["wardsList"] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "فشل إخلاء السرير");
    },
  });

  const dischargeMutation = useMutation({
    mutationFn: (admissionId: number) => dischargeAdmission(admissionId, {}),
    onSuccess: () => {
      toast.success("تم خروج المريض بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["admissionPatientsByDate"] });
      queryClient.invalidateQueries({ queryKey: ["ward"] });
      queryClient.invalidateQueries({ queryKey: ["wardsList"] });
      setAdmittedPatientIds((prev) => {
        const next = new Set(prev);
        if (selectedPatientId) next.delete(selectedPatientId);
        return next;
      });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "فشل خروج المريض");
    },
  });

  const { data: surgeriesList = [] } = useQuery({
    queryKey: ["surgicalOperations"],
    queryFn: getSurgicalOperations,
  });

  const { data: admissionSurgeriesSummary } = useQuery({
    queryKey: ["admissionRequestedSurgeriesSummary", activeAdmissionId],
    queryFn: () => getAdmissionRequestedSurgeriesSummary(activeAdmissionId!),
    enabled: !!activeAdmissionId,
  });

  const calculatorDate = dayjs().format("YYYY-MM-DD");
  type RequestedSurgeryRow = {
    id: number;
    initial_price?: number | null;
    surgery?: { name: string };
    admission?: { patient?: { name: string } };
    finances?: Array<{
      amount: number;
      payment_method?: "cash" | "bankak";
      finance_charge?: { beneficiary?: "center" | "staff" };
    }>;
    paid_cash?: number;
    paid_bank?: number;
  };
  const { data: requestedSurgeriesByDate = [], isLoading: isLoadingCalculator } = useQuery({
    queryKey: ["requestedSurgeriesByDate", calculatorDate],
    queryFn: async () => {
      const { data } = await apiClient.get<RequestedSurgeryRow[]>(`/requested-surgeries`, {
        params: { date: calculatorDate },
      });
      return data ?? [];
    },
    enabled: calculatorDialogOpen,
  });
  const { data: calculatorSummary } = useQuery({
    queryKey: ["requestedSurgeriesSummaryByDate", calculatorDate],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        total_initial: number;
        paid: number;
        paid_cash: number;
        paid_bank: number;
        balance: number;
      }>(`/requested-surgeries/summary`, { params: { date: calculatorDate } });
      return data;
    },
    enabled: calculatorDialogOpen,
  });
  const totalInitialPrice = useMemo(
    () => requestedSurgeriesByDate.reduce((sum, s) => sum + (Number(s.initial_price) || 0), 0),
    [requestedSurgeriesByDate]
  );
  const totalCash = calculatorSummary?.paid_cash ?? 0;
  const totalBank = calculatorSummary?.paid_bank ?? 0;
  const getRowCashBank = (row: RequestedSurgeryRow) => {
    const cash = Number(row.paid_cash) || 0;
    const bank = Number(row.paid_bank) || 0;
    return { cash, bank };
  };
  const getRowStaffCenter = (row: RequestedSurgeryRow) => {
    let staff = 0;
    let center = 0;
    for (const f of row.finances ?? []) {
      const amt = Number(f.amount) || 0;
      if (f.finance_charge?.beneficiary === "staff") staff += amt;
      else if (f.finance_charge?.beneficiary === "center") center += amt;
    }
    return { staff, center };
  };
  const { totalStaff, totalCenter } = useMemo(() => {
    let staff = 0;
    let center = 0;
    for (const row of requestedSurgeriesByDate) {
      for (const f of row.finances ?? []) {
        const amt = Number(f.amount) || 0;
        if (f.finance_charge?.beneficiary === "staff") staff += amt;
        else if (f.finance_charge?.beneficiary === "center") center += amt;
      }
    }
    return { totalStaff: staff, totalCenter: center };
  }, [requestedSurgeriesByDate]);

  const handleAdmissionButtonClick = () => {
    if (!selectedPatientId) return;
    setAdmissionDialogEditId(hasActiveAdmission && activeAdmissionId ? activeAdmissionId : null);
    setAdmissionDialogOpen(true);
  };

  const admissionFormInitialPatient = useMemo((): Patient | null => {
    if (selectedVisit?.patient) {
      const p = selectedVisit.patient;
      return {
        id: p.id,
        name: p.name,
        phone: p.phone ?? undefined,
        gender: p.gender,
        age_year: p.age_year ?? undefined,
      } as Patient;
    }
    return null;
  }, [selectedVisit?.patient]);

  /** حالة التنويم: قيد الإجراء (بدون سرير) | منوم (بسرير) | مخرج */
  const getAdmissionStatusLabel = (
    admission: { status: string; bed_id?: number | null; bed?: { id: number } | null } | null | undefined
  ): string => {
    if (!admission) return "—";
    if (admission.status === "discharged") return "مخرج";
    if (admission.status === "transferred") return "منقول";
    const hasBed = !!(admission.bed_id ?? admission.bed?.id);
    return hasBed ? "منوم" : "قيد الإجراء";
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4 sm:px-6  max-w-7xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-1 mt-2">
            <Button
              component={Link}
              to="/admissions/dashboard"
              variant="outlined"
              size="medium"
              startIcon={<LayoutDashboard />}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              لوحة التنويم
            </Button>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ fontSize: "1.5rem" }}
            >
              تسجيل مريض للتنويم
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <TextField
              type="date"
              size="small"
              label="بحث بتاريخ التسجيل"
              value={admissionSearchDate ?? ""}
              onChange={(e) => setAdmissionSearchDate(e.target.value || null)}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiInputBase-root": { minWidth: 160 },
                "& .MuiInputLabel-shrink": { fontSize: "0.75rem" },
              }}
            />
            <Autocomplete
              size="small"
              options={sortedSearchResults}
              getOptionLabel={(option) => `${option.name} ${option.phone ? `(${option.phone})` : ""}`}
              loading={isSearchingPatients}
              onInputChange={(_, value) => setPatientSearchQuery(value)}
              onChange={(_, value) => handlePatientSearchSelect(value)}
              sx={{ width: 300 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="بحث عن مريض بالاسم"
                  placeholder="2 حروف على الأقل..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isSearchingPatients ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Button
              variant={showQuickAddForm ? "outlined" : "contained"}
              size="medium"
              startIcon={<UserPlus />}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
              onClick={() => {
                setSelectedVisit(null);
                setShowQuickAddForm(true);
              }}
            >
            </Button>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<Calculator size={18} />}
              onClick={() => setCalculatorDialogOpen(true)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              الحاسبه
            </Button>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<Bed />}
              onClick={() => setBedMapOpen(true)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              خريطة الأسرة
            </Button>
          </div>
        </header>

        {/* Three- or four-column layout (fourth when visit selected) */}
        <Box
          sx={{
            display: "grid",
            height: window.innerHeight - 120,
            gridTemplateColumns: {
              xs: "1fr",
              lg: selectedVisit
                ? "minmax(400px,1.2fr) minmax(400px,1.3fr) minmax(400px,1.3fr) minmax(400px,1.3fr)"
                : "minmax(0,1.4fr) minmax(0,1.3fr) minmax(0,1.3fr)",
            },
            gap: 1,
          }}
        >
          {/* Column 1: Quick add patient (hidden when a visit is selected) */}
          {showQuickAddForm && (
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <CardContent sx={{ p: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Box
                    sx={{
                      p: 0.75,
                      borderRadius: 1.5,
                      bgcolor: "primary.lighter",
                      color: "primary.main",
                      display: "flex",
                    }}
                  >
                    <UserPlus size={18} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      إضافة مريض جديد
                    </Typography>
                   
                  </Box>
                </Box>
                <Divider sx={{ mb: 1 }} />
                <QuickAddPatientFormFields
                  theme={theme}
                  quickAddFormData={quickAddFormData}
                  setQuickAddFormData={setQuickAddFormData}
                  quickAddPatientMutation={quickAddPatientMutation}
                  handleFormKeyDown={handleFormKeyDown}
                />
                <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() =>
                      setQuickAddFormData({
                        name: "",
                        phone: "",
                        dob: "1970-01-01",
                        gender: "female",
                        age_year: "",
                        age_month: "",
                        age_day: "",
                        income_source: "",
                        social_status: "",
                      })
                    }
                    disabled={quickAddPatientMutation.isPending}
                    sx={{ textTransform: "none" }}
                  >
                    مسح الحقول
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={
                      !quickAddPatientMutation.isPending && <UserPlus size={16} />
                    }
                    onClick={handleQuickAddSubmit}
                    disabled={
                      quickAddPatientMutation.isPending ||
                      !quickAddFormData.name ||
                      !quickAddFormData.phone ||
                      !quickAddFormData.gender
                    }
                    sx={{ textTransform: "none", px: 2 }}
                  >
                    {quickAddPatientMutation.isPending ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      "حفظ المريض"
                    )}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Column 2: Today's active clinic patients */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              
            }}
          >
            <CardContent
              sx={{
                p: 2,
                pb: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: "info.lighter",
                    color: "info.main",
                    display: "flex",
                  }}
                >
                  <ClipboardList size={20} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {admissionSearchDate
                      ? `مرضى  بتاريخ ${dayjs(admissionSearchDate).format("YYYY/MM/DD")}`
                      : `مرضى  اليوم  (${dayjs().format("YYYY/MM/DD")})`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {admissionSearchDate
                      ? "مرضى   في هذا التاريخ"
                      : "مرضى   في تاريخ اليوم"}
                  </Typography>
                </Box>
              </Box>
              {visits && (
                <Chip
                  size="small"
                  label={`${visits.length} مريض`}
                  color="info"
                  variant="outlined"
                />
              )}
            </CardContent>
            <Divider />
            <Box sx={{ flex: 1, position: "relative" }}>
              {isLoadingVisits ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 4,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : isVisitsError ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography color="error" variant="body2">
                    فشل في جلب قائمة المرضى المسجلين من صفحة التنويم
                  </Typography>
                </Box>
              ) : !visits || visits.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    {admissionSearchDate
                      ? "لا يوجد مرضى مسجلين في هذا التاريخ من صفحة التنويم"
                      : "لا يوجد مرضى مسجلين اليوم من صفحة التنويم"}
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    overflowY: "auto",
                    p: 1.5,
                  }}
                >
                  <div
                    style={{
                      direction: "rtl",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, 300px)",
                      gap: "8px",
                      justifyContent: "flex-start",
                    }}
                  >
                    {visits.map((visit,index) => (
                      <AdmissionActiveCard
                        key={visit.id}
                        visit={visit}
                        index={visits.length - (index+1)}
                        isSelected={selectedVisit?.id === visit.id}
                        onSelect={handleClinicPatientSelect}
                        onProfileClick={(visit) => {
                          setEditPatientId(visit.patient?.id ?? null);
                          setEditPatientDialogOpen(true);
                        }}
                        selectedPatientVisitIdInWorkspace={selectedVisit?.id ?? null}
                      />
                    ))}
                  </div>
                </Box>
              )}
            </Box>
          </Card>

          {/* Column 3: Selected patient details (resembles PatientDetailsColumnV1) */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardContent
              sx={{
                p: 2,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {!selectedVisit ? (
                <Box
                  sx={{
                    py: 6,
                    textAlign: "center",
                    color: "text.secondary",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="body2">
                    لم يتم اختيار أي مريض بعد
                  </Typography>
                </Box>
              ) : selectedVisit?.patient ? (
                <Box sx={{ display: "flex", flexDirection: "column", flex: 1, gap: 1.5 }}>
                  {/* Patient name - centered, bold, border-bottom (like PatientDetailsColumnV1) */}
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      textAlign: "center",
                      borderBottom: 1,
                      borderColor: "divider",
                      pb: 1,
                      mb: 1,
                    }}
                  >
                    {selectedVisit.patient.name}
                  </Typography>

                  {/* Details table (like PatientDetailsColumnV1) */}
                  <Table size="small" sx={{ "& .MuiTableCell-root": { border: 0, py: 0.5 } }}>
                    <TableBody>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="left" sx={{ color: "text.secondary", width: "40%" }}>
                          رقم التنويم
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {activeAdmissionId}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="left" sx={{ color: "text.secondary" }}>
                          العمر
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {typeof selectedVisit.patient.age_year === "number"
                            ? `${selectedVisit.patient.age_year} سنة`
                            : "—"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="left" sx={{ color: "text.secondary" }}>
                          الهاتف
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {selectedVisit.patient.phone || "لا يوجد"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="left" sx={{ color: "text.secondary" }}>
                          مصدر الدخل
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {selectedVisit.patient.income_source || "لا يوجد"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="left" sx={{ color: "text.secondary" }}>
                          الطبيب
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {selectedVisit.doctor?.name ?? selectedVisit.doctor_name ?? "—"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="left" sx={{ color: "text.secondary" }}>
                          تاريخ التسجيل
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {selectedVisit.created_at
                            ? dayjs(selectedVisit.created_at).format("DD/MM/YYYY HH:mm")
                            : "—"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="left" sx={{ color: "text.secondary" }}>
                          تاريخ الميلاد
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {selectedVisit.patient.dob
                            ? dayjs(selectedVisit.patient.dob).format("DD/MM/YYYY")
                            : "—"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="left" sx={{ color: "text.secondary" }}>
                          حالة التنويم
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {getAdmissionStatusLabel(activeAdmission ?? undefined)}
                        </TableCell>
                      </TableRow>
                      {activeAdmission && (
                        <>
                          <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                            <TableCell align="left" sx={{ color: "text.secondary" }}>
                              تاريخ فتح الملف
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>
                              {activeAdmission.created_at
                                ? dayjs(activeAdmission.created_at).format("DD/MM/YYYY HH:mm")
                                : "—"}
                            </TableCell>
                          </TableRow>
                          {activeAdmission.discharge_date && (
                            <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                              <TableCell align="left" sx={{ color: "text.secondary" }}>
                                تاريخ الخروج
                              </TableCell>
                              <TableCell sx={{ fontWeight: 500 }}>
                                {dayjs(activeAdmission.discharge_date).format("DD/MM/YYYY HH:mm")}
                              </TableCell>
                            </TableRow>
                          )}
                          {(activeAdmission.ward || activeAdmission.room || activeAdmission.bed) && (
                            <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                              <TableCell align="right" sx={{ color: "text.secondary" }}>
                                موقع التنويم
                              </TableCell>
                              <TableCell sx={{ fontWeight: 500 }}>
                                {[
                                  activeAdmission.ward?.name,
                                  activeAdmission.room?.room_number != null
                                    ? `غرفة ${activeAdmission.room.room_number}`
                                    : null,
                                  activeAdmission.bed?.bed_number != null
                                    ? `سرير ${activeAdmission.bed.bed_number}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )}
                      {selectedVisit.reason_for_visit && (
                        <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                          <TableCell align="right" sx={{ color: "text.secondary" }}>
                            سبب الزيارة
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {selectedVisit.reason_for_visit}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Financial summary - 3 columns like PatientDetailsColumnV1 */}
                  {activeAdmissionId && (
                    <Box
                      sx={{
                        bgcolor: "grey.50",
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "grey.200",
                        display: "flex",
                        flexDirection: "row",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          textAlign: "center",
                          py: 1.5,
                          px: 1,
                          borderLeft: 1,
                          borderColor: "grey.200",
                          "&:first-of-type": { borderLeft: 0 },
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block">
                          الإجمالي
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {(admissionSurgeriesSummary?.total_initial ?? 0).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          flex: 1,
                          textAlign: "center",
                          py: 1.5,
                          px: 1,
                          borderLeft: 1,
                          borderColor: "grey.200",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block">
                          المدفوع
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="success.main">
                          {(admissionSurgeriesSummary?.paid ?? 0).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          flex: 1,
                          textAlign: "center",
                          py: 1.5,
                          px: 1,
                          borderLeft: 1,
                          borderColor: "grey.200",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block">
                          المتبقي
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="error.main">
                          {(admissionSurgeriesSummary?.balance ?? 0).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Action buttons - full width like PatientDetailsColumnV1 */}
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.1, mt: "auto", pt: 1.5, borderTop: 1, borderColor: "divider" }}>
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      startIcon={<FileText size={16} />}
                      disabled={!selectedPatientId}
                      onClick={handleAdmissionButtonClick}
                      sx={{ textTransform: "none", fontWeight: 600, py: 0.75 }}
                    >
                      {hasActiveAdmission ? "عرض / تعديل ملف التنويم" : "فتح ملف تنويم"}
                    </Button>
                    <div style={{ display: "flex", flexDirection: "row", gap: 0.5 ,marginTop: "0.5rem",}}>
                    {hasActiveAdmission && !activeAdmission?.bed_id && activeAdmission?.status !== "discharged" && (
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        startIcon={<Bed size={16} />}
                        disabled={!selectedPatientId}
                        onClick={() => setBedMapOpen(true)}
                        sx={{ textTransform: "none", fontWeight: 600, py: 0.75 }}
                      >
                        اختر السرير
                      </Button>
                    )}
                      {hasActiveAdmission && !activeAdmission?.bed_id && activeAdmission?.status !== "discharged" && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        fullWidth
                        startIcon={<DoorOpen size={16} />}
                        disabled={dischargeMutation.isPending}
                        onClick={() => {
                          if (window.confirm("هل أنت متأكد من خروج المريض؟")) {
                            dischargeMutation.mutate(activeAdmission!.id);
                          }
                        }}
                        sx={{ textTransform: "none", fontWeight: 600, py: 0.75 }}
                      >
                        {dischargeMutation.isPending ? "جاري الخروج..." : "خروج المريض"}
                      </Button>
                    )}
                    </div>
                    {hasActiveAdmission && activeAdmission?.bed_id && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        fullWidth
                        startIcon={<DoorOpen size={16} />}
                        disabled={vacateBedMutation.isPending}
                        onClick={() => {
                          if (window.confirm("هل أنت متأكد من إخلاء السرير؟ (المريض يبقى منوماً بدون سرير)")) {
                            vacateBedMutation.mutate(activeAdmission.id);
                          }
                        }}
                        sx={{ textTransform: "none", fontWeight: 600, py: 0.75 }}
                      >
                        {vacateBedMutation.isPending ? "جاري الإخلاء..." : "إخلاء السرير"}
                      </Button>
                    )}
                  
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    py: 6,
                    textAlign: "center",
                    color: "text.secondary",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="body2">
                    لم يتم اختيار أي مريض بعد
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Column 4: Surgeries (only when visit is selected) — full tab when admission exists */}
          {selectedVisit && hasActiveAdmission && (
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <CardContent sx={{ p: 2, overflow: "auto", maxHeight: "calc(100vh - 12rem)" }}>
                {activeAdmissionId ? (
                  <RequestedSurgeriesPanel admissionId={activeAdmissionId} />
                ) : (
                  <>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      العمليات 
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                      قم بإنشاء ملف تنويم أولاً لعرض وإدارة العمليات الجراحية المطلوبة
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                  
                    <Typography variant="body2" color="text.secondary">
                      إنشاء ملف تنويم من العمود الأيسر لتفعيل إضافة العمليات
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </Box>

        <Dialog
          open={admissionDialogOpen}
          onClose={() => setAdmissionDialogOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid",
              borderColor: "divider",
              py: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              {admissionDialogEditId != null ? "عرض / تعديل ملف التنويم" : "ملف تنويم جديد"}
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                setAdmissionDialogOpen(false);
                setAdmissionDialogEditId(null);
              }}
              sx={{ color: "text.secondary" }}
            >
              <X size={20} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, overflow: "visible" }}>
            <Box sx={{ p: 2 }}>
              <AdmissionFormPage
                embedded
                admissionId={admissionDialogEditId}
                initialPatient={admissionFormInitialPatient}
                initialBedId={selectedBedId}
                initialBedSummary={selectedBedSummary}
                onSuccess={() => {
                  setAdmissionDialogOpen(false);
                  setAdmissionDialogEditId(null);
                  setSelectedBedId(null);
                  setSelectedBedSummary(null);
                  if (selectedPatientId)
                    setAdmittedPatientIds((prev) =>
                      new Set([...prev, selectedPatientId]),
                    );
                  queryClient.invalidateQueries({ queryKey: ["admissions"] });
                  queryClient.invalidateQueries({ queryKey: ["admissionPatientsByDate"] });
                }}
                onClose={() => {
                  setAdmissionDialogOpen(false);
                  setAdmissionDialogEditId(null);
                }}
              />
            </Box>
          </DialogContent>
        </Dialog>

        {/* BedMap dialog for bed assignment (third column) */}
        <Dialog
          open={bedMapOpen}
          onClose={() => setBedMapOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              width: "90%",
              maxWidth: "90%",
            },
          }}
        >
          <DialogTitle>اختر السرير</DialogTitle>
          <DialogContent>
            <BedMap
              selectedBedId={selectedBedId}
              isUpdatingBed={saveBedMutation.isPending || assignBedToPatientMutation.isPending}
              draggablePatients={visits?.map((v) => ({
                patientId: v.patient?.id ?? 0,
                patientName: v.patient?.name ?? "",
              })).filter((p) => p.patientId) ?? []}
              onSelectBed={(selection) => {
                setSelectedBedId(selection.id);
                const summary = [
                  selection.wardName,
                  selection.room?.room_number != null
                    ? `غرفة ${selection.room.room_number}`
                    : "",
                  `سرير ${selection.bed_number}`,
                ]
                  .filter(Boolean)
                  .join(" - ");
                setSelectedBedSummary(summary);
                setBedMapOpen(false);
                if (selectedPatientId) {
                  saveBedMutation.mutate({
                    bedId: selection.id,
                    isUpdate: hasActiveAdmission && !!activeAdmissionId,
                    admissionId: activeAdmissionId,
                  });
                }
              }}
              onDropPatient={(patientId: number, selection: BedSelection) => {
                assignBedToPatientMutation.mutate({
                  patientId,
                  bedId: selection.id,
                });
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Calculator: total initial price for requested surgeries (current date) */}
        <Dialog
          open={calculatorDialogOpen}
          onClose={() => setCalculatorDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle>
             عمليات اليوم
            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {dayjs(calculatorDate).format("YYYY/MM/DD")}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            {isLoadingCalculator ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : requestedSurgeriesByDate.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                لا توجد عمليات مطلوبة لهذا التاريخ
              </Typography>
            ) : (
              <>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell>#</TableCell>
                        <TableCell>المريض</TableCell>
                        <TableCell>العملية</TableCell>
                        <TableCell align="right">السعر</TableCell>
                        <TableCell align="right">اجمالي الكادر</TableCell>
                        <TableCell align="right">اجمالي المركز</TableCell>
                        <TableCell align="right">كاش</TableCell>
                        <TableCell align="right">بنك</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {requestedSurgeriesByDate.map((row) => {
                        const { cash, bank } = getRowCashBank(row);
                        const { staff, center } = getRowStaffCenter(row);
                        return (
                          <TableRow key={row.id}>
                            <TableCell>{row.id}</TableCell>
                            <TableCell>{row.admission?.patient?.name ?? "—"}</TableCell>
                            <TableCell>{row.surgery?.name ?? "—"}</TableCell>
                            <TableCell align="right">
                              {(Number(row.initial_price) || 0).toLocaleString()} SDG
                            </TableCell>
                            <TableCell align="right">
                              {staff > 0 ? `${staff.toLocaleString()} SDG` : "—"}
                            </TableCell>
                            <TableCell align="right">
                              {center > 0 ? `${center.toLocaleString()} SDG` : "—"}
                            </TableCell>
                            <TableCell align="right">
                              {cash > 0 ? `${cash.toLocaleString()} SDG` : "—"}
                            </TableCell>
                            <TableCell align="right">
                              {bank > 0 ? `${bank.toLocaleString()} SDG` : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ pt: 1, pb: 0.5, display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography fontWeight={700} variant="body1">الإجمالي:</Typography>
                    <Typography fontWeight={700} color="primary.main" variant="h6">
                      {totalInitialPrice.toLocaleString()} SDG
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography fontWeight={600} variant="body2" color="primary.main">اجمالي الكادر:</Typography>
                    <Typography fontWeight={600} variant="body1">{totalStaff.toLocaleString()} SDG</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography fontWeight={600} variant="body2" color="secondary.main">اجمالي المركز:</Typography>
                    <Typography fontWeight={600} variant="body1">{totalCenter.toLocaleString()} SDG</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography fontWeight={600} variant="body2" color="success.main">كاش:</Typography>
                    <Typography fontWeight={600} variant="body1">{totalCash.toLocaleString()} SDG</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography fontWeight={600} variant="body2" color="info.main">بنك:</Typography>
                    <Typography fontWeight={600} variant="body1">{totalBank.toLocaleString()} SDG</Typography>
                  </Box>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCalculatorDialogOpen(false)} variant="contained">
              إغلاق
            </Button>
          </DialogActions>
        </Dialog>

        <QuickAddPatientDialog
          open={editPatientDialogOpen}
          onClose={() => {
            setEditPatientDialogOpen(false);
            setEditPatientId(null);
          }}
          patientId={editPatientId}
          onPatientAdded={() => {}}
          onPatientUpdated={() => {
            queryClient.invalidateQueries({
              queryKey: ["admissionPatientsByDate"],
            });
          }}
        />
      </div>
    </div>
  );
}

