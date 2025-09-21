// src/pages/LabReceptionPage.tsx

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Removed socket listener import

// MUI Imports
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Shadcn & Lucide Imports
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

// Custom Components & Services
import LabRegistrationForm from "@/components/lab/reception/LabRegistrationForm";
import LabPatientQueue, { type LabPatientQueueRef } from "@/components/lab/reception/LabPatientQueue";
import LabRequestsColumn from "@/components/lab/reception/LabRequestsColumn";
import PatientDetailsColumnV1, { type PatientDetailsColumnV1Ref } from "@/components/lab/reception/PatientDetailsColumnV1";
import LabReceptionActionPage from "@/components/lab/reception/LabReceptionActionPage";
import LabReceptionHeader from "@/components/lab/reception/LabReceptionHeader";
import PatientHistoryTable from "@/components/lab/reception/PatientHistoryTable";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";
import { getDoctorVisitById } from "@/services/visitService";
import realtimeService from "@/services/realtimeService";

// Types
import type { Patient, PatientSearchResult } from "@/types/patients";
import type { LabQueueFilters, PatientLabQueueItem } from "@/types/labWorkflow";
import type { DoctorVisit, LabRequest } from "@/types/visits";
import { getAppearanceSettings } from "@/lib/appearance-settings-store";
import type { DoctorShift, DoctorStripped } from "@/types/doctors";
import DoctorFinderDialog from "@/components/clinic/dialogs/DoctorFinderDialog";
import type { AxiosError } from "axios";
import { createLabVisitForExistingPatient, searchExistingPatients } from "@/services/patientService";
import { useCachedMainTestsList } from "@/hooks/useCachedData";
import type { MainTestStripped } from "@/types/labTests";
import apiClient from "@/services/api";
import { addLabTestsToVisit } from "@/services/labRequestService";
// Removed getSinglePatientQueueItem import - using getDoctorVisitById instead
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";

