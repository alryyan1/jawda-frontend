import React, { useState, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TablePagination,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import dayjs from "dayjs";
import {
  RefreshCw,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle,
  Clock,
  Power,
  PowerOff,
} from "lucide-react";

import {
  getFailedJobs,
  getPendingJobs,
  getJobsStatistics,
  getQueues,
  retryJob,
  retryAllJobs,
  deleteFailedJob,
  deleteAllFailedJobs,
  deleteFailedJobsByQueue,
  deleteFailedJobsByIds,
  deletePendingJob,
  deleteAllPendingJobs,
  deletePendingJobsByQueue,
  deletePendingJobsByIds,
  getQueueWorkerStatus,
  startQueueWorker,
  stopQueueWorker,
  type FailedJob,
  type PendingJob,
} from "@/services/jobsManagementService";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`jobs-tabpanel-${index}`}
      aria-labelledby={`jobs-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const JobsManagementPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [selectedQueue, setSelectedQueue] = useState<string>("");
  // Failed jobs dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteQueueDialogOpen, setDeleteQueueDialogOpen] = useState(false);
  const [deleteSelectedDialogOpen, setDeleteSelectedDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedQueueToDelete, setSelectedQueueToDelete] = useState<string>("");
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  // Pending jobs dialogs
  const [deletePendingDialogOpen, setDeletePendingDialogOpen] = useState(false);
  const [deleteAllPendingDialogOpen, setDeleteAllPendingDialogOpen] = useState(false);
  const [deletePendingQueueDialogOpen, setDeletePendingQueueDialogOpen] = useState(false);
  const [deletePendingSelectedDialogOpen, setDeletePendingSelectedDialogOpen] = useState(false);
  const [selectedPendingJobId, setSelectedPendingJobId] = useState<number | null>(null);
  const [selectedPendingQueueToDelete, setSelectedPendingQueueToDelete] = useState<string>("");
  const [selectedPendingJobIds, setSelectedPendingJobIds] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  // Statistics query
  const { data: statistics, isLoading: isLoadingStats } = useQuery({
    queryKey: ["jobsStatistics"],
    queryFn: getJobsStatistics,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Queues query
  const { data: queues = [] } = useQuery({
    queryKey: ["jobsQueues"],
    queryFn: getQueues,
  });

  // Queue worker status query
  const {
    data: queueWorkerStatus,
    isLoading: isLoadingQueueStatus,
    refetch: refetchQueueStatus,
  } = useQuery({
    queryKey: ["queueWorkerStatus"],
    queryFn: getQueueWorkerStatus,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Failed jobs query
  const {
    data: failedJobsData,
    isLoading: isLoadingFailed,
    refetch: refetchFailed,
  } = useQuery({
    queryKey: ["failedJobs", page + 1, rowsPerPage],
    queryFn: () =>
      getFailedJobs({
        page: page + 1,
        per_page: rowsPerPage,
      }),
    placeholderData: (previousData) => previousData,
  });

  // Pending jobs query
  const {
    data: pendingJobsData,
    isLoading: isLoadingPending,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ["pendingJobs", page + 1, rowsPerPage, selectedQueue],
    queryFn: () =>
      getPendingJobs({
        page: page + 1,
        per_page: rowsPerPage,
        queue: selectedQueue || undefined,
      }),
    placeholderData: (previousData) => previousData,
  });

  // Retry job mutation
  const retryJobMutation = useMutation({
    mutationFn: retryJob,
    onSuccess: () => {
      toast.success("تم إعادة محاولة تنفيذ المهمة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["failedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["pendingJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل إعادة المحاولة");
    },
  });

  // Retry all jobs mutation
  const retryAllMutation = useMutation({
    mutationFn: retryAllJobs,
    onSuccess: () => {
      toast.success("تم إعادة محاولة جميع المهام الفاشلة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["failedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["pendingJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل إعادة المحاولة");
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: deleteFailedJob,
    onSuccess: () => {
      toast.success("تم حذف المهمة الفاشلة بنجاح");
      setDeleteDialogOpen(false);
      setSelectedJobId(null);
      queryClient.invalidateQueries({ queryKey: ["failedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل الحذف");
    },
  });

  // Delete all jobs mutation
  const deleteAllMutation = useMutation({
    mutationFn: deleteAllFailedJobs,
    onSuccess: () => {
      toast.success("تم حذف جميع المهام الفاشلة بنجاح");
      setDeleteAllDialogOpen(false);
      setSelectedJobIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["failedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل الحذف");
    },
  });

  // Delete jobs by queue mutation
  const deleteByQueueMutation = useMutation({
    mutationFn: deleteFailedJobsByQueue,
    onSuccess: () => {
      toast.success("تم حذف المهام الفاشلة من الطابور بنجاح");
      setDeleteQueueDialogOpen(false);
      setSelectedQueueToDelete("");
      setSelectedJobIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["failedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل الحذف");
    },
  });

  // Delete selected jobs mutation
  const deleteSelectedMutation = useMutation({
    mutationFn: deleteFailedJobsByIds,
    onSuccess: () => {
      toast.success("تم حذف المهام المحددة بنجاح");
      setDeleteSelectedDialogOpen(false);
      setSelectedJobIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["failedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل الحذف");
    },
  });

  // Start queue worker mutation
  const startQueueMutation = useMutation({
    mutationFn: startQueueWorker,
    onSuccess: (data) => {
      toast.success(data.message || "تم بدء الـ Queue Worker بنجاح");
      queryClient.invalidateQueries({ queryKey: ["queueWorkerStatus"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل بدء الـ Queue Worker");
    },
  });

  // Stop queue worker mutation
  const stopQueueMutation = useMutation({
    mutationFn: stopQueueWorker,
    onSuccess: (data) => {
      toast.success(data.message || "تم إيقاف الـ Queue Worker بنجاح");
      queryClient.invalidateQueries({ queryKey: ["queueWorkerStatus"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل إيقاف الـ Queue Worker");
    },
  });

  // Delete pending job mutation
  const deletePendingJobMutation = useMutation({
    mutationFn: deletePendingJob,
    onSuccess: () => {
      toast.success("تم حذف المهمة بنجاح");
      setDeletePendingDialogOpen(false);
      setSelectedPendingJobId(null);
      queryClient.invalidateQueries({ queryKey: ["pendingJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل الحذف");
    },
  });

  // Delete all pending jobs mutation
  const deleteAllPendingMutation = useMutation({
    mutationFn: deleteAllPendingJobs,
    onSuccess: () => {
      toast.success("تم حذف جميع المهام بنجاح");
      setDeleteAllPendingDialogOpen(false);
      setSelectedPendingJobIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["pendingJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل الحذف");
    },
  });

  // Delete pending jobs by queue mutation
  const deletePendingByQueueMutation = useMutation({
    mutationFn: deletePendingJobsByQueue,
    onSuccess: () => {
      toast.success("تم حذف المهام من الطابور بنجاح");
      setDeletePendingQueueDialogOpen(false);
      setSelectedPendingQueueToDelete("");
      setSelectedPendingJobIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["pendingJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل الحذف");
    },
  });

  // Delete selected pending jobs mutation
  const deletePendingSelectedMutation = useMutation({
    mutationFn: deletePendingJobsByIds,
    onSuccess: () => {
      toast.success("تم حذف المهام المحددة بنجاح");
      setDeletePendingSelectedDialogOpen(false);
      setSelectedPendingJobIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["pendingJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "فشل الحذف");
    },
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRetryJob = (jobId: number) => {
    retryJobMutation.mutate(jobId);
  };

  const handleRetryAll = () => {
    retryAllMutation.mutate();
  };

  const handleDeleteJob = (jobId: number) => {
    setSelectedJobId(jobId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedJobId) {
      deleteJobMutation.mutate(selectedJobId);
    }
  };

  const handleDeleteAll = () => {
    setDeleteAllDialogOpen(true);
  };

  const handleConfirmDeleteAll = () => {
    deleteAllMutation.mutate();
  };

  const handleDeleteByQueue = (queue: string) => {
    setSelectedQueueToDelete(queue);
    setDeleteQueueDialogOpen(true);
  };

  const handleConfirmDeleteByQueue = () => {
    if (selectedQueueToDelete) {
      deleteByQueueMutation.mutate(selectedQueueToDelete);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedJobIds.size > 0) {
      setDeleteSelectedDialogOpen(true);
    } else {
      toast.warning("يرجى تحديد مهام للحذف");
    }
  };

  const handleConfirmDeleteSelected = () => {
    if (selectedJobIds.size > 0) {
      deleteSelectedMutation.mutate(Array.from(selectedJobIds));
    }
  };

  const handleSelectJob = (jobId: number) => {
    setSelectedJobIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleRefresh = () => {
    refetchFailed();
    refetchPending();
    refetchQueueStatus();
    queryClient.invalidateQueries({ queryKey: ["jobsStatistics"] });
  };

  const handleStartQueue = () => {
    startQueueMutation.mutate();
  };

  const handleStopQueue = () => {
    stopQueueMutation.mutate();
  };

  // Pending jobs handlers
  const handleDeletePendingJob = (jobId: number) => {
    setSelectedPendingJobId(jobId);
    setDeletePendingDialogOpen(true);
  };

  const handleConfirmDeletePending = () => {
    if (selectedPendingJobId) {
      deletePendingJobMutation.mutate(selectedPendingJobId);
    }
  };

  const handleDeleteAllPending = () => {
    setDeleteAllPendingDialogOpen(true);
  };

  const handleConfirmDeleteAllPending = () => {
    deleteAllPendingMutation.mutate();
  };

  const handleDeletePendingByQueue = (queue: string) => {
    setSelectedPendingQueueToDelete(queue);
    setDeletePendingQueueDialogOpen(true);
  };

  const handleConfirmDeletePendingByQueue = () => {
    if (selectedPendingQueueToDelete) {
      deletePendingByQueueMutation.mutate(selectedPendingQueueToDelete);
    }
  };

  const handleDeletePendingSelected = () => {
    if (selectedPendingJobIds.size > 0) {
      setDeletePendingSelectedDialogOpen(true);
    } else {
      toast.warning("يرجى تحديد مهام للحذف");
    }
  };

  const handleConfirmDeletePendingSelected = () => {
    if (selectedPendingJobIds.size > 0) {
      deletePendingSelectedMutation.mutate(Array.from(selectedPendingJobIds));
    }
  };

  const handleSelectPendingJob = (jobId: number) => {
    setSelectedPendingJobIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const failedJobs: FailedJob[] = failedJobsData?.data ?? [];
  
  // Sort pending jobs: executing jobs (reserved_at !== null) first, then by created_at
  const sortedPendingJobs = useMemo(() => {
    const jobs = pendingJobsData?.data ?? [];
    return [...jobs].sort((a: PendingJob, b: PendingJob) => {
      // If one is executing (reserved_at !== null) and the other is not, executing comes first
      const aIsExecuting = a.reserved_at !== null;
      const bIsExecuting = b.reserved_at !== null;
      
      if (aIsExecuting && !bIsExecuting) return -1;
      if (!aIsExecuting && bIsExecuting) return 1;
      
      // If both are executing or both are not, sort by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [pendingJobsData]);
  
  const pendingJobs: PendingJob[] = sortedPendingJobs;
  const failedTotal = failedJobsData?.meta?.total ?? 0;
  const pendingTotal = pendingJobsData?.meta?.total ?? 0;

  const handleSelectAll = () => {
    if (selectedJobIds.size === failedJobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(failedJobs.map((job) => job.id)));
    }
  };

  const isAllSelected = failedJobs.length > 0 && selectedJobIds.size === failedJobs.length;
  const isIndeterminate = selectedJobIds.size > 0 && selectedJobIds.size < failedJobs.length;

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          إدارة المهام (Jobs Management)
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          {/* Queue Worker Status and Controls */}
          {!isLoadingQueueStatus && queueWorkerStatus && (
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 1,
                bgcolor: queueWorkerStatus.data.is_running
                  ? "success.light"
                  : "error.light",
              }}
            >
              <Chip
                icon={
                  queueWorkerStatus.data.is_running ? (
                    <CheckCircle size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )
                }
                label={
                  queueWorkerStatus.data.is_running
                    ? `Queue Worker: يعمل (PID: ${queueWorkerStatus.data.pid || "N/A"})`
                    : "Queue Worker: متوقف"
                }
                color={queueWorkerStatus.data.is_running ? "success" : "error"}
                size="small"
              />
              {queueWorkerStatus.data.is_running ? (
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<PowerOff size={16} />}
                  onClick={handleStopQueue}
                  disabled={stopQueueMutation.isPending}
                >
                  إيقاف
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<Power size={16} />}
                  onClick={handleStartQueue}
                  disabled={startQueueMutation.isPending}
                >
                  بدء
                </Button>
              )}
            </Box>
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={handleRefresh}
          >
            تحديث
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {!isLoadingStats && statistics && (
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Card sx={{ flex: "1 1 200px", minWidth: 200 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <AlertCircle color="red" size={24} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {statistics.failed_total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    مهام فاشلة
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: "1 1 200px", minWidth: 200 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Clock color="orange" size={24} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {statistics.pending_total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    مهام قيد الانتظار
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      <Paper>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => {
            setTabValue(newValue);
            setPage(0);
          }}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label={`مهام فاشلة (${failedTotal})`} />
          <Tab label={`مهام قيد الانتظار (${pendingTotal})`} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box mb={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <Button
              variant="contained"
              color="primary"
              startIcon={<Play size={16} />}
              onClick={handleRetryAll}
              disabled={retryAllMutation.isPending || failedTotal === 0}
            >
              إعادة محاولة الكل
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={16} />}
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending || failedTotal === 0}
            >
              حذف الكل
            </Button>
            {selectedJobIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={16} />}
                onClick={handleDeleteSelected}
                disabled={deleteSelectedMutation.isPending}
              >
                حذف المحدد ({selectedJobIds.size})
              </Button>
            )}
            {queues.length > 0 && (
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" fontWeight={600} sx={{ mr: 1 }}>
                  حذف حسب الطابور:
                </Typography>
                {queues.map((queue) => {
                  const queueFailedCount = statistics?.failed_by_queue?.[queue] ?? 0;
                  return (
                    <Button
                      key={queue}
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Trash2 size={14} />}
                      onClick={() => handleDeleteByQueue(queue)}
                      disabled={deleteByQueueMutation.isPending || queueFailedCount === 0}
                      sx={{ textTransform: "none" }}
                    >
                      {queue || "default"} ({queueFailedCount})
                    </Button>
                  );
                })}
              </Box>
            )}
          </Box>

          {isLoadingFailed ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : failedJobs.length === 0 ? (
            <Alert severity="info">لا توجد مهام فاشلة</Alert>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 600, overflow: "auto" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" align="center">
                        <Checkbox
                          indeterminate={isIndeterminate}
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell align="center">ID</TableCell>
                      <TableCell align="center">اسم المهمة</TableCell>
                      <TableCell align="center">الطابور</TableCell>
                      <TableCell align="center">تاريخ الفشل</TableCell>
                      <TableCell align="center">الخطأ</TableCell>
                      <TableCell align="center">إجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {failedJobs.map((job) => (
                      <TableRow
                        key={job.id}
                        selected={selectedJobIds.has(job.id)}
                        sx={{
                          bgcolor: selectedJobIds.has(job.id)
                            ? "action.selected"
                            : "transparent",
                        }}
                      >
                        <TableCell padding="checkbox" align="center">
                          <Checkbox
                            checked={selectedJobIds.has(job.id)}
                            onChange={() => handleSelectJob(job.id)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>
                            {job.id}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>
                            {job.job_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={job.queue || "default"} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          {dayjs(job.failed_at).format("DD/MM/YYYY HH:mm")}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={job.exception}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 300,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {job.exception.split("\n")[0]}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="إعادة المحاولة">
                            <IconButton
                              size="small"
                              onClick={() => handleRetryJob(job.id)}
                              disabled={retryJobMutation.isPending}
                            >
                              <Play size={16} color="green" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteJob(job.id)}
                              disabled={deleteJobMutation.isPending}
                            >
                              <Trash2 size={16} color="red" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={failedTotal}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[25, 50, 100]}
              />
            </>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box mb={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>فلترة حسب الطابور</InputLabel>
              <Select
                value={selectedQueue}
                label="فلترة حسب الطابور"
                onChange={(e) => {
                  setSelectedQueue(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">الكل</MenuItem>
                {queues.map((queue) => (
                  <MenuItem key={queue} value={queue}>
                    {queue || "default"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={16} />}
              onClick={handleDeleteAllPending}
              disabled={deleteAllPendingMutation.isPending || pendingTotal === 0}
            >
              حذف الكل
            </Button>
            {selectedPendingJobIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={16} />}
                onClick={handleDeletePendingSelected}
                disabled={deletePendingSelectedMutation.isPending}
              >
                حذف المحدد ({selectedPendingJobIds.size})
              </Button>
            )}
            {queues.length > 0 && (
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" fontWeight={600} sx={{ mr: 1 }}>
                  حذف حسب الطابور:
                </Typography>
                {queues.map((queue) => {
                  const queuePendingCount = statistics?.pending_by_queue?.[queue] ?? 0;
                  return (
                    <Button
                      key={queue}
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Trash2 size={14} />}
                      onClick={() => handleDeletePendingByQueue(queue)}
                      disabled={deletePendingByQueueMutation.isPending || queuePendingCount === 0}
                      sx={{ textTransform: "none" }}
                    >
                      {queue || "default"} ({queuePendingCount})
                    </Button>
                  );
                })}
              </Box>
            )}
          </Box>

          {isLoadingPending ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : pendingJobs.length === 0 ? (
            <Alert severity="info">لا توجد مهام قيد الانتظار</Alert>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 600, overflow: "auto" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" align="center">
                        <Checkbox
                          indeterminate={selectedPendingJobIds.size > 0 && selectedPendingJobIds.size < pendingJobs.length}
                          checked={pendingJobs.length > 0 && selectedPendingJobIds.size === pendingJobs.length}
                          onChange={() => {
                            if (selectedPendingJobIds.size === pendingJobs.length) {
                              setSelectedPendingJobIds(new Set());
                            } else {
                              setSelectedPendingJobIds(new Set(pendingJobs.map((job) => job.id)));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">ID</TableCell>
                      <TableCell align="center">اسم المهمة</TableCell>
                      <TableCell align="center">الطابور</TableCell>
                      <TableCell align="center">الحالة</TableCell>
                      <TableCell align="center">المحاولات</TableCell>
                      <TableCell align="center">تاريخ الإنشاء</TableCell>
                      <TableCell align="center">متاح في</TableCell>
                      <TableCell align="center">إجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingJobs.map((job) => {
                      const isExecuting = job.reserved_at !== null;
                      return (
                        <TableRow
                          key={job.id}
                          selected={selectedPendingJobIds.has(job.id)}
                          sx={{
                            bgcolor: isExecuting
                              ? "action.selected"
                              : selectedPendingJobIds.has(job.id)
                              ? "action.selected"
                              : "transparent",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <TableCell padding="checkbox" align="center">
                            <Checkbox
                              checked={selectedPendingJobIds.has(job.id)}
                              onChange={() => handleSelectPendingJob(job.id)}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              fontWeight={isExecuting ? 700 : 600}
                              color={isExecuting ? "primary.main" : "inherit"}
                            >
                              {job.id}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              fontWeight={isExecuting ? 700 : 600}
                              color={isExecuting ? "primary.main" : "inherit"}
                            >
                              {job.job_name}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={job.queue || "default"} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            {isExecuting ? (
                              <Chip
                                icon={<Play size={14} />}
                                label="قيد التنفيذ"
                                color="success"
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            ) : (
                              <Chip
                                label="في الانتظار"
                                color="default"
                                size="small"
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={job.attempts}
                              size="small"
                              color={job.attempts > 0 ? "warning" : "default"}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {dayjs(job.created_at).format("DD/MM/YYYY HH:mm")}
                          </TableCell>
                          <TableCell align="center">
                            {dayjs(job.available_at).format("DD/MM/YYYY HH:mm")}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                onClick={() => handleDeletePendingJob(job.id)}
                                disabled={deletePendingJobMutation.isPending}
                              >
                                <Trash2 size={16} color="red" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={pendingTotal}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[25, 50, 100]}
              />
            </>
          )}
        </TabPanel>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف هذه المهمة الفاشلة؟
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteJobMutation.isPending}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog
        open={deleteAllDialogOpen}
        onClose={() => setDeleteAllDialogOpen(false)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف جميع المهام الفاشلة؟ هذا الإجراء لا يمكن التراجع عنه.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleConfirmDeleteAll}
            color="error"
            variant="contained"
            disabled={deleteAllMutation.isPending}
          >
            حذف الكل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete By Queue Confirmation Dialog */}
      <Dialog
        open={deleteQueueDialogOpen}
        onClose={() => {
          setDeleteQueueDialogOpen(false);
          setSelectedQueueToDelete("");
        }}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف جميع المهام الفاشلة من الطابور "{selectedQueueToDelete}"؟ هذا الإجراء لا يمكن التراجع عنه.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteQueueDialogOpen(false);
              setSelectedQueueToDelete("");
            }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirmDeleteByQueue}
            color="error"
            variant="contained"
            disabled={deleteByQueueMutation.isPending}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Selected Confirmation Dialog */}
      <Dialog
        open={deleteSelectedDialogOpen}
        onClose={() => setDeleteSelectedDialogOpen(false)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف {selectedJobIds.size} مهمة فاشلة محددة؟ هذا الإجراء لا يمكن التراجع عنه.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSelectedDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleConfirmDeleteSelected}
            color="error"
            variant="contained"
            disabled={deleteSelectedMutation.isPending}
          >
            حذف ({selectedJobIds.size})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pending Jobs Dialogs */}
      {/* Delete Pending Job Confirmation Dialog */}
      <Dialog open={deletePendingDialogOpen} onClose={() => setDeletePendingDialogOpen(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف هذه المهمة؟
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePendingDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleConfirmDeletePending}
            color="error"
            variant="contained"
            disabled={deletePendingJobMutation.isPending}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All Pending Jobs Confirmation Dialog */}
      <Dialog
        open={deleteAllPendingDialogOpen}
        onClose={() => setDeleteAllPendingDialogOpen(false)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف جميع المهام قيد الانتظار؟ هذا الإجراء لا يمكن التراجع عنه.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllPendingDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleConfirmDeleteAllPending}
            color="error"
            variant="contained"
            disabled={deleteAllPendingMutation.isPending}
          >
            حذف الكل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Pending Jobs By Queue Confirmation Dialog */}
      <Dialog
        open={deletePendingQueueDialogOpen}
        onClose={() => {
          setDeletePendingQueueDialogOpen(false);
          setSelectedPendingQueueToDelete("");
        }}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف جميع المهام من الطابور "{selectedPendingQueueToDelete}"؟ هذا الإجراء لا يمكن التراجع عنه.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeletePendingQueueDialogOpen(false);
              setSelectedPendingQueueToDelete("");
            }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirmDeletePendingByQueue}
            color="error"
            variant="contained"
            disabled={deletePendingByQueueMutation.isPending}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Selected Pending Jobs Confirmation Dialog */}
      <Dialog
        open={deletePendingSelectedDialogOpen}
        onClose={() => setDeletePendingSelectedDialogOpen(false)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف {selectedPendingJobIds.size} مهمة محددة؟ هذا الإجراء لا يمكن التراجع عنه.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePendingSelectedDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleConfirmDeletePendingSelected}
            color="error"
            variant="contained"
            disabled={deletePendingSelectedMutation.isPending}
          >
            حذف ({selectedPendingJobIds.size})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobsManagementPage;

