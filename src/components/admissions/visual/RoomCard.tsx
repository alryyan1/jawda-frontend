import { useDroppable } from "@dnd-kit/core";
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
} from "@mui/material";
import { DoorOpen, BedDouble } from "lucide-react";
import BedIcon from "./BedIcon";
import type { Room, Bed } from "@/types/admissions";

interface RoomCardProps {
  room: Room;
  beds: Bed[];
  isOver?: boolean;
}

export default function RoomCard({ room, beds, isOver }: RoomCardProps) {
  const { setNodeRef, isOver: isDroppable } = useDroppable({
    id: `room-${room.id}`,
    data: {
      room,
      beds,
    },
  });

  // Check if the whole room is booked (booking_type = 'room')
  const isRoomFullyBooked = room.is_fully_occupied || false;
  
  const occupiedBeds = beds.filter((bed) => bed.status === "occupied").length;
  const availableBeds = beds.filter((bed) => bed.status === "available").length;
  const maintenanceBeds = beds.filter((bed) => bed.status === "maintenance").length;
  const totalBeds = beds.length;
  
  // If room is fully booked, mark it as 100% occupied
  const occupancyPercentage = isRoomFullyBooked 
    ? 100 
    : (totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0);

  const getRoomStatusColor = () => {
    if (!room.status) return "#9e9e9e"; // Gray - inactive
    if (occupancyPercentage === 0) return "#4caf50"; // Green - all available
    if (occupancyPercentage === 100) return "#f44336"; // Red - fully occupied
    return "#ff9800"; // Orange - partially occupied
  };

  const getProgressColor = () => {
    if (occupancyPercentage <= 30) return "success";
    if (occupancyPercentage <= 70) return "warning";
    return "error";
  };

  const roomTypeLabel =
    room.room_type === "normal" ? "عادي" : room.room_type === "vip" ? "VIP" : "-";

  return (
    <Card
      ref={setNodeRef}
      sx={{
        border: `3px solid ${getRoomStatusColor()}`,
        borderRadius: 2,
        transition: "all 0.3s ease-in-out",
        bgcolor: isDroppable || isOver ? "action.hover" : "background.paper",
        boxShadow: isDroppable || isOver ? 6 : 2,
        transform: isDroppable || isOver ? "scale(1.02) translateY(-4px)" : "scale(1)",
        height: "100%",
        minWidth: "300px",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          boxShadow: 4,
          transform: "translateY(-2px)",
        },
      }}
    >
      <CardContent>
        {/* Room Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DoorOpen size={20} color={getRoomStatusColor()} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {room.room_number}
            </Typography>
            {roomTypeLabel !== "-" && (
              <Chip label={roomTypeLabel} size="small" color="primary" variant="outlined" />
            )}
          </Box>
          {room.ward && (
            <Typography variant="caption" color="text.secondary">
              {room.ward.name}
            </Typography>
          )}
        </Box>

        {/* Room Booking Info (if booked as room) */}
        {isRoomFullyBooked && room.current_admission && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              bgcolor: "error.50",
              border: "1px solid",
              borderColor: "error.200",
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" color="error.dark" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
              المريض:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {room.current_admission.patient?.name || "-"}
            </Typography>
            {room.current_admission.admission_date && (
              <Typography variant="caption" color="text.secondary">
                تاريخ الدخول: {room.current_admission.admission_date}
              </Typography>
            )}
          </Box>
        )}

        {/* Beds Grid */}
        {!isRoomFullyBooked && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(50px, 1fr))",
              gap: 1.5,
              mb: 2,
              minHeight: 120,
              p: 1,
              bgcolor: "grey.50",
              borderRadius: 1,
            }}
          >
            {beds.length > 0 ? (
              beds.map((bed) => <BedIcon key={bed.id} bed={bed} roomId={room.id} />)
            ) : (
              <Box
                sx={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  py: 3,
                  color: "text.secondary",
                }}
              >
                <BedDouble size={32} style={{ opacity: 0.3 }} />
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  لا توجد أسرّة
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Bed Count & Status */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {isRoomFullyBooked ? (
              <Chip
                label="الغرفة محجوزة بالكامل"
                size="small"
                color="error"
                variant="filled"
              />
            ) : (
              <>
                <Chip
                  label={`${occupiedBeds}/${totalBeds} مشغول`}
                  size="small"
                  color={occupiedBeds > 0 ? "error" : "default"}
                  variant={occupiedBeds > 0 ? "filled" : "outlined"}
                />
                {availableBeds > 0 && (
                  <Chip
                    label={`${availableBeds} متاح`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
                {maintenanceBeds > 0 && (
                  <Chip
                    label={`${maintenanceBeds} صيانة`}
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                )}
              </>
            )}
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              نسبة الإشغال
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {occupancyPercentage.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={occupancyPercentage}
            color={getProgressColor()}
            sx={{
              height: 8,
              borderRadius: 1,
              bgcolor: "grey.200",
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

