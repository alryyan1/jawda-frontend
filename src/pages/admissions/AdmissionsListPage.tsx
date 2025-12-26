import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdmissions } from "@/services/admissionService";
import type { Admission } from "@/types/admissions";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
} from "@mui/material";
import {
  Plus,
  Search,
  Eye,
  ArrowRight,
} from "lucide-react";

export default function AdmissionsListPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ['admissions', page, searchTerm, statusFilter],
    queryFn: () => getAdmissions(page, { 
      search: searchTerm, 
      status: statusFilter || undefined 
    }),
    keepPreviousData: true,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'admitted': return 'success';
      case 'discharged': return 'default';
      case 'transferred': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'admitted': return 'مقيم';
      case 'discharged': return 'مخرج';
      case 'transferred': return 'منقول';
      default: return status;
    }
  };

  if (isLoading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              component={Link}
              to="/admissions"
              variant="outlined"
              size="small"
              startIcon={<ArrowRight />}
            >
              رجوع
            </Button>
            <Typography variant="h5">إدارة التنويم</Typography>
          </Box>
          <Button
            component={Link}
            to="/admissions/new"
            variant="contained"
            startIcon={<Plus />}
          >
            إضافة تنويم جديد
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={statusFilter}
              label="الحالة"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="admitted">مقيم</MenuItem>
              <MenuItem value="discharged">مخرج</MenuItem>
              <MenuItem value="transferred">منقول</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>المريض</TableCell>
                <TableCell>القسم</TableCell>
                <TableCell>الغرفة</TableCell>
                <TableCell>السرير</TableCell>
                <TableCell>تاريخ التنويم</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data.map((admission) => (
                <TableRow key={admission.id}>
                  <TableCell>{admission.patient?.name || '-'}</TableCell>
                  <TableCell>{admission.ward?.name || '-'}</TableCell>
                  <TableCell>{admission.room?.room_number || '-'}</TableCell>
                  <TableCell>{admission.bed?.bed_number || '-'}</TableCell>
                  <TableCell>{admission.admission_date}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(admission.status)}
                      color={getStatusColor(admission.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      component={Link}
                      to={`/admissions/${admission.id}`}
                      size="small"
                      startIcon={<Eye size={16} />}
                    >
                      عرض
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {data && data.meta.last_page > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
            <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
            <Typography sx={{ alignSelf: 'center' }}>صفحة {page} من {data.meta.last_page}</Typography>
            <Button disabled={page === data.meta.last_page} onClick={() => setPage(p => p + 1)}>التالي</Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

