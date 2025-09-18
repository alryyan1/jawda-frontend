// src/components/lab/workstation/ChildTestAutocompleteInput.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
// استخدام نص عربي مباشر بدلاً من i18n
import { useMutation } from "@tanstack/react-query";
import { debounce } from "lodash";
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
import type { ChildTestWithResult } from "@/types/labWorkflow";
import {
  getChildTestOptionsList,
  createChildTestOption,
} from "@/services/childTestOptionService";

interface ChildTestAutocompleteInputProps {
  // RHF field props
  value: ChildTestOption | string | null; // Can be an object or a string (from freeSolo)
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
  // For autosave trigger (optional, can be handled by parent watching RHF value)
  // onValueActuallyChanged: (newValue: string | ChildTestOption | null) => void;
}

type OptionType = ChildTestOption | { inputValue: string; name: string };

const filter = createFilterOptions<OptionType>();

// Helper from your code
function isNumeric(str: unknown): boolean {
  if (typeof str !== "string") return false;
  if (str.includes("-")) return true; // Allow negative numbers and ranges
  return !isNaN(str as unknown as number) && !isNaN(parseFloat(str));
}

const ChildTestAutocompleteInput: React.FC<ChildTestAutocompleteInputProps> = ({
  value,
  onChange,
  onBlur,
  disabled,
  error,
  helperText,
  childTestId,
  childTestName,
  parentChildTestModel,
  onFocusChange,
}) => {
  // استخدام نص عربي مباشر بدلاً من i18n

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
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced visual feedback for save status
  const debouncedOnChange = useCallback(
    (value: string) => {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set saving state
      setIsSaving(true);
      setShowSuccess(false);

      // Set new timeout for visual feedback only
      debounceTimeoutRef.current = setTimeout(() => {
        // The actual API save will be handled by the parent component's useWatch mechanism
        // We just need to show the saving/success states
        setIsSaving(false);
        setShowSuccess(true);
        
        // Hide success indicator after 2 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
      }, 1000); // Show success after 1 second (API call should be done by then)
    },
    []
  );

  // Fetch and cache options using localStorage (from your original component)
  useEffect(() => {
    if (!childTestId) return;
    setIsLoadingOptions(true);
    const localStorageKey = `childTestOptions_${childTestId}`;
    const cachedOptions = localStorage.getItem(localStorageKey);

    if (cachedOptions) {
      try {
        setOptions(JSON.parse(cachedOptions));
      } catch (e) {
        localStorage.removeItem(localStorageKey); // Clear invalid cache
        console.error("Failed to parse cached options", e);
      }
      setIsLoadingOptions(false);
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

  // Initialize currentInputValue from RHF value and update when value changes
  useEffect(() => {
    const newValue = typeof value === "object" && value !== null 
      ? value.name 
      : typeof value === "string" 
        ? value 
        : "";
    
    // Always update the display value when the prop value changes
    // This ensures saved values are properly displayed
    setCurrentInputValue(newValue);
  }, [value]); // Watch for value changes from parent

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

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
        disabled={disabled}
        sx={{
          '& .MuiAutocomplete-root': {
            fontSize: '0.75rem',
          },
          '& .MuiInputBase-root': {
            minHeight: '28px',
            fontSize: '0.75rem',
            padding: '2px 8px',
          },
          '& .MuiInputBase-input': {
            padding: '2px 4px',
            fontSize: '0.75rem',
          },
          '& .MuiAutocomplete-listbox': {
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
            fontSize: '0.75rem',
          },
          '& .MuiAutocomplete-option': {
            color: 'var(--foreground)',
            fontSize: '0.75rem',
            padding: '4px 8px',
            minHeight: 'auto',
            '&:hover': {
              backgroundColor: 'var(--accent)',
            },
            '&.Mui-focused': {
              backgroundColor: 'var(--accent)',
            },
          },
        }}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option.name
        }
        value={value}
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
            setCurrentInputValue(newInputValue);
            onChange(newValue as ChildTestOption | null);
          }
        }}
        inputValue={currentInputValue} // Controlled input value for display
        onInputChange={(_, newInputValue, reason) => {
          if (reason === "input") {
            // Update local state immediately for responsive typing
            setCurrentInputValue(newInputValue);
            // Call onChange immediately to mark field as dirty in React Hook Form
            onChange(newInputValue);
            // Trigger debounced onChange for visual feedback
            debouncedOnChange(newInputValue);
          } else if (reason === "reset") {
            // Handle reset case
            setCurrentInputValue("");
            setShowSuccess(false);
            setIsSaving(false);
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }
          } else if (reason === "clear") {
            // Handle clear case
            setCurrentInputValue("");
            setShowSuccess(false);
            setIsSaving(false);
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }
            onChange(null);
          }
        }}
        onFocus={() => onFocusChange(parentChildTestModel)}
        onBlur={() => {
          onBlur();
          onFocusChange(null);
        }}
        isOptionEqualToValue={(option, val) => {
          // Handles both string and object values
          const optionName = typeof option === "string" ? option : option?.name;
          const valueName = typeof val === "string" ? val : val?.name;
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
            variant="outlined"
            placeholder="أدخل أو اختر النتيجة"
            error={error}
            helperText={helperText}
            onKeyDown={(event) => {
              // Prevent form submission when Enter is pressed
              if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            sx={{
              // Dark theme styling
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                minHeight: '28px',
                fontSize: '0.75rem',
                '& fieldset': {
                  borderColor: 'var(--border)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--ring)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--ring)',
                },
              },
              '& .MuiInputBase-input': {
                padding: '2px 4px',
                fontSize: '0.75rem',
              },
              '& .MuiInputLabel-root': {
                color: 'var(--muted-foreground)',
                fontSize: '0.75rem',
              },
              '& .MuiFormHelperText-root': {
                color: 'var(--muted-foreground)',
                fontSize: '0.65rem',
                margin: '2px 0 0 0',
              },
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoadingOptions ? (
                    <CircularProgress
                      color="inherit"
                      size={16}
                      sx={{ mr: 1 }}
                    />
                  ) : isSaving ? (
                    <CircularProgress
                      color="primary"
                      size={16}
                      sx={{ mr: 1 }}
                    />
                  ) : showSuccess ? (
                    <CheckCircleIcon
                      color="success"
                      sx={{ fontSize: 16, mr: 1 }}
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
            <Button onClick={handleDialogClose} color="inherit" size="small">
              إلغاء
            </Button>
            <Button
              type="submit"
              size="small"
              disabled={isSavingNewOption}
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
