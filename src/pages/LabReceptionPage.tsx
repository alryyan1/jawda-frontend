// src/pages/LabReceptionPage.tsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { toast } from "sonner";
import { X } from "lucide-react";

// UI
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Feature components
import LabRegistrationForm from "@/components/lab/reception/LabRegistrationForm";
import LabPatientQueue, { type LabPatientQueueRef } from "@/components/lab/reception/LabPatientQueue";
import LabRequestsColumn from "@/components/lab/reception/LabRequestsColumn";
import PatientDetailsColumnV1, { type PatientDetailsColumnV1Ref } from "@/components/lab/reception/PatientDetailsColumnV1";
import LabReceptionActionPage from "@/components/lab/reception/LabReceptionActionPage";
import LabReceptionHeader, { type AutocompleteVisitOption } from "@/components/lab/reception/LabReceptionHeader";
import PatientHistoryTable from "@/components/lab/reception/PatientHistoryTable";
import DoctorFinderDialog from "@/components/clinic/dialogs/DoctorFinderDialog";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";
import MainTestsPriceListDialog from "@/components/lab/reception/MainTestsPriceListDialog";
import OffersDialog from "@/components/lab/reception/OffersDialog";

// Hooks & services
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useCachedMainTestsList } from "@/hooks/useCachedData";
import { usePdfPreviewVisibility } from "@/contexts/PdfPreviewVisibilityContext";
import { useLab2LabNewPatientAlert } from "@/hooks/useLab2LabNewPatientAlert";
import { playNotificationSound } from "@/lib/notificationSound";
import { getDoctorVisitById } from "@/services/visitService";
import { createLabVisitForExistingPatient, searchExistingPatients } from "@/services/patientService";
import { addLabTestsToVisit } from "@/services/labRequestService";
import apiClient from "@/services/api";
import { getAppearanceSettings } from "@/lib/appearance-settings-store";

// Types
import type { Patient, PatientSearchResult } from "@/types/patients";
import type { LabQueueFilters, PatientLabQueueItem } from "@/types/labWorkflow";
import type { DoctorVisit, LabRequest } from "@/types/visits";
import type { DoctorShift, DoctorStripped } from "@/types/doctors";
import type { MainTestStripped } from "@/types/labTests";
import type { AxiosError } from "axios";

/* -------------------------------------------------------------------------- */
/*                                 MUI theme                                  */
/* -------------------------------------------------------------------------- */

const materialTheme = createTheme({
  typography: {
    fontFamily: "'Tajawal', 'Cairo', sans-serif",
  },
  palette: {
    primary: { main: "#1976d2", light: "#42a5f5", dark: "#1565c0" },
    secondary: { main: "#dc004e", light: "#ff5983", dark: "#9a0036" },
    background: { default: "#f5f5f5", paper: "#ffffff" },
  },
  shape: { borderRadius: 8 },
});

/* -------------------------------------------------------------------------- */
/*                              Pure helpers                                  */
/* -------------------------------------------------------------------------- */

const formatTimeToAMPM = (timeString: string | null | undefined): string | null => {
  if (!timeString) return null;
  try {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    const mins = minutes || "00";
    return `${hour12.toString().padStart(2, "0")}:${mins} ${ampm}`;
  } catch {
    return null;
  }
};

/**
 * Maps a freshly fetched DoctorVisit onto the PatientLabQueueItem shape the
 * queue consumes, so a new registration can be appended without a refetch.
 */
