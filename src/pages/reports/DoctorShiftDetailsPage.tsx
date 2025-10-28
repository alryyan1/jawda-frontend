// src/pages/reports/DoctorShiftDetailsPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User, Calendar, Clock, FileText, Eye } from "lucide-react";

// MUI imports
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { Button as UIButton } from "@/components/ui/button";

// Services and types
import { getActiveClinicPatients } from "@/services/clinicService";
import type { DoctorShiftReportItem } from "@/types/reports";
import type { ActivePatientVisit } from "@/types/patients";
import { formatNumber } from "@/lib/utils";
import RequestedServicesTable from "@/components/clinic/RequestedServicesTable";
import { webUrl } from "../constants";

const DoctorShiftDetailsPage: React.FC = () => {
  const { doctorShiftId } = useParams<{ doctorShiftId: string }>();
  const navigate = useNavigate();
  const [shiftData, setShiftData] = useState<DoctorShiftReportItem | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<ActivePatientVisit | null>(null);
  const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);

  // Get shift data from location state (passed from the report page) or sessionStorage
  useEffect(() => {
    const state = history.state;
    if (state?.shiftData) {
      setShiftData(state.shiftData);
    } else {
      // Fallback: try to get data from sessionStorage
      const storedData = sessionStorage.getItem('selectedShiftData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setShiftData(parsedData);
        } catch (error) {
          console.error('Error parsing stored shift data:', error);
        }
      }
    }
  }, []);

  // Fetch patients for this shift
  const {
    data: patients,
    isLoading: isLoadingPatients,
    error: patientsError,
  } = useQuery({
    queryKey: ["doctorShiftPatients", doctorShiftId],
    queryFn: () => getActiveClinicPatients({ doctor_shift_id: parseInt(doctorShiftId!) }),
    enabled: !!doctorShiftId,
  });


  // Use financial data from shift data (passed from previous page)
  const financialSummary = React.useMemo(() => {
    if (!shiftData) {
      return {
        total_income: 0,
        clinic_enurance: 0,
        cash_entitlement: 0,
        insurance_entitlement: 0,
        total_doctor_entitlement: 0,
      };
    }

    return {
      total_income: shiftData.total_income || 0,
      clinic_enurance: shiftData.clinic_enurance || 0,
      cash_entitlement: shiftData.cash_entitlement || 0,
      insurance_entitlement: shiftData.insurance_entitlement || 0,
      total_doctor_entitlement: shiftData.total_doctor_entitlement || 0,
    };
  }, [shiftData]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleShowServices = (patient: ActivePatientVisit) => {
    setSelectedPatient(patient);
    setIsServicesDialogOpen(true);
  };

  const handleCloseServicesDialog = () => {
    setIsServicesDialogOpen(false);
    setSelectedPatient(null);
  };

  const handlePrintReceipt = () => {
    // Implement print receipt functionality
    console.log('Print receipt for patient:', selectedPatient?.id);
  };

  if (!doctorShiftId) {
    return (
      <Alert severity="error" className="m-4">
        معرف مناوبة الطبيب غير صحيح
      </Alert>
    );
  }

  if (!shiftData) {
    return (
      <Alert severity="warning" className="m-4">
        <Typography variant="h6" className="mb-2">
          لا يمكن تحميل بيانات المناوبة
        </Typography>
        <Typography variant="body2" className="mb-2">
          يرجى العودة إلى صفحة التقارير والنقر على اسم الطبيب مرة أخرى.
        </Typography>
        <UIButton
          onClick={handleBack}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          العودة إلى التقارير
        </UIButton>
      </Alert>
    );
  }

  if (patientsError) {
    return (
      <Alert severity="error" className="m-4">
        فشل في جلب البيانات: {patientsError?.message}
      </Alert>
    );
  }

  return (
    <Box className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <UIButton
          onClick={handleBack}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة
        </UIButton>
        <div className="flex-1 flex items-center gap-2">
        
          <Typography variant="h4" color="text.secondary">
            {shiftData?.doctor_name || "جاري التحميل..."}
          </Typography>
          <a href={`${webUrl}reports/clinic-report-old/pdf?doctor_shift_id=${doctorShiftId}`} target="_blank">
            <Button variant="contained" color="primary">
              طباعة التقرير
            </Button>
          </a>
        </div>
        
        {/* Financial Summary in Header */}
        {shiftData && (
          <div className="flex gap-4">
            <div className="text-center p-2  bg-green-50 dark:bg-green-900/20 rounded-lg min-w-[100px]">
              <Typography  variant="h5" className="text-green-600 font-bold">
                {formatNumber(financialSummary.total_income || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                إجمالي الإيرادات
              </Typography>
            </div>
            <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg min-w-[100px]">
              <Typography  variant="h5" className="text-red-600 font-bold">
                {formatNumber(financialSummary.clinic_enurance || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                تحمل العيادة
              </Typography>
            </div>
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg min-w-[100px]">
                <Typography  variant="h5" className="text-blue-600 font-bold">
                {formatNumber(financialSummary.cash_entitlement || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                استحقاق كاش
              </Typography>
            </div>
            <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg min-w-[100px]">
              <Typography  variant="h5" className="text-purple-600 font-bold">
                {formatNumber(financialSummary.insurance_entitlement || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                استحقاق تأمين
              </Typography>
            </div>
            <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg min-w-[100px]">
              <Typography  variant="h5" className="text-orange-600 font-bold">
                {formatNumber(financialSummary.total_doctor_entitlement || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                إجمالي الاستحقاق
              </Typography>
            </div>
          </div>
        )}
      </div>

      {/* Shift Information Card */}
      {shiftData && (
        <Card className="mb-4">
          <CardContent className="!p-4">
            <div className="flex flex-wrap justify-around gap-1">
              <div className="flex items-center gap-2 border-r-2 pr-2 justify-around border-blue-600 pl-2">
                <User className="h-4 w-4 text-blue-600" />
                <div>
                  <Typography variant="subtitle1" className="font-semibold">
                    {shiftData.doctor_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {shiftData.doctor_specialist_name || "غير محدد"}
                  </Typography>
                </div>
              </div>
              
              <div className="flex items-center gap-2 border-r-2 pr-2 justify-around border-green-600 pl-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <div>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ المناوبة
                  </Typography>
                  <Typography variant="body2" className="font-medium">
                    {shiftData.created_at
                      ? new Date(shiftData.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                        })
                      : "-"}
                  </Typography>
                </div>
              </div>
              
              <div className="flex items-center gap-2 border-r-2 pr-2 justify-around border-orange-600 pl-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div>
                  <Typography variant="caption" color="text.secondary">
                    وقت البداية
                  </Typography>
                  <Typography variant="body2" className="font-medium">
                    {shiftData.formatted_start_time || "-"}
                  </Typography>
                </div>
              </div>
              
              <div className="flex items-center gap-2 border-r-2 pr-2 justify-around border-purple-600 pl-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <div>
                  <Typography variant="caption" color="text.secondary border-b-2 border-purple-600">
                    وقت الانتهاء
                  </Typography>
                  <Typography variant="body2" className="font-medium">
                    {shiftData.formatted_end_time || "-"}
                  </Typography>
                </div>
              </div>
              
              <div className="flex items-center gap-2 border-r-2 pr-2 justify-around border-indigo-600 pl-2">
                <User className="h-4 w-4 text-indigo-600" />
                <div className="flex flex-col gap-1">
                  <Typography variant="caption" color="text.secondary">
                    فتح المناوبة
                  </Typography>
                  <Typography variant="body2" className="font-medium">
                    {shiftData.user_name_opened || "-"}
                  </Typography>
                </div>
              </div>
              
                <div className="flex items-center gap-2 border-r-2 pr-2 justify-around border-gray-600 pl-2">
                <Chip
                  label={shiftData.status ? "مفتوح" : "مغلق"}
                  color={shiftData.status ? "success" : "error"}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {shiftData.general_shift_name || ""}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Patients List */}
      <div className="mb-4">
          <Typography variant="h6" className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            قائمة المرضى ({patients?.length || 0})
          </Typography>
          
          {isLoadingPatients ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : patients && patients.length > 0 ? (
            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center">رقم الزيارة</TableCell>
                    <TableCell align="center">اسم المريض</TableCell>
                    <TableCell align="center">إجمالي المبلغ</TableCell>
                    <TableCell align="center">الخصم</TableCell>
                    <TableCell align="center">المدفوع</TableCell>
                    <TableCell align="center">المتبقي</TableCell>
                    <TableCell align="center">الخدمات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patients.map((visit) => {
                    const totalAmount = visit.requested_services.reduce(
                      (sum, service) => sum + (service.price * service.count), 0
                    );
                    
                    return (
                      <TableRow key={visit.id}>
                        <TableCell align="center" className="font-medium">
                          {visit.id}
                        </TableCell>
                        <TableCell align="center" className="font-medium">
                          {visit.patient.name}
                        </TableCell>
                        <TableCell align="center" className="font-bold">
                          {formatNumber(totalAmount)}
                        </TableCell>
                        <TableCell align="center">
                          {formatNumber(visit.total_discount)}
                        </TableCell>
                        <TableCell align="center" className="text-green-600 font-medium">
                          {formatNumber(visit.total_paid)}
                        </TableCell>
                        <TableCell align="center" className="text-red-600 font-medium">
                          {formatNumber(visit.balance_due)}
                        </TableCell>
                        <TableCell align="center">
                          <UIButton
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowServices(visit)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            عرض الخدمات ({visit.requested_services.length})
                          </UIButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              لا توجد زيارات مرضى لهذه المناوبة
            </Alert>
          )}
      </div>

      {/* Services Dialog */}
      <Dialog
        open={isServicesDialogOpen}
        onClose={handleCloseServicesDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <FileText className="h-5 w-5" />
            الخدمات المطلوبة - {selectedPatient?.patient.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPatient && (
            <RequestedServicesTable
              visitId={selectedPatient.id}
              visit={{
                id: selectedPatient.id,
                patient_id: selectedPatient.patient_id,
                doctor_id: selectedPatient.doctor_id,
                user_id: selectedPatient.user_id || 0,
                shift_id: selectedPatient.shift_id,
                visit_date: selectedPatient.created_at,
                visit_time: selectedPatient.visit_time,
                status: selectedPatient.status,
                visit_type: selectedPatient.visit_type,
                number: selectedPatient.number,
                is_new: selectedPatient.is_new,
                only_lab: selectedPatient.only_lab,
                patient: {
                  ...selectedPatient.patient,
                  patient_id: selectedPatient.patient_id,
                  phone: selectedPatient.patient.phone || '',
                },
                company: selectedPatient.patient.company,
                created_at: selectedPatient.created_at,
                updated_at: selectedPatient.updated_at,
              }}
              requestedServices={selectedPatient.requested_services.map(service => ({
                ...service,
                visit_id: selectedPatient.id,
              }))}
              isLoading={false}
              currentClinicShiftId={shiftData?.shift_id || null}
              onAddMoreServices={() => {}}
              handlePrintReceipt={handlePrintReceipt}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseServicesDialog}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DoctorShiftDetailsPage;
