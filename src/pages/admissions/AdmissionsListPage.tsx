import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getAdmissions,
  getAdmissionBalance,
  exportAdmissionsListPdf,
} from "@/services/admissionService";
import { getWardsList } from "@/services/wardService";
import { getRooms } from "@/services/roomService";
import type {
  Admission,
  PaginatedAdmissionsResponse,
} from "@/types/admissions";
import {
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Box,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import { Plus, Search, Eye, LayoutDashboard, FileDown } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import DischargeDialog from "@/components/admissions/DischargeDialog";

// Small cell component to show ledger summary fields using /admissions/{id}/balance
function AdmissionBalanceCell({
  admissionId,
  field,
}: {
  admissionId: number;
  field: "total_debits" | "total_credits" | "balance";
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admissionBalance", admissionId],
    queryFn: () => getAdmissionBalance(admissionId),
  });

  const cellSx = { fontSize: "0.95rem", py: 1.5 };
  if (isLoading) {
    return <TableCell sx={cellSx}>…</TableCell>;
  }

  if (isError || !data) {
    return <TableCell sx={cellSx}>-</TableCell>;
  }

  const value = data[field] ?? 0;

  return (
    <TableCell sx={{ ...cellSx, textAlign: "right" }}>
      {formatNumber(value)}
    </TableCell>
  );
}

