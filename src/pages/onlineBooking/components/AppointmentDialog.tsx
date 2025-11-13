import React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FirestoreDoctor, DaySchedule } from "@/services/firestoreSpecialistService";

interface AppointmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: string | null;
  selectedDate: string;
  selectedDoctor: FirestoreDoctor | null;
  formData: {
    patientName: string;
    patientPhone: string;
    period: "morning" | "evening";
    time: string;
  };
  availableTimeSlots: string[];
  formatDateDisplay: (dateString: string) => string;
  isPending: boolean;
  onFormDataChange: (data: Partial<AppointmentDialogProps["formData"]>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedDay,
  selectedDate,
  selectedDoctor,
  formData,
  availableTimeSlots,
  formatDateDisplay,
  isPending,
  onFormDataChange,
  onSubmit,
}) => {
  const daySchedule = selectedDay && selectedDoctor?.workingSchedule
    ? selectedDoctor.workingSchedule[selectedDay]
    : null;

  const filteredTimeSlots = availableTimeSlots.filter((slot) => {
    if (!selectedDay || !selectedDoctor?.workingSchedule) return false;
    const schedule = selectedDoctor.workingSchedule[selectedDay];
    if (!schedule) return false;

    if (formData.period === "morning") {
      if (!schedule.morning) return false;
      const [slotHour, slotMin] = slot.split(":").map(Number);
      const [startHour, startMin] = schedule.morning.start.split(":").map(Number);
      const [endHour, endMin] = schedule.morning.end.split(":").map(Number);
      const slotMinutes = slotHour * 60 + slotMin;
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    } else {
      if (!schedule.evening) return false;
      const [slotHour, slotMin] = slot.split(":").map(Number);
      const [startHour, startMin] = schedule.evening.start.split(":").map(Number);
      const [endHour, endMin] = schedule.evening.end.split(":").map(Number);
      const slotMinutes = slotHour * 60 + slotMin;
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>إنشاء موعد جديد</DialogTitle>
          <DialogDescription>
            {selectedDay && selectedDate && (
              <span>
                {selectedDay} - {formatDateDisplay(selectedDate)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patientName">اسم المريض</Label>
              <Input
                id="patientName"
                value={formData.patientName}
                onChange={(e) =>
                  onFormDataChange({ patientName: e.target.value })
                }
                placeholder="أدخل اسم المريض"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patientPhone">رقم الهاتف</Label>
              <Input
                id="patientPhone"
                value={formData.patientPhone}
                onChange={(e) =>
                  onFormDataChange({ patientPhone: e.target.value })
                }
                placeholder="أدخل رقم الهاتف"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">الفترة</Label>
              <Select
                value={formData.period}
                onValueChange={(value: "morning" | "evening") => {
                  onFormDataChange({ period: value, time: "" });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفترة" />
                </SelectTrigger>
                <SelectContent>
                  {daySchedule?.morning && (
                    <SelectItem value="morning">صباح</SelectItem>
                  )}
                  {daySchedule?.evening && (
                    <SelectItem value="evening">مساء</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">الوقت</Label>
              <Select
                value={formData.time}
                onValueChange={(value) => onFormDataChange({ time: value })}
                disabled={!formData.period}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الوقت" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTimeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                "إنشاء الموعد"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;

