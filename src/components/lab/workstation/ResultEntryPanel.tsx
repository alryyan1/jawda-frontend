// src/components/lab/workstation/ResultEntryPanel.tsx
import React, { useEffect, useCallback, useState, useRef } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
// Using a simple debounce implementation to avoid lodash dependency issues
const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// MUI Imports
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import { styled } from "@mui/material/styles";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";

// MUI Table for two-column layout
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form } from "@/components/ui/form";
import {
  Loader2,
  AlertTriangle,
  XCircle,
  Settings2 as SettingsIcon,
} from "lucide-react";

import type { LabRequest } from "@/types/visits";
import type { ChildTestOption } from "@/types/labTests";
import type {
  MainTestWithChildrenResults,
  ResultEntryFormValues,
  ChildTestWithResult,
  ResultEntryItemFormValue,
} from "@/types/labWorkflow";
import {
  getLabRequestForEntry,
  saveLabResults,
} from "@/services/labWorkflowService";

import ChildTestAutocompleteInput from "./ChildTestAutocompleteInput"; // THE PRIMARY INPUT
import MainCommentEditor from "./MainCommentEditor";
import FieldStatusIndicator from "./FieldStatusIndicator";
import type { FieldSaveStatus } from "./FieldStatusIndicator";
import ManageDeviceNormalRangeDialog from "./ManageDeviceNormalRangeDialog";
// OrganismPanel and its imports if using the "Other" tab
// import OrganismPanel from './OrganismPanel';

const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: "40px",
  padding: theme.spacing(0.5, 1.5),
  fontSize: theme.typography.pxToRem(13),
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`result-tabpanel-${index}`}
      aria-labelledby={`result-tab-${index}`}
      style={{ height: "100%", overflowY: "auto" }}
      {...other}
    >
      {value === index && <Box sx={{ py: 1, height: "100%" }}>{children}</Box>}
    </div>
  );
}

interface ResultEntryPanelProps {
  initialLabRequest: LabRequest;
  onResultsSaved: (updatedLabRequest: LabRequest) => void;
  onClosePanel?: () => void;
  onChildTestFocus: (childTest: ChildTestWithResult | null) => void;
}

