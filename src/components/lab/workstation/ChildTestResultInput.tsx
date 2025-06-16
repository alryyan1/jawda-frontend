// src/components/lab/workstation/ChildTestResultInput.tsx
import React, { useEffect, useRef, useState } from "react"; // Added useState
import { Controller, useWatch } from "react-hook-form";
import type { FieldPath, Control } from "react-hook-form"; // Type-only imports
import { useTranslation } from "react-i18next";

// MUI Imports
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton"; // For settings icon
import Tooltip from "@mui/material/Tooltip";

import { FormLabel, FormMessage } from "@/components/ui/form"; // shadcn FormLabel
import ChildTestAutocompleteInput from "./ChildTestAutocompleteInput";
import FieldStatusIndicator from "./FieldStatusIndicator";
import type { FieldSaveStatus } from "./FieldStatusIndicator"; // Type-only import
import ManageDeviceNormalRangeDialog from "./ManageDeviceNormalRangeDialog"; // Import dialog

import type {
  ResultEntryFormValues,
  ChildTestWithResult,
} from "@/types/labWorkflow";
import { Settings2 as SettingsIcon } from "lucide-react"; // Icon for managing range

interface ChildTestResultInputProps {
  control: Control<ResultEntryFormValues>; // Explicitly type RHF Control
  index: number;
  childTestModelData: ChildTestWithResult;
  debouncedSave: (
    fieldName: FieldPath<ResultEntryFormValues>,
    fieldIndex?: number,
    specificValueToSave?: unknown
  ) => void;
  fieldSaveStatus: Record<string, FieldSaveStatus>;
  onChildTestFocus: (childTest: ChildTestWithResult | null) => void;
  setParentFormValue: (
    name: FieldPath<ResultEntryFormValues>,
    value: unknown,
    options?: {
      shouldValidate?: boolean;
      shouldDirty?: boolean;
      shouldTouch?: boolean;
    }
  ) => void;
}

