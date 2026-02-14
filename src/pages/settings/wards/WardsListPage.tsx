import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getWards, deleteWard, createWard, getWardRooms } from "@/services/wardService";
import { createRoom, updateRoom } from "@/services/roomService";
import { createBed } from "@/services/bedService";
import type { Ward, WardFormData, PaginatedWardsResponse } from "@/types/admissions";
import type { RoomFormData, Room } from "@/types/admissions";
import type { BedFormData } from "@/types/admissions";
import {
  Button,
  Card,
  CardContent,
  CardActions,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Tooltip,
} from "@mui/material";
import { Edit, Trash2, Plus, Search, ArrowRight, DoorOpen, Bed, User } from "lucide-react";
import { toast } from "sonner";

export default function WardsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wardToDelete, setWardToDelete] = useState<Ward | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newWard, setNewWard] = useState<WardFormData>({
    name: "",
    description: "",
    status: true,
  });
  const [wardDialogOpen, setWardDialogOpen] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [newRoom, setNewRoom] = useState<RoomFormData>({
    ward_id: undefined,
    room_number: "",
    room_type: "normal",
    capacity: "1",
    price_per_day: "0",
    status: true,
  });
  const [roomsListDialogOpen, setRoomsListDialogOpen] = useState(false);
  const [selectedWardForRooms, setSelectedWardForRooms] = useState<Ward | null>(null);
  const [addBedDialogOpen, setAddBedDialogOpen] = useState(false);
  const [selectedRoomForBed, setSelectedRoomForBed] = useState<Room | null>(null);
  const [newBed, setNewBed] = useState<BedFormData>({
    room_id: undefined,
    bed_number: "",
    status: "available",
  });
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editRoomForm, setEditRoomForm] = useState<{
    room_number: string;
    room_type: "normal" | "vip" | null;
    capacity: string;
    price_per_day: string;
    status: boolean;
  }>({
    room_number: "",
    room_type: "normal",
    capacity: "1",
    price_per_day: "0",
    status: true,
  });

  const { data, isLoading, error } = useQuery<PaginatedWardsResponse>({
    queryKey: ["wards", page, searchTerm],
    queryFn: () => getWards(page, { search: searchTerm }),
    placeholderData: keepPreviousData,
  });

  const { data: wardRoomsData, isLoading: isLoadingWardRooms } = useQuery({
    queryKey: ["wardRooms", selectedWardForRooms?.id],
    queryFn: () => getWardRooms(selectedWardForRooms!.id),
    enabled: roomsListDialogOpen && !!selectedWardForRooms?.id,
  });

  const wardRooms = (wardRoomsData?.data ?? []) as Room[];

  const deleteMutation = useMutation({
    mutationFn: deleteWard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      toast.success("تم حذف القسم بنجاح");
      setDeleteDialogOpen(false);
      setWardToDelete(null);
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل الحذف", { description: errorMessage });
    },
  });

  const createMutation = useMutation({
    mutationFn: createWard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      toast.success("تم إضافة القسم بنجاح");
      setAddDialogOpen(false);
      setNewWard({ name: "", description: "", status: true });
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل الإضافة", { description: errorMessage });
    },
  });

  const handleDeleteClick = (ward: Ward) => {
    setWardToDelete(ward);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (wardToDelete) {
      deleteMutation.mutate(wardToDelete.id);
    }
  };

  const handleAddClick = () => {
    setAddDialogOpen(true);
  };

  const handleAddConfirm = () => {
    if (!newWard.name.trim()) {
      toast.error("الرجاء إدخال اسم القسم");
      return;
    }
    createMutation.mutate(newWard);
  };

  const handleAddCancel = () => {
    setAddDialogOpen(false);
    setNewWard({ name: "", description: "", status: true });
  };

  const createRoomMutation = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("تم إضافة الغرفة بنجاح");
      setSelectedWard((prev) =>
        prev
          ? { ...prev, rooms_count: (prev.rooms_count ?? 0) + 1 }
          : null
      );
      setNewRoom({
        ward_id: selectedWard ? String(selectedWard.id) : undefined,
        room_number: "",
        room_type: "normal",
        capacity: "1",
        price_per_day: "0",
        status: true,
      });
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل إضافة الغرفة", { description: errorMessage });
    },
  });

  const handleRowClick = (ward: Ward) => {
    setSelectedWard(ward);
      setNewRoom({
        ward_id: String(ward.id),
        room_number: "",
        room_type: "normal",
        capacity: "1",
        price_per_day: "0",
        status: true,
      });
    setWardDialogOpen(true);
  };

  const handleWardDialogClose = () => {
    setWardDialogOpen(false);
    setSelectedWard(null);
    setNewRoom({
      ward_id: undefined,
      room_number: "",
      room_type: "normal",
      capacity: "1",
      price_per_day: "0",
      status: true,
    });
  };

  const createBedMutation = useMutation({
    mutationFn: createBed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardRooms", selectedWardForRooms?.id] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      toast.success("تم إضافة السرير بنجاح");
      setAddBedDialogOpen(false);
      setSelectedRoomForBed(null);
      setNewBed({ room_id: undefined, bed_number: "", status: "available" });
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل إضافة السرير", { description: errorMessage });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateRoom>[1] }) =>
      updateRoom(id, data),
    onSuccess: () => {
      if (selectedWardForRooms?.id) {
        queryClient.invalidateQueries({ queryKey: ["wardRooms", selectedWardForRooms.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      toast.success("تم تحديث الغرفة بنجاح");
      setEditingRoomId(null);
    },
    onError: (err: Error | unknown) => {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error("فشل تحديث الغرفة", { description: errorMessage });
    },
  });

  const handleRoomsCountClick = (e: React.MouseEvent, ward: Ward) => {
    e.stopPropagation();
    setSelectedWardForRooms(ward);
    setRoomsListDialogOpen(true);
  };

  const handleAddBedClick = (room: Room) => {
    setSelectedRoomForBed(room);
    setNewBed({
      room_id: String(room.id),
      bed_number: "",
      status: "available",
    });
    setAddBedDialogOpen(true);
  };

  const handleAddBedSubmit = () => {
    if (!selectedRoomForBed) return;
    if (!newBed.bed_number.trim()) {
      toast.error("الرجاء إدخال رقم السرير");
      return;
    }
    createBedMutation.mutate({
      room_id: String(selectedRoomForBed.id),
      bed_number: newBed.bed_number.trim(),
      status: newBed.status,
    });
  };

  const handleAddRoomSubmit = () => {
    if (!selectedWard) return;
    if (!newRoom.room_number.trim()) {
      toast.error("الرجاء إدخال رقم الغرفة");
      return;
    }
    createRoomMutation.mutate({
      ...newRoom,
      ward_id: String(selectedWard.id),
    });
  };

  const handleStartEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setEditRoomForm({
      room_number: room.room_number,
      room_type: room.room_type ?? "normal",
      capacity: String(room.capacity),
      price_per_day: room.price_per_day != null ? String(room.price_per_day) : "0",
      status: room.status,
    });
  };

  const handleCancelEditRoom = () => {
    setEditingRoomId(null);
  };

  const handleSaveRoom = () => {
    if (editingRoomId == null || !selectedWardForRooms) return;
    if (!editRoomForm.room_number.trim()) {
      toast.error("الرجاء إدخال رقم الغرفة");
      return;
    }
    updateRoomMutation.mutate({
      id: editingRoomId,
      data: {
        room_number: editRoomForm.room_number.trim(),
        room_type: editRoomForm.room_type,
        capacity: editRoomForm.capacity,
        price_per_day: editRoomForm.price_per_day,
        status: editRoomForm.status,
      },
    });
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

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 2 }}>
        حدث خطأ أثناء جلب الأقسام
      </Typography>
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
            <Typography variant="h5">إدارة الأقسام</Typography>
          </Box>
          <Button
            onClick={handleAddClick}
            variant="contained"
            startIcon={<Plus />}
          >
            إضافة قسم جديد
          </Button>
        </Box>

        <TextField
          fullWidth
          placeholder="بحث..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} />
              </InputAdornment>
            ),
          }}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 2,
          }}
        >
          {(data?.data ?? []).map((ward: Ward) => (
            <Box key={ward.id}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  "&:hover": { boxShadow: 1 },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" component="h2">
                      {ward.name}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Tooltip title="تعديل">
                        <IconButton
                          component={Link}
                          to={`/settings/wards/${ward.id}/edit`}
                          size="small"
                          color="primary"
                          aria-label={`تعديل ${ward.name}`}
                        >
                          <Edit size={16} />
                        </IconButton>
                      </Tooltip>
                
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 2,
                      alignItems: "center",
                    }}
                  >
                    <Tooltip title="عرض غرف القسم">
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                          cursor: "pointer",
                          "&:hover": { opacity: 0.8 },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRoomsCountClick(e, ward);
                        }}
                      >
                        <DoorOpen size={18} />
                        <Typography variant="body2" color="text.secondary">
                          عدد الغرف: <strong>{ward.rooms_count ?? 0}</strong>
                        </Typography>
                      </Box>
                    </Tooltip>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <Bed size={18} />
                      <Typography variant="body2" color="text.secondary">
                        عدد الأسرة: <strong>{ward.beds_count ?? 0}</strong>
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      icon={<User size={14} />}
                      label={`مرضى مقيمون: ${ward.current_admissions_count ?? 0}`}
                      color={Number(ward.current_admissions_count) > 0 ? "primary" : "default"}
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: "space-between", px: 2, py: 1 }}>
                  <Button
                    size="small"
                    color="primary"
                    startIcon={<Plus size={16} />}
                    onClick={() => handleRowClick(ward)}
                  >
                    إضافة غرفة
                  </Button>
                  <Button
                    size="small"
                    component={Link}
                    to={`/settings/wards/${ward.id}/edit`}
                  >
                    تعديل
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>

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
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف القسم "{wardToDelete?.name}"؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={roomsListDialogOpen}
        onClose={() => {
          setRoomsListDialogOpen(false);
          setSelectedWardForRooms(null);
          setEditingRoomId(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DoorOpen size={24} />
            غرف قسم: {selectedWardForRooms?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {isLoadingWardRooms ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : wardRooms.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              لا توجد غرف في هذا القسم
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>رقم الغرفة</TableCell>
                    {/* <TableCell align="center">السعة</TableCell> */}
                    <TableCell align="right">سعر اليوم</TableCell>
                    <TableCell align="center">عدد الأسرة</TableCell>
                    <TableCell align="center">عدد المرضى</TableCell>
                    <TableCell align="center">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wardRooms.map((room) => {
                    const isEditing = editingRoomId === room.id;
                    return (
                      <TableRow key={room.id}>
                        <TableCell>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editRoomForm.room_number}
                              onChange={(e) =>
                                setEditRoomForm((f) => ({ ...f, room_number: e.target.value }))
                              }
                              placeholder="رقم الغرفة"
                              sx={{ minWidth: 100 }}
                            />
                          ) : (
                            room.room_number
                          )}
                        </TableCell>
                        {/* <TableCell align="center">
                          {isEditing ? (
                            <TextField
                              size="small"
                              type="number"
                              value={editRoomForm.capacity}
                              onChange={(e) =>
                                setEditRoomForm((f) => ({ ...f, capacity: e.target.value }))
                              }
                              inputProps={{ min: 1 }}
                              sx={{ width: 64 }}
                            />
                          ) : (
                            room.capacity
                          )}
                        </TableCell> */}
                        <TableCell align="right">
                          {isEditing ? (
                            <TextField
                              size="small"
                              type="number"
                              value={editRoomForm.price_per_day}
                              onChange={(e) =>
                                setEditRoomForm((f) => ({ ...f, price_per_day: e.target.value }))
                              }
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: 90 }}
                            />
                          ) : (
                            room.price_per_day ?? "—"
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {room.beds_count ?? room.beds?.length ?? 0}
                        </TableCell>
                        <TableCell align="center">
                          {room.current_admissions_count ?? 0}
                        </TableCell>
                        <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                          {isEditing ? (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={handleSaveRoom}
                                disabled={updateRoomMutation.isPending}
                              >
                                حفظ
                              </Button>
                              <Button
                                size="small"
                                onClick={handleCancelEditRoom}
                                sx={{ ml: 0.5 }}
                              >
                                إلغاء
                              </Button>
                            </>
                          ) : (
                            <>
                              <Tooltip title="تعديل">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleStartEditRoom(room)}
                                  aria-label={`تعديل غرفة ${room.room_number}`}
                                >
                                  <Edit size={16} />
                                </IconButton>
                              </Tooltip>
                              <Button
                                size="small"
                                variant="text"
                                color="primary"
                                onClick={() => handleAddBedClick(room)}
                                aria-label={`إضافة سرير لغرفة ${room.room_number}`}
                              >
                                إضافة سرير
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRoomsListDialogOpen(false);
              setSelectedWardForRooms(null);
            }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addBedDialogOpen}
        onClose={() => {
          setAddBedDialogOpen(false);
          setSelectedRoomForBed(null);
          setNewBed({ room_id: undefined, bed_number: "", status: "available" });
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Bed size={24} />
            إضافة سرير — غرفة {selectedRoomForBed?.room_number}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRoomForBed && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <TextField
                label="رقم السرير"
                required
                fullWidth
                value={newBed.bed_number}
                onChange={(e) =>
                  setNewBed({ ...newBed, bed_number: e.target.value })
                }
                placeholder="مثال: 1"
                autoFocus
              />
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={newBed.status}
                  label="الحالة"
                  onChange={(e) =>
                    setNewBed({
                      ...newBed,
                      status: e.target.value as "available" | "occupied" | "maintenance",
                    })
                  }
                >
                  <MenuItem value="available">متاح</MenuItem>
                  <MenuItem value="occupied">محجوز</MenuItem>
                  <MenuItem value="maintenance">صيانة</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddBedDialogOpen(false);
              setSelectedRoomForBed(null);
            }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={handleAddBedSubmit}
            disabled={
              createBedMutation.isPending || !newBed.bed_number.trim()
            }
          >
            {createBedMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "إضافة سرير"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={wardDialogOpen}
        onClose={handleWardDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DoorOpen size={24} />
            {selectedWard?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedWard && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {selectedWard.description && (
                <Typography variant="body2" color="text.secondary">
                  {selectedWard.description}
                </Typography>
              )}
              <Typography variant="body2">
                عدد الغرف: <strong>{selectedWard.rooms_count ?? 0}</strong>
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                إضافة غرفة جديدة لهذا القسم
              </Typography>
              <TextField
                label="رقم الغرفة"
                required
                fullWidth
                value={newRoom.room_number}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, room_number: e.target.value })
                }
                placeholder="مثال: 101"
                autoFocus
              />
              <FormControl fullWidth>
                <InputLabel>نوع الغرفة</InputLabel>
                <Select
                  value={newRoom.room_type ?? ""}
                  label="نوع الغرفة"
                  onChange={(e) =>
                    setNewRoom({
                      ...newRoom,
                      room_type: e.target.value || null,
                    })
                  }
                >
                  <MenuItem value="">بدون نوع</MenuItem>
                  <MenuItem value="normal">عادي</MenuItem>
                  <MenuItem value="vip">VIP</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="السعة (عدد الأسرة)"
                type="number"
                fullWidth
                inputProps={{ min: 1 }}
                value={newRoom.capacity}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, capacity: e.target.value })
                }
              />
              <TextField
                label="سعر اليوم"
                type="number"
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                value={newRoom.price_per_day ?? "0"}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, price_per_day: e.target.value })
                }
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
                label="الغرفة نشطة"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleWardDialogClose}>إغلاق</Button>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={handleAddRoomSubmit}
            disabled={
              createRoomMutation.isPending || !newRoom.room_number.trim()
            }
          >
            {createRoomMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "إضافة غرفة"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addDialogOpen}
        onClose={handleAddCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة قسم جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="اسم القسم"
              required
              fullWidth
              value={newWard.name}
              onChange={(e) => setNewWard({ ...newWard, name: e.target.value })}
              autoFocus
            />
            <TextField
              label="الوصف"
              fullWidth
              multiline
              rows={3}
              value={newWard.description || ""}
              onChange={(e) =>
                setNewWard({ ...newWard, description: e.target.value })
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newWard.status}
                  onChange={(e) =>
                    setNewWard({ ...newWard, status: e.target.checked })
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
            onClick={handleAddConfirm}
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
      </Dialog>
    </Card>
  );
}
