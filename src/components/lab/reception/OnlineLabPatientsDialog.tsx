import React, { useState, useEffect } from 'react';
import { collection, getDocs, onSnapshot, query, orderBy, where, Timestamp, QueryConstraint, QuerySnapshot } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { labToLabDb } from '@/lib/firebase';
import apiClient from '@/services/api';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Stack,
  Divider,
  Skeleton,
} from '@mui/material';
import { RotateCcw, TestTube, AlertTriangle, Save, Search, CheckCircle2, XCircle, MinusCircle, MessageCircle, Bell } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import dayjs from 'dayjs';
import showJsonDialog from '@/lib/showJsonDialog';

// Types for the Firestore data structure
interface LabRequest {
  container_id: number;
  createdAt: unknown; // Firestore timestamp
  name: string;
  price: number;
  testId: string;
}

interface OnlineLabPatient {
  id: string;
  lab_request: LabRequest[];
  createdAt: unknown; // Firestore timestamp
  labId: string;
  name: string;
  phone?: string; // Add phone field
  status: string;
  barcode?: string; // Add lab2lab_barcode field

}

interface OnlineLabPatientsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Per-channel outcome returned by POST /patients/save-from-online-lab
interface NotificationChannelResult {
  attempted: boolean;
  success: boolean;
  error?: string | null;
}

interface SaveFromOnlineLabNotifications {
  fcm: NotificationChannelResult;
  whatsapp_lab2lab: NotificationChannelResult;
  whatsapp_owner: NotificationChannelResult;
}

interface SaveFromOnlineLabResponse {
  message: string;
  data: unknown;
  notifications?: SaveFromOnlineLabNotifications;
}

interface SaveResultDialogState {
  open: boolean;
  status: 'loading' | 'success' | 'error';
  patientName: string;
  notifications?: SaveFromOnlineLabNotifications;
  errorMessage?: string;
}

const NOTIFICATION_CHANNEL_LABELS: Record<keyof SaveFromOnlineLabNotifications, { label: string; icon: React.ReactNode }> = {
  fcm: { label: 'إشعار استلام العينة (FCM)', icon: <Bell size={18} /> },
  whatsapp_lab2lab: { label: 'رسالة واتساب لهاتف المريض', icon: <MessageCircle size={18} /> },
  whatsapp_owner: { label: 'رسالة واتساب لهاتف المعمل', icon: <MessageCircle size={18} /> },
};

