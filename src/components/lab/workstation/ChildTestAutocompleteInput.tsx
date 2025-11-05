// src/components/lab/workstation/ChildTestAutocompleteInput.tsx
import React, { useState, useEffect, useCallback } from "react";
// استخدام نص عربي مباشر بدلاً من i18n
import { useMutation } from "@tanstack/react-query";
import Autocomplete, {
  createFilterOptions,
} from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button"; // MUI Button
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { toast } from "sonner";

import type { ChildTestOption } from "@/types/labTests";
import type { ChildTestWithResult, PatientLabQueueItem } from "@/types/labWorkflow";
import {
  getChildTestOptionsList,
  createChildTestOption,
} from "@/services/childTestOptionService";
import { saveSingleChildTestResult, getSinglePatientLabQueueItem } from "@/services/labWorkflowService";

interface ChildTestAutocompleteInputProps {
  // RHF field props
  value: ChildTestOption | string | null; // Can be an object or a string (from freeSolo)
  resultId: number;
  onChange: (value: ChildTestOption | string | null) => void; // RHF's onChange
  onBlur: () => void; // RHF's onBlur
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  // Component-specific props
  childTestId: number; // ID of the ChildTest definition
  childTestName: string; // Name for dialog title
  parentChildTestModel: ChildTestWithResult; // For focus callback
  onFocusChange: (childTest: ChildTestWithResult | null) => void;
  // Ref for auto-focus functionality
  inputRef?: React.RefObject<HTMLInputElement | null>;
  // Patient data for authorization check
  patientAuthDate?: boolean | null;
  // For queue invalidation when results are saved
  visitId?: number; // Visit ID to invalidate the correct queue
  onItemUpdated?: (updatedItem: PatientLabQueueItem) => void; // Callback to update the item in parent
  // For autosave trigger (optional, can be handled by parent watching RHF value)
  // onValueActuallyChanged: (newValue: string | ChildTestOption | null) => void;
  patientLabQueueItem?: PatientLabQueueItem | null;
}

type OptionType = ChildTestOption | { inputValue: string; name: string };

const filter = createFilterOptions<OptionType>();

// Helper from your code
function isNumeric(str: unknown): boolean {
  if (typeof str !== "string") return false;
  if (str.includes("-")) return true; // Allow negative numbers and ranges
  return !isNaN(str as unknown as number) && !isNaN(parseFloat(str));
}

// Map boolean values to human labels, trying to use existing option names if available
function booleanToLabel(isTrue: boolean, options?: Array<{ name: string }>): string {
  if (options && options.length > 0) {
    const positive = options.find((o) => /positive|present|yes|true/i.test(o.name))?.name;
    const negative = options.find((o) => /negative|absent|no|false/i.test(o.name))?.name;
    if (isTrue && positive) return positive;
    if (!isTrue && negative) return negative;
  }
  return isTrue ? "Positive" : "Negative";
}