const ResultEntryPanel: React.FC<ResultEntryPanelProps> = ({
  initialLabRequest,
  onResultsSaved,
  onClosePanel,
  onChildTestFocus,
}) => {
  const { t } = useTranslation(["labResults", "common", "labTests"]);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [fieldSaveStatus, setFieldSaveStatus] = useState<
    Record<string, FieldSaveStatus>
  >({});
  const [isDeviceRangeDialogOpen, setIsDeviceRangeDialogOpen] = useState(false);
  const [childTestForDeviceRange, setChildTestForDeviceRange] =
    useState<ChildTestWithResult | null>(null);

  const {
    data: testDataForEntry,
    isLoading,
    error: fetchError,
  } = useQuery<MainTestWithChildrenResults, Error>({
    queryKey: ["labRequestForEntry", initialLabRequest.id],
    queryFn: () => getLabRequestForEntry(initialLabRequest.id),
    enabled: !!initialLabRequest.id,
  });

  const form = useForm<ResultEntryFormValues>({
    defaultValues: { results: [], main_test_comment: "" },
  });
  const { control, setValue, reset, getValues } = form;

  const debouncedSave = useCallback(
    debounce(
      async (
        fieldName: FieldPath<ResultEntryFormValues>,
        fieldIndex?: number,
        specificValueToSave?: unknown
      ) => {
        const statusKey =
          typeof fieldIndex === "number"
            ? `results.${fieldIndex}.result_value`
            : fieldName; // Simplified statusKey for this iteration
        setFieldSaveStatus((prev) => ({ ...prev, [statusKey]: "saving" }));
        try {
          const currentFullFormData = getValues();
          let payloadForBackend: ResultEntryFormValues;

          if (
            typeof fieldIndex === "number" &&
            specificValueToSave !== undefined &&
            fieldName.startsWith("results.")
          ) {
            const resultsKey = fieldName.substring(
              `results.${fieldIndex}.`.length
            ) as keyof ResultEntryItemFormValue;
            if (
              resultsKey === "result_value" ||
              resultsKey === "result_flags" ||
              resultsKey === "result_comment" ||
              resultsKey === "normal_range_text"
            ) {
              // Only autosave these for now
              const updatedResults = currentFullFormData.results.map(
                (item, idx) => {
                  if (idx === fieldIndex) {
                    return { ...item, [resultsKey]: specificValueToSave };
                  }
                  return item;
                }
              );
              payloadForBackend = {
                ...currentFullFormData,
                results: updatedResults,
              };
            } else {
              // Not an autosavable field within results array, do nothing for now or log
              setFieldSaveStatus((prev) => ({ ...prev, [statusKey]: "idle" }));
              return;
            }
          } else if (fieldName === "main_test_comment") {
            payloadForBackend = {
              ...currentFullFormData,
              main_test_comment: specificValueToSave as string,
            };
          } else {
            payloadForBackend = currentFullFormData; // Fallback
          }

          const processedPayload = {
            ...payloadForBackend,
            results: payloadForBackend.results.map((resItem) => {
              // If result_value is an object (from Autocomplete option), extract its name
              if (
                typeof resItem.result_value === "object" &&
                resItem.result_value !== null
              ) {
                return {
                  ...resItem,
                  result_value: (resItem.result_value as ChildTestOption).name,
                };
              }
              return resItem;
            }),
          };

          const updatedLabRequest = await saveLabResults(
            initialLabRequest.id,
            processedPayload
          );
          onResultsSaved(updatedLabRequest);
          queryClient.invalidateQueries({
            queryKey: ["labRequestForEntry", initialLabRequest.id],
          });
          setFieldSaveStatus((prev) => ({ ...prev, [statusKey]: "success" }));
          setTimeout(
            () =>
              setFieldSaveStatus((prev) => ({ ...prev, [statusKey]: "idle" })),
            2000
          );
        } catch {
          setFieldSaveStatus((prev) => ({ ...prev, [statusKey]: "error" }));
          toast.error(
            t("labResults:resultEntry.fieldSavedError", {
              field: fieldName.split(".").pop(),
            })
          );
          setTimeout(
            () =>
              setFieldSaveStatus((prev) => ({ ...prev, [statusKey]: "idle" })),
            3000
          );
        }
      },
      1500
    ),
    [getValues, initialLabRequest.id, onResultsSaved, queryClient, t] // Removed testDataForEntry to avoid re-creating debounce too often
  );

  useEffect(() => {
    if (testDataForEntry) {
      const formattedResults = testDataForEntry.child_tests_with_results.map(
        (ct) => ({
          child_test_id: ct.id!,
          child_test_name: ct.child_test_name,
          unit_name: ct.unit?.name || ct.unit_name,
          normal_range_text:
            ct.normalRange ||
            (ct.low !== null &&
            ct.low !== undefined &&
            ct.upper !== null &&
            ct.upper !== undefined
              ? `${ct.low} - ${ct.upper}`
              : ""),
          options: ct.options || [], // Crucial for Autocomplete
          // The following flags are informational for the input component, not directly saved unless backend uses them
          is_qualitative_with_options: !!(ct.options && ct.options.length > 0), // Simplified: if options exist, it's qualitative
          is_boolean_result: false, // You'd need more specific logic or a field from backend to determine this accurately for *just* autocomplete
          is_numeric:
            !(ct.options && ct.options.length > 0) &&
            (ct.low !== null ||
              ct.upper !== null ||
              !String(ct.defval || "").match(/[a-zA-Z]/)),

          result_value:
            ct.result_value !== undefined && ct.result_value !== null
              ? ct.result_value
              : ct.defval || null,
          result_flags: ct.result_flags || "",
          result_comment: ct.result_comment || "",
        })
      );

      const processedResults = formattedResults.map((res) => {
        if (
          res.is_qualitative_with_options &&
          typeof res.result_value === "string"
        ) {
          const matchedOption = testDataForEntry.child_tests_with_results
            .find((ct) => ct.id === res.child_test_id)
            ?.options?.find((opt) => opt.name === res.result_value);
          if (matchedOption) return { ...res, result_value: matchedOption };
        }
        return res;
      });

      reset({
        results: processedResults,
        main_test_comment: initialLabRequest.comment || "",
      });
    } else {
      reset({ results: [], main_test_comment: "" });
    }
  }, [testDataForEntry, reset, initialLabRequest.comment]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) =>
    setActiveTab(newValue);

  const handleOpenDeviceRangeDialog = (ct: ChildTestWithResult) => {
    setChildTestForDeviceRange(ct);
    setIsDeviceRangeDialogOpen(true);
  };
  const handleApplyRangeToRHF = (newRange: string, index: number) => {
    const fieldName =
      `results.${index}.normal_range_text` as FieldPath<ResultEntryFormValues>;
    setValue(fieldName, newRange, { shouldDirty: true });
    // Trigger autosave for the normal_range_text field
    debouncedSave(fieldName, index, newRange);
  };

  if (isLoading && !testDataForEntry) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (fetchError) {
    return (
      <div className="p-6 text-destructive text-center">
        <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
        {fetchError.message}
      </div>
    );
  }
  if (!testDataForEntry) {
    return (
      <div className="p-6 text-muted-foreground text-center">
        {t("common:noDataAvailable")}
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col p-3 sm:p-4 bg-slate-50 dark:bg-background shadow-inner">
        <div className="flex justify-between items-center mb-2 pb-2 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">
              {t("labResults:resultEntry.title", {
                testName: testDataForEntry.main_test_name,
              })}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("common:labRequestId")}: {initialLabRequest.id}
            </p>
          </div>
          {onClosePanel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClosePanel}
              className="h-8 w-8"
            >
              <XCircle className="h-5 w-5" />
            </Button>
          )}
        </div>

        <Box
          sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0, mb: 1 }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="Result entry tabs"
            sx={{ minHeight: "40px" }}
          >
            <StyledTab
              label={t("labResults:resultEntry.mainTab")}
              id="result-tab-0"
              aria-controls="result-tabpanel-0"
            />
            <StyledTab
              label={t("labResults:resultEntry.otherTab")}
              id="result-tab-1"
              aria-controls="result-tabpanel-1"
            />
          </Tabs>
        </Box>

        <Form {...form}>
          <form className="flex-grow flex flex-col overflow-hidden">
            <CustomTabPanel value={activeTab} index={0}>
              <ScrollArea className="h-full pr-1">
                {testDataForEntry.child_tests_with_results.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    {t("labResults:resultEntry.noChildTestsForEntry")}
                  </div>
                ) : (
                  <TableContainer
                    component={Paper}
                    sx={{
                      backgroundColor: "transparent",
                      boxShadow: "none",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <Table
                      size="small"
                      aria-label="child test results table"
                      sx={{ "& .MuiTableCell-root": { padding: "4px 8px" } }}
                    >
                      <TableHead sx={{ backgroundColor: "action.hover" }}>
                        <TableRow>
                          <TableCell
                            sx={{ fontWeight: "medium", width: "45%" }}
                          >
                            {t("labResults:resultEntry.childTestName")}
                          </TableCell>
                          <TableCell
                            sx={{ fontWeight: "medium", width: "55%" }}
                          >
                            {t("labResults:resultEntry.result")}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {testDataForEntry.child_tests_with_results.map(
                          (ctResult, index) => {
                            const fieldBaseName = `results.${index}` as const;
                            const currentNormalRangeText = getValues(
                              `${fieldBaseName}.normal_range_text`
                            ) || ""; // Get current RHF value

                            return (
                              <ResultRow
                                key={ctResult.id || `new-${index}`}
                                ctResult={ctResult}
                                index={index}
                                fieldBaseName={fieldBaseName}
                                currentNormalRangeText={currentNormalRangeText}
                                control={control}
                                debouncedSave={debouncedSave}
                                fieldSaveStatus={fieldSaveStatus}
                                onChildTestFocus={onChildTestFocus}
                                handleOpenDeviceRangeDialog={handleOpenDeviceRangeDialog}
                                t={t}
                              />
                            );
                          }
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </ScrollArea>
            </CustomTabPanel>

            <CustomTabPanel value={activeTab} index={1}>
              {/* <OrganismPanel selectedTest={initialLabRequest} ... /> */}
              <Typography sx={{ p: 2, textAlign: "center" }}>
                {t("labResults:resultEntry.otherTabContentPlaceholder")}
              </Typography>
            </CustomTabPanel>

            <div className="mt-3 pt-3 border-t flex-shrink-0">
              <MainCommentEditor
                control={control}
                fieldName="main_test_comment"
                debouncedSave={debouncedSave}
                fieldSaveStatus={fieldSaveStatus["main_test_comment"] || "idle"}
                disabled={isLoading}
              />
            </div>
          </form>
        </Form>
      </div>

      <ManageDeviceNormalRangeDialog
        isOpen={isDeviceRangeDialogOpen}
        onOpenChange={setIsDeviceRangeDialogOpen}
        childTest={childTestForDeviceRange}
        currentResultNormalRange={
          childTestForDeviceRange
            ? getValues(
                `results.${testDataForEntry.child_tests_with_results.findIndex(
                  (ct) => ct.id === childTestForDeviceRange.id
                )}.normal_range_text`
              )
            : ""
        }
        onApplyRangeToResultField={(newRange) => {
          if (childTestForDeviceRange) {
            const idx = testDataForEntry.child_tests_with_results.findIndex(
              (ct) => ct.id === childTestForDeviceRange.id
            );
            if (idx !== -1) handleApplyRangeToRHF(newRange, idx);
          }
        }}
      />
    </>
  );
};

// Separate component for each result row to handle hooks properly
interface ResultRowProps {
  ctResult: ChildTestWithResult;
  index: number;
  fieldBaseName: string;
  currentNormalRangeText: string;
  control: any;
  debouncedSave: (
    fieldName: FieldPath<ResultEntryFormValues>,
    fieldIndex?: number,
    specificValueToSave?: unknown
  ) => void;
  fieldSaveStatus: Record<string, FieldSaveStatus>;
  onChildTestFocus: (childTest: ChildTestWithResult | null) => void;
  handleOpenDeviceRangeDialog: (ct: ChildTestWithResult) => void;
  t: (key: string) => string;
}

const ResultRow: React.FC<ResultRowProps> = ({
  ctResult,
  index,
  fieldBaseName,
  currentNormalRangeText,
  control,
  debouncedSave,
  fieldSaveStatus,
  onChildTestFocus,
  handleOpenDeviceRangeDialog,
  t,
}) => {
  // Watch for autosave on result_value
  const resultValue = useWatch({
    control,
    name: `${fieldBaseName}.result_value`,
  });
  const prevResultValueRef = useRef(resultValue);
  
  useEffect(() => {
    const fieldState = control.getFieldState(`${fieldBaseName}.result_value`);
    if (resultValue !== prevResultValueRef.current && fieldState.isDirty) {
      debouncedSave(`${fieldBaseName}.result_value`, index, resultValue);
    }
    prevResultValueRef.current = resultValue;
  }, [resultValue, control, debouncedSave, fieldBaseName, index]);

  return (
    <TableRow
      sx={{
        "&:last-child td, &:last-child th": {
          border: 0,
        },
      }}
    >
      <TableCell
        component="th"
        scope="row"
        sx={{
          verticalAlign: "top",
          borderBottomColor: "divider",
        }}
      >
        <Typography
          variant="body2"
          component="div"
          sx={{
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {ctResult.child_test_name}
          <FieldStatusIndicator
            status={
              fieldSaveStatus[`${fieldBaseName}.result_value`] || "idle"
            }
            size="medium"
          />
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            mt: 0.25,
          }}
        >
          {currentNormalRangeText || t("common:notSet")}
          {ctResult.unit_name && ` (${ctResult.unit_name})`}
          <Tooltip
            title={String(
              t("labResults:deviceNormalRange.manageDeviceSpecificRanges")
            )}
          >
            <IconButton
              size="small"
              onClick={() => handleOpenDeviceRangeDialog(ctResult)}
              sx={{ p: 0.25, ml: 0.5 }}
            >
              <SettingsIcon style={{ fontSize: "0.8rem" }} />
            </IconButton>
          </Tooltip>
        </Typography>
      </TableCell>
      <TableCell
        sx={{
          verticalAlign: "top",
          borderBottomColor: "divider",
        }}
      >
        <Controller
          name={`${fieldBaseName}.result_value`}
          control={control}
          render={({ field, fieldState: { error } }) => (
            <ChildTestAutocompleteInput
              {...field}
              error={!!error}
              helperText={error?.message}
              childTestId={ctResult.id!}
              childTestName={ctResult.child_test_name}
              parentChildTestModel={ctResult}
              onFocusChange={onChildTestFocus}
            />
          )}
        />
      </TableCell>
    </TableRow>
  );
};

export default ResultEntryPanel;
