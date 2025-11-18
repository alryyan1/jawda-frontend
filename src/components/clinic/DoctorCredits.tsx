import { useEffect, useMemo, useState } from "react";
import apiClient from "@/services/api";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import dayjs from "dayjs";
import { Eye } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { DoctorShift as DoctorShiftType, Doctor } from "@/types/doctors";
import type { DoctorShiftFinancialSummary } from "@/types/reports";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";

interface UserPropShape {
  id: number;
  isAdmin: boolean;
}

type DoctorShiftItem = DoctorShiftType & {
  user_id: number;
  is_cash_revenue_prooved?: boolean;
  is_cash_reclaim_prooved?: boolean;
  is_company_revenue_prooved?: boolean;
  is_company_reclaim_prooved?: boolean;
  created_at?: string;
  doctor?: Doctor;
  // Additional properties from API response
  doctor_shift_id?: number;
  status?: string | boolean; // Can be "Open" string or boolean
  total_patients?: number;
  doctor_fixed_share_for_shift?: string;
  doctor_cash_share_total?: number;
  total_doctor_share?: number;
  doctor_insurance_share_total?: number;
  patients_breakdown?: unknown[];
  doctor_visits_count?: number;
};

interface DoctorsCreditsProps {
  setAllMoneyUpdatedLab: (update: (prev: number) => number) => void;
  user: UserPropShape;
}

// Lightweight value loader similar to TdLoader in the legacy code
function ValueLoader({ api, field }: { api: string; field?: string }) {
  const [value, setValue] = useState<number | string>("…");
  useEffect(() => {
    let mounted = true;
    apiClient
      .get(api)
      .then(({ data }) => {
        if (!mounted) return;
        const response = data?.data ?? data;
        if (field && response && typeof response === 'object') {
          setValue(response[field] || 0);
        } else {
          setValue(response || 0);
        }
      })
      .catch(() => setValue("-"));
    return () => {
      mounted = false;
    };
  }, [api, field]);
  const formatted = useMemo(() => {
    const num = Number(value);
    return isNaN(num) ? String(value) : formatNumber(num);
  }, [value]);
  return <TableCell className="text-xl!">{formatted}</TableCell>;
}

