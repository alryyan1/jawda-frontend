// src/components/lab/workstation/ResultEntryPanel.tsx
import React, { useEffect, useCallback, useState, useRef } from "react";
import {
  useForm,
  Controller,
  useWatch,
  type Path,
} from "react-hook-form";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { debounce } from "lodash";

// MUI Imports
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import { styled } from "@mui/material/styles";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Form } from "@/components/ui/form";

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
import { type FieldSaveStatus } from "./FieldStatusIndicator";

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
  onChildTestFocus: (childTest: ChildTestWithResult | null) => void;
  patientAuthDate?: boolean | null;
  }

const ResultEntryPanel: React.FC<ResultEntryPanelProps> = ({
  initialLabRequest,
  onResultsSaved,
  onChildTestFocus,
  patientAuthDate,
}) => {
  // استخدام نص عربي مباشر بدلاً من i18n
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [fieldSaveStatus, setFieldSaveStatus] = useState<
    Record<string, FieldSaveStatus>
  >({});
  
  // Ref to track the first input field for auto-focus
  const firstInputRef = useRef<HTMLInputElement | null>(null);

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
      toast.success("تم حفظ الحقل بنجاح");

      // Don't invalidate queries immediately - the data is already updated
      // Just call the callback to notify parent components
      onResultsSaved(initialLabRequest);

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
      toast.error("فشل حفظ الحقل", {
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

  const immediateSaveField = useCallback(
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
    [saveSingleResultMutation]
  );

  // --- Main Comment Autosave ---
  // const debouncedSaveMainComment = useCallback(
  //   debounce(async (commentValue: string) => {
  //     setFieldSaveStatus((prev) => ({
  //       ...prev,
  //       ["main_test_comment"]: "saving",
  //     }));
  //     try {
  //       const currentFormData = getValues();
  //       const payloadForBackend = {
  //         ...currentFormData,
  //         main_test_comment: commentValue,
  //       };

  //       const processedPayload = {
  //         ...payloadForBackend,
  //         results: payloadForBackend.results.map((resItem, idx) => {
  //           const originalChildTest =
  //             testDataForEntry?.child_tests_with_results[idx];
  //           if (resItem.is_boolean_result && originalChildTest?.options) {
  //             const selectedOptionName =
  //               Boolean(resItem.result_value) === true
  //                 ? originalChildTest.options.find((o) =>
  //                     o.name.match(/positive|present|yes|true/i)
  //                   )?.name || "Positive"
  //                 : originalChildTest.options.find((o) =>
  //                     o.name.match(/negative|absent|no|false/i)
  //                   )?.name || "Negative";
  //             return { ...resItem, result_value: selectedOptionName };
  //           }
  //           if (
  //             resItem.is_qualitative_with_options &&
  //             typeof resItem.result_value === "object" &&
  //             resItem.result_value !== null
  //           ) {
  //             return {
  //               ...resItem,
  //               result_value: (resItem.result_value as ChildTestOption).name,
  //             };
  //           }
  //           return resItem;
  //         }),
  //       };

  //       const updatedLabRequest = await saveLabResults(
  //         initialLabRequest.id,
  //         processedPayload
  //       );
  //       onResultsSaved(updatedLabRequest);
  //       // Don't invalidate queries - data is already updated
  //       setFieldSaveStatus((prev) => ({
  //         ...prev,
  //         ["main_test_comment"]: "success",
  //       }));
  //       setTimeout(
  //         () =>
  //           setFieldSaveStatus((prev) => ({
  //             ...prev,
  //             ["main_test_comment"]: "idle",
  //           })),
  //         2000
  //       );
  //     } catch {
  //       setFieldSaveStatus((prev) => ({
  //         ...prev,
  //         ["main_test_comment"]: "error",
  //       }));
  //       toast.error("فشل حفظ الحقل: تعليق الفحص الرئيسي");
  //       setTimeout(
  //         () =>
  //           setFieldSaveStatus((prev) => ({
  //             ...prev,
  //             ["main_test_comment"]: "idle",
  //           })),
  //         3000
  //       );
  //     }
  //   }, 1500),
  //   [
  //     getValues,
  //     initialLabRequest.id,
  //     onResultsSaved,
  //     queryClient,
  //     testDataForEntry,
  //   ]
  // );

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

  // Auto-focus the first input field when data is loaded
  useEffect(() => {
    if (testDataForEntry && testDataForEntry.child_tests_with_results.length > 0) {
      // Use a small delay to ensure the DOM is fully rendered
      const timer = setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [testDataForEntry]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) =>
    setActiveTab(newValue);


  // Generate field names for consistent access
  const getFieldNames = (index: number) => ({
    resultValueField: `results.${index}.result_value` as Path<ResultEntryFormValues>,
    normalRangeTextField: `results.${index}.normal_range_text` as Path<ResultEntryFormValues>,
  });

  // Watch all form values for immediate autosave
  const watchedValues = useWatch({ control });
  const prevWatchedValuesRef = useRef(watchedValues);

  useEffect(() => {
    if (!testDataForEntry) return;
    
    const currentValues = watchedValues as ResultEntryFormValues;
    const prevValues = prevWatchedValuesRef.current as ResultEntryFormValues;
    
    // Check each result field for changes
    currentValues.results?.forEach((currentResult, index) => {
      const prevResult = prevValues.results?.[index];
      const childTest = testDataForEntry.child_tests_with_results[index];
      
      if (!prevResult || !childTest?.id) return;
      
      // Check result_value changes
      if (currentResult.result_value !== prevResult.result_value) {
        const fieldName = `results.${index}.result_value`;
        const fieldState = control.getFieldState(fieldName as Path<ResultEntryFormValues>);
        
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
          
          immediateSaveField(
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
          immediateSaveField(
            initialLabRequest.id,
            childTest.id,
            fieldName,
            { normal_range_text: currentResult.normal_range_text }
          );
        }
      }
    });

    prevWatchedValuesRef.current = watchedValues;
  }, [watchedValues, testDataForEntry, control, immediateSaveField, initialLabRequest.id]);

  if (isLoading && !testDataForEntry) {
    return <div>جارٍ التحميل...</div>;
  }
  if (fetchError) {
    return <div>حدث خطأ أثناء تحميل البيانات</div>;
  }
  if (!testDataForEntry) {
    return <div>لا توجد بيانات متاحة</div>;
  }

  return (
    <>
      <div className="h-full flex flex-col p-3 sm:p-4 bg-slate-50 dark:bg-background shadow-inner">
     
    

        <Form {...form}>
          <form className="flex-grow flex flex-col overflow-hidden">
            <CustomTabPanel value={activeTab} index={0}>
              <ScrollArea className="h-[calc(100vh-200px)] pr-1">
                {testDataForEntry.child_tests_with_results.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    لا توجد فحوصات فرعية لإدخال النتائج
                  </div>
                ) : (
                  <TableContainer
                    component={Paper}
                    sx={{
                      backgroundColor: "var(--background)",
                      boxShadow: "none",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <Table
                      size="small"
                      aria-label="child test results table"
                      sx={{ 
                        "& .MuiTableCell-root": { 
                          padding: "2px 4px",
                          backgroundColor: "var(--background)",
                          color: "var(--foreground)",
                          borderBottomColor: "var(--border)",
                          // fontSize: "0.75rem",
                          lineHeight: 1.2,
                        }
                      }}
                    >
                      <TableHead sx={{ 
                        backgroundColor: "var(--muted)",
                        "& .MuiTableCell-root": {
                          backgroundColor: "var(--muted)",
                          color: "var(--foreground)",
                          padding: "2px 4px",
                          // fontSize: "0.7rem",
                          fontWeight: "medium",
                        }
                      }}>
                        <TableRow>
                          <TableCell
                            sx={{
                              fontWeight: "medium",
                              width: "30%",
                              borderBottomColor: "var(--border)",
                              backgroundColor: "var(--muted)",
                              color: "var(--foreground)",
                              padding: "2px 4px",
                              // fontSize: "0.7rem",
                            }}
                          >
                             Test 
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: "medium",
                              width: "55%",
                              borderBottomColor: "var(--border)",
                              backgroundColor: "var(--muted)",
                              color: "var(--foreground)",
                              textAlign: "center",
                              padding: "2px 4px",
                              // fontSize: "0.7rem",
                            }}
                          >
                            Result 
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {testDataForEntry.child_tests_with_results
                          .sort((a, b) => {
                            // First sort by test_order
                            const orderA = Number(a.test_order) || 0;
                            const orderB = Number(b.test_order) || 0;
                            if (orderA !== orderB) {
                              return orderA - orderB;
                            }
                            // If test_order is the same, sort by id
                            return Number(a.id || 0) - Number(b.id || 0);
                          })
                          .map(
                          (ctResult, index) => {
                            const { resultValueField, normalRangeTextField } = getFieldNames(index);
                            const isFirstInput = index === 0;

                            return (
                              <TableRow
                                key={ctResult.id || `new-${index}`}
                                sx={{
                                  "&:last-child td, &:last-child th": {
                                    border: 0,
                                  },
                                  "&:hover": {
                                    backgroundColor: "var(--muted)",
                                  },
                                  backgroundColor: "var(--background)",
                                }}
                              >
                                <TableCell
                                  component="th"
                                  scope="row"
                                  sx={{
                                    borderBottomColor: "var(--border)",
                                    backgroundColor: "var(--background)",
                                    color: "var(--foreground)",
                                    padding: "2px 4px",
                                    // fontSize: "0.75rem",
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    component="div"
                                    sx={{
                                      fontWeight: 500,
                                      fontSize: "0.75rem",
                                      lineHeight: 1.2,
                                      color: "var(--foreground)",
                                    }}
                                  >
                                    {ctResult.child_test_name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    component="div"
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      mt: 0.1,
                                      color: "var(--muted-foreground)",
                                      // fontSize: "0.65rem",
                                      lineHeight: 1.1,
                                    }}
                                  >
                                  
                                  </Typography>
                                </TableCell>
                                <TableCell
                                  sx={{
                                    borderBottomColor: "var(--border)",
                                    backgroundColor: "var(--background)",
                                    color: "var(--foreground)",
                                    padding: "2px 4px",
                                    // fontSize: "0.75rem",
                                  }}
                                >
                                  <Controller
                                    name={resultValueField}
                                    control={control}
                                    render={({
                                      field,
                                      fieldState: { error },
                                    }) =>
                                      
                                        <div style={{ fontSize: "0.75rem" }}>
                                          <ChildTestAutocompleteInput
                                            key={`${ctResult.id}-${ctResult.result_id}`}
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
                                            inputRef={isFirstInput ? firstInputRef : undefined}
                                            patientAuthDate={patientAuthDate}
                                          />
                                        </div>
                                      
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

           
          </form>
        </Form>
      </div>

    </>
  );
};

export default ResultEntryPanel;
