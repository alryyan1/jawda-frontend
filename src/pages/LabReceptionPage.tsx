// src/pages/LabReceptionPage.tsx

import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLabUpdates } from '@/hooks/useSocketListener';

// MUI Imports
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Shadcn & Lucide Imports
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

// Custom Components & Services
import LabRegistrationForm from "@/components/lab/reception/LabRegistrationForm";
import LabPatientQueue from "@/components/lab/reception/LabPatientQueue";
import LabRequestsColumn from "@/components/lab/reception/LabRequestsColumn";
import PatientDetailsColumnV1 from "@/components/lab/reception/PatientDetailsColumnV1";
import LabReceptionActionPage from "@/components/lab/reception/LabReceptionActionPage";
import LabReceptionHeader from "@/components/lab/reception/LabReceptionHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";
import { getDoctorVisitById } from "@/services/visitService";
import { getMainTestsListForSelection } from "@/services/mainTestService";
import { addLabTestsToVisit } from "@/services/labRequestService";
import apiClient from "@/services/api";

// Types
import type { Patient } from "@/types/patients";
import type { LabQueueFilters, PatientLabQueueItem } from "@/types/labWorkflow";
import type { DoctorVisit } from "@/types/visits";
import type { MainTestStripped } from "@/types/labTests";
import { getAppearanceSettings, type LabAppearanceSettings } from "@/lib/appearance-settings-store";
import type { DoctorShift } from "@/types/doctors";
import DoctorFinderDialog from "@/components/clinic/dialogs/DoctorFinderDialog";

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

// Type for the Autocomplete's options
interface AutocompleteVisitOption {
  visit_id: number;
  patient_id: number;
  autocomplete_label: string;
}