function DoctorCredits({ setAllMoneyUpdatedLab }: DoctorsCreditsProps) {
  const { currentClinicShift } = useAuth();
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [temp, setTemp] = useState<number>(0);
  const [bankAmount, setBankAmount] = useState<number>(0);
  const [doctorShifts, setDoctorShifts] = useState<DoctorShiftItem[]>([]);
  const [showCashReclaimDialog, setShowCashReclaimDialog] = useState(false);
  const [update, setUpdate] = useState(0);
  const [showAdditionalCosts, setShowAdditionalCosts] = useState(false);
  const [selectedDoctorShift, setSelectedDoctorShift] = useState<DoctorShiftItem | null>(null);
  const [isAddingCost, setIsAddingCost] = useState(false);
  // Removed fetching of last shift as it is not used currently
  const { user } = useAuth();
  useEffect(() => {
    document.title = "استحقاق الاطباء";
  }, []);

  useEffect(() => {
    // Get all doctor shifts
    apiClient.get("/doctor-shifts", {
      params: {
        // status: '1', // Only open shiftst
        today: true,
        per_page: 100,
        shift_id: currentClinicShift?.id
      }
    }).then(({ data }) => {
      const list = Array.isArray(data?.data) ? data.data : data;
      setDoctorShifts(list);
    });
  }, [update, currentClinicShift?.id]);

  const addCost = (
    doctorShiftId: number,
    amountCash: number,
    amountBank: number,
    doctorName: string,
    setIsLoading: (loading: boolean) => void
  ) => {
    setIsLoading(true);
    setIsAddingCost(true);
    
    // Get current shift ID from auth context
    const currentShiftId = currentClinicShift?.id;
    
    if (!currentShiftId) {
      console.error('No current shift available');
      setIsLoading(false);
      setIsAddingCost(false);
      return;
    }
    if ((amountCash || 0) <= 0 && (amountBank || 0) <= 0) {
      console.error('At least one amount (cash or bank) must be greater than zero.');
      setIsLoading(false);
      setIsAddingCost(false);
      return;
    }
    
    apiClient
      .post('/costs', {
        shift_id: currentShiftId,
        doctor_shift_id: doctorShiftId,
        description: `خصم استحقاق الطبيب ${doctorName}`,
        comment: `خصم تلقائي من استحقاق الطبيب ${doctorName}`,
        amount_cash_input: amountCash,
        amount_bank_input: amountBank,
        doctor_shift_id_for_sub_cost: doctorShiftId,
      })
      .then(({ data }) => {
        console.log('Cost added successfully:', data);
        setUpdate((prev) => prev + 1);
        setAllMoneyUpdatedLab((prev) => prev + 1);
      })
      .catch((error) => {
        console.error('Error adding cost:', error);
        // You might want to show a toast notification here
      })
      .finally(() => {
        setIsLoading(false);
        setIsAddingCost(false);
      });
  };


  useEffect(() => {
    setCashAmount(0);
    setBankAmount(0);
    if (selectedDoctorShift) {
      const api = selectedDoctorShift.doctor?.calc_insurance ? "doctor-shifts" : "doctor-shifts";
      apiClient.get<{ data: DoctorShiftFinancialSummary }>(`${api}/${selectedDoctorShift.id}/financial-summary`).then(({ data }) => {
        const summary: DoctorShiftFinancialSummary = data?.data ?? data;
        const cashAmount = summary?.total_doctor_share || 0;
        setCashAmount(cashAmount);
        setTemp(cashAmount);
      });
    }
  }, [selectedDoctorShift]);

  const prooveCashReclaim = (setIsLoading: (loading: boolean) => void) => {
    const r = confirm("هل انت متاكد من اثبات استحقاق الطبيب");
    if (!r) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    if (!selectedDoctorShift?.id) return;

    if ((cashAmount || 0) <= 0 && (bankAmount || 0) <= 0) {
      alert('يجب أن يكون أحد المبلغين (الصندوق أو البنك) أكبر من صفر');
      setIsLoading(false);
      return;
    }

    addCost(selectedDoctorShift.id, cashAmount, bankAmount, selectedDoctorShift.doctor?.name || selectedDoctorShift.doctor_name || '', setIsLoading);

    // Use the available proofing flags endpoint
    apiClient
      .put(`/doctor-shifts/${selectedDoctorShift.id}/update-proofing-flags`, {
        is_cash_reclaim_prooved: true
      })
      .then(({ data }) => {
        setShowCashReclaimDialog(false);
        const updated = data?.data ?? data;
        setDoctorShifts((prev) => prev.map((item) => (item.id === selectedDoctorShift.id ? updated : item)));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };
  const {hasRole}= useAuthorization();

  return (
    <Paper elevation={2} sx={{ p: 1 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
      </Typography>
        <Table style={{ direction: "rtl" }} className="text-xl!" size="small">
        <TableHead>
          <TableRow>
            <TableCell>الحالة</TableCell>
            <TableCell>الاسم</TableCell>
            <TableCell>اجمالي الاستحقاق</TableCell>
            <TableCell>عدد المرضي</TableCell>
            <TableCell>استحقاق النقدي</TableCell>
            <TableCell>استحقاق التامين</TableCell>
            <TableCell>الزمن</TableCell>
            <TableCell> اثبات الاستحقاق النقدي</TableCell>
            <TableCell>اخري</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {doctorShifts
            .filter((d) => {
              if(hasRole('admin')){
                return true;
              }
              if(user?.user_type == 'خزنه موحده'){
                return true;
              }
              return d.user_id_opened === user?.id;
            })
            .map((shift) => {
              // Determine if shift is open - status can be boolean, number, or string
              const statusValue = shift.status;
              const isOpen = statusValue === true || 
                            (typeof statusValue === 'number' && statusValue === 1) || 
                            (typeof statusValue === 'string' && (statusValue === "1" || statusValue === "Open"));
              
              return (
                <TableRow key={shift.id}>
                  <TableCell className="text-xl!">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: isOpen ? '#4CAF50' : '#F44336', // Green for open, red for closed
                        margin: '0 auto',
                        border: '2px solid',
                        borderColor: isOpen ? '#2E7D32' : '#C62828', // Darker border
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      title={isOpen ? 'مفتوح' : 'مغلق'}
                    />
                  </TableCell>
                  <TableCell className="text-xl!">{shift.doctor?.name || shift.doctor_name}</TableCell>
                  <ValueLoader api={`doctor-shifts/${shift.id}/financial-summary`} field="total_doctor_share" />
                  <TableCell className="text-xl!">{shift.doctor_visits_count}</TableCell>
                  <ValueLoader api={`doctor-shifts/${shift.id}/financial-summary`} field="doctor_cash_share_total" />
                  <ValueLoader api={`doctor-shifts/${shift.id}/financial-summary`} field="doctor_insurance_share_total" />
                  <TableCell className="text-xl!">
                    {shift.created_at
                      ? dayjs(Date.parse(shift.created_at)).format("H:m A")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-xl!">
                    <Button
                      disabled={ Boolean(shift.is_cash_reclaim_prooved)}
                      onClick={() => {
                        setShowCashReclaimDialog(true);
                        setSelectedDoctorShift(shift);
                      }}
                      variant="contained"
                      size="small"
                    >
                      اثبات الاستحقاق النقدي
                    </Button>
                  </TableCell>
                  <TableCell className="text-xl!">
                    <Button
                      onClick={() => {
                        setSelectedDoctorShift(shift);
                        setShowAdditionalCosts(true);
                      }}
                      size="small"
                    >
                      <Eye />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>

      {/* Additional Costs Dialog (placeholder replacing DoctorShiftAddictionalCosts) */}
      <Dialog open={showAdditionalCosts} onClose={() => setShowAdditionalCosts(false)} fullWidth>
        <DialogTitle>التكاليف الإضافية</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            لا توجد مكونات إضافية متاحة هنا حالياً.
          </Typography>
          {selectedDoctorShift && (
            <Typography variant="body2">
              الطبيب: {selectedDoctorShift.doctor?.name || selectedDoctorShift.doctor_name}
      </Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Cash reclaim dialog */}
      <Dialog open={showCashReclaimDialog} onClose={() => setShowCashReclaimDialog(false)} fullWidth>
        <DialogTitle>اثبات الاستحقاق النقدي</DialogTitle>
        <DialogContent>
          <Stack direction={"column"} gap={1} sx={{ p: 1 }}>
            <TextField
              type="number"
              value={cashAmount}
              onChange={(e) => {
                const value = Number(e.target.value || 0);
                setCashAmount(value);
                setBankAmount(temp - value);
              }}
              label="الصندوق"
            />
            <TextField
              type="number"
              value={bankAmount}
              onChange={(e) => {
                const value = Number(e.target.value || 0);
                setBankAmount(value);
                setCashAmount(temp - value);
              }}
              label="البنك"
            />
            <Button 
              onClick={() => prooveCashReclaim(() => {})} 
              variant="contained"
              disabled={isAddingCost}
            >
              {isAddingCost ? 'جاري المعالجة...' : 'خصم  الاستحقاق النقدي'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Paper>
  );
}

export default DoctorCredits;