const ChildTestResultInput: React.FC<ChildTestResultInputProps> = ({
  control,
  index,
  childTestModelData,
  debouncedSave,
  fieldSaveStatus,
  onChildTestFocus,
  setParentFormValue,
}) => {
  const { t } = useTranslation(["labResults", "common"]);
  const fieldBaseName = `results.${index}` as const;
  const [isDeviceRangeDialogOpen, setIsDeviceRangeDialogOpen] = useState(false);

  const resultValue = useWatch({
    control,
    name: `${fieldBaseName}.result_value`,
  });
  const resultFlags = useWatch({
    control,
    name: `${fieldBaseName}.result_flags`,
  });
  const resultComment = useWatch({
    control,
    name: `${fieldBaseName}.result_comment`,
  });
  const currentNormalRangeText = useWatch({
    control,
    name: `${fieldBaseName}.normal_range_text`,
  });

  const isQualitativeFromForm = useWatch({
    control,
    name: `${fieldBaseName}.is_qualitative_with_options`,
  });
  const isBooleanFromForm = useWatch({
    control,
    name: `${fieldBaseName}.is_boolean_result`,
  });
  const isNumericFromForm = useWatch({
    control,
    name: `${fieldBaseName}.is_numeric`,
  });

  const isQualitative = isQualitativeFromForm;
  const isBooleanType = isBooleanFromForm;
  const isNumericType = isNumericFromForm;

  const prevResultValueRef = useRef(resultValue);
  useEffect(() => {
    const fieldState = control.getFieldState(`${fieldBaseName}.result_value`);
    if (resultValue !== prevResultValueRef.current && fieldState.isDirty) {
      debouncedSave(`${fieldBaseName}.result_value`, index, resultValue);
    }
    prevResultValueRef.current = resultValue;
  }, [resultValue, control, debouncedSave, fieldBaseName, index]);

  const prevFlagsRef = useRef(resultFlags);
  useEffect(() => {
    const fieldState = control.getFieldState(`${fieldBaseName}.result_flags`);
    if (resultFlags !== prevFlagsRef.current && fieldState.isDirty) {
      debouncedSave(`${fieldBaseName}.result_flags`, index, resultFlags);
    }
    prevFlagsRef.current = resultFlags;
  }, [resultFlags, control, debouncedSave, fieldBaseName, index]);

  const prevCommentRef = useRef(resultComment);
  useEffect(() => {
    const fieldState = control.getFieldState(`${fieldBaseName}.result_comment`);
    if (resultComment !== prevCommentRef.current && fieldState.isDirty) {
      debouncedSave(`${fieldBaseName}.result_comment`, index, resultComment);
    }
    prevCommentRef.current = resultComment;
  }, [resultComment, control, debouncedSave, fieldBaseName, index]);

  const handleApplyRangeToFormField = (newRange: string) => {
    setParentFormValue(`${fieldBaseName}.normal_range_text`, newRange, {
      shouldDirty: true,
    });
    // Autosave for normal_range_text will be handled by its own useWatch + useEffect if added
    // For now, it just updates the form state. The parent's saveLabResults will pick it up.
  };

  return (
    <>
      <Card
        variant="outlined"
        sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 0.5,
          }}
        >
          <FormLabel className="text-xs font-medium text-foreground">
            {childTestModelData.child_test_name}
            {childTestModelData.unit_name && (
              <span className="text-muted-foreground text-[10px]">
                {" "}
                ({childTestModelData.unit_name})
              </span>
            )}
          </FormLabel>
          <FieldStatusIndicator
            status={
              fieldSaveStatus[`${fieldBaseName}.result_value`] ||
              fieldSaveStatus[`${fieldBaseName}.result_flags`] ||
              fieldSaveStatus[`${fieldBaseName}.result_comment`] ||
              "idle"
            }
          />
        </Box>

        <Controller
          name={`${fieldBaseName}.result_value`}
          control={control}
          defaultValue={
            childTestModelData.result_value ?? childTestModelData.defval ?? null
          }
          render={({ field, fieldState: { error } }) => (
            <>
              {isQualitative ? (
                <ChildTestAutocompleteInput
                  {...field} // Pass RHF field props
                  error={!!error}
                  helperText={error?.message}
                  childTestId={childTestModelData.id!}
                  initialOptions={childTestModelData.options}
                  parentChildTest={childTestModelData}
                  onFocusChange={onChildTestFocus}
                />
              ) : isBooleanType ? (
                <FormGroup sx={{ alignItems: "flex-start" }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        onFocus={() => onChildTestFocus(childTestModelData)}
                        onBlur={() => {
                          field.onBlur();
                          onChildTestFocus(null);
                        }}
                        size="small"
                        disabled={field.disabled}
                      />
                    }
                    label={
                      field.value
                        ? childTestModelData.options?.find((o) =>
                            o.name.match(/positive|present|yes|true/i)
                          )?.name || t("common:positiveShort")
                        : childTestModelData.options?.find((o) =>
                            o.name.match(/negative|absent|no|false/i)
                          )?.name || t("common:negativeShort")
                    }
                    labelPlacement="end"
                    sx={{
                      mr: 0,
                      "& .MuiTypography-root": { fontSize: "0.875rem" },
                    }}
                  />
                  {error && (
                    <FormMessage className="text-xs">
                      {error.message}
                    </FormMessage>
                  )}
                </FormGroup>
              ) : (
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  type={isNumericType ? "number" : "text"}
                  inputProps={isNumericType ? { step: "any" } : {}}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  onFocus={() => onChildTestFocus(childTestModelData)}
                  onBlur={() => {
                    field.onBlur();
                    onChildTestFocus(null);
                  }}
                  error={!!error}
                  helperText={error?.message}
                  disabled={field.disabled}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      fontSize: "0.875rem",
                      backgroundColor: "var(--background)",
                      borderRadius: "var(--radius)",
                    },
                  }}
                />
              )}
            </>
          )}
        />

        <Box sx={{ mt: 0.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            {t("labResults:resultEntry.normalRange")}:{" "}
            {currentNormalRangeText ||
              childTestModelData.normalRange ||
              t("common:notSet")}
            <Tooltip
              title={String(
                t("labResults:deviceNormalRange.manageDeviceSpecificRanges")
              )}
            >
              <IconButton
                size="small"
                onClick={() => setIsDeviceRangeDialogOpen(true)}
                sx={{ p: 0.25 }}
              >
                <SettingsIcon style={{ fontSize: "0.8rem" }} />
              </IconButton>
            </Tooltip>
          </Typography>
        </Box>

        <Box
          sx={{ display: "flex", gap: 1, mt: 0.5, alignItems: "flex-start" }}
        >
          <Controller
            name={`${fieldBaseName}.result_flags`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value || ""}
                label={t("labResults:resultEntry.flagsShort")}
                variant="outlined"
                size="small"
                sx={{
                  width: "80px",
                  "& .MuiOutlinedInput-root": {
                    fontSize: "0.75rem",
                    backgroundColor: "var(--background)",
                  },
                }}
              />
            )}
          />
          <Controller
            name={`${fieldBaseName}.result_comment`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value || ""}
                label={t("labResults:resultEntry.commentShort")}
                variant="outlined"
                size="small"
                multiline
                maxRows={2}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: "0.75rem",
                    backgroundColor: "var(--background)",
                  },
                }}
              />
            )}
          />
        </Box>
      </Card>

      {childTestModelData && (
        <ManageDeviceNormalRangeDialog
          isOpen={isDeviceRangeDialogOpen}
          onOpenChange={setIsDeviceRangeDialogOpen}
          childTest={childTestModelData}
          currentResultNormalRange={currentNormalRangeText} // This is results[index].normal_range_text
          onApplyRangeToResultField={handleApplyRangeToFormField}
        />
      )}
    </>
  );
};
export default React.memo(ChildTestResultInput);
