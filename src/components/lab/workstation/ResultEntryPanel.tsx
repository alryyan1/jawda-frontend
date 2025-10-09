// src/components/lab/workstation/ResultEntryPanel.tsx
import React, { useEffect, useCallback, useState, useRef } from "react";
import {
  useForm,
  Controller,
  type Path,
} from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { debounce } from "lodash";

// MUI Imports
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import type { LabRequest } from "@/types/visits";
import type { ChildTestOption } from "@/types/labTests";
import type {
  MainTestWithChildrenResults,
  ResultEntryFormValues,
  ChildTestWithResult,
  PatientLabQueueItem,
} from "@/types/labWorkflow";
import {
  getLabRequestForEntry,
  updateNormalRange,
  updateLabRequestComment,
} from "@/services/labWorkflowService";

import ChildTestAutocompleteInput from "./ChildTestAutocompleteInput";


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
  visitId?: number; // Visit ID for queue invalidation
  onItemUpdated?: (updatedItem: PatientLabQueueItem) => void; // Callback to update the item in parent
  }

const ResultEntryPanel: React.FC<ResultEntryPanelProps> = ({
  initialLabRequest,
  onResultsSaved,
  onChildTestFocus,
  patientAuthDate,
  visitId,
  onItemUpdated,
}) => {
  // استخدام نص عربي مباشر بدلاً من i18n
  const [activeTab] = useState(0);
  const [activeGroupTab, setActiveGroupTab] = useState(0); // For special test group tabs
  const [selectedChildTestIndex, setSelectedChildTestIndex] = useState<number | null>(null);
  const [normalRangeInput, setNormalRangeInput] = useState<string>("");
  const [isSavingNormalRange, setIsSavingNormalRange] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentInput, setCommentInput] = useState<string>("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  
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

  // Get unique child groups for special tests
  const childGroups = React.useMemo(() => {
    if (!testDataForEntry?.is_special_test || !testDataForEntry?.child_tests_with_results) {
      return [];
    }
    // console.log(testDataForEntry.child_tests_with_results,'testDataForEntry.child_tests_with_results');
    const groups = testDataForEntry.child_tests_with_results
      .filter(ct => ct.child_group_name) // Only include tests with group names
      .reduce((acc, ct) => {
        const groupName = ct.child_group_name!;
        if (!acc.find(g => g.name === groupName)) {
          acc.push({
            name: groupName,
            id: ct.child_group_id || 0,
          });
        }
        return acc;
      }, [] as Array<{ name: string; id: number }>);
    
    // Sort groups by the order they appear in the child tests
    return groups.sort((a, b) => {
      const aIndex = testDataForEntry.child_tests_with_results.findIndex(ct => ct.child_group_name === a.name);
      const bIndex = testDataForEntry.child_tests_with_results.findIndex(ct => ct.child_group_name === b.name);
      return aIndex - bIndex;
    });
  }, [testDataForEntry]);

  // Filter child tests by active group tab for special tests
  const { filteredChildTests, filteredToOriginalIndexMap } = React.useMemo(() => {
    if (!testDataForEntry?.is_special_test || childGroups.length === 0) {
      const allTests = testDataForEntry?.child_tests_with_results || [];
      const indexMap = allTests.reduce((map, _, index) => {
        map[index] = index;
        return map;
      }, {} as Record<number, number>);
      return { filteredChildTests: allTests, filteredToOriginalIndexMap: indexMap };
    }
    
    const activeGroup = childGroups[activeGroupTab];
    if (!activeGroup) {
      const allTests = testDataForEntry.child_tests_with_results;
      const indexMap = allTests.reduce((map, _, index) => {
        map[index] = index;
        return map;
      }, {} as Record<number, number>);
      return { filteredChildTests: allTests, filteredToOriginalIndexMap: indexMap };
    }
    
    const filtered = testDataForEntry.child_tests_with_results.filter(
      ct => ct.child_group_name === activeGroup.name
    );
    
    // Create mapping from filtered index to original index
    const indexMap = filtered.reduce((map, filteredTest, filteredIndex) => {
      const originalIndex = testDataForEntry.child_tests_with_results.findIndex(
        originalTest => originalTest.id === filteredTest.id
      );
      map[filteredIndex] = originalIndex;
      return map;
    }, {} as Record<number, number>);
    
    return { filteredChildTests: filtered, filteredToOriginalIndexMap: indexMap };
  }, [testDataForEntry, childGroups, activeGroupTab]);
  
  console.log('Filtered child tests:', filteredChildTests);
  console.log('Index mapping:', filteredToOriginalIndexMap);
  console.log('Active group tab:', activeGroupTab);



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

  // Clear selected child test index when test data changes (new lab request)
  useEffect(() => {
    setSelectedChildTestIndex(null);
    setNormalRangeInput("");
    // Reset group tab to first tab for special tests
    setActiveGroupTab(0);
  }, [testDataForEntry]);

  // Force form re-render when switching tabs to ensure proper synchronization
  useEffect(() => {
    if (testDataForEntry && testDataForEntry.is_special_test) {
      // Trigger a form re-render by updating a dummy field
      // This ensures all form fields are properly synchronized
      const currentFormData = getValues();
      reset(currentFormData);
    }
  }, [activeGroupTab, testDataForEntry, reset, getValues]);


  const handleGroupTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveGroupTab(newValue);
    // Clear selected child test when switching groups
    setSelectedChildTestIndex(null);
    setNormalRangeInput("");
  };

  // Custom handler for child test focus that sets the selected index
  const handleChildTestFocus = useCallback((childTest: ChildTestWithResult | null, index: number) => {
    if (childTest) {
      setSelectedChildTestIndex(index);
      // Set the current normal range value when selecting a child test
      // Use normal_range from requested_results table as the default value
      setNormalRangeInput(childTest.normal_range || "");
    }
    // Don't clear the selected index on blur - keep it persistent
    // Also call the parent's onChildTestFocus for any other functionality
    onChildTestFocus(childTest);
  }, [onChildTestFocus]);

  // Handler for row click to show normal range
  const handleRowClick = useCallback((childTest: ChildTestWithResult, index: number) => {
    setSelectedChildTestIndex(index);
    setNormalRangeInput(childTest.normal_range || "");
    onChildTestFocus(childTest);
  }, [onChildTestFocus]);

  // Debounced save function for normal range updates
  const saveNormalRange = useCallback(async (newNormalRange: string) => {
    if (!initialLabRequest.id || selectedChildTestIndex === null) return;
    
    // Find the child test in the filtered array
    const filteredTest = filteredChildTests[selectedChildTestIndex];
    if (!filteredTest?.id) return;
    
    setIsSavingNormalRange(true);
    try {
      await updateNormalRange(initialLabRequest.id, filteredTest.id, newNormalRange);
      toast.success("تم حفظ النطاق الطبيعي بنجاح");
      // Update the local state to reflect the saved value
      filteredTest.normal_range = newNormalRange;
    } catch (error: unknown) {
      console.error('Failed to save normal range:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unknown error';
      toast.error("فشل حفظ النطاق الطبيعي", {
        description: errorMessage,
      });
    } finally {
      setIsSavingNormalRange(false);
    }
  }, [initialLabRequest.id, selectedChildTestIndex, filteredChildTests]);

  const debouncedSaveNormalRange = React.useMemo(
    () => debounce(saveNormalRange, 1000),
    [saveNormalRange]
  );

  // Handle normal range input change
  const handleNormalRangeChange = useCallback((value: string) => {
    setNormalRangeInput(value);
    debouncedSaveNormalRange(value);
  }, [debouncedSaveNormalRange]);


  const handleCloseCommentDialog = useCallback(() => {
    setCommentDialogOpen(false);
    setCommentInput("");
  }, []);

  const handleSaveComment = useCallback(async () => {
    if (!initialLabRequest.id) return;
    
    setIsSavingComment(true);
    try {
      await updateLabRequestComment(initialLabRequest.id, commentInput);
      toast.success("تم حفظ التعليق بنجاح");
      setCommentDialogOpen(false);
      // Update the local lab request object
      initialLabRequest.comment = commentInput;
      onResultsSaved(initialLabRequest);
    } catch (error: unknown) {
      console.error('Failed to save comment:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unknown error';
      toast.error("فشل حفظ التعليق", {
        description: errorMessage,
      });
    } finally {
      setIsSavingComment(false);
    }
  }, [initialLabRequest, commentInput, onResultsSaved]);


  // Generate field names for consistent access
  const getFieldNames = (filteredIndex: number) => {
    const originalIndex = filteredToOriginalIndexMap[filteredIndex];
    return {
      resultValueField: `results.${originalIndex}.result_value` as Path<ResultEntryFormValues>,
      normalRangeTextField: `results.${originalIndex}.normal_range_text` as Path<ResultEntryFormValues>,
    };
  };



  if (isLoading && !testDataForEntry) {
    return (
      <div className="h-full flex flex-col p-3 sm:p-4 bg-slate-50 dark:bg-background shadow-inner">
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="h-[calc(100vh-200px)] pr-1">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="space-y-4">
                {/* Header skeleton */}
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                </div>
                
                {/* Table skeleton */}
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <Skeleton className="h-8 w-1/3" />
                      <Skeleton className="h-8 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (fetchError) {
    return (
      <div className="h-full flex flex-col p-3 sm:p-4 bg-slate-50 dark:bg-background shadow-inner">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center text-red-500">
            <p>حدث خطأ أثناء تحميل البيانات</p>
            <p className="text-sm text-muted-foreground mt-2">
              {fetchError.message}
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (!testDataForEntry) {
    return (
      <div className="h-full flex flex-col p-3 sm:p-4 bg-slate-50 dark:bg-background shadow-inner">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>لا توجد بيانات متاحة</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col p-3 sm:p-4 bg-slate-50 dark:bg-background shadow-inner">
     
    

        <Form {...form}>
          <form className="flex-grow flex flex-col overflow-hidden">
            {/* Comment Button */}
            {/* <div className="mb-3 flex justify-end">
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenCommentDialog}
                sx={{
                  fontSize: "0.75rem",
                  padding: "4px 12px",
                  minWidth: "auto",
                }}
              >
                {initialLabRequest.comment ? "تعديل التعليق" : "إضافة تعليق"}
              </Button>
            </div> */}
            
            <CustomTabPanel value={activeTab} index={0}>
              <ScrollArea className="h-[calc(100vh-200px)] pr-1">
                {/* Group Tabs for Special Tests */}
                {testDataForEntry.is_special_test && childGroups.length > 0 && (
                  <div className="mb-4">
                    <Tabs
                      value={activeGroupTab}
                      onChange={handleGroupTabChange}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                          minHeight: '36px',
                          fontSize: '0.8rem',
                          padding: '6px 12px',
                          textTransform: 'none',
                          fontWeight: 500,
                        },
                      }}
                    >
                      {childGroups.map((group, index) => (
                        <Tab
                          key={group.id}
                          label={group.name}
                          id={`group-tab-${index}`}
                          aria-controls={`group-tabpanel-${index}`}
                        />
                      ))}
                    </Tabs>
                  </div>
                )}

                {filteredChildTests.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    {testDataForEntry.is_special_test && childGroups.length > 0
                      ? `لا توجد فحوصات في المجموعة "${childGroups[activeGroupTab]?.name || ''}"`
                      : "لا توجد فحوصات فرعية لإدخال النتائج"
                    }
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
                              padding: "10حء",
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
                        {/* {console.log(testDataForEntry,'testDataForEntry')} */}
                        {filteredChildTests
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
                            const { resultValueField } = getFieldNames(index);
                            const isFirstInput = index === 0;
                            const fieldValue = getValues(resultValueField);
                            console.log('Rendering child test:', { 
                              childTestId: ctResult.id, 
                              childTestName: ctResult.child_test_name,
                              fieldValue,
                              resultValueField,
                              originalIndex: filteredToOriginalIndexMap[index]
                            });
                            return (
                              <TableRow
                                key={ctResult.id || `new-${index}`}
                                onClick={() => handleRowClick(ctResult, index)}
                                sx={{
                                  "&:last-child td, &:last-child th": {
                                    border: 0,
                                  },
                                  "&:hover": {
                                    backgroundColor: "var(--muted)",
                                    cursor: "pointer",
                                  },
                                  backgroundColor: "var(--background)",
                                  cursor: "pointer",
                                  borderLeft: selectedChildTestIndex === index ? "4px solid #3b82f6" : "4px solid transparent",
                                  transition: "all 0.2s ease-in-out",
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
                                      fontWeight: 900,
                                      textAlign: "center",
                                      color: "var(--foreground)",
                                    }}
                                  >
                                    {ctResult.child_test_name
                                      ? ctResult.child_test_name.charAt(0).toUpperCase() + ctResult.child_test_name.slice(1)
                                      : ""}
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
                                      
                                        <div 
                                          style={{ fontSize: "0.75rem" }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ChildTestAutocompleteInput
                                            key={`${ctResult.id}-${ctResult.result_id}-${activeGroupTab}`}
                                            value={field.value as string | ChildTestOption | null}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            resultId={ctResult.result_id || 0}
                                            error={!!error}
                                            helperText={error?.message}
                                            childTestId={ctResult.id!}
                                            childTestName={
                                              ctResult.child_test_name
                                            }
                                            parentChildTestModel={ctResult}
                                            onFocusChange={(childTest) => handleChildTestFocus(childTest, index)}
                                            inputRef={isFirstInput ? firstInputRef : undefined}
                                            patientAuthDate={patientAuthDate}
                                            visitId={visitId}
                                            onItemUpdated={onItemUpdated}
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
                        {/* Normal Range Display */}
             
                  </TableContainer>
                )}

{selectedChildTestIndex !== null && filteredChildTests[selectedChildTestIndex] && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        color: "var(--foreground)",
                      }}
                    >
                      Normal Range for {filteredChildTests[selectedChildTestIndex].child_test_name}
                    </Typography>
                  </div>
                  <div className="relative">
                    <Textarea
                      value={normalRangeInput}
                      onChange={(e) => handleNormalRangeChange(e.target.value)}
                      className="min-h-[60px] text-sm bg-background border-border pr-8"
                      placeholder="Enter Normal Range..."
                      style={{
                        resize: "vertical",
                        fontSize: "0.75rem",
                        lineHeight: "1.4",
                      }}
                    />
                    {isSavingNormalRange && (
                      <div className="absolute top-2 right-2">
                        <CircularProgress size={16} color="primary" />
                      </div>
                    )}
                  </div>
                  {filteredChildTests[selectedChildTestIndex].unit_name && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Unit: {filteredChildTests[selectedChildTestIndex].unit_name}
                    </div>
                  )}
                </div>
              )}
              </ScrollArea>
              
          
            </CustomTabPanel>

            <CustomTabPanel value={activeTab} index={1}>
              {/* Other Tab */}
            </CustomTabPanel>

           
          </form>
        </Form>
      </div>

      {/* Comment Dialog */}
      <Dialog
        open={commentDialogOpen}
        onClose={handleCloseCommentDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "var(--background)",
            border: "1px solid var(--border)",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>
          {initialLabRequest.comment ? "Edit Lab Request Comment" : "Add Lab Request Comment"}
        </DialogTitle>
        <DialogContent>
          <Textarea
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Enter your comment here..."
            className="min-h-[120px] text-sm bg-background border-border"
            style={{
              resize: "vertical",
              fontSize: "0.875rem",
              lineHeight: "1.5",
            }}
          />
        </DialogContent>
        <DialogActions sx={{ padding: "16px 24px" }}>
          <Button
            onClick={handleCloseCommentDialog}
            variant="outlined"
            size="small"
            disabled={isSavingComment}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSaveComment}
            variant="contained"
            size="small"
            disabled={isSavingComment}
            startIcon={isSavingComment ? <CircularProgress size={16} /> : null}
          >
            {isSavingComment ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

    </>
  );
};

export default ResultEntryPanel;