export default function AdmissionsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [wardFilter, setWardFilter] = useState<string>("");
  const [roomFilter, setRoomFilter] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(
    null,
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))
        return;
      if (e.key === "+") {
        e.preventDefault();
        navigate("/admissions/new");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const { data: wardsData } = useQuery({
    queryKey: ["wardsList"],
    queryFn: () => getWardsList({ status: true }),
  });
  const wards = wardsData ?? [];

  const { data: roomsResponse } = useQuery({
    queryKey: ["roomsList", wardFilter],
    queryFn: () =>
      getRooms(1, {
        per_page: 300,
        ...(wardFilter ? { ward_id: Number(wardFilter) } : {}),
      }),
  });
  const rooms = roomsResponse?.data ?? [];

  const { data, isLoading } = useQuery<PaginatedAdmissionsResponse>({
    queryKey: [
      "admissions",
      page,
      searchTerm,
      statusFilter,
      dateFrom,
      dateTo,
      wardFilter,
      roomFilter,
    ],
    queryFn: () => {
      const filters: Record<string, string | number | boolean> = {};
      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.status = statusFilter;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (wardFilter) filters.ward_id = Number(wardFilter);
      if (roomFilter) filters.room_id = Number(roomFilter);
      return getAdmissions(page, filters);
    },
    placeholderData: keepPreviousData,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "admitted":
        return "success";
      case "discharged":
        return "default";
      case "transferred":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "admitted":
        return "مقيم";
      case "discharged":
        return "مخرج";
      case "transferred":
        return "منقول";
      default:
        return status;
    }
  };

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      const filters: Record<string, string | number | boolean> = {};
      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.status = statusFilter;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (wardFilter) filters.ward_id = Number(wardFilter);
      if (roomFilter) filters.room_id = Number(roomFilter);
      const blob = await exportAdmissionsListPdf(filters);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch {
      // Error handled by api interceptor / toast
    } finally {
      setPdfLoading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
          bgcolor: "background.paper",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-8xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Button
              component={Link}
              to="/admissions/dashboard"
              variant="outlined"
              size="medium"
              startIcon={<LayoutDashboard />}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
            >
              لوحة التحكم
            </Button>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ fontSize: "1.5rem" }}
            >
              إدارة التنويم
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              size="large"
              startIcon={
                pdfLoading ? <CircularProgress size={18} /> : <FileDown />
              }
              onClick={handleExportPdf}
              disabled={pdfLoading}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              PDF
            </Button>
            <Button
              component={Link}
              to="/admissions/new"
              variant="contained"
              size="large"
              startIcon={<Plus />}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                boxShadow: 1,
              }}
            >
              إضافة تنويم جديد
            </Button>
          </div>
        </header>

        {/* Filters */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            mt: 3,
            mb: 3,
            p: 2,
            borderRadius: 3,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <TextField
            fullWidth
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
              sx: { borderRadius: 2 },
            }}
            sx={{ maxWidth: 320 }}
          />
          <TextField
            type="date"
            label="من تاريخ"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{
              minWidth: 180,
              "& .MuiOutlinedInput-root": { borderRadius: 2 },
            }}
          />
          <TextField
            type="date"
            label="إلى تاريخ"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{
              minWidth: 180,
              "& .MuiOutlinedInput-root": { borderRadius: 2 },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>القسم</InputLabel>
            <Select
              value={wardFilter}
              label="القسم"
              onChange={(e) => {
                setWardFilter(e.target.value);
                setRoomFilter("");
                setPage(1);
              }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">الكل</MenuItem>
              {wards.map((ward) => (
                <MenuItem key={ward.id} value={String(ward.id)}>
                  {ward.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>الغرفة</InputLabel>
            <Select
              value={roomFilter}
              label="الغرفة"
              onChange={(e) => {
                setRoomFilter(e.target.value);
                setPage(1);
              }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">الكل</MenuItem>
              {rooms.map((room: { id: number; room_number: string }) => (
                <MenuItem key={room.id} value={String(room.id)}>
                  {room.room_number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={statusFilter}
              label="الحالة"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="admitted">مقيم</MenuItem>
              <MenuItem value="discharged">مخرج</MenuItem>
              <MenuItem value="transferred">منقول</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table size="medium" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    رقم التنويم
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    المريض
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    الطبيب الأخصائي
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    القسم
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    الغرفة
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    السرير
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    تاريخ ووقت التنويم
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    عدد أيام الإقامة
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    إجمالي المدين
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    إجمالي الدائن
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    الرصيد
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    الحالة
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      bgcolor: "grey.50",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    الإجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.data.map((admission: Admission) => (
                  <TableRow
                    key={admission.id}
                    onClick={() => navigate(`/admissions/${admission.id}`)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                      "&:nth-of-type(even)": {
                        bgcolor: "grey.50",
                      },
                      "&:nth-of-type(even):hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <TableCell sx={{ fontSize: "0.95rem", py: 1.5 }}>
                      {admission.id}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.95rem", py: 1.5 }}>
                      {admission.patient?.name || "-"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.95rem", py: 1.5 }}>
                      {admission.specialist_doctor?.name || "-"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.95rem", py: 1.5 }}>
                      {admission.ward?.name || "-"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.95rem", py: 1.5 }}>
                      {admission.room?.room_number || "-"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.95rem", py: 1.5 }}>
                      {admission.bed?.bed_number || "-"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.95rem", py: 1.5 }}>
                      {admission.admission_date}
                      {admission.admission_time ? (
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.25 }}
                        >
                          {String(admission.admission_time).slice(0, 5)}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: "0.95rem", py: 1.5, textAlign: "center" }}
                    >
                      {admission.days_admitted != null
                        ? admission.days_admitted
                        : "-"}
                    </TableCell>
                    <AdmissionBalanceCell
                      admissionId={admission.id}
                      field="total_debits"
                    />
                    <AdmissionBalanceCell
                      admissionId={admission.id}
                      field="total_credits"
                    />
                    <AdmissionBalanceCell
                      admissionId={admission.id}
                      field="balance"
                    />
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={getStatusLabel(admission.status)}
                        color={
                          getStatusColor(admission.status) as
                            | "success"
                            | "default"
                            | "info"
                        }
                        size="small"
                        sx={{ fontWeight: 500, fontSize: "0.8rem" }}
                      />
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ py: 1.5 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Stack
                        direction={"row"}
                        alignItems={"center"}
                        justifyContent={"center"}
                        spacing={1}
                      >
                        <Button
                          component={Link}
                          to={`/admissions/${admission.id}`}
                          size="small"
                          variant="outlined"
                        startIcon={<Eye size={16} />}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 600,
                        }}
                      >
                        عرض
                      </Button>
                      {admission.status === "admitted" && (
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAdmission(admission);
                            setDischargeDialogOpen(true);
                          }}
                          sx={{
                            mr: 1,
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                          }}
                        >
                          خروج
                        </Button>
                      )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {data?.meta && data.meta.last_page > 1 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 2,
                py: 2,
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
              }}
            >
              <Button
                variant="outlined"
                size="medium"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                السابق
              </Button>
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.secondary"
              >
                صفحة {page} من {data.meta.last_page}
              </Typography>
              <Button
                variant="outlined"
                size="medium"
                disabled={page === data.meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                التالي
              </Button>
            </Box>
          ) : null}
        </Card>
      </div>

      {selectedAdmission && (
        <DischargeDialog
          open={dischargeDialogOpen}
          onClose={() => {
            setDischargeDialogOpen(false);
            setSelectedAdmission(null);
          }}
          admission={selectedAdmission}
        />
      )}
    </div>
  );
}
