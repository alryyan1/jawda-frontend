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
  BedDouble,
  Bed,
  X,
  Calculator,
  FileText,
} from "lucide-react";
import { getActiveClinicPatients } from "@/services/clinicService";
import { getAdmissions, getPatientActiveAdmission, createAdmission, updateAdmission, getAdmissionRequestedSurgeriesSummary } from "@/services/admissionService";
import type {
  ActivePatientVisit,
  Patient,
} from "@/types/patients";
import AdmissionActiveCard from "@/components/admissions/AdmissionActiveCard";
import {
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
        queryKey: ["clinicActivePatientsForAdmission"],
      });
    },
  });

  const {
    data: visits,
    isLoading: isLoadingVisits,
    isError: isVisitsError,
  } = useQuery<ActivePatientVisit[]>({
    queryKey: ["clinicActivePatientsForAdmission"],
    queryFn: () => getActiveClinicPatients({}),
  });

  const handleClinicPatientSelect = (patient: Patient, visitId: number) => {
    const visit = visits?.find((v) => v.id === visitId) || null;
    if (visit) {
      // Ensure patient details on the visit are up to date with the selection (loosen typing)
      setSelectedVisit({ ...(visit as any), patient: patient as any });
      setShowQuickAddForm(false);
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
      queryClient.invalidateQueries({ queryKey: ["clinicActivePatientsForAdmission"] });
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
      queryClient.invalidateQueries({ queryKey: ["clinicActivePatientsForAdmission"] });
      queryClient.invalidateQueries({ queryKey: ["ward"] });
      queryClient.invalidateQueries({ queryKey: ["wardsList"] });
      setAdmittedPatientIds((prev) => new Set([...prev, variables.patientId]));
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "فشل تعيين السرير");
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
  const { data: requestedSurgeriesByDate = [], isLoading: isLoadingCalculator } = useQuery({
    queryKey: ["requestedSurgeriesByDate", calculatorDate],
    queryFn: async () => {
      const { data } = await apiClient.get<Array<{
        id: number;
        initial_price?: number | null;
        surgery?: { name: string };
        admission?: { patient?: { name: string } };
      }>>(`/requested-surgeries`, { params: { date: calculatorDate } });
      return data ?? [];
    },
    enabled: calculatorDialogOpen,
  });
  const totalInitialPrice = useMemo(
    () => requestedSurgeriesByDate.reduce((sum, s) => sum + (Number(s.initial_price) || 0), 0),
    [requestedSurgeriesByDate]
  );

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
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
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
              نموذج مريض جديد
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
            <Button
              component={Link}
              to="/admissions/list"
              variant="outlined"
              size="medium"
              startIcon={<ClipboardList />}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              قائمة التنويم
            </Button>
            <Button
              component={Link}
              to="/admissions/new"
              variant="contained"
              size="medium"
              startIcon={<BedDouble />}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              تنويم جديد
            </Button>
          </div>
        </header>

        {/* Three- or four-column layout (fourth when visit selected) */}
        <Box
          sx={{
            display: "grid",
            height: window.innerHeight - 200,
            gridTemplateColumns: {
              xs: "1fr",
              lg: selectedVisit
                ? "minmax(400px,1.2fr) minmax(400px,1.3fr) minmax(400px,1.3fr) minmax(400px,1.3fr)"
                : "minmax(0,1.4fr) minmax(0,1.3fr) minmax(0,1.3fr)",
            },
            gap: 1,
            mt: 3,
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
                    المرضى المنتظرين للتنويم
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    قائمة المرضى المنتظرين للتنويم لاختيارهم للتنويم
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
                    فشل في جلب قائمة مرضى اليوم
                  </Typography>
                </Box>
              ) : !visits || visits.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    لا يوجد مرضى نشطين اليوم في العيادة
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
                    {visits.map((visit) => (
                      <AdmissionActiveCard
                        key={visit.id}
                        visit={visit}
                        isSelected={selectedVisit?.id === visit.id}
                        onSelect={handleClinicPatientSelect}
                        onProfileClick={() => {}}
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
                        <TableCell align="right" sx={{ color: "text.secondary", width: "40%" }}>
                          الجنس
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {selectedVisit.patient.gender === "male" ? "ذكر" : selectedVisit.patient.gender === "female" ? "أنثى" : "—"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="right" sx={{ color: "text.secondary" }}>
                          العمر
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {typeof selectedVisit.patient.age_year === "number"
                            ? `${selectedVisit.patient.age_year} سنة`
                            : "—"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="right" sx={{ color: "text.secondary" }}>
                          الهاتف
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {selectedVisit.patient.phone || "لا يوجد"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="right" sx={{ color: "text.secondary" }}>
                          مصدر الدخل
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {selectedVisit.patient.income_source || "لا يوجد"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="right" sx={{ color: "text.secondary" }}>
                          الطبيب
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {selectedVisit.doctor?.name ?? selectedVisit.doctor_name ?? "—"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="right" sx={{ color: "text.secondary" }}>
                          تاريخ التسجيل
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {selectedVisit.created_at
                            ? dayjs(selectedVisit.created_at).format("DD/MM/YYYY HH:mm")
                            : "—"}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                        <TableCell align="right" sx={{ color: "text.secondary" }}>
                          حالة التنويم
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {getAdmissionStatusLabel(activeAdmission ?? undefined)}
                        </TableCell>
                      </TableRow>
                      {activeAdmission && (
                        <>
                          <TableRow sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                            <TableCell align="right" sx={{ color: "text.secondary" }}>
                              تاريخ التنويم
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>
                              {activeAdmission.created_at
                                ? dayjs(activeAdmission.created_at).format("DD/MM/YYYY HH:mm")
                                : "—"}
                            </TableCell>
                          </TableRow>
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: "auto", pt: 2, borderTop: 1, borderColor: "divider" }}>
                    <Button
                      variant="contained"
                      size="medium"
                      fullWidth
                      startIcon={<FileText size={18} />}
                      disabled={!selectedPatientId}
                      onClick={handleAdmissionButtonClick}
                      sx={{ textTransform: "none", fontWeight: 600 }}
                    >
              {hasActiveAdmission ? "عرض / تعديل ملف التنويم" : "فتح ملف تنويم"}
                    </Button>
                    {hasActiveAdmission && (
                      <Button
                        variant="outlined"
                        size="medium"
                        fullWidth
                        startIcon={<Bed size={18} />}
                        disabled={!selectedPatientId}
                        onClick={() => setBedMapOpen(true)}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        اختر السرير
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
                  queryClient.invalidateQueries({ queryKey: ["clinicActivePatientsForAdmission"] });
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
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle>
            إجمالي السعر الأولي — عمليات اليوم
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
                        <TableCell align="right">السعر الأولي</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {requestedSurgeriesByDate.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>{row.admission?.patient?.name ?? "—"}</TableCell>
                          <TableCell>{row.surgery?.name ?? "—"}</TableCell>
                          <TableCell align="right">
                            {(Number(row.initial_price) || 0).toLocaleString()} SDG
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ pt: 1, pb: 0.5, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1 }}>
                  <Typography fontWeight={700} variant="body1">
                    الإجمالي:
                  </Typography>
                  <Typography fontWeight={700} color="primary.main" variant="h6">
                    {totalInitialPrice.toLocaleString()} SDG
                  </Typography>
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
      </div>
    </div>
  );
}

