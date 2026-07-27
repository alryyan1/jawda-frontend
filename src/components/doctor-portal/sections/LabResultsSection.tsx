import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { alpha } from '@mui/material/styles';
import {
  ChevronUp,
  ChevronDown,
  FlaskConical,
  Loader2,
  Plus,
  Printer,
  Send,
  Star,
  X,
} from 'lucide-react';

import { getLabRequestForEntry } from '@/services/labWorkflowService';
import { getVisitLabReportPdfUrl } from '@/services/visitDocumentsService';
import {
  getAvailableLabTestsForVisit,
  getTopRequestedLabTestsForVisit,
  addLabTestsToVisit,
  notifyLabReceptionOfVisit,
} from '@/services/labRequestService';
import { getMedicalHistory } from '@/services/patientMedicalHistoryService';
import { isChildTestResultAbnormal, isValueEmpty } from '@/utils/labResultFlags';
import type { DoctorVisit, LabRequest } from '@/types/visits';
import type { MainTestWithChildrenResults } from '@/types/labWorkflow';
import type { MainTestStripped } from '@/types/labTests';
import type { PatientMedicalHistory } from '@/types/medicalHistory';
import LabReportPdfPreviewDialog from '@/components/common/LabReportPdfPreviewDialog';
import VitalsSection from './VitalsSection';

const GENDER_LABELS: Record<string, string> = { male: 'ذكر', female: 'أنثى', other: 'آخر' };

const VIEWER_COLUMNS_STORAGE_KEY = 'labResultsViewerColumnCount';
const VIEWER_COLUMN_OPTIONS = [1, 2, 3, 4] as const;

interface LabResultsSectionProps {
  visit: DoctorVisit | undefined;
}

/** One lab request's summary row — fetches its results and shows a progress bar as they're entered, opens the viewer on click. */
const LabRequestRow: React.FC<{ labRequest: LabRequest; onView: () => void }> = ({ labRequest, onView }) => {
  const testName = labRequest.main_test?.main_test_name ?? `طلب #${labRequest.id}`;

  const { data } = useQuery<MainTestWithChildrenResults>({
    queryKey: ['labRequestForEntry', labRequest.id],
    queryFn: () => getLabRequestForEntry(labRequest.id),
  });

  const childTests = data?.child_tests_with_results ?? [];
  const totalCount = childTests.length;
  const completedCount = childTests.filter(ct => !isValueEmpty(ct.result_value)).length;
  const fillPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = totalCount > 0 && completedCount === totalCount;

  return (
    <Paper
      onClick={onView}
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        cursor: 'pointer',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'all 0.12s',
        '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
      }}
    >
      <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
        {testName}
      </Typography>
      {totalCount > 0 && !isComplete && (
        <Typography variant="caption" color="text.secondary">
          {completedCount}/{totalCount}
        </Typography>
      )}
      {isComplete && (
        <Chip label="مكتمل" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />
      )}

      {totalCount > 0 && (
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: 'action.hover' }}>
          <Box
            sx={{
              height: '100%',
              width: `${fillPercentage}%`,
              bgcolor: isComplete ? 'success.main' : 'primary.main',
              transition: 'width 0.3s ease-out',
            }}
          />
        </Box>
      )}
    </Paper>
  );
};

/** Right-side, large-font, LTR results viewer with up/down navigation between the visit's lab requests. */
/** Same ordering as the Lab Workstation's result-entry table: test_order asc, then id asc. */
const sortChildTestsByOrder = (childTests: MainTestWithChildrenResults['child_tests_with_results']) =>
  [...childTests].sort((a, b) => {
    const orderA = Number(a.test_order) || 0;
    const orderB = Number(b.test_order) || 0;
    if (orderA !== orderB) return orderA - orderB;
    return Number(a.id || 0) - Number(b.id || 0);
  });