const OnlineLabPatientsDialog: React.FC<OnlineLabPatientsDialogProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const [patients, setPatients] = useState<OnlineLabPatient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPatientId, setSavingPatientId] = useState<string | null>(null);
  const [saveResultDialog, setSaveResultDialog] = useState<SaveResultDialogState | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searchDate, setSearchDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [labToLap, setLabToLap] = useState<any[]>([]);
  // Firestore doc IDs (= patients.lab_to_lab_object_id) already saved to the local system today
  const [savedObjectIds, setSavedObjectIds] = useState<Set<string>>(new Set());

  // Patient count per lab, for the currently loaded (filtered) list
  const labCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    patients.forEach((patient) => {
      counts.set(patient.labId, (counts.get(patient.labId) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([labId, count]) => ({
        labId,
        name: labToLap.find(lab => lab.id === labId)?.name || 'غير محدد',
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [patients, labToLap]);
  // Firestore query conditions shared between the realtime listener and manual refresh
  const buildQueryConditions = (nameFilter?: string, dateFilter?: string): QueryConstraint[] => {
    const queryConditions: QueryConstraint[] = [];

    // Add name filter if provided
    if (nameFilter && nameFilter.trim()) {
      // Firestore doesn't support case-insensitive search directly,
      // so we order by name and filter on the client side below
      queryConditions.push(orderBy('name'));
    }

    // Add date filter if provided
    if (dateFilter) {
      const startOfDay = new Date(dateFilter);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(dateFilter);
      endOfDay.setHours(23, 59, 59, 999);

      queryConditions.push(
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<=', Timestamp.fromDate(endOfDay))
      );
    }

    // Always order by creation date (newest first) if no other ordering is applied
    if (!nameFilter || !nameFilter.trim()) {
      queryConditions.push(orderBy('createdAt', 'desc'));
    }

    return queryConditions;
  };

  // Resolve each patient document plus its lab_request subcollection
  const buildPatientsData = async (
    querySnapshot: QuerySnapshot<DocumentData>,
    nameFilter?: string
  ): Promise<OnlineLabPatient[]> => {
    const patientsData: OnlineLabPatient[] = [];

    for (const doc of querySnapshot.docs) {
      const data = doc.data();

      // Apply name filter on client side if needed (for case-insensitive search)
      if (nameFilter && nameFilter.trim()) {
        const patientName = data.name || '';
        if (!patientName.toLowerCase().includes(nameFilter.toLowerCase())) {
          continue; // Skip this patient if name doesn't match
        }
      }

      // Fetch lab_request subcollection for this patient
      const labRequestRef = collection(labToLabDb!, 'labToLap', 'global', 'patients', doc.id, 'lab_request');
      const labRequestSnapshot = await getDocs(labRequestRef);

      const labRequests: LabRequest[] = [];
      labRequestSnapshot.forEach((labDoc) => {
        const labData = labDoc.data();
        labRequests.push({
          container_id: labData.container_id || 0,
          createdAt: labData.createdAt,
          name: labData.name || '',
          price: labData.price || 0,
          testId: labData.testId || ''
        } as LabRequest);
      });

      patientsData.push({
        id: doc.id,
        lab_request: labRequests,
        createdAt: data.createdAt,
        labId: data.labId || '',
        name: data.name || '',
        phone: data.phone || '',
        status: data.status || 'pending'
      } as OnlineLabPatient);
    }

    return patientsData;
  };

  // Manual refresh: useful to pick up lab_request subcollection changes that
  // don't touch the parent patient document and so won't retrigger the listener below.
  const refreshPatients = async () => {
    if (!labToLabDb) {
      setError('خدمة المختبرات الأخرى غير مفعلة');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const patientsRef = collection(labToLabDb, 'labToLap', 'global', 'patients');
      const q = query(patientsRef, ...buildQueryConditions(searchName, searchDate));
      const querySnapshot = await getDocs(q);
      setPatients(await buildPatientsData(querySnapshot, searchName));
      await fetchSavedObjectIds();
    } catch (err) {
      console.error('Error refreshing online lab patients:', err);
      setError('فشل في جلب بيانات المرضى من المختبرات الأخرى');
    } finally {
      setIsLoading(false);
    }
  };
  // showJsonDialog(labToLap)
  useEffect(() => {
    if (!isOpen || !labToLabDb) return;

    const fetchLabToLap = async () => {
     const querySnapshot = await getDocs(collection(labToLabDb, 'labToLap'))
     const labToLap: any[] = []
     querySnapshot.forEach(async (doc) => {
      const data = doc.data()
      // console.log(data, 'data',doc.id,'doc')
      labToLap.push({...data, id: doc.id})
     })
     setLabToLap(labToLap)
    }
    fetchLabToLap()
  }, [isOpen]);
 // console.log(labToLap, 'labToLap')

  // Fetch today's already-saved lab2lab object IDs, so we can mark them instead of offering to save again
  const fetchSavedObjectIds = async () => {
    try {
      const response = await apiClient.get<{ data: string[] }>('/patients/lab2lab-today-saved-ids');
      setSavedObjectIds(new Set(response.data.data));
    } catch (err) {
      console.error('Error fetching today\'s saved lab2lab patient IDs:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSavedObjectIds();
    }
  }, [isOpen]);

  // Debounce the search inputs so we don't tear down/recreate the Firestore listener on every keystroke
  const [debouncedSearchName, setDebouncedSearchName] = useState(searchName);
  const [debouncedSearchDate, setDebouncedSearchDate] = useState(searchDate);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      setDebouncedSearchName(searchName);
      setDebouncedSearchDate(searchDate);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchName, searchDate, isOpen]);

  // Realtime subscription: reflects new/updated/deleted patient documents as they happen in Firestore
  useEffect(() => {
    if (!isOpen) return;
    if (!labToLabDb) {
      setError('خدمة المختبرات الأخرى غير مفعلة');
      return;
    }

    setIsLoading(true);
    setError(null);

    const patientsRef = collection(labToLabDb, 'labToLap', 'global', 'patients');
    const q = query(patientsRef, ...buildQueryConditions(debouncedSearchName, debouncedSearchDate));

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        try {
          setPatients(await buildPatientsData(querySnapshot, debouncedSearchName));
        } catch (err) {
          console.error('Error processing online lab patients snapshot:', err);
          setError('فشل في جلب بيانات المرضى من المختبرات الأخرى');
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to online lab patients:', err);
        setError('فشل في جلب بيانات المرضى من المختبرات الأخرى');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, debouncedSearchName, debouncedSearchDate]);



  const calculateTotalPrice = (labRequests: LabRequest[]) => {
    return labRequests.reduce((total, request) => total + (request.price || 0), 0);
  };

  const toDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
      return new Timestamp((value as { seconds: number }).seconds, (value as { nanoseconds?: number }).nanoseconds || 0).toDate();
    }
    return new Date(value as string | number);
  };

  const handleSavePatient = async (patient: OnlineLabPatient) => {
    setSavingPatientId(patient.id);
    setSaveResultDialog({ open: true, status: 'loading', patientName: patient.name });
    try {
      const response = await apiClient.post<SaveFromOnlineLabResponse>('/patients/save-from-online-lab', {
        name: patient.name,
        phone: patient.phone,
        lab_phone:labToLap.find(lab => lab.id === patient.labId)?.whatsapp,
        lab_requests: patient.lab_request,
        external_lab_id: patient.labId,
        external_patient_id: patient.id,
        created_at: patient.createdAt,
        lab_to_lab_object_id: patient.id,
        labId: patient.labId,
        lab2lab_id  : patient.id ,
        lab2lab_barcode:patient.barcode ?? '0'
      });

      // Remove the patient from the pending list now that it's saved
      setPatients(prev => prev.filter(p => p.id !== patient.id));
      setSavedObjectIds(prev => new Set(prev).add(patient.id));

      setSaveResultDialog({
        open: true,
        status: 'success',
        patientName: patient.name,
        notifications: response.data.notifications,
      });
    } catch (error) {
      // Error toast is already shown by the API client interceptor;
      // this drives the local alert + the result dialog.
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError?.response?.data?.message || 'فشل في حفظ بيانات المريض';
      setError(errorMessage);
      setSaveResultDialog({
        open: true,
        status: 'error',
        patientName: patient.name,
        errorMessage,
      });
    } finally {
      setSavingPatientId(null);
    }
  };

  return (
    <>
    <Dialog
      open={isOpen}
      onClose={() => onOpenChange(false)}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh', maxHeight: '90vh' }
      }}
    >
 

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Search Filters */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' }
            }}>
              <Box sx={{ width: { xs: '100%', md: 300 } }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="البحث بالاسم..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={20} color="#666" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Box>
              <Box sx={{ width: { xs: '100%', md: 150 } }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}

                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: 'center' }}>
                {labCounts.map(({ labId, name, count }) => (
                  <Chip key={labId} label={`${name}: ${count}`} size="small" color="primary" variant="outlined" />
                ))}
              </Stack>
            </Box>
          </Box>

          {isLoading && (
            <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>الكود</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>الاسم</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>المعمل</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>المبلغ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>التاريخ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>التحليل</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Skeleton variant="text" sx={{ mx: 'auto' }} width={40} />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Skeleton variant="text" sx={{ mx: 'auto' }} width={90} />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Skeleton variant="text" sx={{ mx: 'auto' }} width={100} />
                        <Skeleton variant="text" sx={{ mx: 'auto' }} width={80} />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Skeleton variant="text" sx={{ mx: 'auto' }} width={60} />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Skeleton variant="text" sx={{ mx: 'auto' }} width={80} />
                        <Skeleton variant="text" sx={{ mx: 'auto' }} width={50} />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Skeleton variant="text" sx={{ mx: 'auto' }} width={120} />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Skeleton variant="circular" sx={{ mx: 'auto' }} width={24} height={24} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              icon={<AlertTriangle size={20} />}
            >
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
          )}

          {!isLoading && !error && patients.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary">
                {searchName || searchDate ? 'لا توجد نتائج مطابقة لمعايير البحث' : 'لا توجد طلبات من المختبرات الأخرى'}
              </Typography>
            </Box>
          )}

          {!isLoading && !error && patients.length > 0 && (
            <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>الكود</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>الاسم</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>المعمل</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>المبلغ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>التاريخ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>التحليل</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id} hover>
                      <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>
                        {patient.id}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>
                        {patient.name}
                      </TableCell>
                    
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Stack direction="column" spacing={0.5} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {labToLap.find(lab => lab.id === patient.labId)?.name || 'غير محدد'}
                        </Typography>
                        <Divider sx={{ width: '100%', my: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">
                          {labToLap.find(lab => lab.id === patient.labId)?.whatsapp || 'لا يوجد واتساب'}
                        </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          {formatNumber(calculateTotalPrice(patient.lab_request))}
                        </Typography>
                      </TableCell>
                     
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Stack direction="column" spacing={0.5} alignItems="center">
                          {(() => {
                            const date = toDate(patient.createdAt);
                            return date ? (
                              <>
                                {dayjs(date).format('DD/MM/YYYY')}
                                <Typography variant="caption" color="text.secondary">
                                  {dayjs(date).format('HH:mm A')}
                                </Typography>
                              </>
                            ) : (
                              '-'
                            );
                          })()}
                        </Stack>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        {patient.lab_request && patient.lab_request.length > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {patient.lab_request.map(request => request.name).join('، ')}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            لا توجد تحاليل
                          </Typography>
                        )}
                      </TableCell>
                  
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        {savedObjectIds.has(patient.id) ? (
                          <Tooltip title="تم حفظ هذا المريض بالفعل">
                            <CheckCircle2 size={20} color="#2e7d32" />
                          </Tooltip>
                        ) : (
                          <Tooltip title="حفظ المريض في النظام">
                            <IconButton
                              onClick={() => handleSavePatient(patient)}
                              disabled={savingPatientId === patient.id}
                              color="primary"
                              size="small"
                            >
                              {savingPatientId === patient.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Save size={16} />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          variant="outlined" 
          onClick={() => onOpenChange(false)}
        >
          إغلاق
        </Button>
        <Button 
          variant="contained"
          onClick={() => refreshPatients()} 
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <RotateCcw size={16} />}
        >
          تحديث
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={!!saveResultDialog?.open}
      onClose={() => {
        if (saveResultDialog?.status !== 'loading') {
          setSaveResultDialog(null);
        }
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {saveResultDialog?.status === 'loading' && <CircularProgress size={20} />}
        {saveResultDialog?.status === 'success' && <CheckCircle2 size={22} color="#2e7d32" />}
        {saveResultDialog?.status === 'error' && <XCircle size={22} color="#d32f2f" />}
        <Typography variant="h6" component="span">
          {saveResultDialog?.status === 'loading' && 'جاري حفظ المريض...'}
          {saveResultDialog?.status === 'success' && 'تم حفظ المريض'}
          {saveResultDialog?.status === 'error' && 'فشل حفظ المريض'}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {saveResultDialog?.status === 'loading' && (
          <Typography variant="body2" color="text.secondary">
            جاري حفظ بيانات {saveResultDialog.patientName} وإرسال إشعار الاستلام ورسالتي الواتساب...
          </Typography>
        )}

        {saveResultDialog?.status === 'error' && (
          <Alert severity="error" icon={<AlertTriangle size={20} />}>
            {saveResultDialog.errorMessage}
          </Alert>
        )}

        {saveResultDialog?.status === 'success' && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              تم حفظ بيانات {saveResultDialog.patientName} بنجاح
            </Alert>

            {saveResultDialog.notifications ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {(Object.keys(NOTIFICATION_CHANNEL_LABELS) as Array<keyof SaveFromOnlineLabNotifications>).map((channel) => {
                  const result = saveResultDialog.notifications?.[channel];
                  const { label, icon } = NOTIFICATION_CHANNEL_LABELS[channel];
                  const attempted = result?.attempted ?? false;
                  const success = result?.success ?? false;

                  return (
                    <Box
                      key={channel}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{label}</Typography>
                        {!success && result?.error && (
                          <Typography variant="caption" color="text.secondary">
                            {result.error}
                          </Typography>
                        )}
                      </Box>
                      {!attempted ? (
                        <Tooltip title="لم تتم المحاولة">
                          <MinusCircle size={20} color="#9e9e9e" />
                        </Tooltip>
                      ) : success ? (
                        <Tooltip title="نجح الإرسال">
                          <CheckCircle2 size={20} color="#2e7d32" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="فشل الإرسال">
                          <XCircle size={20} color="#d32f2f" />
                        </Tooltip>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                لم يتم استلام حالة الإشعارات من الخادم.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => setSaveResultDialog(null)}
          disabled={saveResultDialog?.status === 'loading'}
        >
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default OnlineLabPatientsDialog;
