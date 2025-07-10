// src/pages/LabReceptionPage.tsx

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLabUpdates } from '@/hooks/useSocketListener';

// MUI Imports
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Shadcn & Lucide Imports
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

// Custom Components & Services
import LabRegistrationForm from "@/components/lab/reception/LabRegistrationForm";
import LabPatientQueue from "@/components/lab/reception/LabPatientQueue";
import LabRequestsColumn from "@/components/lab/reception/LabRequestsColumn";
import PatientDetailsColumnV1 from "@/components/lab/reception/PatientDetailsColumnV1";
import LabReceptionActionPage from "@/components/lab/reception/LabReceptionActionPage";
import LabReceptionHeader from "@/components/lab/reception/LabReceptionHeader";
import PatientHistoryTable from "@/components/lab/reception/PatientHistoryTable";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";
import { getDoctorVisitById } from "@/services/visitService";

// Types
import type { Patient, PatientSearchResult } from "@/types/patients";
import type { LabQueueFilters, PatientLabQueueItem } from "@/types/labWorkflow";
import type { DoctorVisit } from "@/types/visits";
import { getAppearanceSettings } from "@/lib/appearance-settings-store";
import type { DoctorShift, DoctorStripped } from "@/types/doctors";
import DoctorFinderDialog from "@/components/clinic/dialogs/DoctorFinderDialog";
import type { AxiosError } from "axios";
import { createLabVisitForExistingPatient, searchExistingPatients } from "@/services/patientService";
import { getMainTestsListForSelection } from "@/services/mainTestService";
import type { MainTestStripped } from "@/types/labTests";
import apiClient from "@/services/api";
import { addLabTestsToVisit } from "@/services/labRequestService";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";

// Material Theme
const materialTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            },
          },
        },
      },
    },
  },
});

