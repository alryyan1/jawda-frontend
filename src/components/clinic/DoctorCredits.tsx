import { useEffect, useMemo, useState } from "react";
import apiClient from "@/services/api";
import JournalEntryDialog from "./JournalEntryDialog";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import {
  Button,
  CircularProgress,
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
import { formatNumber } from "@/lib/utils";
import type { DoctorShift as DoctorShiftType, Doctor } from "@/types/doctors";
import type { DoctorShiftFinancialSummary } from "@/types/reports";
import type { UserShiftIncomeSummary } from "@/types/users";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";

interface UserPropShape {
  id: number;
  isAdmin: boolean;
}

type DoctorShiftItem = DoctorShiftType & {
  user_id: number;
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
        if (field && response && typeof response === "object") {
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
  return <TableCell className="text-sm!">{formatted}</TableCell>;
}

function DoctorCredits({ setAllMoneyUpdatedLab }: DoctorsCreditsProps) {
  const { currentClinicShift } = useAuth();
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [temp, setTemp] = useState<number>(0);
  const [bankAmount, setBankAmount] = useState<number>(0);
  const [doctorShifts, setDoctorShifts] = useState<DoctorShiftItem[]>([]);
  const [showCashReclaimDialog, setShowCashReclaimDialog] = useState(false);
  const [showJournalDialog, setShowJournalDialog] = useState(false);
  const [journalAmounts, setJournalAmounts] = useState({ cash: 0, bank: 0, total: 0, clinicCashTotal: 0, clinicBankTotal: 0 });
  const [clinicTotals, setClinicTotals] = useState({ cash: 0, bank: 0 });
  const [clinicTotalsLoading, setClinicTotalsLoading] = useState(false);
  const [update, setUpdate] = useState(0);
  const [selectedDoctorShift, setSelectedDoctorShift] =
    useState<DoctorShiftItem | null>(null);
  const [isAddingCost, setIsAddingCost] = useState(false);
  const [journalLoadingId, setJournalLoadingId] = useState<number | null>(null);
  // Removed fetching of last shift as it is not used currently
  const { user } = useAuth();
  useEffect(() => {
    document.title = "استحقاق الاطباء";
  }, []);

  useEffect(() => {
    // Get all doctor shifts
    apiClient
      .get("/doctor-shifts", {
        params: {
          // status: '1', // Only open shiftst
          // today: true,
          per_page: 100,
          shift_id: currentClinicShift?.id,
        },
      })
      .then(({ data }) => {
        const list = Array.isArray(data?.data) ? data.data : data;
        setDoctorShifts(list);
      });
  }, [update, currentClinicShift?.id]);

  const addCost = (
    doctorShiftId: number,
    amountCash: number,
    amountBank: number,
    doctorName: string,
    setIsLoading: (loading: boolean) => void,
  ) => {
    setIsLoading(true);
    setIsAddingCost(true);

    // Get current shift ID from auth context
    const currentShiftId = currentClinicShift?.id;

    if (!currentShiftId) {
      console.error("No current shift available");
      setIsLoading(false);
      setIsAddingCost(false);
      return;
    }
    if ((amountCash || 0) <= 0 && (amountBank || 0) <= 0) {
      console.error(
        "At least one amount (cash or bank) must be greater than zero.",
      );
      setIsLoading(false);
      setIsAddingCost(false);
      return;
    }

    const payload: Record<string, unknown> = {
      shift_id: currentShiftId,
      doctor_shift_id: doctorShiftId,
      description: `خصم استحقاق الطبيب ${doctorName}`,
      comment: `خصم تلقائي من استحقاق الطبيب ${doctorName}`,
      amount_cash_input: amountCash,
      amount_bank_input: amountBank,
    };

    apiClient
      .post("/costs", payload)
      .then(({ data }) => {
        console.log("Cost added successfully:", data);
        setUpdate((prev) => prev + 1);
        setAllMoneyUpdatedLab((prev) => prev + 1);
      })
      .catch((error) => {
        console.error("Error adding cost:", error);
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
    if (!selectedDoctorShift) return;

    setClinicTotalsLoading(true);
    Promise.all([
      apiClient.get<{ data: DoctorShiftFinancialSummary }>(
        `doctor-shifts/${selectedDoctorShift.id}/financial-summary`,
      ),
      currentClinicShift?.id
        ? apiClient.get<{ data: UserShiftIncomeSummary }>(
            `user/current-shift-income-summary`,
            { params: { shift_id: currentClinicShift.id } },
          )
        : Promise.resolve(null),
    ]).then(([doctorRes, shiftRes]) => {
      const doctorSummary: DoctorShiftFinancialSummary = doctorRes.data?.data ?? doctorRes.data;
      const total = doctorSummary?.total_doctor_share || 0;
      setCashAmount(total);
      setTemp(total);

      const shiftSummary: UserShiftIncomeSummary | null = shiftRes ? (shiftRes.data?.data ?? shiftRes.data) : null;
      setClinicTotals({
        cash: shiftSummary?.total_cash ?? 0,
        bank: shiftSummary?.total_bank ?? 0,
      });
    }).finally(() => setClinicTotalsLoading(false));
  }, [selectedDoctorShift, currentClinicShift?.id]);

  const prooveCashReclaim = (setIsLoading: (loading: boolean) => void) => {
    const r = confirm("هل انت متاكد من اثبات استحقاق الطبيب");
    if (!r) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    if (!selectedDoctorShift?.id) return;

    if ((cashAmount || 0) <= 0 && (bankAmount || 0) <= 0) {
      alert("يجب أن يكون أحد المبلغين (الصندوق أو البنك) أكبر من صفر");
      setIsLoading(false);
      return;
    }

    addCost(
      selectedDoctorShift.id,
      cashAmount,
      bankAmount,
      selectedDoctorShift.doctor?.name || selectedDoctorShift.doctor_name || "",
      setIsLoading,
    );

    apiClient
      .put(`/doctor-shifts/${selectedDoctorShift.id}/update-proofing-flags`)
      .then(({ data }) => {
        setShowCashReclaimDialog(false);
        const updated = data?.data ?? data;
        setDoctorShifts((prev) =>
          prev.map((item) =>
            item.id === selectedDoctorShift.id ? updated : item,
          ),
        );
        // Open journal entry dialog after proofing succeeds
        // setJournalAmounts({ cash: cashAmount, bank: bankAmount, total: temp, clinicCashTotal: clinicTotals.cash, clinicBankTotal: clinicTotals.bank });
        // setShowJournalDialog(true);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };
  const openJournalDirectly = async (shift: DoctorShiftItem) => {
    setJournalLoadingId(shift.id);
    setSelectedDoctorShift(shift);
    try {
      const [doctorRes, shiftRes] = await Promise.all([
        apiClient.get<{ data: DoctorShiftFinancialSummary }>(
          `doctor-shifts/${shift.id}/financial-summary`,
        ),
        currentClinicShift?.id
          ? apiClient.get<{ data: UserShiftIncomeSummary }>(
              `user/current-shift-income-summary`,
              { params: { shift_id: currentClinicShift.id } },
            )
          : Promise.resolve(null),
      ]);

      const doctorSummary: DoctorShiftFinancialSummary = doctorRes.data?.data ?? doctorRes.data;
      const total = doctorSummary?.total_doctor_share || 0;

      const shiftSummary: UserShiftIncomeSummary | null = shiftRes ? (shiftRes.data?.data ?? shiftRes.data) : null;
      const cCash = shiftSummary?.total_cash ?? 0;
      const cBank = shiftSummary?.total_bank ?? 0;

      setJournalAmounts({ cash: total, bank: 0, total, clinicCashTotal: cCash, clinicBankTotal: cBank });
      setShowJournalDialog(true);
    } finally {
      setJournalLoadingId(null);
    }
  };

  const { hasRole } = useAuthorization();

  return (

    <>   <Table style={{ direction: "rtl" }} className="text-sm!" size="small">
        <TableHead>
          <TableRow>
            <TableCell>الحالة</TableCell>
            <TableCell>الاسم</TableCell>
            <TableCell>اجمالي الاستحقاق</TableCell>
            <TableCell>عدد المرضي</TableCell>
            <TableCell>الأجر الثابت</TableCell>
            <TableCell>استحقاق النقدي</TableCell>
            <TableCell>استحقاق التامين</TableCell>
            <TableCell>الزمن</TableCell>
            <TableCell>اثبات</TableCell>
            <TableCell>قيد محاسبي</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {doctorShifts
            .filter((d) => {
              if (hasRole("admin")) {
                return true;
              }
              if (user?.user_type == "خزنه موحده") {
                return true;
              }
              return d.user_id_opened === user?.id;
            })
            .map((shift) => {
              // Determine if shift is open - status can be boolean, number, or string
              const statusValue = shift.status;
              const isOpen =
                statusValue === true ||
                (typeof statusValue === "number" && statusValue === 1) ||
                (typeof statusValue === "string" &&
                  (statusValue === "1" || statusValue === "Open"));

              return (
                <TableRow key={shift.id}>
                  <TableCell className="text-sm!">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: isOpen ? "#4CAF50" : "#F44336", // Green for open, red for closed
                        margin: "0 auto",
                        border: "2px solid",
                        borderColor: isOpen ? "#2E7D32" : "#C62828", // Darker border
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                      title={isOpen ? "مفتوح" : "مغلق"}
                    />
                  </TableCell>
                  <TableCell className="text-sm!">
                    {shift.doctor?.name || shift.doctor_name}
                  </TableCell>
                  <ValueLoader
                    api={`doctor-shifts/${shift.id}/financial-summary`}
                    field="total_doctor_share"
                  />
                  <TableCell className="text-sm!">
                    {shift.doctor_visits_count}
                  </TableCell>
                  <ValueLoader
                    api={`doctor-shifts/${shift.id}/financial-summary`}
                    field="doctor_fixed_share_for_shift"
                  />
                  <ValueLoader
                    api={`doctor-shifts/${shift.id}/financial-summary`}
                    field="doctor_cash_share_total"
                  />
                  <ValueLoader
                    api={`doctor-shifts/${shift.id}/financial-summary`}
                    field="doctor_insurance_share_total"
                  />
                  <TableCell className="text-sm!">
                    {shift.created_at
                      ? dayjs(Date.parse(shift.created_at)).format("H:m A")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm!">
                    <Button
                      disabled={!isOpen}
                      onClick={() => {
                        setShowCashReclaimDialog(true);
                        setSelectedDoctorShift(shift);
                      }}
                      variant="contained"
                      size="small"
                    >
                        اثبات  
                    </Button>
                  </TableCell>
                  <TableCell className="text-sm!">
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      disabled={journalLoadingId === shift.id || isOpen}
                      onClick={() => openJournalDirectly(shift)}
                      startIcon={
                        journalLoadingId === shift.id
                          ? <CircularProgress size={14} color="inherit" />
                          : <AccountBalanceIcon fontSize="small" />
                      }
                    >
                      قيد
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>

      {/* Journal entry dialog — opens after cash reclaim is proved */}
      {showJournalDialog && selectedDoctorShift && (
        <JournalEntryDialog
          open={showJournalDialog}
          onClose={() => setShowJournalDialog(false)}
          doctorName={selectedDoctorShift.doctor?.name || selectedDoctorShift.doctor_name || ''}
          doctorId={selectedDoctorShift.doctor?.id ?? selectedDoctorShift.doctor_id ?? 0}
          totalAmount={journalAmounts.total}
          cashAmount={journalAmounts.cash}
          bankAmount={journalAmounts.bank}
          date={new Date().toISOString().slice(0, 10)}
          reference={`DS-${selectedDoctorShift.id}`}
          userName={user?.name ?? user?.username}
          clinicShiftId={currentClinicShift?.id}
          doctorShiftId={selectedDoctorShift.id}
          clinicCashTotal={journalAmounts.clinicCashTotal}
          clinicBankTotal={journalAmounts.clinicBankTotal}
        />
      )}

      {/* Cash reclaim dialog */}
      <Dialog
        open={showCashReclaimDialog}
        onClose={() => setShowCashReclaimDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>اثبات الاستحقاق النقدي</DialogTitle>
        <DialogContent>
          <Stack
            direction="row"
            justifyContent="space-around"
            sx={{ mb: 2, p: 1.5, bgcolor: "grey.100", borderRadius: 1 }}
          >
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">
                صافي الصندوق
              </Typography>
              {clinicTotalsLoading ? (
                <CircularProgress size={20} color="success" />
              ) : (
                <Typography variant="h6" color="success.main" fontWeight={700}>
                  {formatNumber(clinicTotals.cash)}
                </Typography>
              )}
            </Box>
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">
                صافي البنك
              </Typography>
              {clinicTotalsLoading ? (
                <CircularProgress size={20} color="info" />
              ) : (
                <Typography variant="h6" color="info.main" fontWeight={700}>
                  {formatNumber(clinicTotals.bank)}
                </Typography>
              )}
            </Box>
          </Stack>
          <Stack direction={"column"} gap={1} sx={{ p: 1 }}>
            <TextField
              type="number"
              value={Number(cashAmount).toFixed(0) || ""}
              onChange={(e) => {
                const value = Number(e.target.value || 0);
                setCashAmount(value);
                setBankAmount(temp - value);
              }}
              label="الصندوق"
              disabled={clinicTotalsLoading}
            />
            <TextField
              type="number"
              value={Number(bankAmount).toFixed(0) || ""}
              onChange={(e) => {
                const value = Number(e.target.value || 0);
                setBankAmount(value);
                setCashAmount(temp - value);
              }}
              label="البنك"
              disabled={clinicTotalsLoading}
            />
            <Button
              onClick={() => prooveCashReclaim(() => {})}
              variant="contained"
              disabled={
                clinicTotalsLoading ||
                isAddingCost ||
                cashAmount > clinicTotals.cash ||
                bankAmount > clinicTotals.bank
              }
            >
              {isAddingCost ? "جاري المعالجة..." : "خصم  الاستحقاق النقدي"}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog></>
   

     
  );
}

export default DoctorCredits;
