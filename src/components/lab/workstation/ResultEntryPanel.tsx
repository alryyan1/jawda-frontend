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
import BugReportIcon from "@mui/icons-material/BugReport";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import type { LabRequest, RequestedOrganism } from "@/types/visits";
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
import OrganismTable from "./OrganismTable";
import { Shield } from "lucide-react";
import { IconButton } from "@mui/material";


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
  onTestResultsChange?: (testResults: any) => void; // Callback to expose current test results for AI analysis
  patientLabQueueItem?: PatientLabQueueItem | null;
  }

const ResultEntryPanel: React.FC<ResultEntryPanelProps> = ({
  initialLabRequest,
  onResultsSaved,
  onChildTestFocus,
  patientAuthDate,
  visitId,
  onItemUpdated,
  onTestResultsChange,
  patientLabQueueItem
}) => {
  // console.log(patientLabQueueItem,'patientLabQueueItem in ResultEntryPanel');
  // استخدام نص عربي مباشر بدلاً من i18n
  const [activeTab] = useState(0);
  const [activeGroupTab, setActiveGroupTab] = useState(0); // For special test group tabs
  const [selectedChildTestIndex, setSelectedChildTestIndex] = useState<number | null>(null);
  const [normalRangeInput, setNormalRangeInput] = useState<string>("");
  const [isSavingNormalRange, setIsSavingNormalRange] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentInput, setCommentInput] = useState<string>("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [organisms, setOrganisms] = useState<RequestedOrganism[]>([]);
  const [organismDialogOpen, setOrganismDialogOpen] = useState(false);
  
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
    staleTime: 0, // Always consider data stale to ensure fresh fetch
    gcTime: 0, // Don't cache the data (replaces cacheTime)
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
  
  // console.log('Filtered child tests:', filteredChildTests);
  // console.log('Index mapping:', filteredToOriginalIndexMap);
  // console.log('Active group tab:', activeGroupTab);



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

          // Always use the actual result_value from the database, don't fall back to defval
          let initialResultValue: string | ChildTestOption | null | boolean =
            ct.result_value !== undefined && ct.result_value !== null
              ? ct.result_value
              : null; // Use null instead of defval to avoid showing stale values

          if (
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
      
      // Initialize organisms from testDataForEntry
      const organismsData = testDataForEntry.requested_organisms || [];
      // console.log('Organisms data from backend:', organismsData);
      // Ensure all organism fields are strings
      const formattedOrganisms = organismsData.map(org => ({
        ...org,
        organism: org.organism || '',
        sensitive: org.sensitive || '',
        resistant: org.resistant || ''
      }));
      // console.log('Formatted organisms:', formattedOrganisms);
      setOrganisms(formattedOrganisms);
    } else {
      reset({ results: [], main_test_comment: "" });
      setOrganisms([]);
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
  }, [testDataForEntry, initialLabRequest.id]);

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

  // Determine if a given result is abnormal
  const isResultAbnormal = useCallback((ct: ChildTestWithResult, value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    // Numeric range check
    const hasNumericBounds = (ct.low !== null && ct.low !== undefined) || (ct.upper !== null && ct.upper !== undefined);
    if (hasNumericBounds) {
      const parsed = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : NaN;
      if (!Number.isFinite(parsed)) return false;
      const low = typeof ct.low === "number" ? ct.low : undefined;
      const upper = typeof ct.upper === "number" ? ct.upper : undefined;
      if (low !== undefined && upper !== undefined) return parsed < low || parsed > upper;
      if (low !== undefined) return parsed < low;
      if (upper !== undefined) return parsed > upper;
      return false;
    }
    // Qualitative options check
    const options = ct.options || [];
    const toName = (v: unknown): string => {
      if (typeof v === "string") return v;
      if (typeof v === "boolean") return v ? "Positive" : "Negative";
      if (typeof v === "object" && v !== null && "name" in (v as Record<string, unknown>)) {
        return String((v as { name?: string }).name || "");
      }
      return String(v ?? "");
    };
    const vName = toName(value);
    if (options.length > 0) {
      const positiveLike = /positive|reactive|detected|present|yes|true/i;
      const negativeLike = /negative|non\s*reactive|not\s*detected|absent|no|false/i;
      // If matches positive-like => mark abnormal, if matches negative-like => normal
      if (positiveLike.test(vName)) return true;
      if (negativeLike.test(vName)) return false;
      // Fallback: if there is a default value, mark abnormal when differs
      if (ct.defval && typeof ct.defval === "string") {
        return vName.trim().toLowerCase() !== ct.defval.trim().toLowerCase();
      }
      return false;
    }
    return false;
  }, []);

  // Expose current test results for AI analysis
  useEffect(() => {
    if (testDataForEntry && onTestResultsChange) {
      const currentFormData = getValues();
      const testResults = {
        testName: testDataForEntry.main_test_name,
        results: testDataForEntry.child_tests_with_results?.map((ct, index) => ({
          testName: ct.child_test_name,
          value: currentFormData.results?.[index]?.result_value || ct.result_value,
          unit: ct.unit_name || ct.unit?.name,
          normalRange: ct.normal_range || ct.normalRange,
          isAbnormal: ct.result_value ? isResultAbnormal(ct, currentFormData.results?.[index]?.result_value || ct.result_value) : false
        })) || [],
        comment: currentFormData.main_test_comment || initialLabRequest.comment,
        patientName: initialLabRequest.patient_name || 'Unknown Patient',
        testDate: new Date().toISOString()
      };
      onTestResultsChange(testResults);
    }
  }, [testDataForEntry, getValues, onTestResultsChange, initialLabRequest.comment, isResultAbnormal]);

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

  const handleOpenOrganismDialog = useCallback(() => {
    setOrganismDialogOpen(true);
  }, []);

  const handleCloseOrganismDialog = useCallback(() => {
    setOrganismDialogOpen(false);
  }, []);


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
                          padding: "1px 2px",
                          backgroundColor: "var(--background)",
                          color: "var(--foreground)",
                          borderBottomColor: "var(--border)",
                          fontSize: "0.7rem",
                          lineHeight: 1.1,
                        }
                      }}
                    >
                      <TableHead sx={{ 
                        backgroundColor: "var(--muted)",
                        "& .MuiTableCell-root": {
                          backgroundColor: "var(--muted)",
                          color: "var(--foreground)",
                          padding: "1px 2px",
                          fontSize: "0.65rem",
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
                              padding: "1px 2px",
                              fontSize: "0.65rem",
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
                              padding: "1px 2px",
                              fontSize: "0.65rem",
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
                            // console.log('Rendering child test:', { 
                            //   childTestId: ctResult.id, 
                            //   childTestName: ctResult.child_test_name,
                            //   fieldValue,
                            //   resultValueField,
                            //   originalIndex: filteredToOriginalIndexMap[index]
                            // });
                            // console.log(ctResult,'ctResult');
                            const abnormal = isResultAbnormal(ctResult, fieldValue);
                            return (
                              <TableRow
                                key={ctResult.id || `new-${index}`}
                                onClick={() => handleRowClick(ctResult, index)}
                                // className={patientLabQueueItem?.result_auth == true ? "text-2xl" : ""}
                                sx={{
                                  "&:last-child td, &:last-child th": {
                                    border: 0,
                                  },
                                  "&:hover": {
                                    
                                    color: patientLabQueueItem?.result_auth == true ? "red" : "red!important",
                                    cursor: "pointer",
                                  },
                                  backgroundColor: "var(--background)",
                                  cursor: "pointer",
                                  borderLeft: selectedChildTestIndex === index ? "4px solid #3b82f6" : "4px solid transparent",
                                  borderRight: abnormal ? "4px solid #ef4444" : "4px solid transparent",
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
                                    padding: "1px 2px",
                                    fontSize: "0.7rem",
                                    
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    component="div"
                                    className="flex items-center justify-center"
                                    sx={{
                                      fontWeight: 900,
                                      textAlign: "center",
                                      // color: "var(--foreground)",
                                      // fontSize: "0.7rem",
                                      lineHeight: 1.1,
                                      margin: 0,
                                      padding: 0,
                                    }}
                                  >
                                  {patientLabQueueItem?.result_auth == true ? <IconButton> <Shield  className="w-3 h-3" /> </IconButton> : ""}
                                  <div className="flex-grow">{ctResult.child_test_name
                                      ? ctResult.child_test_name.charAt(0).toUpperCase() + ctResult.child_test_name.slice(1) 
                                      : ""}</div>
                                    
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    component="div"
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      mt: 0,
                                      color: "var(--muted-foreground)",
                                      // fontSize: "0.6rem",
                                      lineHeight: 1,
                                      margin: 0,
                                      padding: 0,
                                    }}
                                  >
                                  
                                  </Typography>
                                </TableCell>
                                <TableCell
                                  sx={{
                                    borderBottomColor: "var(--border)",
                                    backgroundColor: "var(--background)",
                                    color: "var(--foreground)",
                                    padding: "1px 2px",
                                    // fontSize: "0.7rem",
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
                                          // style={{ fontSize: "0.7rem" }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ChildTestAutocompleteInput
                                            key={`${initialLabRequest.id}-${ctResult.id}-${ctResult.result_id}-${activeGroupTab}`}
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
                                            patientLabQueueItem={patientLabQueueItem}
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

                {/* Organism Button */}
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<BugReportIcon />}
                    onClick={handleOpenOrganismDialog}
                    sx={{
                      fontSize: "0.75rem",
                      padding: "4px 12px",
                      minWidth: "auto",
                    }}
                  >
                    {organisms.length > 0 
                      ? `إدارة الكائنات الحية (${organisms.length})` 
                      : "إضافة كائنات حية"
                    }
                  </Button>
                </div>

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

      {/* Organism Dialog */}
      <Dialog
        open={organismDialogOpen}
        onClose={handleCloseOrganismDialog}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "var(--background)",
            border: "1px solid var(--border)",
            maxHeight: "90vh",
            width: "95vw",
            maxWidth: "1400px",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <BugReportIcon fontSize="small" />
          إدارة الكائنات الحية
        </DialogTitle>
        <DialogContent sx={{ padding: 0 }} dir="ltr">
          <OrganismTable
            organisms={organisms}
            labRequestId={initialLabRequest.id}
            onOrganismsChange={setOrganisms}
          />
        </DialogContent>
        <DialogActions sx={{ padding: "16px 24px" }}>
          <Button
            onClick={handleCloseOrganismDialog}
            variant="outlined"
            size="small"
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

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
            direction:'ltr',
          },
        }}
      >
        <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>
          {initialLabRequest.comment ? "Edit Lab Request Comment" : "Add Lab Request Comment"}
        </DialogTitle>
        <DialogContent dir="ltr">
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
