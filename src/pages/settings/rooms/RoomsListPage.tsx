import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getRooms, createRoom, updateRoom } from "@/services/roomService";
import { getWardsList } from "@/services/wardService";
import type { Room, RoomFormData } from "@/types/admissions";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Edit, Plus, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function RoomsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [wardFilter, setWardFilter] = useState<number | "">("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);
  const [newRoom, setNewRoom] = useState<RoomFormData>({
    ward_id: undefined,
    room_number: "",
    room_type: null,
    capacity: "",
    price_per_day: "",
    status: true,
  });
  const [editRoom, setEditRoom] = useState<RoomFormData>({
    ward_id: undefined,
    room_number: "",
    room_type: null,
    capacity: "",
    price_per_day: "",
    status: true,
  });

  const { data: wards } = useQuery({
    queryKey: ["wardsList"],
    queryFn: () => getWardsList({ status: true }),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["rooms", page, searchTerm, wardFilter],
    queryFn: () =>
      getRooms(page, { search: searchTerm, ward_id: wardFilter || undefined }),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("تم إضافة الغرفة بنجاح");
      setAddDialogOpen(false);
      setNewRoom({
        ward_id: undefined,
        room_number: "",
        room_type: null,
        capacity: "",
        price_per_day: "",
        status: true,
      });
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل الإضافة", { description: errorMessage });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RoomFormData> }) =>
      updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("تم تحديث الغرفة بنجاح");
      setEditDialogOpen(false);
      setRoomToEdit(null);
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل التحديث", { description: errorMessage });
    },
  });

  const handleAddClick = () => {
    setAddDialogOpen(true);
  };

  const handleAddConfirm = () => {
    if (!newRoom.ward_id) {
      toast.error("الرجاء اختيار القسم");
      return;
    }
    if (!newRoom.room_number.trim()) {
      toast.error("الرجاء إدخال رقم الغرفة");
      return;
    }
    if (!newRoom.capacity || parseInt(newRoom.capacity) <= 0) {
      toast.error("الرجاء إدخال سعة صحيحة");
      return;
    }
    createMutation.mutate(newRoom);
  };

  const handleAddCancel = () => {
    setAddDialogOpen(false);
    setNewRoom({
      ward_id: undefined,
      room_number: "",
      room_type: null,
      capacity: "",
      price_per_day: "",
      status: true,
    });
  };

  const handleEditClick = (room: Room) => {
    setRoomToEdit(room);
    setEditRoom({
      ward_id: String(room.ward_id),
      room_number: room.room_number,
      room_type: room.room_type,
      capacity: String(room.capacity),
      price_per_day: room.price_per_day ? String(room.price_per_day) : "",
      status: room.status,
    });
    setEditDialogOpen(true);
  };

  const handleEditConfirm = () => {
    if (!editRoom.ward_id) {
      toast.error("الرجاء اختيار القسم");
      return;
    }
    if (!editRoom.room_number.trim()) {
      toast.error("الرجاء إدخال رقم الغرفة");
      return;
    }
    if (!editRoom.capacity || parseInt(editRoom.capacity) <= 0) {
      toast.error("الرجاء إدخال سعة صحيحة");
      return;
    }
    if (roomToEdit) {
      updateMutation.mutate({ id: roomToEdit.id, data: editRoom });
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setRoomToEdit(null);
  };

  if (isLoading && !data) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
            onClick={handleAddClick}
            variant="contained"
            startIcon={<Plus />}
          >
            إضافة غرفة جديدة
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
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
                <MenuItem key={ward.id} value={ward.id}>
                  {ward.name}
                </MenuItem>
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
                <TableCell>السعر لليوم</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>عدد الأسرّة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>{room.room_number}</TableCell>
                  <TableCell>{room.ward?.name || "-"}</TableCell>
                  <TableCell>
                    {room.room_type === "normal"
                      ? "عادي"
                      : room.room_type === "vip"
                        ? "VIP"
                        : "-"}
                  </TableCell>
                  <TableCell>{room.price_per_day || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={room.status ? "نشط" : "غير نشط"}
                      color={room.status ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{room.capacity || 0}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={() => handleEditClick(room)}
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
          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 2 }}
          >
            <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              السابق
            </Button>
            <Typography sx={{ alignSelf: "center" }}>
              صفحة {page} من {data.meta.last_page}
            </Typography>
            <Button
              disabled={page === data.meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </Button>
          </Box>
        )}
      </CardContent>

      <Dialog
        open={addDialogOpen}
        onClose={handleAddCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة غرفة جديدة</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddConfirm();
          }}
        >
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
              <FormControl fullWidth required>
                <InputLabel>القسم</InputLabel>
                <Select
                  value={newRoom.ward_id || ""}
                  label="القسم"
                  onChange={(e) =>
                    setNewRoom({
                      ...newRoom,
                      ward_id: e.target.value as string,
                    })
                  }
                >
                  {wards?.map((ward) => (
                    <MenuItem key={ward.id} value={ward.id}>
                      {ward.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="رقم الغرفة"
                required
                fullWidth
                value={newRoom.room_number}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, room_number: e.target.value })
                }
              />

              <FormControl fullWidth>
                <InputLabel>نوع الغرفة</InputLabel>
                <Select
                  value={newRoom.room_type || ""}
                  label="نوع الغرفة"
                  onChange={(e) =>
                    setNewRoom({
                      ...newRoom,
                      room_type: e.target.value || null,
                    })
                  }
                >
                  <MenuItem value="">غير محدد</MenuItem>
                  <MenuItem value="normal">عادي</MenuItem>
                  <MenuItem value="vip">VIP</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="عدد الأسرّة"
                required
                fullWidth
                type="number"
                value={newRoom.capacity}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, capacity: e.target.value })
                }
                inputProps={{ min: 1 }}
              />

              <TextField
                label="السعر لليوم"
                fullWidth
                type="number"
                value={newRoom.price_per_day}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, price_per_day: e.target.value })
                }
                inputProps={{ min: 0, step: "0.01" }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={newRoom.status}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, status: e.target.checked })
                    }
                  />
                }
                label="نشط"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddCancel}>إلغاء</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                "إضافة"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onClose={handleEditCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تعديل الغرفة</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEditConfirm();
          }}
        >
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
              <FormControl fullWidth required>
                <InputLabel>القسم</InputLabel>
                <Select
                  value={editRoom.ward_id || ""}
                  label="القسم"
                  onChange={(e) =>
                    setEditRoom({
                      ...editRoom,
                      ward_id: e.target.value as string,
                    })
                  }
                >
                  {wards?.map((ward) => (
                    <MenuItem key={ward.id} value={ward.id}>
                      {ward.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="رقم الغرفة"
                required
                fullWidth
                value={editRoom.room_number}
                onChange={(e) =>
                  setEditRoom({ ...editRoom, room_number: e.target.value })
                }
              />

              <FormControl fullWidth>
                <InputLabel>نوع الغرفة</InputLabel>
                <Select
                  value={editRoom.room_type || ""}
                  label="نوع الغرفة"
                  onChange={(e) =>
                    setEditRoom({
                      ...editRoom,
                      room_type: e.target.value || null,
                    })
                  }
                >
                  <MenuItem value="">غير محدد</MenuItem>
                  <MenuItem value="normal">عادي</MenuItem>
                  <MenuItem value="vip">VIP</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="عدد الأسرّة"
                required
                fullWidth
                type="number"
                value={editRoom.capacity}
                onChange={(e) =>
                  setEditRoom({ ...editRoom, capacity: e.target.value })
                }
                inputProps={{ min: 1 }}
              />

              <TextField
                label="السعر لليوم"
                fullWidth
                type="number"
                value={editRoom.price_per_day}
                onChange={(e) =>
                  setEditRoom({ ...editRoom, price_per_day: e.target.value })
                }
                inputProps={{ min: 0, step: "0.01" }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={editRoom.status}
                    onChange={(e) =>
                      setEditRoom({ ...editRoom, status: e.target.checked })
                    }
                  />
                }
                label="نشط"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditCancel}>إلغاء</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                "حفظ"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  );
}
