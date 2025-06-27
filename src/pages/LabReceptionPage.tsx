// src/pages/LabReceptionPage.tsx

import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

// MUI Imports
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";

// Shadcn & Lucide Imports
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  ListRestart,
  Microscope,
} from "lucide-react";
import { toast } from "sonner";

// Custom Components & Services
import LabActionsPane from "@/components/lab/reception/LabActionsPane";
import LabRegistrationForm from "@/components/lab/reception/LabRegistrationForm";
import LabPatientQueue from "@/components/lab/reception/LabPatientQueue";
import LabPatientWorkspace from "@/components/lab/reception/LabPatientWorkspace";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";
import { getDoctorVisitById } from "@/services/visitService";
import apiClient from "@/services/api";

// Types
import type { Patient } from "@/types/patients";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import type { DoctorVisit } from "@/types/visits";

// Type for the Autocomplete's options
interface AutocompleteVisitOption {
  visit_id: number;
  patient_id: number;
  autocomplete_label: string;
}

const LabReceptionPage: React.FC = () => {
  const { t, i18n } = useTranslation([
    "labReception",
    "common",
    "labResults",
    "shifts",
    "clinic",
    "patients",
  ]);
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();

  // --- State Management ---
  const [activeVisitId, setActiveVisitId] = useState<number | null>(null);

  // Header controls state
  const [visitIdSearchTerm, setVisitIdSearchTerm] = useState("");
  const [autocompleteInputValue, setAutocompleteInputValue] = useState("");
  const [selectedVisitFromAutocomplete, setSelectedVisitFromAutocomplete] =
    useState<AutocompleteVisitOption | null>(null);
  const debouncedAutocompleteSearch = useDebounce(autocompleteInputValue, 500);

  // --- Data Fetching & Mutations ---
  const { data: recentVisitsData, isLoading: isLoadingRecentVisits } = useQuery<
    AutocompleteVisitOption[],
    Error
  >({
    queryKey: [
      "searchPatientVisitsForAutocomplete",
      debouncedAutocompleteSearch,
    ],
    queryFn: async () => {
      // This endpoint needs to be created on the backend
      const response = await apiClient.get("/search/patient-visits", {
        params: { term: debouncedAutocompleteSearch },
      });
      return response.data.data;
    },
    enabled: debouncedAutocompleteSearch.length >= 2,
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
            visitId:
              visitIdSearchTerm || selectedVisitFromAutocomplete?.visit_id,
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

  // --- Event Handlers ---
  const handlePatientActivated = useCallback(
    (patientWithVisit: Patient & { doctorVisit?: DoctorVisit }) => {
      // Invalidate the lab patient queue to show the newly added patient
      queryClient.invalidateQueries({
        queryKey: ["labReceptionQueue", currentClinicShift?.id],
      });
      
      if (patientWithVisit.doctorVisit) {
        setActiveVisitId(patientWithVisit.doctorVisit.id);
      }
    },
    [queryClient, currentClinicShift?.id]
  );

  const handlePatientSelectedFromQueue = useCallback(
    (queueItem: PatientLabQueueItem) => {
      fetchVisitDetailsMutation.mutate(queueItem.visit_id);
    },
    [fetchVisitDetailsMutation]
  );

  const handleToggleToRegistration = useCallback(() => {
    setActiveVisitId(null);
  }, []);

  const handleSearchByVisitIdEnter = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
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
    setVisitIdSearchTerm("");
    setAutocompleteInputValue("");
    setSelectedVisitFromAutocomplete(null);
    toast.info(t("viewReset", "View has been reset."));
  };

  const isRTL = i18n.dir() === "rtl";

  return (
    <div  className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden">
      <header className="flex-shrink-0 h-auto p-2 border-b bg-card flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-shrink-0">
          <Microscope className="h-7 w-7 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
            {t("pageTitle", "Lab Reception")}
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto sm:flex-grow justify-end">
          <Autocomplete
            id="lab-reception-search"
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
            onInputChange={(_, newInputValue) =>
              setAutocompleteInputValue(newInputValue)
            }
            getOptionLabel={(option) => option.autocomplete_label}
            isOptionEqualToValue={(option, value) =>
              option.visit_id === value.visit_id
            }
            loading={isLoadingRecentVisits}
            size="small"
            sx={{
              width: { xs: "100%", sm: 250, md: 320 },
              "& .MuiInputLabel-root": { fontSize: "0.8rem" },
              "& .MuiOutlinedInput-root": {
                fontSize: "0.8rem",
                backgroundColor: "var(--background)",
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("labResults:searchRecentVisitsByPatientLabel")}
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <Search className="h-4 w-4 text-muted-foreground ltr:mr-2 rtl:ml-2" />
                  ),
                  endAdornment: (
                    <>
                      {isLoadingRecentVisits ||
                      fetchVisitDetailsMutation.isPending ? (
                        <CircularProgress color="inherit" size={18} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            PaperComponent={(props) => (
              <Paper
                {...props}
                className="dark:bg-slate-800 dark:text-slate-100"
              />
            )}
            noOptionsText={
              autocompleteInputValue.length < 2
                ? t("common:typeMoreChars")
                : t("common:noResultsFound")
            }
            loadingText={t("common:loading")}
          />

          <div className="relative w-full sm:w-auto">
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <Input
              type="number"
              placeholder={t("labResults:searchByVisitIdPlaceholderShort")}
              value={visitIdSearchTerm}
              onChange={(e) => setVisitIdSearchTerm(e.target.value)}
              onKeyDown={handleSearchByVisitIdEnter}
              className="ps-10 rtl:pr-10 h-10 text-sm w-full sm:w-28 md:w-32"
              disabled={fetchVisitDetailsMutation.isPending}
            />
            {fetchVisitDetailsMutation.isPending && (
              <Loader2 className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetView}
            title={t("labResults:resetViewTooltip")}
            className="h-10 w-10"
          >
            <ListRestart className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* DYNAMIC 2 OR 3 COLUMN LAYOUT */}
      <div
        className={cn(
          "flex-grow grid gap-0 overflow-hidden transition-all duration-300 ease-in-out",
          activeVisitId
            ? "grid-cols-[60px_420px_1fr]"
            : "grid-cols-[60px_400px_1fr]"
        )}
      >
        {/* Column 1: Actions Pane (always visible) */}
        <LabActionsPane
          isFormVisible={!activeVisitId}
          onToggleView={handleToggleToRegistration}
        />

        {/* Column 2: Form when no active visit, Queue when visit is active */}
        <section
          className={cn(
            "h-full flex flex-col",
            activeVisitId
              ? "bg-card border-border " + (isRTL ? "border-r" : "border-l")
              : "p-2 sm:p-3 overflow-y-auto bg-background"
          )}
        >
          {activeVisitId ? (
            <LabPatientQueue
              currentShift={currentClinicShift}
              onShiftChange={() =>
                toast.info(t("common:featureNotImplementedShort"))
              }
              onPatientSelect={handlePatientSelectedFromQueue}
              selectedVisitId={activeVisitId}
              globalSearchTerm={""} // The queue could have its own search if desired
            />
          ) : (
            <LabRegistrationForm
              onPatientActivated={handlePatientActivated}
              isVisible={!activeVisitId}
            />
          )}
        </section>

        {/* Column 3: Queue when no active visit, Workspace when visit is active */}
        <section
          className={cn(
            "h-full flex flex-col",
            activeVisitId
              ? "p-2 sm:p-3 overflow-y-auto bg-background"
              : "bg-card border-border " + (isRTL ? "border-r" : "border-l")
          )}
        >
          {activeVisitId ? (
            <LabPatientWorkspace
              key={activeVisitId}
              activeVisitId={activeVisitId}
              onClose={handleToggleToRegistration}
            />
          ) : (
            <LabPatientQueue
              currentShift={currentClinicShift}
              onShiftChange={() =>
                toast.info(t("common:featureNotImplementedShort"))
              }
              onPatientSelect={handlePatientSelectedFromQueue}
              selectedVisitId={activeVisitId}
              globalSearchTerm={""} // The queue could have its own search if desired
            />
          )}
        </section>
      </div>
    </div>
  );
};
export default LabReceptionPage;
