// src/components/lab/reception/LabReceptionHeader.tsx
import React from "react";

// MUI
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

// Icons
import { Search, Loader2, Microscope, Plus } from "lucide-react";

// Types & hooks
import type { MainTestStripped } from "@/types/labTests";
import { useAuthorization } from "@/hooks/useAuthorization";

export interface AutocompleteVisitOption {
  visit_id: number;
  patient_id: number;
  autocomplete_label: string;
}

interface LabReceptionHeaderProps {
  // Test selection
  availableTests: MainTestStripped[];
  selectedTests: MainTestStripped[];
  setSelectedTests: (tests: MainTestStripped[]) => void;
  isLoadingTests: boolean;
  activeVisitId: number | null;
  addTestsMutation: { isPending: boolean };
  testSelectionAutocompleteRef: React.RefObject<HTMLDivElement | null>;

  // Visit search
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
  onOpenOffers: () => void;
}

/** Page identity block (icon + title) shown at the start of the toolbar. */
const HeaderBrand: React.FC = () => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 1.5,
        bgcolor: "primary.main",
        color: "primary.contrastText",
      }}
    >
      <Microscope size={19} />
    </Box>
    <Box sx={{ display: { xs: "none", md: "block" } }}>
      <Box component="span" sx={{ fontWeight: 700, fontSize: 15, color: "text.primary", display: "block", lineHeight: 1.2 }}>
        استقبال المختبر
      </Box>
    </Box>
  </Box>
);

/** Patient/visit lookup: fuzzy autocomplete + direct visit-code field. */
const VisitSearchControls: React.FC<
  Pick<
    LabReceptionHeaderProps,
    | "recentVisitsData"
    | "isLoadingRecentVisits"
    | "selectedVisitFromAutocomplete"
    | "setSelectedVisitFromAutocomplete"
    | "autocompleteInputValue"
    | "setAutocompleteInputValue"
    | "visitIdSearchTerm"
    | "setVisitIdSearchTerm"
    | "fetchVisitDetailsMutation"
    | "onSearchByVisitIdEnter"
  >
> = ({
  recentVisitsData,
  isLoadingRecentVisits,
  selectedVisitFromAutocomplete,
  setSelectedVisitFromAutocomplete,
  autocompleteInputValue,
  setAutocompleteInputValue,
  visitIdSearchTerm,
  setVisitIdSearchTerm,
  fetchVisitDetailsMutation,
  onSearchByVisitIdEnter,
}) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, justifyContent: "center" }}>
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
          label="بحث"
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            startAdornment: <Search className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />,
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
      noOptionsText={autocompleteInputValue.length < 2 ? "اكتب المزيد من الأحرف" : "لا توجد نتائج"}
      loadingText="جاري التحميل"
    />

    <TextField
      type="number"
      placeholder="الكود"
      aria-label="بحث برقم الزيارة"
      value={visitIdSearchTerm}
      onChange={(e) => setVisitIdSearchTerm(e.target.value)}
      onKeyDown={onSearchByVisitIdEnter}
      disabled={fetchVisitDetailsMutation.isPending}
      size="small"
      sx={{ width: 120 }}
      InputProps={{
        startAdornment: <Search size={16} style={{ marginRight: 8, color: "#666" }} aria-hidden />,
      }}
    />
  </Box>
);

/** Multi-select test picker + add button, with keyboard shortcuts preserved. */
const TestSelectionControls: React.FC<
  Pick<
    LabReceptionHeaderProps,
    | "availableTests"
    | "selectedTests"
    | "setSelectedTests"
    | "isLoadingTests"
    | "activeVisitId"
    | "addTestsMutation"
    | "testSelectionAutocompleteRef"
    | "onAddTests"
    | "onOpenOffers"
  >
> = ({
  availableTests,
  selectedTests,
  setSelectedTests,
  isLoadingTests,
  activeVisitId,
  addTestsMutation,
  testSelectionAutocompleteRef,
  onAddTests,
  onOpenOffers,
}) => {
  const { can } = useAuthorization();

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
      {Boolean(activeVisitId) && (
        <Button size="small" variant="contained" color="secondary" onClick={onOpenOffers}>
          العروض
        </Button>
      )}

      <Autocomplete
        ref={testSelectionAutocompleteRef}
        multiple
        options={availableTests || []}
        value={selectedTests}
        onChange={(_, newValue) => setSelectedTests(newValue)}
        getOptionKey={(option) => option.id}
        getOptionLabel={(option) => option.main_test_name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={isLoadingTests}
        size="small"
        sx={{ width: 320 }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="اختر الفحوصات لإضافتها"
            variant="outlined"
            placeholder="ابحث واختر الفحوصات..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Typing a numeric test id then Enter selects that test directly
                const enteredId = (e.target as HTMLInputElement).value;
                const foundTest = availableTests?.find((test) => test.id === parseInt(enteredId));
                if (foundTest) {
                  setSelectedTests([...selectedTests, foundTest]);
                }
              } else if (e.key === "+" || e.key === "=") {
                // "+" / "=" commits the current selection
                e.preventDefault();
                if (selectedTests.length > 0 && activeVisitId && !addTestsMutation.isPending) {
                  onAddTests();
                  (e.target as HTMLInputElement).blur();
                }
              }
            }}
          />
        )}
        noOptionsText="لا توجد نتائج"
        loadingText="جاري التحميل"
      />

      <Button
        onClick={onAddTests}
        disabled={selectedTests.length === 0 || !activeVisitId || addTestsMutation.isPending || !can("اضافه فحص")}
        variant="contained"
        size="small"
        startIcon={addTestsMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
      >
        إضافة فحص {selectedTests.length > 0 && `(${selectedTests.length})`}
      </Button>
    </Box>
  );
};

const LabReceptionHeader: React.FC<LabReceptionHeaderProps> = (props) => {
  return (
    <Box
      component="header"
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        px: 1.5,
        py: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <HeaderBrand />
        <VisitSearchControls {...props} />
        <TestSelectionControls {...props} />
      </Box>
    </Box>
  );
};

export default LabReceptionHeader;
