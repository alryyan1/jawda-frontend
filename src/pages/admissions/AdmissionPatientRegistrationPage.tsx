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
  IconButton,
} from "@mui/material";
import {
  LayoutDashboard,
  ClipboardList,
  UserPlus,
  BedDouble,
  Bed,
  X,
} from "lucide-react";
import { getActiveClinicPatients } from "@/services/clinicService";
import { getPatientById } from "@/services/patientService";
import { getAdmissions, createAdmission, updateAdmission } from "@/services/admissionService";
import type {
  ActivePatientVisit,
  PatientSearchResult,
  Patient,
} from "@/types/patients";
import ActivePatientCard from "@/components/clinic/ActivePatientCard";
import {
  useQuickAddPatient,
  QuickAddPatientFormFields,
} from "@/components/admissions/QuickAddPatientDialog";
import AdmissionFormPage from "@/pages/admissions/AdmissionFormPage";
import BedMap from "@/components/admissions/BedMap";

export default function AdmissionPatientRegistrationPage() {
  const queryClient = useQueryClient();

  const [selectedVisit, setSelectedVisit] =
    useState<ActivePatientVisit | null>(null);
  const [selectedQuickPatient, setSelectedQuickPatient] =
    useState<PatientSearchResult | null>(null);
  const [showQuickAddForm, setShowQuickAddForm] = useState<boolean>(true);
  const [admissionDialogOpen, setAdmissionDialogOpen] = useState(false);
  /** When set, the admission dialog opens in edit mode for this admission id. */
  const [admissionDialogEditId, setAdmissionDialogEditId] = useState<number | null>(null);
  const [bedMapOpen, setBedMapOpen] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
  const [selectedBedSummary, setSelectedBedSummary] = useState<string | null>(
    null,
  );
  const [admittedPatientIds, setAdmittedPatientIds] = useState<Set<number>>(
    () => new Set(),
  );

  const {
    theme,
    quickAddFormData,
    setQuickAddFormData,
    quickAddPatientMutation,
    handleQuickAddSubmit,
    handleFormKeyDown,
  } = useQuickAddPatient({
    onPatientAdded: (patient) => {
      setSelectedQuickPatient(patient);
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

  // Load full patient details for the patient created in column 1
  const {
    data: quickPatientDetails,
    isLoading: isLoadingQuickDetails,
    isError: isQuickDetailsError,
  } = useQuery<Patient>({
    queryKey: ["admissionQuickPatient", selectedQuickPatient?.id],
    queryFn: () => getPatientById(selectedQuickPatient!.id),
    enabled: !!selectedQuickPatient?.id,
  });

  const selectedPatientId = selectedVisit?.patient?.id ?? selectedQuickPatient?.id ?? null;

  const { data: admissionsResponse } = useQuery({
    queryKey: ["admissions", "active", selectedPatientId],
    queryFn: () =>
      getAdmissions(1, {
        patient_id: selectedPatientId!,
        status: "admitted",
      }),
    enabled: !!selectedPatientId,
  });

  const hasActiveAdmission =
    !!selectedPatientId &&
    (admittedPatientIds.has(selectedPatientId) ||
      (admissionsResponse?.data?.length ?? 0) > 0);

  const activeAdmissionId = (admissionsResponse?.data?.length ?? 0) > 0
    ? admissionsResponse!.data![0].id
    : null;

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
      if (!variables.isUpdate && selectedPatientId) {
        setAdmittedPatientIds((prev) => new Set([...prev, selectedPatientId]));
      }
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "فشل حفظ السرير");
    },
  });

  const handleAdmissionButtonClick = () => {
    if (!selectedPatientId) return;
    setAdmissionDialogEditId(hasActiveAdmission && activeAdmissionId ? activeAdmissionId : null);
    setAdmissionDialogOpen(true);
  };

  const admissionFormInitialPatient = useMemo((): PatientSearchResult | null => {
    if (selectedVisit?.patient) {
      const p = selectedVisit.patient;
      return {
        id: p.id,
        name: p.name,
        phone: p.phone ?? undefined,
        gender: p.gender,
        age_year: p.age_year ?? undefined,
        patient_id: p.id,
      };
    }
    if (selectedQuickPatient) {
      return selectedQuickPatient;
    }
    if (quickPatientDetails) {
      return {
        id: quickPatientDetails.id,
        name: quickPatientDetails.name,
        phone: quickPatientDetails.phone ?? undefined,
        gender: quickPatientDetails.gender,
        age_year: quickPatientDetails.age_year ?? undefined,
        patient_id: quickPatientDetails.id,
      };
    }
    return null;
  }, [selectedVisit?.patient, selectedQuickPatient, quickPatientDetails]);

  const getVisitStatusLabel = (status: ActivePatientVisit["status"]) => {
    switch (status) {
      case "waiting":
        return "في الانتظار";
      case "with_doctor":
        return "عند الطبيب";
      case "lab_pending":
        return "معلق بالمختبر";
      case "imaging_pending":
        return "معلق بالأشعة";
      case "payment_pending":
        return "في انتظار الدفع";
      case "completed":
        return "مكتملة";
      case "cancelled":
        return "ملغاة";
      case "no_show":
        return "لم يحضر";
      default:
        return status;
    }
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
              onClick={() => setShowQuickAddForm(true)}
            >
              نموذج مريض جديد
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

        {/* Three-column layout */}
        <Box
          sx={{
            display: "grid",
            height:window.innerHeight-200,
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(0,1.4fr) minmax(0,1.2fr) minmax(0,1.3fr)",
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
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: "primary.lighter",
                        color: "primary.main",
                        display: "flex",
                      }}
                    >
                      <UserPlus size={20} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        إضافة مريض جديد
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        تسجيل سريع لمريض جديد للتنويم أو العيادة
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <QuickAddPatientFormFields
                  theme={theme}
                  quickAddFormData={quickAddFormData}
                  setQuickAddFormData={setQuickAddFormData}
                  quickAddPatientMutation={quickAddPatientMutation}
                  handleFormKeyDown={handleFormKeyDown}
                />
                <Box
                  sx={{
                    mt: 2.5,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1.5,
                  }}
                >
                  <Button
                    variant="outlined"
                    size="medium"
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
                    size="medium"
                    startIcon={
                      !quickAddPatientMutation.isPending && <UserPlus size={18} />
                    }
                    onClick={handleQuickAddSubmit}
                    disabled={
                      quickAddPatientMutation.isPending ||
                      !quickAddFormData.name ||
                      !quickAddFormData.phone ||
                      !quickAddFormData.gender
                    }
                    sx={{ textTransform: "none", px: 3 }}
                  >
                    {quickAddPatientMutation.isPending ? (
                      <CircularProgress size={20} color="inherit" />
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
                    مرضى اليوم (العيادة)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    قائمة المرضى النشطين لهذا اليوم لاختيارهم للتنويم
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
                      <ActivePatientCard
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

          {/* Column 3: Selected patient details */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                 تفاصيل المريض المختار
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 2 }}
              >
                اختر مريضاً من القائمة أو قم بإضافته من العمود الأول لعرض
                التفاصيل هنا
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {!selectedVisit && !selectedQuickPatient ? (
                <Box
                  sx={{
                    py: 6,
                    textAlign: "center",
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="body2">
                    لم يتم اختيار أي مريض بعد
                  </Typography>
                </Box>
              ) : selectedVisit && selectedVisit.patient ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedVisit.patient.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                    {selectedVisit.patient.gender && (
                      <Chip
                        size="small"
                        label={
                          selectedVisit.patient.gender === "male" ? "ذكر" : "أنثى"
                        }
                      />
                    )}
                    {typeof selectedVisit.patient.age_year === "number" &&
                      selectedVisit.patient.age_year !== null && (
                        <Chip
                          size="small"
                          label={`${selectedVisit.patient.age_year} سنة`}
                        />
                      )}
                    {selectedVisit.patient.social_status && (
                      <Chip
                        size="small"
                        label={
                          selectedVisit.patient.social_status === "single"
                            ? "أعزب"
                            : selectedVisit.patient.social_status === "married"
                              ? "متزوج"
                              : selectedVisit.patient.social_status === "widowed"
                                ? "أرمل"
                                : selectedVisit.patient.social_status === "divorced"
                                  ? "مطلق"
                                  : selectedVisit.patient.social_status
                        }
                      />
                    )}
                    <Chip
                      size="small"
                      color="primary"
                      label={getVisitStatusLabel(selectedVisit.status)}
                    />
                    {selectedVisit.queue_number && (
                      <Chip
                        size="small"
                        label={`رقم الدور ${selectedVisit.queue_number}`}
                      />
                    )}
                  </Box>
                  <Typography variant="body2">
                    <strong>الهاتف:</strong>{" "}
                    {selectedVisit.patient.phone || "لا يوجد"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>مصدر الدخل:</strong>{" "}
                    {selectedVisit.patient.income_source || "لا يوجد"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>الطبيب:</strong>{" "}
                    {selectedVisit.doctor?.name ?? selectedVisit.doctor_name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>تاريخ الزيارة:</strong>{" "}
                    {selectedVisit.created_at
                      ? new Date(selectedVisit.created_at).toLocaleString("ar-EG")
                      : "غير متوفر"}
                  </Typography>
                  {selectedVisit.reason_for_visit && (
                    <Typography variant="body2">
                      <strong>سبب الزيارة:</strong>{" "}
                      {selectedVisit.reason_for_visit}
                    </Typography>
                  )}
                  {selectedVisit.patient.company?.name && (
                    <Typography variant="body2">
                      <strong>الشركة:</strong>{" "}
                      {selectedVisit.patient.company.name}
                    </Typography>
                  )}
                  {selectedBedSummary && (
                    <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Bed size={16} style={{ flexShrink: 0 }} />
                      <strong>السرير:</strong> {selectedBedSummary}
                    </Typography>
                  )}
                </Box>
              ) : !selectedQuickPatient ? (
                <Box
                  sx={{
                    py: 6,
                    textAlign: "center",
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="body2">
                    لم يتم تسجيل أي مريض بعد من العمود الأول
                  </Typography>
                </Box>
              ) : isLoadingQuickDetails ? (
                <Box
                  sx={{
                    py: 4,
                    textAlign: "center",
                    color: "text.secondary",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CircularProgress size={24} />
                  <Typography variant="body2">جاري تحميل بيانات المريض...</Typography>
                </Box>
              ) : isQuickDetailsError || !quickPatientDetails ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedQuickPatient.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                    {selectedQuickPatient.gender && (
                      <Chip
                        size="small"
                        label={
                          selectedQuickPatient.gender === "male"
                            ? "ذكر"
                            : "أنثى"
                        }
                      />
                    )}
                    {typeof selectedQuickPatient.age_year === "number" && (
                      <Chip
                        size="small"
                        label={`${selectedQuickPatient.age_year} سنة`}
                      />
                    )}
                  </Box>
                  <Typography variant="body2">
                    <strong>الهاتف:</strong>{" "}
                    {selectedQuickPatient.phone || "لا يوجد"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    تم تسجيل هذا المريض حديثاً. يمكنك استخدامه في نموذج التنويم
                    لاحقاً.
                  </Typography>
                  {selectedBedSummary && (
                    <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Bed size={16} style={{ flexShrink: 0 }} />
                      <strong>السرير:</strong> {selectedBedSummary}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="h6" fontWeight={700}>
                    {quickPatientDetails.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                    {quickPatientDetails.gender && (
                      <Chip
                        size="small"
                        label={
                          quickPatientDetails.gender === "male" ? "ذكر" : "أنثى"
                        }
                      />
                    )}
                    {typeof quickPatientDetails.age_year === "number" &&
                      quickPatientDetails.age_year !== null && (
                        <Chip
                          size="small"
                          label={`${quickPatientDetails.age_year} سنة`}
                        />
                      )}
                    {quickPatientDetails.social_status && (
                      <Chip
                        size="small"
                        label={
                          quickPatientDetails.social_status === "single"
                            ? "أعزب"
                            : quickPatientDetails.social_status === "married"
                              ? "متزوج"
                              : quickPatientDetails.social_status === "widowed"
                                ? "أرمل"
                                : quickPatientDetails.social_status === "divorced"
                                  ? "مطلق"
                                  : quickPatientDetails.social_status
                        }
                      />
                    )}
                    {quickPatientDetails.company?.name && (
                      <Chip
                        size="small"
                        label={quickPatientDetails.company.name}
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Typography variant="body2">
                    <strong>الهاتف:</strong>{" "}
                    {quickPatientDetails.phone || "لا يوجد"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>مصدر الدخل:</strong>{" "}
                    {quickPatientDetails.income_source || "لا يوجد"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>الرقم القومي:</strong>{" "}
                    {quickPatientDetails.gov_id || "لا يوجد"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>البريد الإلكتروني:</strong>{" "}
                    {quickPatientDetails.email || "لا يوجد"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>الجنسية:</strong>{" "}
                    {quickPatientDetails.nationality || "لا يوجد"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>العنوان:</strong>{" "}
                    {quickPatientDetails.address || "لا يوجد"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>تاريخ التسجيل:</strong>{" "}
                    {new Date(
                      quickPatientDetails.created_at,
                    ).toLocaleString("ar-EG")}
                  </Typography>
                  {selectedBedSummary && (
                    <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Bed size={16} style={{ flexShrink: 0 }} />
                      <strong>السرير:</strong> {selectedBedSummary}
                    </Typography>
                  )}
                </Box>
              )}

              {/* إجراء التنويم + اختر السرير buttons in third column */}
              {(selectedVisit || selectedQuickPatient) && (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<BedDouble size={18} />}
                      disabled={!selectedPatientId}
                      onClick={handleAdmissionButtonClick}
                      sx={{ textTransform: "none", fontWeight: 600, flex: 1, minWidth: 140 }}
                    >
                      {hasActiveAdmission ? "عرض ملف " : "ملف تنويم جديد"}
                    </Button>
                    <Button
                      variant="outlined"
                      size="medium"
                      startIcon={<Bed size={18} />}
                      disabled={!selectedPatientId}
                      onClick={() => setBedMapOpen(true)}
                      sx={{ textTransform: "none", fontWeight: 600, flex: 1, minWidth: 140 }}
                    >
                      اختر السرير
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
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
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle>اختر السرير</DialogTitle>
          <DialogContent>
            <BedMap
              selectedBedId={selectedBedId}
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
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