/** One lab request's full results table — large font, LTR. Used side-by-side, two at a time. */
const LabResultPane: React.FC<{ labRequest: LabRequest | undefined }> = ({ labRequest }) => {
  const testName = labRequest?.main_test?.main_test_name ?? (labRequest ? `طلب #${labRequest.id}` : '');

  const { data, isLoading } = useQuery<MainTestWithChildrenResults>({
    queryKey: ['labRequestForEntry', labRequest?.id],
    queryFn: () => getLabRequestForEntry(labRequest!.id),
    enabled: !!labRequest,
  });

  const childTests = useMemo(() => sortChildTestsByOrder(data?.child_tests_with_results ?? []), [data]);

  if (!labRequest) {
    return <Box sx={{ flex: 1, minWidth: 0 }} />;
  }

  return (
    <Box sx={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto', p: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.3rem', mb: 1.5 }}>
        {testName}
      </Typography>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : childTests.length === 0 ? (
        <Typography color="text.disabled" sx={{ fontSize: '1rem' }}>
          No results yet
        </Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Test</TableCell>
              <TableCell sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Result</TableCell>
              <TableCell sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Unit</TableCell>
              <TableCell sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Normal Range</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {childTests.map(ct => {
              const value = ct.result_value ?? '';
              const empty = isValueEmpty(value);
              const abnormal = !empty && isChildTestResultAbnormal(ct, value);
              const displayValue = empty
                ? '—'
                : String(typeof value === 'object' ? (value as { name?: string })?.name ?? '' : value);
              return (
                <TableRow key={ct.id}>
                  <TableCell sx={{ fontSize: '1.05rem', py: 1.5 }}>{ct.child_test_name}</TableCell>
                  <TableCell
                    sx={{
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      py: 1.5,
                      color: abnormal ? 'error.main' : empty ? 'text.disabled' : 'text.primary',
                    }}
                  >
                    {displayValue}
                  </TableCell>
                  <TableCell sx={{ fontSize: '1rem', py: 1.5, color: 'text.secondary' }}>{ct.unit_name ?? ''}</TableCell>
                  <TableCell sx={{ fontSize: '1rem', py: 1.5, color: 'text.secondary' }}>{ct.normalRange ?? ''}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

const LabResultViewerDrawer: React.FC<{
  visit: DoctorVisit;
  labRequests: LabRequest[];
  index: number | null;
  medHistory: PatientMedicalHistory | undefined;
  isLoadingMedHistory: boolean;
  canPrint: boolean;
  columnsCount: number;
  onColumnsCountChange: (count: number) => void;
  onClose: () => void;
  onNavigate: (direction: 'up' | 'down') => void;
  onJumpTo: (index: number) => void;
  onPrintReport: () => void;
}> = ({
  visit,
  labRequests,
  index,
  medHistory,
  isLoadingMedHistory,
  canPrint,
  columnsCount,
  onColumnsCountChange,
  onClose,
  onNavigate,
  onJumpTo,
  onPrintReport,
}) => {
  const open = index !== null;
  const canGoUp = index !== null && index > 0;
  const canGoDown = index !== null && index < labRequests.length - 1;
  // Sliding window of `columnsCount`: the request at `index` and the ones right after it.
  const visibleRequests = useMemo(
    () => Array.from({ length: columnsCount }, (_, i) => (index !== null ? labRequests[index + i] : undefined)),
    [index, labRequests, columnsCount]
  );
  const lastVisibleIndex =
    index !== null ? Math.min(index + columnsCount - 1, labRequests.length - 1) : null;

  const p = visit.patient;

  // Keyboard navigation while the viewer is open: ArrowUp/ArrowDown move the window by one.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (canGoUp) onNavigate('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (canGoDown) onNavigate('down');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, canGoUp, canGoDown, onNavigate]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: '100vw', maxWidth: '100vw' } } }}>
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar: condensed patient info, one line, plus navigation + close */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25 }} dir="rtl">
          <Typography sx={{ fontSize: '1.05rem' }}>
            <Box component="span" sx={{ fontWeight: 700 }}>
              {p?.name}
            </Box>
            {' • '}
            {p?.age_year ? `${p.age_year} سنة` : '—'}
            {' • '}
            {p ? GENDER_LABELS[p.gender] ?? p.gender : ''}
            {p?.address ? ` • ${p.address}` : ''}
          </Typography>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Previous lab request (↑ arrow key)">
            <span>
              <IconButton size="small" onClick={() => onNavigate('up')} disabled={!canGoUp}>
                <ChevronUp size={20} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Next lab request (↓ arrow key)">
            <span>
              <IconButton size="small" onClick={() => onNavigate('down')} disabled={!canGoDown}>
                <ChevronDown size={20} />
              </IconButton>
            </span>
          </Tooltip>
          {index !== null && (
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {index + 1}
              {lastVisibleIndex !== null && lastVisibleIndex > index ? `-${lastVisibleIndex + 1}` : ''} / {labRequests.length} — use ↑ / ↓ to move quickly between lab requests
            </Typography>
          )}

          <ToggleButtonGroup
            size="small"
            exclusive
            value={columnsCount}
            onChange={(_, value) => {
              if (value !== null) onColumnsCountChange(value);
            }}
          >
            {VIEWER_COLUMN_OPTIONS.map(count => (
              <ToggleButton key={count} value={count} sx={{ px: 1, py: 0.25, fontSize: '0.7rem' }}>
                {count}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>


            <Tooltip title="معاينة/طباعة تقرير المختبر">
              <IconButton size="small" onClick={onPrintReport}>
                <Printer size={20} />
              </IconButton>
            </Tooltip>


            <Button variant="outlined" size="small" onClick={onClose}>
              <X size={20} />
            خروج
            </Button>
        </Box>

        {/* Requested lab tests — click one to jump straight to its results */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, px: 2, pb: 1.25 }} dir="rtl">
          {labRequests.map((req, i) => {
            const isShown = index !== null && i >= index && i < index + columnsCount;
            return (
              <Chip
                key={req.id}
                label={req.main_test?.main_test_name ?? `طلب #${req.id}`}
                size="small"
                clickable
                onClick={() => onJumpTo(i)}
                color={isShown ? 'primary' : 'default'}
                variant={isShown ? 'filled' : 'outlined'}
              />
            );
          })}
        </Box>
        <Divider />

        {/* Vitals (left) + two lab request result panes, expanded to fill the freed-up space */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row' }} dir="ltr">
          {visibleRequests.map((req, i) => (
            <React.Fragment key={req?.id ?? `empty-${i}`}>
              {i > 0 && <Divider orientation="vertical" flexItem />}
              <LabResultPane labRequest={req} />
            </React.Fragment>
          ))}
        </Box>
      </Box>
    </Drawer>
  );
};

const LabResultsSection: React.FC<LabResultsSectionProps> = ({ visit }) => {
  const queryClient = useQueryClient();
  const [selectedTests, setSelectedTests] = useState<MainTestStripped[]>([]);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [columnsCount, setColumnsCount] = useState<number>(() => {
    const stored = Number(localStorage.getItem(VIEWER_COLUMNS_STORAGE_KEY));
    return VIEWER_COLUMN_OPTIONS.includes(stored as (typeof VIEWER_COLUMN_OPTIONS)[number]) ? stored : 2;
  });
  const testSelectionAutocompleteRef = useRef<HTMLDivElement>(null);

  const handleColumnsCountChange = useCallback((count: number) => {
    setColumnsCount(count);
    localStorage.setItem(VIEWER_COLUMNS_STORAGE_KEY, String(count));
  }, []);

  const visitId = visit?.id;
  const patientId = visit?.patient_id;
  const labRequests: LabRequest[] = visit?.lab_requests ?? [];
  const resultsReady = visit?.result_auth === true;

  const { data: rawAvailableTests = [], isLoading: isLoadingTests } = useQuery<MainTestStripped[]>({
    queryKey: ['availableLabTests', visitId],
    queryFn: () => getAvailableLabTestsForVisit(visitId!),
    enabled: !!visitId,
  });

  const { data: topRequestedTests = [], isLoading: isLoadingTopTests } = useQuery<MainTestStripped[]>({
    queryKey: ['topRequestedLabTests', visitId],
    queryFn: () => getTopRequestedLabTestsForVisit(visitId!),
    enabled: !!visitId,
  });

  // Shares the same cache entry PatientWorkspace uses for this patient, so opening
  // the results viewer doesn't issue a duplicate request if it's already loaded.
  const { data: medHistory, isLoading: isLoadingMedHistory } = useQuery<PatientMedicalHistory>({
    queryKey: ['medicalHistory', patientId],
    queryFn: () => getMedicalHistory(patientId!),
    enabled: !!patientId,
  });

  const availableTests = useMemo(() => [...rawAvailableTests].sort((a, b) => a.id - b.id), [rawAvailableTests]);
  const selectedIds = useMemo(() => new Set(selectedTests.map(t => t.id)), [selectedTests]);

  const addTestsMutation = useMutation({
    mutationFn: () => addLabTestsToVisit({ visitId: visitId!, main_test_ids: selectedTests.map(t => t.id) }),
    onSuccess: added => {
      toast.success(`تمت إضافة ${added.length} فحص بنجاح`);
      queryClient.invalidateQueries({ queryKey: ['doctorVisit', visitId] });
      queryClient.invalidateQueries({ queryKey: ['availableLabTests', visitId] });
      setSelectedTests([]);
    },
    onError: () => toast.error('حدث خطأ أثناء إضافة الفحوصات'),
  });

  const notifyMutation = useMutation({
    mutationFn: () => notifyLabReceptionOfVisit(visitId!),
    onSuccess: () => toast.success('تم إرسال الطلب إلى المختبر'),
    onError: () => toast.error('فشل إرسال الطلب إلى المختبر'),
  });

  const [addingTopTestId, setAddingTopTestId] = useState<number | null>(null);
  const addTopTestMutation = useMutation({
    mutationFn: (test: MainTestStripped) => addLabTestsToVisit({ visitId: visitId!, main_test_ids: [test.id] }),
    onMutate: test => setAddingTopTestId(test.id),
    onSuccess: added => {
      toast.success(`تمت إضافة ${added[0]?.main_test?.main_test_name ?? 'الفحص'} بنجاح`);
      queryClient.invalidateQueries({ queryKey: ['doctorVisit', visitId] });
      queryClient.invalidateQueries({ queryKey: ['availableLabTests', visitId] });
      queryClient.invalidateQueries({ queryKey: ['topRequestedLabTests', visitId] });
    },
    onError: () => toast.error('حدث خطأ أثناء إضافة الفحص'),
    onSettled: () => setAddingTopTestId(null),
  });

  const handlePrintReport = useCallback(async () => {
    if (!visit) return;
    setIsPdfLoading(true);
    setPdfUrl(null);
    setIsPdfOpen(true);
    try {
      const objectUrl = await getVisitLabReportPdfUrl(visit.id);
      setPdfUrl(objectUrl);
    } catch {
      toast.error('فشل إنشاء تقرير المختبر');
      setIsPdfOpen(false);
    } finally {
      setIsPdfLoading(false);
    }
  }, [visit]);

  const handleNavigate = useCallback(
    (direction: 'up' | 'down') => {
      setViewIndex(prev => {
        if (prev === null) return prev;
        const next = direction === 'up' ? prev - 1 : prev + 1;
        return next >= 0 && next < labRequests.length ? next : prev;
      });
    },
    [labRequests.length]
  );

  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          طلبات المختبر ({labRequests.length})
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {resultsReady && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Printer size={14} />}
              onClick={handlePrintReport}
              sx={{ fontSize: '0.75rem', py: 0.5 }}
            >
              طباعة التقرير
            </Button>
          )}
          {labRequests.length > 0 && (
            <Button
              size="small"
              variant="outlined"
              startIcon={notifyMutation.isPending ? <CircularProgress size={14} /> : <Send size={14} />}
              disabled={notifyMutation.isPending}
              onClick={() => notifyMutation.mutate()}
              sx={{ fontSize: '0.75rem', py: 0.5 }}
            >
              إرسال إلى المختبر
            </Button>
          )}
        </Box>
      </Box>

      {/* Always-visible test picker — same pattern as the Lab Reception page */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, flexWrap: 'wrap', bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Autocomplete
          ref={testSelectionAutocompleteRef}
          multiple
          options={availableTests}
          value={selectedTests}
          onChange={(_, newValue) => setSelectedTests(newValue)}
          getOptionKey={option => option.id}
          getOptionLabel={option => option.main_test_name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          loading={isLoadingTests}
          size="small"
          sx={{ width: 320 }}
          renderInput={params => (
            <TextField
              {...params}
              label="اختر الفحوصات لإضافتها"
              variant="outlined"
              placeholder="ابحث واختر الفحوصات..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const enteredId = (e.target as HTMLInputElement).value;
                  const foundTest = availableTests.find(test => test.id === parseInt(enteredId, 10));
                  if (foundTest && !selectedIds.has(foundTest.id)) {
                    setSelectedTests([...selectedTests, foundTest]);
                  }
                } else if (e.key === '+' || e.key === '=') {
                  e.preventDefault();
                  if (selectedTests.length > 0 && !addTestsMutation.isPending) {
                    addTestsMutation.mutate();
                    (e.target as HTMLInputElement).blur();
                  }
                }
              }}
            />
          )}
          noOptionsText="لا توجد نتائج"
          loadingText="جاري التحميل"
        />

        <Button
          onClick={() => addTestsMutation.mutate()}
          disabled={selectedTests.length === 0 || addTestsMutation.isPending}
          variant="contained"
          size="small"
          startIcon={addTestsMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        >
          إضافة فحص {selectedTests.length > 0 && `(${selectedTests.length})`}
        </Button>
      </Box>

      <LabReportPdfPreviewDialog
        isOpen={isPdfOpen}
        onOpenChange={open => {
          setIsPdfOpen(open);
          if (!open) {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
          }
        }}
        pdfUrl={pdfUrl}
        title="تقرير نتائج المختبر"
        fileName={`lab-report-${visit.id}.pdf`}
        isLoading={isPdfLoading}
      />

      <LabResultViewerDrawer
        visit={visit}
        labRequests={labRequests}
        index={viewIndex}
        medHistory={medHistory}
        isLoadingMedHistory={isLoadingMedHistory}
        canPrint={resultsReady}
        columnsCount={columnsCount}
        onColumnsCountChange={handleColumnsCountChange}
        onClose={() => setViewIndex(null)}
        onNavigate={handleNavigate}
        onJumpTo={setViewIndex}
        onPrintReport={handlePrintReport}
      />


      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', p: 2, bgcolor: 'background.paper' }}>
        {labRequests.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              width: '220px',
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              الفحوصات المطلوبة ({labRequests.length})
            </Typography>
            {labRequests.map((req, i) => (
              <LabRequestRow key={req.id} labRequest={req} onView={() => setViewIndex(i)} />
            ))}
          </Box>
        )}

        {(isLoadingTopTests || topRequestedTests.length > 0) && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              width: '220px',
              marginInlineStart: 'auto',
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: theme => alpha(theme.palette.warning.main, 0.3),
              bgcolor: theme => alpha(theme.palette.warning.main, 0.06),
            }}
          >
            <Typography variant="caption" fontWeight={700} color="warning.dark" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Star size={12} /> الأكثر طلبًا
            </Typography>
            {isLoadingTopTests ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              topRequestedTests.map(test => (
                <Paper
                  key={test.id}
                  onClick={() => {
                    if (!addTopTestMutation.isPending) addTopTestMutation.mutate(test);
                  }}
                  elevation={0}
                  sx={{
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    cursor: addTopTestMutation.isPending ? 'default' : 'pointer',
                    opacity: addingTopTestId === test.id ? 0.6 : 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    transition: 'all 0.12s',
                    '&:hover': addTopTestMutation.isPending ? undefined : { borderColor: 'warning.main', bgcolor: 'action.hover' },
                  }}
                >
                  <Typography  variant="body2" sx={{ flex: 1 }}>
                    {test.main_test_name}
                  </Typography>
                  {addingTopTestId === test.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                </Paper>
              ))
            )}
          </Box>
        )}
      </Box>
    </Paper>
    </Box>
  );
};

export default LabResultsSection;
