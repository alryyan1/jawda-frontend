// src/pages/LabReceptionPage.tsx

import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLabUpdates } from '@/hooks/useSocketListener';

// MUI Imports
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Shadcn & Lucide Imports
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Loader2,
  ListRestart,
  Microscope,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

// Custom Components & Services
import LabRegistrationForm from "@/components/lab/reception/LabRegistrationForm";
import LabPatientQueue from "@/components/lab/reception/LabPatientQueue";
import LabRequestsColumn from "@/components/lab/reception/LabRequestsColumn";
import PatientDetailsColumnV1 from "@/components/lab/reception/PatientDetailsColumnV1";
import LabReceptionActionPage from "@/components/lab/reception/LabReceptionActionPage";
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
import { ConnectionStatusIndicator } from "@/components/common/ConnectionStatusIndicator";

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
  
  // Lab Test Selection State - Multiple Selection
  const [selectedTests, setSelectedTests] = useState<MainTestStripped[]>([]);

  // Filters state
  const [filters] = useState<LabQueueFilters>({
    isBankak: null,
    company_id: null,
    doctor_id: null,
    specialist: null,
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
        <header className="flex-shrink-0 h-auto p-4 bg-white dark:bg-slate-800 shadow-lg border-b border-blue-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Microscope className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {t("pageTitle", "Lab Reception")}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Professional Lab Management System
                </p>
              </div>
              <ConnectionStatusIndicator size="small" />
            </div>

            {/* Test Selection Autocomplete - Multiple Selection */}
            <div className="flex items-center gap-3">
              <Autocomplete
                multiple
                options={availableTests}
                value={selectedTests}
                onChange={(_, newValue) => setSelectedTests(newValue)}
                getOptionLabel={(option) => option.main_test_name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={isLoadingTests}
                size="small"
                sx={{ width: 400 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("selectTestToAdd", "Select Tests to Add")}
                    variant="outlined"
                    placeholder={t("addTestsPlaceholder", "Search and select tests...")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const enteredId = (e.target as HTMLInputElement).value;
                        const foundTest = availableTests?.find(
                          (test) => test.id === parseInt(enteredId)
                        );
                        if (foundTest) {
                          setSelectedTests((prev) => [...prev, foundTest]);
                        }
                      }
                    }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <Search className="h-4 w-4 text-muted-foreground mr-2" />,
                      endAdornment: (
                        <>
                          {isLoadingTests ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      "& .MuiInputLabel-root": { fontSize: "0.875rem" },
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "background.paper",
                        fontSize: "0.875rem",
                      },
                    }}
                  />
                )}
                PaperComponent={(props) => (
                  <Paper {...props} className="dark:bg-slate-800 dark:text-slate-100" />
                )}
                noOptionsText={t("common:noResultsFound")}
                loadingText={t("common:loading")}
              />
              <Button
                onClick={handleAddTests}
                disabled={selectedTests.length === 0 || !activeVisitId || addTestsMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105"
              >
                {addTestsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {t("addTest", "Add Test")} {selectedTests.length > 0 && `(${selectedTests.length})`}
              </Button>
            </div>

            {/* Search Controls */}
            <div className="flex items-center gap-3">
              <Autocomplete
                options={recentVisitsData || []}
                value={selectedVisitFromAutocomplete}
                onChange={(_, newValue) => {
                  setSelectedVisitFromAutocomplete(newValue);
                  if (newValue?.visit_id) {
                    setVisitIdSearchTerm("");
                    fetchVisitDetailsMutation.mutate(newValue.visit_id);
                  }
                }}
                inputValue={autocompleteInputValue}
                onInputChange={(_, newInputValue) => setAutocompleteInputValue(newInputValue)}
                getOptionLabel={(option) => option.autocomplete_label}
                isOptionEqualToValue={(option, value) => option.visit_id === value.visit_id}
                loading={isLoadingRecentVisits}
                size="small"
                sx={{ width: 250 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("searchPatients", "Search Patients")}
                    variant="outlined"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <Search className="h-4 w-4 text-muted-foreground mr-2" />,
                      endAdornment: (
                        <>
                          {isLoadingRecentVisits || fetchVisitDetailsMutation.isPending ? (
                            <CircularProgress color="inherit" size={18} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                PaperComponent={(props) => (
                  <Paper {...props} className="dark:bg-slate-800 dark:text-slate-100" />
                )}
                noOptionsText={
                  autocompleteInputValue.length < 2
                    ? t("common:typeMoreChars")
                    : t("common:noResultsFound")
                }
                loadingText={t("common:loading")}
              />

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="number"
                  placeholder={t("visitId", "Visit ID")}
                  value={visitIdSearchTerm}
                  onChange={(e) => setVisitIdSearchTerm(e.target.value)}
                  onKeyDown={handleSearchByVisitIdEnter}
                  className="pl-10 w-28 h-10 text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={fetchVisitDetailsMutation.isPending}
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetView}
                title={t("resetView", "Reset View")}
                className="h-10 w-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ListRestart className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Dynamic Layout */}
        <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">
          {/* Action Column */}
          <div className="flex-shrink-0">
            <LabReceptionActionPage
              isFormVisible={isFormVisible}
              onToggleForm={handleToggleForm}
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
        </div>
      </div>
    </ThemeProvider>
  );
};

export default LabReceptionPage;
