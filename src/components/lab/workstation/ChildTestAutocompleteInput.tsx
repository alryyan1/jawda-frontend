// src/components/lab/workstation/ChildTestAutocompleteInput.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["labResults", "common"]);

  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [currentInputValue, setCurrentInputValue] = useState(""); // For the text field part
  const [options, setOptions] = useState<ChildTestOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Dialog for adding new option
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogValue, setDialogValue] = useState("");
  const [isSavingNewOption, setIsSavingNewOption] = useState(false);

  // Debounced onChange to avoid too many API calls on every keystroke
  const debouncedOnChange = useCallback(
    debounce((value: string) => {
      onChange(value);
    }, 800), // 800ms delay
    [onChange]
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

  // Sync RHF `value` to local `currentInputValue` for display in TextField
  useEffect(() => {
    if (typeof value === "object" && value !== null) {
      setCurrentInputValue(value.name);
    } else if (typeof value === "string") {
      setCurrentInputValue(value);
    } else {
      setCurrentInputValue("");
    }
  }, [value]);

  const handleDialogClose = () => {
    setDialogValue("");
    setDialogOpen(false);
  };

  const createOptionMutation = useMutation({
    mutationFn: (newOptionName: string) =>
      createChildTestOption(childTestId, { name: newOptionName }),
    onSuccess: (newOption) => {
      toast.success(t("labTests:childTests.options.addedSuccess"));
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
        errorMessage || t("labTests:childTests.options.addError")
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
          '& .MuiAutocomplete-listbox': {
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
          },
          '& .MuiAutocomplete-option': {
            color: 'var(--foreground)',
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
              onChange(newValue); // Pass string for numeric input
            }
          } else if (newValue && "inputValue" in newValue) {
            // User selected "Add '...'" from dropdown
            setDialogValue(newValue.inputValue);
            setDialogOpen(true);
          } else {
            // User selected an existing option or cleared
            onChange(newValue as ChildTestOption | null);
          }
        }}
        inputValue={currentInputValue} // Controlled input value for display
        onInputChange={(_, newInputValue, reason) => {
          if (reason === "input") {
            setCurrentInputValue(newInputValue);
            // Trigger debounced onChange for direct text input to enable autosave
            debouncedOnChange(newInputValue);
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
                name: t("labResults:resultEntry.addNewOption", {
                  optionName: params.inputValue,
                }),
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
            placeholder={t("labResults:resultEntry.enterOrSelectResult")}
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
              '& .MuiInputLabel-root': {
                color: 'var(--muted-foreground)',
              },
              '& .MuiFormHelperText-root': {
                color: 'var(--muted-foreground)',
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
            {t("labResults:resultEntry.addNewOptionTitle", {
              testName: childTestName,
            })}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="new-option-name"
              label={t("labResults:resultEntry.optionNameLabel")}
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
              {t("common:cancel")}
            </Button>
            <Button
              type="submit"
              size="small"
              disabled={isSavingNewOption}
            >
              {t("common:add")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};
export default React.memo(ChildTestAutocompleteInput);
