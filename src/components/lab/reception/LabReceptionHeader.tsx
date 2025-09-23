import React from "react";

// MUI Imports
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
// import Chip from "@mui/material/Chip";

// MUI & Lucide Imports
import { Button, Box, Typography, IconButton } from "@mui/material";
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
  testSelectionAutocompleteRef: React.RefObject<HTMLDivElement | null>;

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
  testSelectionAutocompleteRef,

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
    <Box
      component="header"
      sx={{
        flexShrink: 0,
        height: 'auto',
        bgcolor: 'background.paper',
        boxShadow: 2,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <Box
            sx={{
              bgcolor: 'primary.light',
              borderRadius: 1,
            }}
          >
            <Microscope size={28} color="#1976d2" />
          </Box>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              استقبال المختبر
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              نظام إدارة المختبرات الاحترافي
            </Typography>
          </Box>
          {/* Sockets removed: no connection status */}
        </Box>
        {/* Search Controls - centered */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, justifyContent: 'center' }}>
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
              <Paper {...props} />
            )}
            noOptionsText={
              autocompleteInputValue.length < 2
                ? "اكتب المزيد من الأحرف"
                : "لا توجد نتائج"
            }
            loadingText={"جاري التحميل"}
          />

          <Box sx={{ position: 'relative' }}>
            <TextField
              type="number"
              placeholder="رقم الزيارة"
              value={visitIdSearchTerm}
              onChange={(e) => setVisitIdSearchTerm(e.target.value)}
              onKeyDown={onSearchByVisitIdEnter}
              disabled={fetchVisitDetailsMutation.isPending}
              size="small"
              sx={{ width: 120 }}
              InputProps={{
                startAdornment: (
                  <Search size={16} style={{ marginRight: 8, color: '#666' }} />
                ),
              }}
            />
          </Box>

          <IconButton
            onClick={onResetView}
            title="إعادة التعيين"
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ListRestart size={20} />
          </IconButton>
        </Box>

        {/* Test Selection Autocomplete - moved to the right */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <Autocomplete
            ref={testSelectionAutocompleteRef}
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
                  } else if (e.key === "+" || e.key === "=") {
                    // Trigger add tests when + or = key is pressed
                    e.preventDefault();
                    if (selectedTests.length > 0 && activeVisitId && !addTestsMutation.isPending) {
                      onAddTests();
                      // Remove focus from the input after adding tests
                      (e.target as HTMLInputElement).blur();
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
            variant="contained"
            startIcon={
              addTestsMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )
            }
            sx={{
              bgcolor: 'primary.main',
              px: 2,
              py: 1,
              borderRadius: 1,
              boxShadow: 2,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: 'primary.dark',
                boxShadow: 4,
                transform: 'scale(1.05)',
              },
            }}
          >
            إضافة فحص {selectedTests.length > 0 && `(${selectedTests.length})`}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LabReceptionHeader; 