const LabReceptionPage: React.FC = () => {
  const { t } = useTranslation([
    "labReception",
    "common",
    "labResults",
    "shifts",
    "clinic",
    "patients",
  ]);
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();

  useLabUpdates();

  // --- State Management ---
  const [activeVisitId, setActiveVisitId] = useState<number | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientLabQueueItem | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(true);

  // Header controls state
  const [visitIdSearchTerm, setVisitIdSearchTerm] = useState("");
  const [autocompleteInputValue, setAutocompleteInputValue] = useState("");
  const [selectedVisitFromAutocomplete, setSelectedVisitFromAutocomplete] = useState<AutocompleteVisitOption | null>(null);
  const debouncedAutocompleteSearch = useDebounce(autocompleteInputValue, 500);
  const [appearanceSettings] = useState<LabAppearanceSettings>(getAppearanceSettings);
    // State for the filters that the dialog will update
    const [filters, setFilters] = useState<LabQueueFilters>({
      isBankak: null,
      company: null,
      doctor: null,
      specialist: null,
    });
  
  // Lab Test Selection State - Multiple Selection
  const [selectedTests, setSelectedTests] = useState<MainTestStripped[]>([]);
  const [isDoctorFinderOpen, setIsDoctorFinderOpen] = useState(false); // State for the dialog




  // This function is passed to LabActionsPane to open the dialog
  const handleOpenDoctorFinder = useCallback(() => {
    setIsDoctorFinderOpen(true);
    alert("open doctor finder");
  }, []);

  // This function is passed to DoctorFinderDialog to handle a selection
  const handleDoctorFilterSelect = useCallback((doctorShift: DoctorShift) => {
    setFilters(prev => ({
      ...prev,
      doctor: { id: doctorShift.doctor_id, name: doctorShift.doctor_name, specialist_name: doctorShift.doctor_specialist_name },
      specialist: null, // Clear specialist if specific doctor is chosen
    }));
    setIsDoctorFinderOpen(false); // Close the dialog after selection
    toast.info(t('filterApplied', { filterName: doctorShift.doctor_name }));
  }, [t]);






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

  const { data: availableTests = [], isLoading: isLoadingTests } = useQuery<MainTestStripped[], Error>({
    queryKey: ["mainTestsForSelection", activeVisitId],
    queryFn: () => getMainTestsListForSelection({
      visit_id_to_exclude_requests: activeVisitId || undefined,
      pack_id: "all",
    }),
  });

  // Fetch active visit data once and share with all components
  const { data: activeVisit, isLoading: isVisitLoading, error: visitError } = useQuery<DoctorVisit, Error>({
    queryKey: ["doctorVisit", activeVisitId],
    queryFn: () => getDoctorVisitById(activeVisitId!),
    enabled: !!activeVisitId,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

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

  // --- Event Handlers ---
  const handlePatientActivated = useCallback(
    (patientWithVisit: Patient & { doctorVisit?: DoctorVisit }) => {
      queryClient.invalidateQueries({
        queryKey: ["labReceptionQueue", currentClinicShift?.id],
      });
      
      if (patientWithVisit.doctorVisit) {
        setActiveVisitId(patientWithVisit.doctorVisit.id);
        
        // Create a queue item for the newly registered patient to auto-select it
        const newQueueItem: PatientLabQueueItem = {
          visit_id: patientWithVisit.doctorVisit.id,
          patient_id: patientWithVisit.id,
          patient_name: patientWithVisit.name,
          phone: patientWithVisit.phone || '',
          lab_number: `L${patientWithVisit.doctorVisit.id}`,
          sample_id: null,
          lab_request_ids: [],
          test_count: 0,
          all_requests_paid: false,
          result_is_locked: false,
          is_result_locked: false,
          is_printed: false,
          oldest_request_time: patientWithVisit.doctorVisit.created_at || new Date().toISOString(),
        };
        
        // Auto-select the newly registered patient
        setSelectedPatient(newQueueItem);
        
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
      setSelectedPatient(queueItem);
      fetchVisitDetailsMutation.mutate(queueItem.visit_id);
      // Hide form when patient is selected
      setIsFormVisible(false);
    },
    [fetchVisitDetailsMutation]
  );

  const handleSearchByVisitIdEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && visitIdSearchTerm.trim()) {
      const id = parseInt(visitIdSearchTerm.trim());
      if (!isNaN(id) && id > 0) {
        setAutocompleteInputValue("");
        setSelectedVisitFromAutocomplete(null);
        fetchVisitDetailsMutation.mutate(id);
      } else {
        toast.error(t("invalidVisitId", "Please enter a valid Visit ID."));
      }
    }
  };

  const handleResetView = () => {
    setActiveVisitId(null);
    setSelectedPatient(null);
    setVisitIdSearchTerm("");
    setAutocompleteInputValue("");
    setSelectedVisitFromAutocomplete(null);
    setIsFormVisible(true);
    toast.info(t("viewReset", "View has been reset."));
  };

  const handleToggleForm = () => {
    setIsFormVisible(!isFormVisible);
  };

  const handleAddTests = () => {
    if (selectedTests.length > 0 && activeVisitId) {
      addTestsMutation.mutate(selectedTests.map(test => test.id));
    } else {
      toast.error(t("selectTestAndPatient", "Please select a test and patient first."));
    }
  };

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
        <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">
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
                  onPatientActivated={handlePatientActivated}
                  isVisible={isFormVisible}
                />
              </CardContent>
            </Card>
          </div>

          {/* Patient Queue Column */}
          <div className="w-1/4 flex-shrink-0">
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
              <CardContent className="p-0 h-full overflow-hidden">
                <LabPatientQueue
                  appearanceSettings={appearanceSettings}
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
            isFormVisible ? 'w-1/4' : 'w-1/2'
          } flex-shrink-0`}>
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
              <CardContent className="p-0 h-full overflow-hidden">
                <LabRequestsColumn
                  activeVisitId={activeVisitId}
                  visit={activeVisit}
                  isLoading={isVisitLoading}
                  error={visitError}
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
                    selectedPatient={selectedPatient}
                    activeVisitId={activeVisitId}
                    visit={activeVisit}
                    isLoading={isVisitLoading}
                    error={visitError}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
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