// Material Theme
const materialTheme = createTheme({
  typography: {
    fontFamily: "'Tajawal', 'Cairo', sans-serif",
  },
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
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();

  // Helper function to convert DoctorVisit to PatientLabQueueItem format
  const convertVisitToQueueItem = (visit: DoctorVisit): PatientLabQueueItem => {
    const labRequests = visit.lab_requests || [];
    const oldestRequest = labRequests.length > 0 ? labRequests[0] : null;
    
    return {
      visit_id: visit.id,
      patient_id: visit.patient_id,
      lab_number: visit.id.toString(), // Using visit ID as lab number
      patient_name: visit.patient?.name || '',
      phone: visit.patient?.phone || '',
      sample_id: oldestRequest?.id?.toString() || visit.id.toString(),
      lab_request_ids: labRequests.map((req: LabRequest) => req.id),
      oldest_request_time: oldestRequest?.created_at || visit.created_at,
      test_count: labRequests.length,
      result_is_locked: visit.patient?.result_is_locked || false,
      all_requests_paid: labRequests.length > 0 ? labRequests.every((req: LabRequest) => req.amount_paid > 0) : false,
      is_result_locked: visit.patient?.result_is_locked || false,
      is_printed: false, // This would need to be determined from lab results
      company: visit.patient?.company,
    };
  };

  // Real-time event subscription for patient registration
  useEffect(() => {
    const handlePatientRegistered = async (patient: Patient) => {
      console.log('Patient registered event received:', patient);
      
      try {
        // If the patient has a doctor visit, fetch the visit data and convert to queue item
        if (patient.doctor_visit?.id) {
          console.log('Fetching visit data for visit ID:', patient.doctor_visit.id);
          const visitData = await getDoctorVisitById(patient.doctor_visit.id);
          const newQueueItem = convertVisitToQueueItem(visitData);
          console.log('Converted queue item:', newQueueItem);
          
          // Update the lab patient queue directly using the ref
          console.log('Current shift ID:', currentClinicShift?.id);
          if (labPatientQueueRef.current) {
            labPatientQueueRef.current.appendPatientToQueue(newQueueItem);
          }
          
          // Show a toast notification
          toast.success(`تم تسجيل مريض جديد: ${patient.name}`);
        } else {
          // Fallback: refresh the entire queue if no visit ID is available
          if (labPatientQueueRef.current) {
            labPatientQueueRef.current.refresh();
          }
          toast.success(`تم تسجيل مريض جديد: ${patient.name}`);
        }
      } catch (error) {
        console.error('Error fetching new patient queue item:', error);
        // Fallback: refresh the entire queue on error
        if (labPatientQueueRef.current) {
          labPatientQueueRef.current.refresh();
        }
        toast.success(`تم تسجيل مريض جديد: ${patient.name}`);
      }
    };

    // Subscribe to patient-registered events
    realtimeService.onPatientRegistered(handlePatientRegistered);

    // Cleanup subscription on component unmount
    return () => {
      realtimeService.offPatientRegistered(handlePatientRegistered);
    };
  }, [queryClient, currentClinicShift?.id]);

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
  const [nameSearchQuery, setNameSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const debouncedNameSearchQuery = useDebounce(nameSearchQuery, 300);
  const [selectedDoctorForNewVisit, setSelectedDoctorForNewVisit] = useState<DoctorStripped | null>(null);
  
  // Patient history visibility state
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  const patientHistoryRef = useRef<HTMLDivElement>(null);
  
  // Ref for test selection autocomplete focus
  const testSelectionAutocompleteRef = useRef<HTMLDivElement>(null);
  
  // Ref for patient details column to trigger payment
  const patientDetailsRef = useRef<PatientDetailsColumnV1Ref>(null);
  
  // Ref for lab patient queue to update it directly
  const labPatientQueueRef = useRef<LabPatientQueueRef>(null);

  // --- Data Fetching & Mutations ---
  const { data: searchResults = [], isLoading: isLoadingSearchResults } = useQuery<PatientSearchResult[], Error>({
    queryKey: ["patientSearchExistingLab", debouncedSearchQuery],
    queryFn: () => debouncedSearchQuery.length >= 2 ? searchExistingPatients(debouncedSearchQuery) : Promise.resolve([]),
    enabled: debouncedSearchQuery.length >= 2 && isFormVisible,
  });

  // Name-based search query
  const { data: nameSearchResults = [], isLoading: isLoadingNameSearchResults } = useQuery<PatientSearchResult[], Error>({
    queryKey: ["patientSearchExistingLabByName", debouncedNameSearchQuery],
    queryFn: () => debouncedNameSearchQuery.length >= 2 ? searchExistingPatients(debouncedNameSearchQuery) : Promise.resolve([]),
    enabled: debouncedNameSearchQuery.length >= 2 && isFormVisible,
  });

  // Combine search results from both phone and name searches
  const combinedSearchResults = React.useMemo(() => {
    const combined = [...searchResults, ...nameSearchResults];
    // Remove duplicates based on patient ID
    const uniqueResults = combined.filter((patient, index, self) => 
      index === self.findIndex(p => p.id === patient.id)
    );
    return uniqueResults;
  }, [searchResults, nameSearchResults]);

  // Show patient history when search results are available (from either phone or name search)
  useEffect(() => {
    setShowPatientHistory(combinedSearchResults.length > 0);
  }, [combinedSearchResults.length]);

  // Keyboard event listener for Enter key to trigger payment
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if Enter is pressed and a patient is selected
      if (event.key === 'Enter' && activeVisitId && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        // Check if we're not in an input field or textarea
        const target = event.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
        
        if (!isInputField) {
          event.preventDefault();
          // Trigger payment if patient details ref is available
          if (patientDetailsRef.current) {
            patientDetailsRef.current.triggerPayment();
          }
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeVisitId]);

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
      toast.success(`تم إنشاء زيارة للمريض ${newPatientWithVisit.name}`);
      handlePatientActivated(newPatientWithVisit);
      setSearchQuery(''); // Clear phone search query after success
      setNameSearchQuery(''); // Clear name search query after success
    },
    onError: (error: AxiosError) => {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || 'فشل إنشاء الزيارة');
    },
  });

  // This function is passed to LabActionsPane to open the dialog
  const handleOpenDoctorFinder = useCallback(() => {
    setIsDoctorFinderOpen(true);
  }, []);

  // This function is passed to DoctorFinderDialog to handle a selection
  const handleDoctorFilterSelect = useCallback((doctorShift: DoctorShift) => {
    setFilters(prev => ({
      ...prev,
      doctor: doctorShift.doctor_id,
      doctor_id: doctorShift.doctor_id, // Also set doctor_id for backend compatibility
      specialist: null, // Clear specialist if specific doctor is chosen
    }));
    setIsDoctorFinderOpen(false); // Close the dialog after selection
    toast.info(`تم تطبيق الفلتر: ${doctorShift.doctor_name}`);
  }, []);


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
      // queryClient.invalidateQueries({
      //   queryKey: ["labReceptionQueue", currentClinicShift?.id],
      // });
      
      if (patientWithVisit.doctorVisit) {
        setActiveVisitId(patientWithVisit.doctorVisit.id);
        
        // Hide the form to show the queue with the selected patient
        setIsFormVisible(false);
        
        // Focus on test selection autocomplete after patient is activated
        setTimeout(() => {
          if (testSelectionAutocompleteRef.current) {
            console.log("testSelectionAutocompleteRef", testSelectionAutocompleteRef.current);
            // Find the input element within the Autocomplete
            const inputElement = testSelectionAutocompleteRef.current.querySelector('input');
            if (inputElement) {
              inputElement.focus();
            }
          }
        }, 100);
        
        // Show success message
        toast.success(`تم اختيار المريض تلقائياً: ${patientWithVisit.name} (زيارة ${patientWithVisit.doctorVisit.id})`);
      }
    },
    []
  );

  // New callback to handle post-save actions
  const handlePatientSaved = useCallback(() => {
    // Close patient history table
    setShowPatientHistory(false);
    setSearchQuery(''); // Clear phone search query
    setNameSearchQuery(''); // Clear name search query
    
    // Focus on test selection autocomplete after a short delay
    setTimeout(() => {
      if (testSelectionAutocompleteRef.current) {
        console.log(testSelectionAutocompleteRef.current, "testSelectionAutocompleteRef.current");
        console.log("Focusing on test selection autocomplete after patient save");
        // Find the input element within the Autocomplete
        const inputElement = testSelectionAutocompleteRef.current.querySelector('input');
        if (inputElement) {
          inputElement.focus();
        }
      }
    }, 200);
  }, []);

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
    toast.info('تمت إعادة التعيين');
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
      toast.success(`تمت إضافة ${newlyAddedLabRequests.length} فحوصات`);
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
      toast.error(apiError.response?.data?.message || 'فشل الإضافة');
    },
  });
  const { data: availableTests = [], isLoading: isLoadingTests } = useCachedMainTestsList(activeVisitId);
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
      toast.error('فشل توليد ملف PDF', { description: errorMessage });
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
      `إيصال الزيارة رقم ${activeVisitId}`,
      'LabReceipt',
      () => apiClient.get(`/visits/${activeVisitId}/lab-thermal-receipt/pdf`, { responseType: 'blob' }).then(res => res.data)
    );
  };

  // Debug logging
  useEffect(() => {
    console.log('Available tests:', availableTests);
    // console.log('Selected tests:', selectedTests);
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
      toast.error('يرجى اختيار فحص ومريض أولاً');
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
        toast.error('يرجى إدخال رقم زيارة صحيح');
      }
    }
  };
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
      toast.error(apiError.response?.data?.message || 'فشل الجلب');
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
          testSelectionAutocompleteRef={testSelectionAutocompleteRef}

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
            className={`${
              isFormVisible ? 'w-1/4' : 'w-0 opacity-0'
            } overflow-hidden`}
          >
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0 rounded-xl overflow-hidden h-full">
              <CardContent className="p-4 h-full overflow-y-auto">
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
                      <h3 className="text-lg font-semibold">سجل المريض</h3>
                      <p className="text-sm text-muted-foreground">نتائج البحث عن المريض</p>
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
                    searchResults={combinedSearchResults}
                    isLoading={isLoadingSearchResults || isLoadingNameSearchResults}
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
                  ref={labPatientQueueRef}
                  appearanceSettings={getAppearanceSettings()}
                  labFilters={filters}
                  currentShift={currentClinicShift}
                  onShiftChange={() => toast.info('الميزة غير متاحة حالياً')}
                  onPatientSelect={handlePatientSelectedFromQueue}
                  selectedVisitId={activeVisitId}
                  globalSearchTerm=""
                />
              </CardContent>
            </Card>
          </div>

          {/* Lab Requests Column (takes twice the width when form is hidden) */}
          <div className={`${
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
            <div className={`${
              isFormVisible ? 'w-1/4' : 'w-1/6'
            } flex-shrink-0`}>
              <Card className="bg-white dark:bg-slate-800 shadow-lg border-0 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
                <CardContent className="p-0 h-full overflow-hidden">
                  <PatientDetailsColumnV1
                    ref={patientDetailsRef}
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