const LabReceptionPage: React.FC = () => {
  const { t } = useTranslation([
    "labReception",
    "common",
    "clinic",
    "patients",
  ]);
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();

  useLabUpdates();

  // --- State Management ---
  const [activeVisitId, setActiveVisitId] = useState<number | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
  const [pdfFileName, setPdfFileName] = useState('document.pdf');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // State for the filters that the dialog will update
  const [filters, setFilters] = useState<LabQueueFilters>({
    isBankak: null,
    company: null,
    doctor: null,
    specialist: null, 
  });

  const [isDoctorFinderOpen, setIsDoctorFinderOpen] = useState(false);

  // State lifted from LabRegistrationForm
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedDoctorForNewVisit, setSelectedDoctorForNewVisit] = useState<DoctorStripped | null>(null);
  
  // Patient history visibility state
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  const patientHistoryRef = useRef<HTMLDivElement>(null);

  // --- Data Fetching & Mutations ---
  const { data: searchResults = [], isLoading: isLoadingSearchResults } = useQuery<PatientSearchResult[], Error>({
    queryKey: ["patientSearchExistingLab", debouncedSearchQuery],
    queryFn: () => debouncedSearchQuery.length >= 2 ? searchExistingPatients(debouncedSearchQuery) : Promise.resolve([]),
    enabled: debouncedSearchQuery.length >= 2 && isFormVisible,
  });

  // Show patient history when search results are available
  useEffect(() => {
    setShowPatientHistory(searchResults.length > 0);
  }, [searchResults.length]);

  // Click outside handler for patient history - DISABLED to prevent closing on click away
  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (patientHistoryRef.current && !patientHistoryRef.current.contains(event.target as Node)) {
  //       setShowPatientHistory(false);
  //       setSearchQuery(''); // Also clear search when clicking away
  //     }
  //   };

  //   if (showPatientHistory) {
  //     document.addEventListener('mousedown', handleClickOutside);
  //   }

  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //   };
  // }, [showPatientHistory]);

  const createVisitFromHistoryMutation = useMutation({
    mutationFn: (payload: { patientId: number; doctorId: number; companyId?: number }) =>
      createLabVisitForExistingPatient(payload.patientId, { 
        doctor_id: payload.doctorId,
        company_id: payload.companyId 
      }),
    onSuccess: (newPatientWithVisit) => {
      toast.success(t("patients:search.visitCreatedSuccess", { patientName: newPatientWithVisit.name }));
      handlePatientActivated(newPatientWithVisit);
      setSearchQuery(''); // Clear search query after success
    },
    onError: (error: AxiosError) => {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || t('clinic:errors.visitCreationFailed'));
    },
  });

  // This function is passed to LabActionsPane to open the dialog
  const handleOpenDoctorFinder = useCallback(() => {
    setIsDoctorFinderOpen(true);
    alert("open doctor finder");
  }, []);

  // This function is passed to DoctorFinderDialog to handle a selection
  const handleDoctorFilterSelect = useCallback((doctorShift: DoctorShift) => {
    setFilters(prev => ({
      ...prev,
      doctor: doctorShift.doctor_id,
      specialist: null, // Clear specialist if specific doctor is chosen
    }));
    setIsDoctorFinderOpen(false); // Close the dialog after selection
    toast.info(t('filterApplied', { filterName: doctorShift.doctor_name }));
  }, [t]);

  // Fetch active visit data once and share with all components
  const { data: activeVisit, isLoading: isVisitLoading } = useQuery<DoctorVisit, Error>({
    queryKey: ["doctorVisit", activeVisitId],
    queryFn: () => getDoctorVisitById(activeVisitId!),
    enabled: !!activeVisitId,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
  const [selectedTests, setSelectedTests] = useState<MainTestStripped[]>([]);

  // --- Event Handlers ---
  const handlePatientActivated = useCallback(
    (patientWithVisit: Patient & { doctorVisit?: DoctorVisit }) => {
      queryClient.invalidateQueries({
        queryKey: ["labReceptionQueue", currentClinicShift?.id],
      });
      
      if (patientWithVisit.doctorVisit) {
        setActiveVisitId(patientWithVisit.doctorVisit.id);
        
        // Hide the form to show the queue with the selected patient
        setIsFormVisible(false);
        
        // Show success message
        toast.success(
          t("patientRegistration.autoSelected", {
            patientName: patientWithVisit.name,
            visitId: patientWithVisit.doctorVisit.id,
          })
        );
      }
    },
    [queryClient, currentClinicShift?.id, t]
  );

  const handlePatientSelectedFromQueue = useCallback(
    (queueItem: PatientLabQueueItem) => {
      setActiveVisitId(queueItem.visit_id);
      // Hide form when patient is selected
      setIsFormVisible(false);
    },
    []
  );

  const handleResetView = () => {
    setActiveVisitId(null);
    setIsFormVisible(true);
    toast.info(t("viewReset", "View has been reset."));
  };

  const handleToggleForm = () => {
    setIsFormVisible(!isFormVisible);
  };

  const handlePatientSelectedFromHistory = (patientId: number, doctorId: number, companyId?: number) => {
    createVisitFromHistoryMutation.mutate({ patientId, doctorId, companyId });
  };


  const addTestsMutation = useMutation({
    mutationFn: async (testIds: number[]) => {
      if (!activeVisitId) throw new Error("No active visit selected");
      return await addLabTestsToVisit({
        visitId: activeVisitId,
        main_test_ids: testIds,
      });
    },
    onSuccess: (newlyAddedLabRequests) => {
      toast.success(
        t("labTests:request.addedSuccessMultiple", {
          count: newlyAddedLabRequests.length,
        })
      );
      queryClient.invalidateQueries({
        queryKey: ["activeVisitForLabRequests", activeVisitId],
      });

      queryClient.invalidateQueries({
        queryKey: ["doctorVisit", activeVisitId],
      });
    
      setSelectedTests([]);
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || t("common:error.addFailed")
      );
    },
  });
  const { data: availableTests = [], isLoading: isLoadingTests } = useQuery<MainTestStripped[], Error>({
    queryKey: ["mainTestsForSelection", activeVisitId],
    queryFn: () => getMainTestsListForSelection({
      visit_id_to_exclude_requests: activeVisitId || undefined,
      pack_id: "all",
    }),
  });
  const generateAndShowPdf = async (
    title: string,
    fileNamePrefix: string,
    fetchFunction: () => Promise<Blob>
  ) => {
    if (!activeVisitId) return;
    
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setPdfPreviewTitle(title);
    setIsPdfPreviewOpen(true);

    try {
      const blob = await fetchFunction();
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
      const patientNameSanitized = activeVisit?.patient?.name.replace(/[^A-Za-z0-9\-_]/g, '_') || 'patient';
      setPdfFileName(`${fileNamePrefix}_${activeVisitId}_${patientNameSanitized}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error: unknown) {
      console.error(`Error generating ${title}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(t('common:error.generatePdfFailed'), {
        description: errorMessage,
      });
      setIsPdfPreviewOpen(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintReceipt = () => {
    console.log("handlePrintReceipt", activeVisitId);
    if (!activeVisitId) return;
    console.log("handlePrintReceipt 2", activeVisitId);
    generateAndShowPdf(
      t('common:printReceiptDialogTitle', { visitId: activeVisitId }),
      'LabReceipt',
      () => apiClient.get(`/visits/${activeVisitId}/lab-thermal-receipt/pdf`, { responseType: 'blob' }).then(res => res.data)
    );
  };

  // Debug logging
  useEffect(() => {
    console.log('Available tests:', availableTests);
    console.log('Selected tests:', selectedTests);
  }, [availableTests, selectedTests]);
  // Type for the Autocomplete's options
interface AutocompleteVisitOption {
  visit_id: number;
  patient_id: number;
  autocomplete_label: string;
}
  const [visitIdSearchTerm, setVisitIdSearchTerm] = useState("");
  const [autocompleteInputValue, setAutocompleteInputValue] = useState("");
  const [selectedVisitFromAutocomplete, setSelectedVisitFromAutocomplete] = useState<AutocompleteVisitOption | null>(null);
  const debouncedAutocompleteSearch = useDebounce(autocompleteInputValue, 500);
  const handleAddTests = () => {
    // alert("add tests");
    if (selectedTests.length > 0 && activeVisitId) {
      addTestsMutation.mutate(selectedTests.map(test => test.id));
    } else {
      toast.error(t("selectTestAndPatient", "Please select a test and patient first."));
    }
  };
  const handleSearchByVisitIdEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && visitIdSearchTerm.trim()) {
      const id = parseInt(visitIdSearchTerm.trim());
      if (!isNaN(id) && id > 0) {
        setAutocompleteInputValue("");
        setSelectedVisitFromAutocomplete(null);
        fetchVisitDetailsMutation.mutate(id);
        setIsFormVisible(false);
      } else {
        toast.error(t("invalidVisitId", "Please enter a valid Visit ID."));
      }
    }
  };
  const fetchVisitDetailsMutation = useMutation({
    mutationFn: (id: number) => getDoctorVisitById(id),
    onSuccess: (foundVisit) => {
      if (foundVisit) {
        setActiveVisitId(foundVisit.id);
        toast.success(
          t("visitFoundById", {
            visitId: foundVisit.id,
            patientName: foundVisit.patient.name,
          })
        );
      } else {
        toast.error(
          t("visitNotFoundById", {
            visitId: visitIdSearchTerm || selectedVisitFromAutocomplete?.visit_id,
          })
        );
      }
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || t("common:error.fetchFailed")
      );
    },
  });
    // --- Data Fetching & Mutations ---
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
  return (
    <ThemeProvider theme={materialTheme}>
      <div className="flex flex-col min-h-0 h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
        {/* Header */}
        <LabReceptionHeader
          // Test selection props
          availableTests={availableTests}
          selectedTests={selectedTests}
          setSelectedTests={setSelectedTests}
          isLoadingTests={isLoadingTests}
          activeVisitId={activeVisitId}
          addTestsMutation={addTestsMutation}

          // Search props
          recentVisitsData={recentVisitsData}
          isLoadingRecentVisits={isLoadingRecentVisits}
          selectedVisitFromAutocomplete={selectedVisitFromAutocomplete}
          setSelectedVisitFromAutocomplete={setSelectedVisitFromAutocomplete}
          autocompleteInputValue={autocompleteInputValue}
          setAutocompleteInputValue={setAutocompleteInputValue}
          visitIdSearchTerm={visitIdSearchTerm}
          setVisitIdSearchTerm={setVisitIdSearchTerm}
          fetchVisitDetailsMutation={fetchVisitDetailsMutation}

          // Event handlers
          onResetView={handleResetView}
          onAddTests={handleAddTests}
          onSearchByVisitIdEnter={handleSearchByVisitIdEnter}
        />

        {/* Dynamic Layout */}
        <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden relative">
          {/* Action Column */}
          <div className="flex-shrink-0">
            <LabReceptionActionPage
              isFormVisible={isFormVisible}
              onToggleView={handleToggleForm}
              onOpenDoctorFinder={handleOpenDoctorFinder}
            />
          </div>

          {/* Form Column (slides in/out) */}
          <div 
            className={`transition-all duration-500 ease-in-out ${
              isFormVisible ? 'w-1/4' : 'w-0 opacity-0'
            } overflow-hidden`}
          >
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
              <CardContent className="p-4 h-full overflow-y-auto">
                <LabRegistrationForm
                  setActiveVisitId={setActiveVisitId}
                  setFormVisible={setIsFormVisible}
                  onPatientActivated={handlePatientActivated}
                  isVisible={isFormVisible}
                  onSearchChange={setSearchQuery}
                  onDoctorChange={setSelectedDoctorForNewVisit}
                  referringDoctor={selectedDoctorForNewVisit}
                />
              </CardContent>
            </Card>
          </div>

          {/* Patient History Dialog - Absolute positioned overlay */}
          {showPatientHistory && (
            <div className="absolute top-4 left-4 z-50 w-1/2 max-h-[600px]" ref={patientHistoryRef}>
              <Card className="bg-white dark:bg-slate-800 shadow-2xl border-0 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-4 h-full overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{t('patientHistory.title')}</h3>
                      <p className="text-sm text-muted-foreground">{t('patientHistory.description')}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPatientHistory(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <PatientHistoryTable
                    searchResults={searchResults}
                    isLoading={isLoadingSearchResults}
                    onSelectPatient={handlePatientSelectedFromHistory}
                    referringDoctor={selectedDoctorForNewVisit}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Patient Queue Column */}
          <div className="w-1/4 flex-shrink-0">
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
              <CardContent className="p-0 h-full overflow-hidden">
                <LabPatientQueue
                  appearanceSettings={getAppearanceSettings()}
                  labFilters={filters}
                  currentShift={currentClinicShift}
                  onShiftChange={() => toast.info(t("common:featureNotImplementedShort"))}
                  onPatientSelect={handlePatientSelectedFromQueue}
                  selectedVisitId={activeVisitId}
                  globalSearchTerm=""
                />
              </CardContent>
            </Card>
          </div>

          {/* Lab Requests Column (takes twice the width when form is hidden) */}
          <div className={`transition-all duration-500 ease-in-out ${
            isFormVisible ? 'w-0' : 'w-1/2'
          } flex-shrink-0`}>
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
              <CardContent className="p-0 h-full overflow-hidden">
                <LabRequestsColumn
                  activeVisitId={activeVisitId}
                  visit={activeVisit}
                  isLoading={isVisitLoading}
                  onPrintReceipt={handlePrintReceipt}
                />
              </CardContent>
            </Card>
          </div>

          {/* Patient Info Column - Dynamic Width */}
          {activeVisitId && (
            <div className={`transition-all duration-500 ease-in-out ${
              isFormVisible ? 'w-1/4' : 'w-1/6'
            } flex-shrink-0`}>
              <Card className="bg-white dark:bg-slate-800 shadow-lg border-0 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
                <CardContent className="p-0 h-full overflow-hidden">
                  <PatientDetailsColumnV1
                    activeVisitId={activeVisitId}
                    visit={activeVisit}
                    onPrintReceipt={handlePrintReceipt}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        <PdfPreviewDialog
        widthClass="w-[350px]"
        isOpen={isPdfPreviewOpen}
        onOpenChange={(open) => {
            setIsPdfPreviewOpen(open);
            if (!open && pdfUrl) { // Clean up URL when dialog is manually closed
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
            }
        }}
        pdfUrl={pdfUrl}
        isLoading={isGeneratingPdf && !pdfUrl}
        title={pdfPreviewTitle}
        fileName={pdfFileName}
      />
      </div>
      {/* === RENDER THE DIALOG HERE === */}
      {/* It's controlled by the state within this page component */}
      <DoctorFinderDialog
          isOpen={isDoctorFinderOpen}
          onOpenChange={setIsDoctorFinderOpen}
          onDoctorShiftSelect={handleDoctorFilterSelect}
      />
    </ThemeProvider>
  );
};
export default LabReceptionPage;
