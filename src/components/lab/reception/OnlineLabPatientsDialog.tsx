import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, Timestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
} from '@mui/material';
import { RotateCcw, TestTube, AlertTriangle, Save, Search } from 'lucide-react';
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
}

interface OnlineLabPatientsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const OnlineLabPatientsDialog: React.FC<OnlineLabPatientsDialogProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const [patients, setPatients] = useState<OnlineLabPatient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPatientId, setSavingPatientId] = useState<string | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searchDate, setSearchDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [labToLap, setLabToLap] = useState<any[]>([]);
  const fetchOnlineLabPatients = async (nameFilter?: string, dateFilter?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Reference to the Firestore collection: /labToLap/global/patients
      const patientsRef = collection(db, 'labToLap', 'global', 'patients');
      
      // Build query conditions
      const queryConditions: QueryConstraint[] = [];
      
      // Add name filter if provided
      if (nameFilter && nameFilter.trim()) {
        // For name search, we'll use array-contains for partial matching
        // Since Firestore doesn't support case-insensitive search directly,
        // we'll fetch all and filter on client side for name
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
      
      const q = query(patientsRef, ...queryConditions);
      const querySnapshot = await getDocs(q);
      const patientsData: OnlineLabPatient[] = [];
      
      // Process each patient document
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        // console.log(data, 'patient data');
        
        // Apply name filter on client side if needed (for case-insensitive search)
        if (nameFilter && nameFilter.trim()) {
          const patientName = data.name || '';
          if (!patientName.toLowerCase().includes(nameFilter.toLowerCase())) {
            continue; // Skip this patient if name doesn't match
          }
        }
        
        // Fetch lab_request subcollection for this patient
        const labRequestRef = collection(db, 'labToLap', 'global', 'patients', doc.id, 'lab_request');
        const labRequestSnapshot = await getDocs(labRequestRef);
        
        const labRequests: LabRequest[] = [];
        labRequestSnapshot.forEach((labDoc) => {
          const labData = labDoc.data();
          // console.log(labData, 'lab request data');
          labRequests.push({
            
            container_id: labData.container_id || 0,
            createdAt: labData.createdAt,
            name: labData.name || '',
            price: labData.price || 0,
            testId: labData.testId || ''
          } as LabRequest);
        });
        //  console.log(patientsData, 'patientsData')
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
      
      setPatients(patientsData);
    } catch (err) {
      console.error('Error fetching online lab patients:', err);
      setError('فشل في جلب بيانات المرضى من المختبرات الأخرى');
    } finally {
      setIsLoading(false);
    }
  };
  // showJsonDialog(labToLap)
  useEffect(() => {
    const fetchLabToLap = async () => {
     const querySnapshot = await getDocs(collection(db,'labToLap'))
     const labToLap: any[] = []
     querySnapshot.forEach(async (doc) => {
      const data = doc.data()
      console.log(data, 'data',doc.id,'doc')
      labToLap.push({...data, id: doc.id})
     })
     setLabToLap(labToLap)
    }
    fetchLabToLap()
  }, [isOpen]);
 console.log(labToLap, 'labToLap')
  useEffect(() => {
    if (isOpen) {
      fetchOnlineLabPatients(searchName, searchDate);
    }
  }, [isOpen, searchName, searchDate]);

  // Debounced search effect
  useEffect(() => {
    if (!isOpen) return;
    
    const timeoutId = setTimeout(() => {
      fetchOnlineLabPatients(searchName, searchDate);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchName, searchDate, isOpen]);

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'غير محدد';
    try {
      const date = (timestamp as { toDate?: () => Date }).toDate ? 
        (timestamp as { toDate: () => Date }).toDate() : 
        new Date(timestamp as string | number);
      return dayjs(date).format('DD/MM/YYYY');
    } catch {
      return 'غير محدد';
    }
  };

  const formatTime = (timestamp: unknown) => {
    if (!timestamp) return 'غير محدد';
    try {
      const date = (timestamp as { toDate?: () => Date }).toDate ? 
        (timestamp as { toDate: () => Date }).toDate() : 
        new Date(timestamp as string | number);
      return dayjs(date).format('HH:mm');
    } catch {
      return 'غير محدد';
    }
  };

  const getStatusChipColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'في الانتظار';
      case 'completed':
        return 'مكتمل';
      case 'in_progress':
        return 'قيد التنفيذ';
      default:
        return status;
    }
  };

  const calculateTotalPrice = (labRequests: LabRequest[]) => {
    return labRequests.reduce((total, request) => total + (request.price || 0), 0);
  };

  const handleSavePatient = async (patient: OnlineLabPatient) => {
    // showJsonDialog(patient)
    setSavingPatientId(patient.id);
    try {
      const response = await apiClient.post('/patients/save-from-online-lab', {
        name: patient.name,
        phone: patient.phone,
        lab_requests: patient.lab_request,
        external_lab_id: patient.labId,
        external_patient_id: patient.id,
        created_at: patient.createdAt,
        lab_to_lab_object_id: patient.id,
        labId: patient.labId,
      });

      // Show success message or handle success
      // console.log('Patient saved successfully:', response.data);
      
      // Optionally remove the patient from the list or mark as saved
      setPatients(prev => prev.filter(p => p.id !== patient.id));
      
    } catch (error) {
      // console.error('Error saving patient:', error);
      // Error handling is already done by the API client interceptor
      // Just set a local error state for this specific operation
      setError('فشل في حفظ بيانات المريض');
    } finally {
      setSavingPatientId(null);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => onOpenChange(false)}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 2 }}>
        <TestTube size={24} />
        <Typography variant="h6" component="span">
          المرضى من المختبرات الأخرى
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Search Filters */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ 
              display: 'flex', 
              width:'600px',
              gap: 2, 
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' }
            }}>
              <Box sx={{ flex: 1 }}>
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
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
             
                  sx={{
                    width:'150px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>

          {isLoading && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 8,
              gap: 2
            }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                جاري التحميل...
              </Typography>
            </Box>
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
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>الهاتف</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>المعمل</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>المبلغ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>الوقت</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>التاريخ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>التحليل</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>الحالة</TableCell>
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
                      <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, px: 1 }}>
                        {patient.phone}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        {labToLap.find(lab => lab.id === patient.labId)?.name || 'غير محدد'}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          {formatNumber(calculateTotalPrice(patient.lab_request))}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        {formatTime(patient.createdAt)}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        {formatDate(patient.createdAt)}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                        {patient.lab_request && patient.lab_request.length > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <TestTube size={16} color="#666" />
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
                        <Chip 
                          label={getStatusText(patient.status)}
                          color={getStatusChipColor(patient.status) as 'warning' | 'success' | 'info' | 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
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
          onClick={() => fetchOnlineLabPatients(searchName, searchDate)} 
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <RotateCcw size={16} />}
        >
          تحديث
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OnlineLabPatientsDialog;
