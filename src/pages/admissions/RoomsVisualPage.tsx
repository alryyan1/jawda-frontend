import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  IconButton,
  Card,
  CardContent,
} from "@mui/material";
import { RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getRooms } from "@/services/roomService";
import { getBeds } from "@/services/bedService";
import { getWardsList } from "@/services/wardService";
import { transferAdmission } from "@/services/admissionService";
import type { Room, Bed, Admission, TransferFormData } from "@/types/admissions";
import RoomCard from "@/components/admissions/visual/RoomCard";
import VisualFilters from "@/components/admissions/visual/VisualFilters";
import BedIcon from "@/components/admissions/visual/BedIcon";

interface RoomWithBeds extends Room {
  beds: Bed[];
}

export default function RoomsVisualPage() {
  const queryClient = useQueryClient();
  const [selectedWard, setSelectedWard] = useState<number | "">("");
  const [selectedRoomType, setSelectedRoomType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferData, setTransferData] = useState<{
    admission: Admission;
    sourceBed: Bed;
    targetBed: Bed;
    targetRoom: Room;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch data
  const { data: wards } = useQuery({
    queryKey: ["wardsList"],
    queryFn: () => getWardsList({ status: true }),
  });

  const { data: roomsData, isLoading: isLoadingRooms, refetch: refetchRooms } = useQuery({
    queryKey: ["rooms", "visual"],
    queryFn: () => getRooms(1, { per_page: 1000 }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: bedsData, isLoading: isLoadingBeds, refetch: refetchBeds } = useQuery({
    queryKey: ["beds", "visual"],
    queryFn: () => getBeds(1, { per_page: 1000 }),
    refetchInterval: 30000,
  });

  // Combine rooms and beds data
  const roomsWithBeds = useMemo(() => {
    if (!roomsData?.data || !bedsData?.data) return [];

    const bedsByRoomId = bedsData.data.reduce((acc: Record<number, Bed[]>, bed) => {
      if (!acc[bed.room_id]) {
        acc[bed.room_id] = [];
      }
      acc[bed.room_id].push(bed);
      return acc;
    }, {});

    return roomsData.data.map((room) => ({
      ...room,
      beds: bedsByRoomId[room.id] || [],
    })) as RoomWithBeds[];
  }, [roomsData, bedsData]);

  // Filter rooms
  const filteredRooms = useMemo(() => {
    let filtered = roomsWithBeds;

    // Ward filter
    if (selectedWard !== "") {
      filtered = filtered.filter((room) => room.ward_id === selectedWard);
    }

    // Room type filter
    if (selectedRoomType !== "all") {
      filtered = filtered.filter((room) => room.room_type === selectedRoomType);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((room) =>
        room.room_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((room) => {
        const occupied = room.beds.filter((b) => b.status === "occupied").length;
        const total = room.beds.length;
        const percentage = total > 0 ? (occupied / total) * 100 : 0;

        if (selectedStatus === "available") return percentage === 0;
        if (selectedStatus === "partial") return percentage > 0 && percentage < 100;
        if (selectedStatus === "occupied") return percentage === 100;
        return true;
      });
    }

    return filtered;
  }, [roomsWithBeds, selectedWard, selectedRoomType, selectedStatus, searchTerm]);

  // Quick filter handler
  const handleQuickFilter = (filter: "available" | "occupied" | "all") => {
    if (filter === "available") {
      setSelectedStatus("available");
    } else if (filter === "occupied") {
      setSelectedStatus("occupied");
    } else {
      setSelectedStatus("all");
    }
  };

  // Drag handlers
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Extract bed and room IDs
    if (activeId.startsWith("bed-") && overId.startsWith("bed-")) {
      const sourceBedId = parseInt(activeId.replace("bed-", ""));
      const targetBedId = parseInt(overId.replace("bed-", ""));

      const sourceBed = bedsData?.data.find((b) => b.id === sourceBedId);
      const targetBed = bedsData?.data.find((b) => b.id === targetBedId);

      if (!sourceBed || !targetBed || !sourceBed.current_admission) {
        toast.error("لا يمكن نقل هذا السرير");
        return;
      }

      if (sourceBedId === targetBedId) {
        return; // Same bed, no action needed
      }

      if (targetBed.status !== "available") {
        toast.error("السرير الهدف غير متاح");
        return;
      }

      const targetRoom = roomsData?.data.find((r) => r.id === targetBed.room_id);

      if (!targetRoom) {
        toast.error("لم يتم العثور على الغرفة");
        return;
      }

      setTransferData({
        admission: sourceBed.current_admission,
        sourceBed,
        targetBed,
        targetRoom,
      });
      setTransferDialogOpen(true);
    }
  };

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: (data: TransferFormData) =>
      transferAdmission(transferData!.admission.id, data),
    onSuccess: () => {
      toast.success("تم نقل المريض بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      refetchRooms();
      refetchBeds();
      setTransferDialogOpen(false);
      setTransferData(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل نقل المريض");
    },
  });

  const handleTransferConfirm = () => {
    if (!transferData) return;

    const transferFormData: TransferFormData = {
      ward_id: String(transferData.targetRoom.ward_id),
      room_id: String(transferData.targetRoom.id),
      bed_id: String(transferData.targetBed.id),
      notes: `نقل تلقائي من ${transferData.sourceBed.room?.room_number || ""} - سرير ${transferData.sourceBed.bed_number}`,
    };

    transferMutation.mutate(transferFormData);
  };

  const activeBed = useMemo(() => {
    if (!activeId || !activeId.startsWith("bed-")) return null;
    const bedId = parseInt(activeId.replace("bed-", ""));
    return bedsData?.data.find((b) => b.id === bedId);
  }, [activeId, bedsData]);

  const isLoading = isLoadingRooms || isLoadingBeds;

  if (isLoading && !roomsData && !bedsData) {
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
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          p: 3,
          overflowY: "auto",
          flex: 1,
        }}
      >
 

      {/* Filters */}
      {wards && (
        <VisualFilters
          wards={wards}
          selectedWard={selectedWard}
          selectedRoomType={selectedRoomType}
          selectedStatus={selectedStatus}
          searchTerm={searchTerm}
          onWardChange={setSelectedWard}
          onRoomTypeChange={setSelectedRoomType}
          onStatusChange={setSelectedStatus}
          onSearchChange={setSearchTerm}
          onQuickFilter={handleQuickFilter}
        />
      )}

      {/* Stats */}
      <Box
        sx={{
          mb: 3,
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            px: 2,
            py: 1.5,
            transition: "all 0.2s",
            "&:hover": { boxShadow: 2, transform: "translateY(-2px)" },
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            إجمالي الغرف
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {filteredRooms.length}
          </Typography>
        </Card>
        <Card
          variant="outlined"
          sx={{
            px: 2,
            py: 1.5,
            transition: "all 0.2s",
            "&:hover": { boxShadow: 2, transform: "translateY(-2px)" },
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            إجمالي الأسرّة
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {filteredRooms.reduce((sum, room) => sum + room.beds.length, 0)}
          </Typography>
        </Card>
        <Card
          variant="outlined"
          sx={{
            px: 2,
            py: 1.5,
            transition: "all 0.2s",
            "&:hover": { boxShadow: 2, transform: "translateY(-2px)" },
            borderColor: "error.light",
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            الأسرّة المشغولة
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "error.main" }}>
            {filteredRooms.reduce(
              (sum, room) => sum + room.beds.filter((b) => b.status === "occupied").length,
              0
            )}
          </Typography>
        </Card>
        <Card
          variant="outlined"
          sx={{
            px: 2,
            py: 1.5,
            transition: "all 0.2s",
            "&:hover": { boxShadow: 2, transform: "translateY(-2px)" },
            borderColor: "success.light",
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            الأسرّة المتاحة
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "success.main" }}>
            {filteredRooms.reduce(
              (sum, room) => sum + room.beds.filter((b) => b.status === "available").length,
              0
            )}
          </Typography>
        </Card>
      </Box>

      {/* Rooms Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {filteredRooms.length === 0 ? (
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 6,
                }}
              >
                <AlertCircle size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  لا توجد غرف تطابق الفلاتر المحددة
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  جرب تغيير الفلاتر للعثور على الغرف
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredRooms.map((room) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={room.id}>
                <RoomCard room={room} beds={room.beds} />
              </Grid>
            ))}
          </Grid>
        )}

        <DragOverlay>
          {activeBed ? (
            <Box sx={{ opacity: 0.8 }}>
              <BedIcon bed={activeBed} roomId={activeBed.room_id || 0} isDragging />
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Transfer Confirmation Dialog */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تأكيد نقل المريض</DialogTitle>
        <DialogContent>
          {transferData && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                سيتم نقل المريض من السرير الحالي إلى السرير الجديد
              </Alert>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  اسم المريض:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                  {transferData.admission.patient?.name || "-"}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  من:
                </Typography>
                <Typography variant="body1">
                  {transferData.sourceBed.room?.room_number || "-"} - سرير {transferData.sourceBed.bed_number}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  إلى:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: "success.main" }}>
                  {transferData.targetRoom.room_number} - سرير {transferData.targetBed.bed_number}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)} disabled={transferMutation.isPending}>
            إلغاء
          </Button>
          <Button
            onClick={handleTransferConfirm}
            variant="contained"
            color="primary"
            disabled={transferMutation.isPending}
          >
            {transferMutation.isPending ? <CircularProgress size={20} /> : "تأكيد النقل"}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