const ChildTestAutocompleteInput: React.FC<ChildTestAutocompleteInputProps> = ({
  value,
  resultId,
  onChange,
  onBlur,
  disabled,
  error,
  helperText,
  childTestId,
  childTestName,
  parentChildTestModel,
  onFocusChange,
  inputRef,
  patientAuthDate,
  visitId,
  onItemUpdated,
  patientLabQueueItem
}) => {
  // استخدام نص عربي مباشر بدلاً من i18n

  // Check if patient is authorized (auth_date is not null)
  const isPatientAuthorized = patientAuthDate == true;
  const isDisabled = disabled || isPatientAuthorized;

  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [currentInputValue, setCurrentInputValue] = useState(""); // For the text field part
  const [options, setOptions] = useState<ChildTestOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Dialog for adding new option
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogValue, setDialogValue] = useState("");
  const [isSavingNewOption, setIsSavingNewOption] = useState(false);

  // Save status indicators
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Immediate onChange without debouncing
  const handleImmediateChange = useCallback((value: string | ChildTestOption | null) => {
    // Call onChange immediately
    onChange(value);
    
    // Set saving state for visual feedback
    setIsSaving(true);
    setShowSuccess(false);

    // Show success indicator after a short delay
    setTimeout(async () => {
      setIsSaving(false);
      setShowSuccess(true);
      
      // Fetch the updated single item to update progress bars
      if (visitId && onItemUpdated) {
        try {
          const updatedItem = await getSinglePatientLabQueueItem(visitId);
          onItemUpdated(updatedItem);
        } catch {
          // console.error('Failed to fetch updated item:', error);
        }
      }
      
      // Hide success indicator after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }, 500);
  }, [onChange, visitId, onItemUpdated]);

  // Fetch and cache options using localStorage (cache options only, not result values)
  useEffect(() => {
    if (!childTestId) return;
    setIsLoadingOptions(true);
    const localStorageKey = `childTestOptions_${childTestId}`;
    const cachedOptions = localStorage.getItem(localStorageKey);

    if (cachedOptions) {
      try {
        setOptions(JSON.parse(cachedOptions));
        setIsLoadingOptions(false);
      } catch {
        localStorage.removeItem(localStorageKey); // Clear invalid cache
        // Fallback to API call if cache is corrupted
        getChildTestOptionsList(childTestId)
          .then((data: ChildTestOption[]) => {
            setOptions(data);
            localStorage.setItem(localStorageKey, JSON.stringify(data));
          })
          .catch((err: unknown) =>
            console.error("Failed to fetch child test options:", err)
          )
          .finally(() => setIsLoadingOptions(false));
      }
    } else {
      getChildTestOptionsList(childTestId)
        .then((data: ChildTestOption[]) => {
          setOptions(data);
          localStorage.setItem(localStorageKey, JSON.stringify(data));
        })
        .catch((err: unknown) =>
          console.error("Failed to fetch child test options:", err)
        )
        .finally(() => setIsLoadingOptions(false));
    }
  }, [childTestId]);

  // Reset autocomplete state when childTestId changes (e.g., when switching tabs)
  useEffect(() => {
    setIsAutocompleteOpen(false);
    setCurrentInputValue("");
    setIsSaving(false);
    setShowSuccess(false);
  }, [childTestId]);

  // Initialize currentInputValue from RHF value and update when value changes
  useEffect(() => {
    const newValue = typeof value === "object" && value !== null 
      ? value.name 
      : typeof value === "string" 
        ? value 
        : typeof value === "boolean"
          ? booleanToLabel(value, options)
          : ""; // Always use empty string for null/undefined values
    
    // Use a small timeout to ensure this runs after the reset effect
    const timeoutId = setTimeout(() => {
      // Always update the display value when the prop value changes
      // This ensures saved values are properly displayed and resets when switching tabs
      setCurrentInputValue(newValue);
      
      // Reset saving states when value changes (e.g., when switching tabs)
      setIsSaving(false);
      setShowSuccess(false);
      
      // console.log('ChildTestAutocompleteInput value updated:', { childTestId, newValue, value });
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [value, childTestId, options]); // Watch for value changes from parent and childTestId

  const handleDialogClose = () => {
    setDialogValue("");
    setDialogOpen(false);
  };

  const createOptionMutation = useMutation({
    mutationFn: (newOptionName: string) =>
      createChildTestOption(childTestId, { name: newOptionName }),
    onSuccess: (newOption) => {
      toast.success("تم إضافة الخيار بنجاح");
      const newOptionsList = [...options, newOption];
      setOptions(newOptionsList);
      // Update localStorage cache with the new option
      localStorage.setItem(
        `childTestOptions_${childTestId}`,
        JSON.stringify(newOptionsList)
      );
      onChange(newOption); // Select the newly added option in the form
      handleDialogClose();
    },
    onError: (err: unknown) => {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(
        errorMessage || "فشل إضافة الخيار"
      );
    },
    onSettled: () => setIsSavingNewOption(false),
  });

  const handleDialogSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (dialogValue.trim()) {
      setIsSavingNewOption(true);
      createOptionMutation.mutate(dialogValue.trim());
    }
  };
  return (
    <>
      <Autocomplete<OptionType, false, false, true>
        fullWidth
        size="small"
        open={isAutocompleteOpen}
        onOpen={() => setIsAutocompleteOpen(true)}
        onClose={() => setIsAutocompleteOpen(false)}
        options={options as OptionType[]} // Use locally managed options (with localStorage caching)
        loading={isLoadingOptions}
        readOnly={isDisabled}
        sx={{
        
          '& .MuiAutocomplete-root': {
            // fontSize: '0.7rem',
          },
          '& .MuiInputBase-root': {
            minHeight: '20px',
            // fontSize: '0.7rem',
            padding: '1px 4px',
          },
          '& .MuiInputBase-input': {
            padding: '1px 2px',
            // fontSize: '0.7rem',
          },
          '& .MuiAutocomplete-listbox': {
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
            // fontSize: '0.7rem',
          },
          '& .MuiAutocomplete-option': {
            color: 'var(--foreground)',
            // fontSize: '0.7rem',
            padding: '2px 4px',
            minHeight: 'auto',
            lineHeight: 1.1,
            '&:hover': {
              backgroundColor: 'var(--accent)',
            },
            '&.Mui-focused': {
              backgroundColor: 'var(--accent)',
            },
          },
        }}
        getOptionLabel={(option) => {
          if (typeof option === "string") return option;
          if (typeof option === "boolean") return booleanToLabel(option, options);
          return option?.name ?? "";
        }}
        value={value || null}
        onChange={(_, newValue) => {
          if (typeof newValue === "string") {
            // User typed and pressed Enter for a new value (freeSolo)
            // For numeric fields, we just pass the string. For qualitative, open dialog if not numeric.
            if (!isNumeric(newValue)) {
              setTimeout(() => {
                // Timeout to avoid issues with Autocomplete internal state
                setDialogValue(newValue);
                setDialogOpen(true);
              });
            } else {
              setCurrentInputValue(newValue);
              onChange(newValue); // Pass string for numeric input
            }
          } else if (newValue && "inputValue" in newValue) {
            // User selected "Add '...'" from dropdown
            setDialogValue(newValue.inputValue);
            setDialogOpen(true);
          } else {
            // User selected an existing option or cleared
            const newInputValue = newValue ? (newValue as ChildTestOption).name : "";
            saveSingleChildTestResult(resultId, newInputValue);
            setCurrentInputValue(newInputValue);
            onChange(newValue as ChildTestOption | null);
          }
        }}
        inputValue={currentInputValue} // Controlled input value for display
        onInputChange={(_, newInputValue, reason) => {
          if (reason === "input") {
            // Update local state immediately for responsive typing
            setCurrentInputValue(newInputValue);

            // Use immediate onChange to trigger save on every keystroke
            handleImmediateChange(newInputValue);
          } else if (reason === "reset") {
            // Handle reset case
            setCurrentInputValue("");
            setShowSuccess(false);
            setIsSaving(false);
          } else if (reason === "clear") {
            // Handle clear case
            setCurrentInputValue("");
            setShowSuccess(false);
            setIsSaving(false);
            onChange(null); // Immediately clear the value
          } else if (reason === "blur") {
            // Ensure input value matches the actual value on blur
            const actualValue = typeof value === "object" && value !== null 
              ? value.name 
              : typeof value === "string" 
                ? value 
                : "";
            setCurrentInputValue(actualValue);
          }
        }}
        onFocus={() => onFocusChange(parentChildTestModel)}
        onBlur={() => {
          onBlur();
          // Don't call onFocusChange(null) to keep the normal range persistent
        }}
        isOptionEqualToValue={(option, val) => {
          // Handles string, boolean, and object values safely
          const optionName =
            typeof option === "string"
              ? option
              : typeof option === "boolean"
                ? booleanToLabel(option, options)
                : option?.name;
          const valueName =
            typeof val === "string"
              ? val
              : typeof val === "boolean"
                ? booleanToLabel(val, options)
                : val?.name;
          return optionName === valueName;
        }}
        freeSolo // Allows typing values not in the list
        selectOnFocus
        clearOnBlur // Clears input if user blurs without selecting, if `value` is null
        handleHomeEndKeys
        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          if (params.inputValue !== "" && !isNumeric(params.inputValue)) {
            // Don't show "Add..." for numbers
            const existingOption = options.find(
              (opt) =>
                opt.name.toLowerCase() === params.inputValue.toLowerCase()
            );
            if (!existingOption) {
              filtered.push({
                // This structure is from your original code
                inputValue: params.inputValue,
                name: `إضافة "${params.inputValue}"`,
              });
            }
          }
          return filtered;
        }}
        renderOption={(props, option) => (
          <li
            {...props}
            key={typeof option === "string" ? option : ("id" in option ? option.id : option.name)}
          >
            {typeof option === "string" ? option : option.name}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            inputRef={inputRef}
            variant="outlined"
            placeholder="  "
            style={{color:'red'}}
            className={patientLabQueueItem?.result_auth != true ? 'cursor-not-allowed text-red-500' : ''}
            error={error}
            helperText={helperText}
            onKeyDown={(event) => {
              // const target = event.target as HTMLInputElement;
              // console.log(target.value, 'event.target.value')
              // Prevent form submission when Enter is pressed
              if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          onChange={(event) => {
            // console.log(resultId, 'resultId')
            const target = event.target as HTMLInputElement;
            saveSingleChildTestResult(resultId, target.value)
          }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoadingOptions ? (
                    <CircularProgress
                      color="inherit"
                      size={12}
                      sx={{ mr: 0.5 }}
                    />
                  ) : isSaving ? (
                    <CircularProgress
                      color="primary"
                      size={12}
                      sx={{ mr: 0.5 }}
                    />
                  ) : showSuccess ? (
                    <CheckCircleIcon
                      color="success"
                      sx={{ fontSize: 12, mr: 0.5 }}
                    />
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
      />

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }
        }}
      >
        <form onSubmit={handleDialogSubmit}>
          <DialogTitle sx={{ color: 'var(--foreground)' }}>
            إضافة خيار جديد لـ {childTestName}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="new-option-name"
              label="اسم الخيار"
              type="text"
              fullWidth
              variant="standard"
              value={dialogValue}
              onChange={(event) => setDialogValue(event.target.value)}
              sx={{
                '& .MuiInput-root': {
                  color: 'var(--foreground)',
                  '&:before': {
                    borderBottomColor: 'var(--border)',
                  },
                  '&:hover:before': {
                    borderBottomColor: 'var(--ring)',
                  },
                  '&.Mui-focused:after': {
                    borderBottomColor: 'var(--ring)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--muted-foreground)',
                  '&.Mui-focused': {
                    color: 'var(--ring)',
                  },
                },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} color="inherit" size="small" sx={{ fontSize: '0.75rem', padding: '2px 8px' }}>
              إلغاء
            </Button>
            <Button
              type="submit"
              size="small"
              disabled={isSavingNewOption}
              sx={{ fontSize: '0.75rem', padding: '2px 8px' }}
            >
              إضافة
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};
export default React.memo(ChildTestAutocompleteInput);
