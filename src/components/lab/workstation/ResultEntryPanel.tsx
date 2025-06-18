// src/components/lab/workstation/ResultEntryPanel.tsx
import React, { useEffect, useCallback, useState, useRef } from "react";
import {
  useForm,
  Controller,
  useWatch,
  type FieldPath,
  type Path,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { debounce } from "lodash";

// MUI Imports
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import { styled } from "@mui/material/styles";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
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
  XCircle,
  Settings2 as SettingsIcon,
} from "lucide-react";

import type { LabRequest } from "@/types/visits";
import type { ChildTestOption } from "@/types/labTests";
import type {
  MainTestWithChildrenResults,
  ResultEntryFormValues,
  ChildTestWithResult,
} from "@/types/labWorkflow";
import {
  getLabRequestForEntry,
  saveSingleChildTestResult,
  saveLabResults,
  type SingleResultSavePayload,
} from "@/services/labWorkflowService";

import ChildTestAutocompleteInput from "./ChildTestAutocompleteInput";
import MainCommentEditor from "./MainCommentEditor";
import FieldStatusIndicator, { type FieldSaveStatus } from "./FieldStatusIndicator";
import ManageDeviceNormalRangeDialog from "./ManageDeviceNormalRangeDialog";

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
  const {
    control,
    setValue,
    reset,
    getValues,
  } = form;

  // --- Individual Result Save Mutation ---
  const saveSingleResultMutation = useMutation({
    mutationFn: (params: {
      labRequestId: number;
      childTestId: number;
      payload: SingleResultSavePayload;
      fieldNameKey: string;
    }) =>
      saveSingleChildTestResult(
        params.labRequestId,
        params.childTestId,
        params.payload
      ),
    onSuccess: (updatedResultData, variables) => {
      if (!updatedResultData) return;
      setFieldSaveStatus((prev) => ({
        ...prev,
        [variables.fieldNameKey]: "success",
      }));
      toast.success(t("labResults:resultEntry.fieldSavedSuccessShort"));

      queryClient
        .invalidateQueries({
          queryKey: ["labRequestForEntry", initialLabRequest.id],
        })
        .then(() => {
          const updatedLabRequestData =
            queryClient.getQueryData<MainTestWithChildrenResults>([
              "labRequestForEntry",
              initialLabRequest.id,
            ]);
          if (updatedLabRequestData) {
            onResultsSaved(initialLabRequest);
          }
        });

      setTimeout(
        () =>
          setFieldSaveStatus((prev) => ({
            ...prev,
            [variables.fieldNameKey]: "idle",
          })),
        2000
      );
    },
    onError: (error: Error, variables) => {
      setFieldSaveStatus((prev) => ({
        ...prev,
        [variables.fieldNameKey]: "error",
      }));
      toast.error(t("labResults:resultEntry.fieldSavedErrorShort"), {
        description: error?.message,
      });
      setTimeout(
        () =>
          setFieldSaveStatus((prev) => ({
            ...prev,
            [variables.fieldNameKey]: "idle",
          })),
        3000
      );
    },
  });

  const debouncedSaveField = useCallback(
    debounce(
      (
        labRequestId: number,
        childTestId: number,
        fieldNameKey: string,
        payload: SingleResultSavePayload
      ) => {
        setFieldSaveStatus((prev) => ({ ...prev, [fieldNameKey]: "saving" }));
        saveSingleResultMutation.mutate({
          labRequestId,
          childTestId,
          payload,
          fieldNameKey,
        });
      },
      1500
    ),
    [saveSingleResultMutation]
  );

  // --- Main Comment Autosave ---
  const debouncedSaveMainComment = useCallback(
    debounce(async (commentValue: string) => {
      setFieldSaveStatus((prev) => ({
        ...prev,
        ["main_test_comment"]: "saving",
      }));
      try {
        const currentFormData = getValues();
        const payloadForBackend = {
          ...currentFormData,
          main_test_comment: commentValue,
        };

        const processedPayload = {
          ...payloadForBackend,
          results: payloadForBackend.results.map((resItem, idx) => {
            const originalChildTest =
              testDataForEntry?.child_tests_with_results[idx];
            if (resItem.is_boolean_result && originalChildTest?.options) {
              const selectedOptionName =
                Boolean(resItem.result_value) === true
                  ? originalChildTest.options.find((o) =>
                      o.name.match(/positive|present|yes|true/i)
                    )?.name || "Positive"
                  : originalChildTest.options.find((o) =>
                      o.name.match(/negative|absent|no|false/i)
                    )?.name || "Negative";
              return { ...resItem, result_value: selectedOptionName };
            }
            if (
              resItem.is_qualitative_with_options &&
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
        setFieldSaveStatus((prev) => ({
          ...prev,
          ["main_test_comment"]: "success",
        }));
        setTimeout(
          () =>
            setFieldSaveStatus((prev) => ({
              ...prev,
              ["main_test_comment"]: "idle",
            })),
          2000
        );
      } catch {
        setFieldSaveStatus((prev) => ({
          ...prev,
          ["main_test_comment"]: "error",
        }));
        toast.error(
          t("labResults:resultEntry.fieldSavedError", {
            field: t("labResults:resultEntry.mainTestComment"),
          })
        );
        setTimeout(
          () =>
            setFieldSaveStatus((prev) => ({
              ...prev,
              ["main_test_comment"]: "idle",
            })),
          3000
        );
      }
    }, 1500),
    [
      getValues,
      initialLabRequest.id,
      onResultsSaved,
      queryClient,
      t,
      testDataForEntry,
    ]
  );

  useEffect(() => {
    if (testDataForEntry) {
      const formattedResults = testDataForEntry.child_tests_with_results.map(
        (ct) => {
          const hasOptions = ct.options && ct.options.length > 0;
          const isBooleanResult =
            hasOptions &&
            ct.options!.length === 2 &&
            ct.options!.every((opt) =>
              /^(positive|negative|present|absent|yes|no|true|false)$/i.test(
                opt.name
              )
            );

          let initialResultValue: string | ChildTestOption | null | boolean =
            ct.result_value !== undefined && ct.result_value !== null
              ? ct.result_value
              : ct.defval || null;

          if (isBooleanResult && typeof initialResultValue === "string") {
            const positiveOption = ct.options
              ?.find((o) => o.name.match(/positive|present|yes|true/i))
              ?.name.toLowerCase();
            initialResultValue =
              initialResultValue.toLowerCase() === "true" ||
              initialResultValue.toLowerCase() === positiveOption;
          } else if (
            hasOptions &&
            typeof initialResultValue === "string" &&
            initialResultValue.trim() !== ""
          ) {
            const matchedOption = ct.options?.find(
              (opt) => opt.name === initialResultValue
            );
            if (matchedOption) initialResultValue = matchedOption;
          }

          return {
            child_test_id: ct.id!,
            child_test_name: ct.child_test_name,
            unit_name: ct.unit?.name || ct.unit_name,
            normal_range_text: ct.normalRange || "N/A",
            options: ct.options || [],
            is_qualitative_with_options: hasOptions && !isBooleanResult,
            is_boolean_result: isBooleanResult,
            is_numeric:
              !hasOptions &&
              (ct.low !== null ||
                ct.upper !== null ||
                !String(ct.defval || "").match(/[a-zA-Z]/)),
            result_value: initialResultValue as string | ChildTestOption | null,
            result_flags: "",
            result_comment: "",
          };
        }
      );
      reset({
        results: formattedResults,
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
    if (testDataForEntry) {
      debouncedSaveField(
        initialLabRequest.id,
        testDataForEntry.child_tests_with_results[index].id!,
        fieldName,
        { normal_range_text: newRange }
      );
    }
  };

  // Generate field names for consistent access
  const getFieldNames = (index: number) => ({
    resultValueField: `results.${index}.result_value` as Path<ResultEntryFormValues>,
    normalRangeTextField: `results.${index}.normal_range_text` as Path<ResultEntryFormValues>,
  });

  // Watch all form values for autosave
  const watchedValues = useWatch({ control });
  const prevWatchedValuesRef = useRef(watchedValues);

  useEffect(() => {
    if (!testDataForEntry) return;
    // alert('save')
    // console.log('save')
    const currentValues = watchedValues as ResultEntryFormValues;
    const prevValues = prevWatchedValuesRef.current as ResultEntryFormValues;
    // console.log(currentValues,'currentValues',prevValues,'prevValues')
    // Check each result field for changes
    currentValues.results?.forEach((currentResult, index) => {
      const prevResult = prevValues.results?.[index];
      const childTest = testDataForEntry.child_tests_with_results[index];
      // console.log(prevResult,'prevResult',currentResult,'currentResult',childTest,'childTest')
      if (!prevResult || !childTest?.id) return;
      // console.log(currentResult.result_value,'currentResult.result_value',prevResult.result_value,'prevResult.result_value')
      // Check result_value changes
      if (currentResult.result_value !== prevResult.result_value) {
        const fieldName = `results.${index}.result_value`;
        const fieldState = control.getFieldState(fieldName as Path<ResultEntryFormValues>);
        // console.log(fieldState,'fieldState',fieldName,'fieldName')
        if (fieldState.isDirty) {
          // Convert result_value to string format for API
          let apiValue: string | null = null;
          if (typeof currentResult.result_value === "string") {
            apiValue = currentResult.result_value;
          } else if (typeof currentResult.result_value === "object" && currentResult.result_value !== null) {
            apiValue = (currentResult.result_value as ChildTestOption).name;
          } else if (typeof currentResult.result_value === "boolean") {
            apiValue = currentResult.result_value ? "true" : "false";
          }
          
          debouncedSaveField(
            initialLabRequest.id,
            childTest.id,
            fieldName,
            { result_value: apiValue }
          );
        }
      }

      // Check normal_range_text changes
      if (currentResult.normal_range_text !== prevResult.normal_range_text) {
        const fieldName = `results.${index}.normal_range_text`;
        const fieldState = control.getFieldState(fieldName as Path<ResultEntryFormValues>);
        if (fieldState.isDirty) {
          debouncedSaveField(
            initialLabRequest.id,
            childTest.id,
            fieldName,
            { normal_range_text: currentResult.normal_range_text }
          );
        }
      }
    });

    prevWatchedValuesRef.current = watchedValues;
  }, [watchedValues, testDataForEntry, control, debouncedSaveField, initialLabRequest.id]);

  if (isLoading && !testDataForEntry) {
    return <div>Loading...</div>;
  }
  if (fetchError) {
    return <div>Error loading data</div>;
  }
  if (!testDataForEntry) {
    return <div>No data available</div>;
  }

  return (
    <>
      <div className="h-full flex flex-col p-3 sm:p-4 bg-slate-50 dark:bg-background shadow-inner">
        {/* Header and Tabs */}
        <div className="flex justify-between items-center mb-2 pb-2 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">
              {t("labResults:resultEntry.title", {
                testName: testDataForEntry?.main_test_name,
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
                      sx={{ "& .MuiTableCell-root": { padding: "6px 8px" } }}
                    >
                      <TableHead sx={{ backgroundColor: "action.hover" }}>
                        <TableRow>
                          <TableCell
                            sx={{
                              fontWeight: "medium",
                              width: "45%",
                              borderBottomColor: "divider",
                            }}
                          >
                            {t("labResults:resultEntry.childTestName")}
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: "medium",
                              width: "55%",
                              borderBottomColor: "divider",
                            }}
                          >
                            {t("labResults:resultEntry.result")}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {testDataForEntry.child_tests_with_results.map(
                          (ctResult, index) => {
                            const { resultValueField, normalRangeTextField } = getFieldNames(index);

                            return (
                              <TableRow
                                key={ctResult.id || `new-${index}`}
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
                                        fieldSaveStatus[resultValueField] ||
                                        "idle"
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
                                    {String(getValues(normalRangeTextField) ||
                                      ctResult.normalRange ||
                                      t("common:notSet"))}
                                    {ctResult.unit_name &&
                                      ` (${ctResult.unit_name})`}
                                    <Tooltip
                                      title={String(
                                        t(
                                          "labResults:deviceNormalRange.manageDeviceSpecificRanges"
                                        )
                                      )}
                                    >
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          handleOpenDeviceRangeDialog(ctResult)
                                        }
                                        sx={{ p: 0.25, ml: 0.5 }}
                                      >
                                        <SettingsIcon
                                          style={{ fontSize: "0.8rem" }}
                                        />
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
                                    name={resultValueField}
                                    control={control}
                                    render={({
                                      field,
                                      fieldState: { error },
                                    }) =>
                                      
                                        <ChildTestAutocompleteInput
                                          value={field.value as string | ChildTestOption | null}
                                          onChange={field.onChange}
                                          onBlur={field.onBlur}
                                          error={!!error}
                                          helperText={error?.message}
                                          childTestId={ctResult.id!}
                                          childTestName={
                                            ctResult.child_test_name
                                          }
                                          parentChildTestModel={ctResult}
                                          onFocusChange={onChildTestFocus}
                                        />
                                      
                                    }
                                  />
                                </TableCell>
                              </TableRow>
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
              {/* Other Tab */}
            </CustomTabPanel>

            <div className="mt-3 pt-3 border-t flex-shrink-0">
              <MainCommentEditor
                control={control}
                fieldName="main_test_comment"
                debouncedSave={debouncedSaveMainComment}
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
          childTestForDeviceRange && testDataForEntry
            ? getValues(
                `results.${testDataForEntry.child_tests_with_results.findIndex(
                  (ct) => ct.id === childTestForDeviceRange.id
                )}.normal_range_text`
              )
            : ""
        }
        onApplyRangeToResultField={(newRange) => {
          if (childTestForDeviceRange && testDataForEntry) {
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

export default ResultEntryPanel;
