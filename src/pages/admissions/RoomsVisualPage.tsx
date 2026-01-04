import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getRooms } from "@/services/roomService";
import { getBeds } from "@/services/bedService";
import { transferAdmission } from "@/services/admissionService";
import type { Room, Bed, Admission, TransferFormData } from "@/types/admissions";
import RoomCard from "@/components/admissions/visual/RoomCard";
import BedIcon from "@/components/admissions/visual/BedIcon";

interface RoomWithBeds extends Room {
  beds: Bed[];
}

export default function RoomsVisualPage() {
  const queryClient = useQueryClient();
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
          minHeight: "300px",
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
      {/* Rooms Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {roomsWithBeds.length === 0 ? (
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
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 1,
            }}
          >
            {roomsWithBeds.map((room) => (
              <Box key={room.id} sx={{ minWidth: '300px' }}>
                <RoomCard room={room} beds={room.beds} />
              </Box>
            ))}
          </Box>
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