const convertVisitToQueueItem = (visit: DoctorVisit): PatientLabQueueItem => {
  const labRequests = visit.lab_requests || [];
  const oldestRequest = labRequests.length > 0 ? labRequests[0] : null;

  const requestedServices = visit.requested_services || [];
  const totalServicesAmount = requestedServices.reduce((sum, svc) => sum + svc.price * svc.count, 0);
  const totalServicesPaid = requestedServices.reduce((sum, svc) => sum + svc.amount_paid, 0);
  const totalLabAmount = labRequests.reduce((sum, req) => sum + req.price, 0);
  const totalLabPaid = labRequests.reduce((sum, req) => sum + req.amount_paid, 0);
  const totalLabDiscount = labRequests.reduce((sum, req) => sum + (req.price * req.discount_per) / 100, 0);
  const totalLabEndurance = labRequests.reduce((sum, req) => sum + req.endurance, 0);
  const totalLabBalance = totalLabAmount - totalLabPaid - totalLabDiscount - totalLabEndurance;
  const totalDiscount = requestedServices.reduce(
    (sum, svc) => sum + svc.discount + (svc.price * svc.discount_per * svc.count) / 100,
    0
  );
  const totalAmount = totalServicesAmount + totalLabAmount;
  const totalPaid = totalServicesPaid + totalLabPaid;
  const balanceDue = totalAmount - totalPaid - totalDiscount;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return {
    id: visit.id,
    visit_time: visit.visit_time || null,
    visit_time_formatted: formatTimeToAMPM(visit.visit_time),
    status: visit.status,
    visit_type: visit.visit_type || null,
    company: visit.company || visit.patient?.company || null,
    queue_number: visit.queue_number || visit.number || null,
    number: visit.number,
    reason_for_visit: visit.reason_for_visit || "",
    visit_notes: visit.visit_notes || null,
    is_new: visit.is_new,
    only_lab: visit.only_lab,
    requested_services_count: visit.requested_services_count || requestedServices.length || null,
    patient_id: visit.patient_id,
    patient: visit.patient
      ? {
          id: visit.patient.id,
          name: visit.patient.name,
          phone: visit.patient.phone || "",
          gender: visit.patient.gender,
          age_year: visit.patient.age_year || 0,
          age_month: visit.patient.age_month || null,
          age_day: visit.patient.age_day || null,
          full_age: (visit.patient as any).full_age || "N/A",
          doctor: visit.patient.doctor || null,
          result_is_locked: visit.patient.result_is_locked || false,
          address: visit.patient.address || null,
          gov_id: (visit.patient as any).gov_id || null,
          company_id: visit.patient.company_id || null,
          company: visit.patient.company || null,
          subcompany_id: visit.patient.subcompany_id || null,
          subcompany: visit.patient.subcompany || null,
          company_relation_id: visit.patient.company_relation_id || null,
          company_relation: visit.patient.company_relation || null,
          insurance_no: (visit.patient as any).insurance_no || null,
          expire_date: (visit.patient as any).expire_date || null,
          guarantor: (visit.patient as any).guarantor || null,
          paper_fees: (visit.patient as any).paper_fees || 0,
          is_lab_paid: (visit.patient as any).is_lab_paid || false,
          lab_paid: (visit.patient as any).lab_paid || 0,
          sample_collected: (visit.patient as any).sample_collected || false,
          sample_collect_time: (visit.patient as any).sample_collect_time || null,
          result_print_date: visit.patient.result_print_date || null,
          sample_print_date: (visit.patient as any).sample_print_date || null,
          visit_number: (visit.patient as any).visit_number || 0,
          result_auth: visit.patient.result_auth || false,
          auth_date: visit.patient.auth_date || null,
          discount: (visit.patient as any).discount || 0,
          discount_comment: (visit.patient as any).discount_comment || "",
          doctor_finish: (visit.patient as any).doctor_finish || false,
          doctor_lab_request_confirm: (visit.patient as any).doctor_lab_request_confirm || false,
          doctor_lab_urgent_confirm: (visit.patient as any).doctor_lab_urgent_confirm || false,
          created_at: (visit.patient as any).created_at,
          updated_at: (visit.patient as any).updated_at,
          user: visit.patient.user || null,
          has_cbc: visit.patient.has_cbc || false,
          result_url: visit.patient.result_url || null,
        }
      : null,
    patient_subcompany: visit.patient?.subcompany || null,
    doctor_id: visit.doctor_id,
    doctor: visit.doctor || null,
    doctor_name: visit.doctor?.name || "",
    user_id: visit.user_id,
    created_by_user: visit.created_by_user || null,
    shift_id: visit.shift_id,
    doctor_shift_id: visit.doctor_shift_id || null,
    total_services_amount: totalServicesAmount,
    total_services_paid: totalServicesPaid,
    total_lab_value_will_pay: totalLabAmount - totalLabEndurance,
    lab_paid: (visit.patient as any)?.lab_paid || 0,
    total_lab_amount: totalLabAmount,
    total_paid: totalPaid,
    total_discount: totalDiscount,
    balance_due: balanceDue,
    total_lab_paid: totalLabPaid,
    total_lab_discount: totalLabDiscount,
    total_lab_endurance: totalLabEndurance,
    total_lab_balance: totalLabBalance,
    requested_services: requestedServices,
    lab_requests: labRequests,
    requested_services_summary: requestedServices.map((svc) => ({
      id: svc.id,
      service_name: svc.service?.name || "",
      price: svc.price,
      count: svc.count,
      amount_paid: svc.amount_paid,
      is_paid: svc.is_paid,
      done: svc.done,
    })),
    created_at: visit.created_at,
    updated_at: visit.updated_at,
    company_relation: visit.patient?.company_relation || null,
    result_auth: visit.result_auth || false,
    auth_date: visit.auth_date || null,
    visit_id: visit.id,
    lab_number: (visit.patient as any)?.visit_number?.toString() || visit.id.toString(),
    patient_name: visit.patient?.name || "",
    phone: visit.patient?.phone || "",
    sample_id: oldestRequest?.id?.toString() || visit.id.toString(),
    lab_request_ids: labRequests.map((req: LabRequest) => req.id),
    oldest_request_time: oldestRequest?.created_at || visit.created_at,
    test_count: labRequests.length,
    result_is_locked: visit.patient?.result_is_locked || false,
    all_requests_paid: labRequests.length > 0 ? labRequests.every((req: LabRequest) => req.amount_paid > 0) : false,
    is_result_locked: visit.patient?.result_is_locked || false,
    is_printed: false,
    total_result_count: labRequests.reduce((sum, req) => sum + (req.results?.length || 0), 0),
    pending_result_count: labRequests.reduce((sum, req) => {
      const results = (req as any).results || [];
      return sum + results.filter((r: { result?: string }) => !r.result || r.result === "").length;
    }, 0),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
};

/* -------------------------------------------------------------------------- */
/*                            PDF preview hook                                */
/* -------------------------------------------------------------------------- */

interface PdfGenerateOptions {
  title: string;
  fileNamePrefix: string;
  visitId: number;
  patientName?: string;
  fetchFunction: () => Promise<Blob>;
}

const usePdfPreview = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("document.pdf");

  const generate = useCallback(async ({ title, fileNamePrefix, visitId, patientName, fetchFunction }: PdfGenerateOptions) => {
    setIsGenerating(true);
    setUrl(null);
    setTitle(title);
    setIsOpen(true);

    try {
      const blob = await fetchFunction();
      setUrl(URL.createObjectURL(blob));
      const patientNameSanitized = patientName?.replace(/[^A-Za-z0-9\-_]/g, "_") || "patient";
      setFileName(`${fileNamePrefix}_${visitId}_${patientNameSanitized}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error: unknown) {
      console.error(`Error generating ${title}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("فشل توليد ملف PDF", { description: errorMessage });
      setIsOpen(false);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open && url) {
        URL.revokeObjectURL(url);
        setUrl(null);
      }
    },
    [url]
  );

  return { isOpen, url, isGenerating, title, fileName, generate, handleOpenChange };
};

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

const LabReceptionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();
  const { can } = useAuthorization();
  const { isVisible: isPdfPreviewVisible } = usePdfPreviewVisibility();
  const pdfPreview = usePdfPreview();

  // Notify with a sound + toast whenever a new patient arrives from another lab
  useLab2LabNewPatientAlert((patientName) => {
    playNotificationSound();
    toast.info(`مريض جديد من مختبر آخر: ${patientName}`);
  });

  /* ------------------------------ View state ------------------------------ */
  const [activeVisitId, setActiveVisitId] = useState<number | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [showPatientHistory, setShowPatientHistory] = useState(false);

  const [isDoctorFinderOpen, setIsDoctorFinderOpen] = useState(false);
  const [isPriceListOpen, setIsPriceListOpen] = useState(false);
  const [isOffersOpen, setIsOffersOpen] = useState(false);

  const [filters, setFilters] = useState<LabQueueFilters>({
    isBankak: null,
    company: null,
    doctor: null,
    specialist: null,
  });

  /* --------------------------- Search state ------------------------------- */
  const [searchQuery, setSearchQuery] = useState("");
  const [nameSearchQuery, setNameSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const debouncedNameSearchQuery = useDebounce(nameSearchQuery, 300);
  const [selectedDoctorForNewVisit, setSelectedDoctorForNewVisit] = useState<DoctorStripped | null>(null);

  const [visitIdSearchTerm, setVisitIdSearchTerm] = useState("");
  const [autocompleteInputValue, setAutocompleteInputValue] = useState("");
  const [selectedVisitFromAutocomplete, setSelectedVisitFromAutocomplete] = useState<AutocompleteVisitOption | null>(null);
  const debouncedAutocompleteSearch = useDebounce(autocompleteInputValue, 500);

  const [selectedTests, setSelectedTests] = useState<MainTestStripped[]>([]);

  /* -------------------------------- Refs ---------------------------------- */
  const patientHistoryRef = useRef<HTMLDivElement>(null);
  const testSelectionAutocompleteRef = useRef<HTMLDivElement>(null);
  const patientDetailsRef = useRef<PatientDetailsColumnV1Ref>(null);
  const labPatientQueueRef = useRef<LabPatientQueueRef>(null);

  const focusTestSelection = useCallback((delay: number) => {
    setTimeout(() => {
      const inputElement = testSelectionAutocompleteRef.current?.querySelector("input");
      inputElement?.focus();
    }, delay);
  }, []);

  /* ------------------------------- Queries -------------------------------- */
  const { data: searchResults = [], isLoading: isLoadingSearchResults } = useQuery<PatientSearchResult[], Error>({
    queryKey: ["patientSearchExistingLab", debouncedSearchQuery],
    queryFn: () => (debouncedSearchQuery.length >= 2 ? searchExistingPatients(debouncedSearchQuery) : Promise.resolve([])),
    enabled: debouncedSearchQuery.length >= 2 && isFormVisible,
  });

  const { data: nameSearchResults = [], isLoading: isLoadingNameSearchResults } = useQuery<PatientSearchResult[], Error>({
    queryKey: ["patientSearchExistingLabByName", debouncedNameSearchQuery],
    queryFn: () =>
      debouncedNameSearchQuery.length >= 2 ? searchExistingPatients(debouncedNameSearchQuery) : Promise.resolve([]),
    enabled: debouncedNameSearchQuery.length >= 2 && isFormVisible,
  });

  // Merge phone + name matches, de-duplicated by patient id
  const combinedSearchResults = useMemo(() => {
    const combined = [...searchResults, ...nameSearchResults];
    return combined.filter((patient, index, self) => index === self.findIndex((p) => p.id === patient.id));
  }, [searchResults, nameSearchResults]);

  useEffect(() => {
    setShowPatientHistory(combinedSearchResults.length > 0);
  }, [combinedSearchResults.length]);

  const { data: activeVisit, isLoading: isVisitLoading } = useQuery<DoctorVisit, Error>({
    queryKey: ["doctorVisit", activeVisitId],
    queryFn: () => getDoctorVisitById(activeVisitId!),
    enabled: !!activeVisitId,
    staleTime: 30 * 1000,
  });

  const { data: availableTests = [], isLoading: isLoadingTests } = useCachedMainTestsList(activeVisitId);

  const { data: recentVisitsData, isLoading: isLoadingRecentVisits } = useQuery<AutocompleteVisitOption[], Error>({
    queryKey: ["searchPatientVisitsForAutocomplete", debouncedAutocompleteSearch],
    queryFn: async () => {
      const response = await apiClient.get("/search/patient-visits", {
        params: { term: debouncedAutocompleteSearch },
      });
      return response.data.data;
    },
    enabled: debouncedAutocompleteSearch.length >= 2,
  });

  /* ---------------------- Global Enter-to-pay shortcut --------------------- */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && activeVisitId && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        const target = event.target as HTMLElement;
        const isInputField =
          target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true";

        if (!isInputField && patientDetailsRef.current && can("سداد فحص")) {
          event.preventDefault();
          patientDetailsRef.current.triggerPayment();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVisitId]);

  /* ------------------------------ Mutations -------------------------------- */
  const createVisitFromHistoryMutation = useMutation({
    mutationFn: (payload: { patientId: number; doctorId: number; companyId?: number }) =>
      createLabVisitForExistingPatient(payload.patientId, {
        doctor_id: payload.doctorId,
        company_id: payload.companyId,
      }),
    onSuccess: (newPatientWithVisit) => {
      handlePatientActivated(newPatientWithVisit);
      setSearchQuery("");
      setNameSearchQuery("");
    },
    onError: (error: AxiosError) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "فشل إنشاء الزيارة");
    },
  });

  const addTestsMutation = useMutation({
    mutationFn: async (testIds: number[]) => {
      if (!activeVisitId) throw new Error("No active visit selected");
      return await addLabTestsToVisit({
        visitId: activeVisitId,
        main_test_ids: testIds,
      });
    },
    onSuccess: (newlyAddedLabRequests) => {
      toast.success(`تمت إضافة ${newlyAddedLabRequests.length} فحوصات`);
      queryClient.invalidateQueries({ queryKey: ["activeVisitForLabRequests", activeVisitId] });
      queryClient.invalidateQueries({ queryKey: ["doctorVisit", activeVisitId] });
      setSelectedTests([]);
    },
    onError: () => {
      // Error toast handled globally by the axios interceptor
    },
  });

  const fetchVisitDetailsMutation = useMutation({
    mutationFn: (id: number) => getDoctorVisitById(id),
    onSuccess: (foundVisit) => {
      if (foundVisit) {
        setActiveVisitId(foundVisit.id);
        toast.success(`تم العثور على الزيارة رقم ${foundVisit.id} للمريض ${foundVisit.patient.name}`);
      } else {
        toast.error(`لم يتم العثور على الزيارة برقم ${visitIdSearchTerm || selectedVisitFromAutocomplete?.visit_id}`);
      }
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "فشل الجلب");
    },
  });

  /* ------------------------------ Handlers --------------------------------- */
  const handlePatientActivated = useCallback(
    (patientWithVisit: Patient & { doctorVisit?: DoctorVisit }) => {
      const doctorVisit = patientWithVisit.doctor_visit || patientWithVisit.doctorVisit;

      if (doctorVisit) {
        setActiveVisitId(doctorVisit.id);
        setIsFormVisible(false);

        // Append immediately from the API response instead of waiting on a refetch
        const newQueueItem = convertVisitToQueueItem(doctorVisit);
        labPatientQueueRef.current?.appendPatientToQueue(newQueueItem);

        focusTestSelection(100);
      } else {
        console.error("No doctor visit found in patient response:", patientWithVisit);
        toast.error("لم يتم العثور على بيانات الزيارة في الاستجابة");
      }
    },
    [focusTestSelection]
  );

  const handlePatientSaved = useCallback(() => {
    setShowPatientHistory(false);
    setSearchQuery("");
    setNameSearchQuery("");
    focusTestSelection(200);
  }, [focusTestSelection]);

  const handlePatientSelectedFromQueue = useCallback(
    (queueItem: PatientLabQueueItem) => {
      setActiveVisitId(queueItem.visit_id);
      setIsFormVisible(false);
      focusTestSelection(200);
    },
    [focusTestSelection]
  );

  const handleResetView = useCallback(() => {
    setActiveVisitId(null);
    setIsFormVisible(true);
    toast.info("تمت إعادة التعيين");
  }, []);

  const handleToggleForm = useCallback(() => {
    setIsFormVisible((prev) => !prev);
    setActiveVisitId(null);
  }, []);

  const handlePatientSelectedFromHistory = useCallback(
    (patientId: number, doctorId: number, companyId?: number) => {
      createVisitFromHistoryMutation.mutate({ patientId, doctorId, companyId });
    },
    [createVisitFromHistoryMutation]
  );

  const handleOpenDoctorFinder = useCallback(() => {
    setIsDoctorFinderOpen(true);
  }, []);

  const handleDoctorFilterSelect = useCallback((doctorShift: DoctorShift) => {
    setFilters((prev) => ({
      ...prev,
      doctor: doctorShift.doctor_id,
      doctor_id: doctorShift.doctor_id,
      specialist: null,
    }));
    setIsDoctorFinderOpen(false);
    toast.info(`تم تطبيق الفلتر: ${doctorShift.doctor_name}`);
  }, []);

  const handleAddTests = useCallback(() => {
    if (selectedTests.length > 0 && activeVisitId) {
      addTestsMutation.mutate(selectedTests.map((test) => test.id));
    } else {
      toast.error("يرجى اختيار فحص ومريض أولاً");
    }
  }, [selectedTests, activeVisitId, addTestsMutation]);

  const handleSearchByVisitIdEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && visitIdSearchTerm.trim()) {
        const id = parseInt(visitIdSearchTerm.trim());
        if (!isNaN(id) && id > 0) {
          setAutocompleteInputValue("");
          setSelectedVisitFromAutocomplete(null);
          fetchVisitDetailsMutation.mutate(id);
          setIsFormVisible(false);
        } else {
          toast.error("يرجى إدخال رقم زيارة صحيح");
        }
      }
    },
    [visitIdSearchTerm, fetchVisitDetailsMutation]
  );

  const handlePrintReceipt = useCallback(() => {
    if (!activeVisitId) return;
    pdfPreview.generate({
      title: `إيصال الزيارة رقم ${activeVisitId}`,
      fileNamePrefix: "LabReceipt",
      visitId: activeVisitId,
      patientName: activeVisit?.patient?.name,
      fetchFunction: () =>
        apiClient.get(`/visits/${activeVisitId}/lab-thermal-receipt/pdf`, { responseType: "blob" }).then((res) => res.data),
    });

    const realtimeUrl = "http://localhost:4002";
    fetch(`${realtimeUrl}/emit/print-lab-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": import.meta.env.VITE_SERVER_AUTH_TOKEN || "changeme",
      },
      body: JSON.stringify({
        visit_id: activeVisitId,
        patient_id: activeVisit?.patient?.id,
        lab_request_ids: activeVisit?.lab_requests?.map((req) => req.id) || [],
      }),
    });
  }, [activeVisitId, activeVisit, pdfPreview]);

  const handlePrintInvoice = useCallback(() => {
    if (!activeVisitId) return;
    pdfPreview.generate({
      title: `فاتورة المختبر للزيارة ${activeVisitId}`,
      fileNamePrefix: "LabInvoice",
      visitId: activeVisitId,
      patientName: activeVisit?.patient?.name,
      fetchFunction: () =>
        apiClient.get(`/visits/${activeVisitId}/lab-invoice/pdf`, { responseType: "blob" }).then((res) => res.data),
    });
  }, [activeVisitId, activeVisit, pdfPreview]);

  // Apply selected offers -> add their tests using offer prices as override
  const handleApplyOffers = useCallback(
    async (payload: { mainTestIds: number[]; overridePrices: Record<number, number> }) => {
      if (!activeVisitId) return;
      if (payload.mainTestIds.length === 0) return;
      try {
        await addLabTestsToVisit({
          visitId: activeVisitId,
          main_test_ids: payload.mainTestIds,
          override_prices: payload.overridePrices,
        });
        toast.success("تمت إضافة عروض الفحوصات");
        queryClient.invalidateQueries({ queryKey: ["activeVisitForLabRequests", activeVisitId] });
        queryClient.invalidateQueries({ queryKey: ["doctorVisit", activeVisitId] });
        setIsOffersOpen(false);
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || "فشل إضافة العروض");
      }
    },
    [activeVisitId, queryClient]
  );

  /* -------------------------------- Render --------------------------------- */
  return (
    <ThemeProvider theme={materialTheme}>
      <div className="flex h-full flex-col bg-muted/20">
        <LabReceptionHeader
          availableTests={availableTests}
          selectedTests={selectedTests}
          setSelectedTests={setSelectedTests}
          isLoadingTests={isLoadingTests}
          activeVisitId={activeVisitId}
          addTestsMutation={addTestsMutation}
          testSelectionAutocompleteRef={testSelectionAutocompleteRef}
          recentVisitsData={recentVisitsData}
          isLoadingRecentVisits={isLoadingRecentVisits}
          selectedVisitFromAutocomplete={selectedVisitFromAutocomplete}
          setSelectedVisitFromAutocomplete={setSelectedVisitFromAutocomplete}
          autocompleteInputValue={autocompleteInputValue}
          setAutocompleteInputValue={setAutocompleteInputValue}
          visitIdSearchTerm={visitIdSearchTerm}
          setVisitIdSearchTerm={setVisitIdSearchTerm}
          fetchVisitDetailsMutation={fetchVisitDetailsMutation}
          onResetView={handleResetView}
          onAddTests={handleAddTests}
          onSearchByVisitIdEnter={handleSearchByVisitIdEnter}
          onOpenOffers={() => setIsOffersOpen(true)}
        />

        <main className="relative flex min-h-0 flex-1 gap-2 overflow-hidden p-2">
          {/* Action rail */}
          <LabReceptionActionPage
            isFormVisible={isFormVisible}
            onToggleView={handleToggleForm}
            onOpenDoctorFinder={handleOpenDoctorFinder}
            onOpenPriceList={() => setIsPriceListOpen(true)}
            activeVisitId={activeVisitId}
            hasLabRequests={(activeVisit?.lab_requests?.length ?? 0) > 0}
            onPrintInvoice={handlePrintInvoice}
          />

          {/* Registration form (slides in/out) */}
          <section
            aria-label="تسجيل مريض جديد"
            className={`overflow-hidden transition-[width,opacity] duration-300 ease-in-out ${
              isFormVisible ? "w-1/4 opacity-100" : "w-0 opacity-0"
            }`}
          >
            <LabRegistrationForm
              setActiveVisitId={setActiveVisitId}
              setFormVisible={setIsFormVisible}
              onPatientActivated={handlePatientActivated}
              isVisible={isFormVisible}
              onSearchChange={setSearchQuery}
              onNameSearchChange={setNameSearchQuery}
              onDoctorChange={setSelectedDoctorForNewVisit}
              referringDoctor={selectedDoctorForNewVisit}
              onPatientSaved={handlePatientSaved}
            />
          </section>

          {/* Patient history overlay */}
          {showPatientHistory && (
            <div
              ref={patientHistoryRef}
              className="absolute left-4 top-4 z-50 max-h-[600px] w-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
              role="dialog"
              aria-label="سجل المرضى المطابق"
            >
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
                <span className="text-sm font-semibold text-foreground">سجل المرضى المطابق</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPatientHistory(false)}
                  className="h-7 w-7 p-0"
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <PatientHistoryTable
                searchResults={combinedSearchResults}
                isLoading={isLoadingSearchResults || isLoadingNameSearchResults}
                onSelectPatient={handlePatientSelectedFromHistory}
                referringDoctor={selectedDoctorForNewVisit}
              />
            </div>
          )}

          {/* Workspace grid */}
          <div className="grid min-h-0 flex-1 grid-cols-4 gap-2">
            {/* Patient queue */}
            <section aria-label="قائمة المرضى" className={activeVisitId ? "col-span-1 min-h-0" : "col-span-2 min-h-0"}>
              <Card className="h-full overflow-hidden rounded-xl border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
                <LabPatientQueue
                  ref={labPatientQueueRef}
                  appearanceSettings={getAppearanceSettings()}
                  labFilters={filters}
                  currentShift={currentClinicShift}
                  onShiftChange={() => toast.info("الميزة غير متاحة حالياً")}
                  onPatientSelect={handlePatientSelectedFromQueue}
                  selectedVisitId={activeVisitId}
                  globalSearchTerm=""
                />
              </Card>
            </section>

            {/* Lab requests */}
            <section aria-label="طلبات المختبر" className="col-span-2 min-h-0">
              <Card className="h-full overflow-hidden rounded-xl border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
                <LabRequestsColumn
                  activeVisitId={activeVisitId}
                  visit={activeVisit}
                  isLoading={isVisitLoading}
                  onPrintReceipt={handlePrintReceipt}
                />
              </Card>
            </section>

            {/* Patient details (only with an active visit) */}
            {activeVisitId && (
              <section aria-label="بيانات المريض" className="col-span-1 min-h-0">
                <Card className="h-full rounded-xl border-border bg-card p-0 shadow-sm">
                  <CardContent className="h-full max-h-[calc(100vh-100px)] overflow-auto p-0">
                    <PatientDetailsColumnV1
                      ref={patientDetailsRef}
                      activeVisitId={activeVisitId}
                      visit={activeVisit}
                      onPrintReceipt={handlePrintReceipt}
                    />
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        </main>

        {/* Dialogs */}
        {isPdfPreviewVisible && (
          <PdfPreviewDialog
            widthClass="w-[350px]"
            isOpen={pdfPreview.isOpen}
            onOpenChange={pdfPreview.handleOpenChange}
            pdfUrl={pdfPreview.url}
            isLoading={pdfPreview.isGenerating && !pdfPreview.url}
            title={pdfPreview.title}
            fileName={pdfPreview.fileName}
          />
        )}
        <MainTestsPriceListDialog isOpen={isPriceListOpen} onOpenChange={setIsPriceListOpen} tests={availableTests} />
        <OffersDialog
          isOpen={isOffersOpen && Boolean(activeVisitId)}
          onOpenChange={setIsOffersOpen}
          onApply={handleApplyOffers}
        />
        <DoctorFinderDialog
          isOpen={isDoctorFinderOpen}
          onOpenChange={setIsDoctorFinderOpen}
          onDoctorShiftSelect={handleDoctorFilterSelect}
        />
      </div>
    </ThemeProvider>
  );
};

export default LabReceptionPage;
