import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRooms } from "@/services/roomService";
import { getWardsList } from "@/services/wardService";
import type { Room } from "@/types/admissions";
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
  IconButton,
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
  Edit,
  Plus,
  Search,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export default function RoomsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [wardFilter, setWardFilter] = useState<number | "">("");

  const { data: wards } = useQuery({
    queryKey: ['wardsList'],
    queryFn: () => getWardsList({ status: true }),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['rooms', page, searchTerm, wardFilter],
    queryFn: () => getRooms(page, { search: searchTerm, ward_id: wardFilter || undefined }),
    keepPreviousData: true,
  });


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
            <Typography variant="h5">إدارة الغرف</Typography>
          </Box>
          <Button
            component={Link}
            to="/settings/rooms/new"
            variant="contained"
            startIcon={<Plus />}
          >
            إضافة غرفة جديدة
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
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>القسم</InputLabel>
            <Select
              value={wardFilter}
              label="القسم"
              onChange={(e) => {
                setWardFilter(e.target.value as number | "");
                setPage(1);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {wards?.map((ward) => (
                <MenuItem key={ward.id} value={ward.id}>{ward.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>رقم الغرفة</TableCell>
                <TableCell>القسم</TableCell>
                <TableCell>نوع الغرفة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>عدد الأسرّة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>{room.room_number}</TableCell>
                  <TableCell>{room.ward?.name || '-'}</TableCell>
                  <TableCell>
                    {room.room_type === 'normal' ? 'عادي' : room.room_type === 'vip' ? 'VIP' : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={room.status ? 'نشط' : 'غير نشط'}
                      color={room.status ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{room.beds_count || 0}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      component={Link}
                      to={`/settings/rooms/${room.id}/edit`}
                      size="small"
                      color="primary"
                    >
                      <Edit size={16} />
                    </IconButton>
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

