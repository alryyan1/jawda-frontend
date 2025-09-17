import React from "react";

// MUI Imports
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
// import Chip from "@mui/material/Chip";

// Shadcn & Lucide Imports
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  ListRestart,
  Microscope,
  Plus,
} from "lucide-react";

// Custom Components
// Removed connection status indicator (sockets removed)

// Types
import type { MainTestStripped } from "@/types/labTests";

interface AutocompleteVisitOption {
  visit_id: number;
  patient_id: number;
  autocomplete_label: string;
}

interface LabReceptionHeaderProps {
  // Test selection props
  availableTests: MainTestStripped[];
  selectedTests: MainTestStripped[];
  setSelectedTests: (tests: MainTestStripped[]) => void;
  isLoadingTests: boolean;
  activeVisitId: number | null;
  addTestsMutation: { isPending: boolean };

  // Search props
  recentVisitsData: AutocompleteVisitOption[] | undefined;
  isLoadingRecentVisits: boolean;
  selectedVisitFromAutocomplete: AutocompleteVisitOption | null;
  setSelectedVisitFromAutocomplete: (visit: AutocompleteVisitOption | null) => void;
  autocompleteInputValue: string;
  setAutocompleteInputValue: (value: string) => void;
  visitIdSearchTerm: string;
  setVisitIdSearchTerm: (value: string) => void;
  fetchVisitDetailsMutation: { isPending: boolean; mutate: (id: number) => void };

  // Event handlers
  onResetView: () => void;
  onAddTests: () => void;
  onSearchByVisitIdEnter: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const LabReceptionHeader: React.FC<LabReceptionHeaderProps> = ({
  // Test selection props
  availableTests,
  selectedTests,
  setSelectedTests,
  isLoadingTests,
  activeVisitId,
  addTestsMutation,

  // Search props
  recentVisitsData,
  isLoadingRecentVisits,
  selectedVisitFromAutocomplete,
  setSelectedVisitFromAutocomplete,
  autocompleteInputValue,
  setAutocompleteInputValue,
  visitIdSearchTerm,
  setVisitIdSearchTerm,
  fetchVisitDetailsMutation,

  // Event handlers
  onResetView,
  onAddTests,
  onSearchByVisitIdEnter,
}) => {
  // Translations removed; using direct Arabic strings

  return (
    <header className="flex-shrink-0 h-auto p-4 bg-white dark:bg-slate-800 shadow-lg border-b border-blue-200 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Microscope className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              استقبال المختبر
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              نظام إدارة المختبرات الاحترافي
            </p>
          </div>
          {/* Sockets removed: no connection status */}
        </div>
        {/* Search Controls - centered */}
        <div className="flex items-center gap-3 flex-1 justify-center">
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
                label={"ابحث عن المرضى"}
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
                ? "اكتب المزيد من الأحرف"
                : "لا توجد نتائج"
            }
            loadingText={"جاري التحميل"}
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="number"
              placeholder={"رقم الزيارة"}
              value={visitIdSearchTerm}
              onChange={(e) => setVisitIdSearchTerm(e.target.value)}
              onKeyDown={onSearchByVisitIdEnter}
              className="pl-10 w-28 h-10 text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={fetchVisitDetailsMutation.isPending}
            />
          </div>

          <Button
            onClick={onResetView}
            title={"إعادة التعيين"}
            className="h-10 w-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <ListRestart className="h-5 w-5" />
          </Button>
        </div>

        {/* Test Selection Autocomplete - moved to the right */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Autocomplete
            multiple
            options={availableTests || []}
            value={selectedTests}
            onChange={(_, newValue) => {
              console.log('Autocomplete onChange:', newValue);
              setSelectedTests(newValue);
            }}
            getOptionKey={(option) => option.id}
            getOptionLabel={(option) => option.main_test_name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={isLoadingTests}
            size="small"
            sx={{ width: 320 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={"اختر الفحوصات لإضافتها"}
                variant="outlined"
                placeholder={"ابحث واختر الفحوصات..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const enteredId = (e.target as HTMLInputElement).value;
                    const foundTest = availableTests?.find(
                      (test) => test.id === parseInt(enteredId)
                    );
                    if (foundTest) {
                      setSelectedTests([...selectedTests, foundTest]);
                    }
                  }
                }}
              />
            )}
            noOptionsText={"لا توجد نتائج"}
            loadingText={"جاري التحميل"}
          />
          <Button
            onClick={onAddTests}
            disabled={selectedTests.length === 0 || !activeVisitId || addTestsMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            {addTestsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {"إضافة فحص"} {selectedTests.length > 0 && `(${selectedTests.length})`}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default LabReceptionHeader; 