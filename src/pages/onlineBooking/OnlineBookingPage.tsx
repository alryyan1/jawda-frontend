import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { toast } from "sonner";
import { 
  fetchAllFirestoreSpecialists, 
  fetchAllDoctorsBySpecialist,
  fetchAppointmentsByDoctor,
  createAppointment,
  type FirestoreSpecialist,
  type FirestoreDoctor,
  type FirestoreAppointment,
  type DaySchedule
} from "@/services/firestoreSpecialistService";

// Map Arabic day names to JavaScript day numbers (0 = Sunday, 6 = Saturday)
const arabicDayToNumber: Record<string, number> = {
  "الأحد": 0,    // Sunday
  "الاثنين": 1,  // Monday
  "الثلاثاء": 2, // Tuesday
  "الأربعاء": 3, // Wednesday
  "الخميس": 4,   // Thursday
  "الجمعة": 5,   // Friday
  "السبت": 6,    // Saturday
};

const OnlineBookingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<FirestoreDoctor | null>(null);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [formData, setFormData] = useState({
    patientName: "",
    patientPhone: "",
    period: "morning" as "morning" | "evening",
    time: "",
  });

  // Fetch all specialists from Firestore
  const { data: specialists, isLoading, error } = useQuery<FirestoreSpecialist[], Error>({
    queryKey: ["firestoreSpecialists"],
    queryFn: fetchAllFirestoreSpecialists,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch doctors for selected specialist
  const { data: doctors, isLoading: isLoadingDoctors, error: doctorsError } = useQuery<FirestoreDoctor[], Error>({
    queryKey: ["firestoreDoctors", selectedSpecialistId],
    queryFn: () => fetchAllDoctorsBySpecialist(selectedSpecialistId!),
    enabled: !!selectedSpecialistId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch appointments for selected doctor
  const { data: appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useQuery<FirestoreAppointment[], Error>({
    queryKey: ["firestoreAppointments", selectedSpecialistId, selectedDoctor?.id],
    queryFn: () => fetchAppointmentsByDoctor(selectedSpecialistId!, selectedDoctor!.id),
    enabled: !!selectedSpecialistId && !!selectedDoctor?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: { patientName: string; patientPhone: string; period: "morning" | "evening"; time: string }) => {
      if (!selectedSpecialistId || !selectedDoctor?.id) throw new Error("No doctor selected");
      return createAppointment(selectedSpecialistId, selectedDoctor.id, {
        date: selectedDate,
        ...data,
      });
    },
    onSuccess: () => {
      toast.success("تم إنشاء الموعد بنجاح");
      setIsAppointmentDialogOpen(false);
      setFormData({ patientName: "", patientPhone: "", period: "morning", time: "" });
      // Invalidate appointments query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["firestoreAppointments", selectedSpecialistId, selectedDoctor?.id] });
    },
    onError: (error: Error) => {
      toast.error(`فشل إنشاء الموعد: ${error.message}`);
    },
  });

  // Filter appointments based on search
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    if (!appointmentSearch.trim()) return appointments;
    
    const searchLower = appointmentSearch.toLowerCase();
    return appointments.filter((appointment) => {
      return (
        appointment.patientName.toLowerCase().includes(searchLower) ||
        appointment.patientPhone.includes(searchLower) ||
        appointment.date.includes(searchLower) ||
        appointment.time.includes(searchLower)
      );
    });
  }, [appointments, appointmentSearch]);

  // Reset selected doctor and search when specialist changes
  useEffect(() => {
    setSelectedDoctor(null);
    setAppointmentSearch("");
  }, [selectedSpecialistId]);

  // Reset search when doctor changes
  useEffect(() => {
    setAppointmentSearch("");
  }, [selectedDoctor?.id]);

  // Sort schedule days starting from tomorrow
  const sortedScheduleDays = useMemo(() => {
    if (!selectedDoctor?.workingSchedule) return [];

    const today = new Date();
    const todayDay = today.getDay(); // 0 = Sunday, 6 = Saturday
    const tomorrowDay = (todayDay + 1) % 7;

    const scheduleEntries = Object.entries(selectedDoctor.workingSchedule) as [string, DaySchedule][];
    
    // Sort days starting from tomorrow
    return scheduleEntries.sort(([dayA], [dayB]) => {
      const dayANum = arabicDayToNumber[dayA] ?? -1;
      const dayBNum = arabicDayToNumber[dayB] ?? -1;

      if (dayANum === -1 || dayBNum === -1) return 0;

      // Calculate days until each day (starting from tomorrow)
      const daysUntilA = dayANum >= tomorrowDay 
        ? dayANum - tomorrowDay 
        : 7 - tomorrowDay + dayANum;
      const daysUntilB = dayBNum >= tomorrowDay 
        ? dayBNum - tomorrowDay 
        : 7 - tomorrowDay + dayBNum;

      return daysUntilA - daysUntilB;
    });
  }, [selectedDoctor?.workingSchedule]);

  // Calculate date for a given day name
  const getDateForDay = (dayName: string): string => {
    const today = new Date();
    const todayDay = today.getDay();
    const tomorrowDay = (todayDay + 1) % 7;
    const targetDay = arabicDayToNumber[dayName] ?? -1;

    if (targetDay === -1) return "";

    // Calculate days until target day (starting from tomorrow)
    const daysUntilTarget = targetDay >= tomorrowDay 
      ? targetDay - tomorrowDay 
      : 7 - tomorrowDay + targetDay;

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget + 1); // +1 because we start from tomorrow

    return format(targetDate, "yyyy-MM-dd", { locale: arSA });
  };

  // Format date for display
  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    return format(date, "d MMMM", { locale: arSA });
  };

  // Generate time slots based on schedule
  const generateTimeSlots = (start: string, end: string, intervalMinutes: number = 30): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const timeString = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
      slots.push(timeString);
      
      currentMin += intervalMinutes;
      if (currentMin >= 60) {
        currentMin -= 60;
        currentHour += 1;
      }
    }
    
    return slots;
  };

  // Get available time slots for selected day
  const availableTimeSlots = useMemo(() => {
    if (!selectedDay || !selectedDoctor?.workingSchedule) return [];
    
    const daySchedule = selectedDoctor.workingSchedule[selectedDay];
    if (!daySchedule) return [];
    
    const slots: string[] = [];
    
    if (daySchedule.morning) {
      const morningSlots = generateTimeSlots(
        daySchedule.morning.start,
        daySchedule.morning.end
      );
      slots.push(...morningSlots);
    }
    
    if (daySchedule.evening) {
      const eveningSlots = generateTimeSlots(
        daySchedule.evening.start,
        daySchedule.evening.end
      );
      slots.push(...eveningSlots);
    }
    
    return slots;
  }, [selectedDay, selectedDoctor?.workingSchedule]);

  // Handle day click
  const handleDayClick = (day: string, dateString: string) => {
    if (!selectedDoctor) return;
    
    const daySchedule = selectedDoctor.workingSchedule[day];
    if (!daySchedule || (!daySchedule.morning && !daySchedule.evening)) {
      toast.info("لا يوجد جدول متاح لهذا اليوم");
      return;
    }
    
    setSelectedDay(day);
    setSelectedDate(dateString);
    setFormData({
      patientName: "",
      patientPhone: "",
      period: daySchedule.morning ? "morning" : "evening",
      time: "",
    });
    setIsAppointmentDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientName.trim() || !formData.patientPhone.trim() || !formData.time) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    
    createAppointmentMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">الحجز الإلكتروني</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* First Column - Specialists List */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>التخصصات</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-4">
                فشل تحميل التخصصات
              </div>
            ) : specialists && specialists.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {specialists.map((specialist) => (
                  <div
                    key={specialist.id}
                    onClick={() => setSelectedSpecialistId(specialist.id)}
                    className={`p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                      selectedSpecialistId === specialist.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                        : ""
                    }`}
                  >
                    <div className="font-medium">{specialist.specName}</div>
                    {specialist.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {specialist.description}
                      </div>
                    )}
                    {!specialist.isActive && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        غير نشط
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                لا توجد تخصصات متاحة
              </div>
            )}
          </CardContent>
        </Card>

        {/* Second Column - Doctors List */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>
              الأطباء
              {selectedSpecialistId && specialists && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mr-2">
                  ({specialists.find(s => s.id === selectedSpecialistId)?.specName})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedSpecialistId ? (
              <div className="text-center py-8 text-gray-500">
                اختر تخصصاً لعرض الأطباء
              </div>
            ) : isLoadingDoctors ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : doctorsError ? (
              <div className="text-red-500 text-center py-4">
                فشل تحميل الأطباء
              </div>
            ) : doctors && doctors.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => setSelectedDoctor(doctor)}
                    className={`p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                      selectedDoctor?.id === doctor.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {doctor.photoUrl ? (
                        <img
                          src={doctor.photoUrl}
                          alt={doctor.docName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-400 text-sm">
                            {doctor.docName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{doctor.docName}</div>
                        {doctor.phoneNumber && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {doctor.phoneNumber}
                          </div>
                        )}
                        {!doctor.isActive && (
                          <div className="text-xs text-red-500 mt-1">غير نشط</div>
                        )}
                        {!doctor.isBookingEnabled && (
                          <div className="text-xs text-orange-500 mt-1">الحجز غير متاح</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                لا يوجد أطباء متاحون لهذا التخصص
              </div>
            )}
          </CardContent>
        </Card>

        {/* Third Column - Doctor Schedule */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>
              الجدول الزمني
              {selectedDoctor && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mr-2">
                  ({selectedDoctor.docName})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDoctor ? (
              <div className="text-center py-8 text-gray-500">
                اختر طبيباً لعرض جدوله الزمني
              </div>
            ) : selectedDoctor.workingSchedule && Object.keys(selectedDoctor.workingSchedule).length > 0 ? (
              <div className="max-h-[600px] overflow-y-auto">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedScheduleDays.map(([day, schedule]) => {
                    const hasSchedule = schedule.morning || schedule.evening;
                    const dateString = getDateForDay(day);
                    const formattedDate = formatDateDisplay(dateString);
                    return (
                      <div
                        key={day}
                        onClick={() => hasSchedule && handleDayClick(day, dateString)}
                        className={`py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          !hasSchedule ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">{day}</div>
                          {formattedDate && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formattedDate}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {schedule.morning && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              صباح
                            </span>
                          )}
                          {schedule.evening && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                              مساء
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                لا يوجد جدول زمني متاح
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fourth Column - Appointments */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>
              المواعيد
              {selectedDoctor && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mr-2">
                  ({selectedDoctor.docName})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDoctor ? (
              <div className="text-center py-8 text-gray-500">
                اختر طبيباً لعرض المواعيد
              </div>
            ) : isLoadingAppointments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : appointmentsError ? (
              <div className="text-red-500 text-center py-4">
                فشل تحميل المواعيد
              </div>
            ) : (
              <>
                {/* Search Input */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="بحث في المواعيد..."
                      value={appointmentSearch}
                      onChange={(e) => setAppointmentSearch(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>

                {/* Appointments List */}
                {filteredAppointments && filteredAppointments.length > 0 ? (
                  <div className="max-h-[500px] overflow-y-auto">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{appointment.patientName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {appointment.patientPhone}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {appointment.date} - {appointment.time}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  appointment.period === "morning"
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                    : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                                }`}>
                                  {appointment.period === "morning" ? "صباح" : "مساء"}
                                </span>
                                {appointment.isConfirmed ? (
                                  <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                    مؤكد
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                                    غير مؤكد
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : appointmentSearch ? (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد نتائج للبحث
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد مواعيد متاحة
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Dialog */}
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
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
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">اسم المريض</Label>
                <Input
                  id="patientName"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  placeholder="أدخل اسم المريض"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patientPhone">رقم الهاتف</Label>
                <Input
                  id="patientPhone"
                  value={formData.patientPhone}
                  onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                  placeholder="أدخل رقم الهاتف"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">الفترة</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value: "morning" | "evening") => {
                    setFormData({ ...formData, period: value, time: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفترة" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedDay && selectedDoctor?.workingSchedule[selectedDay]?.morning && (
                      <SelectItem value="morning">صباح</SelectItem>
                    )}
                    {selectedDay && selectedDoctor?.workingSchedule[selectedDay]?.evening && (
                      <SelectItem value="evening">مساء</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">الوقت</Label>
                <Select
                  value={formData.time}
                  onValueChange={(value) => setFormData({ ...formData, time: value })}
                  disabled={!formData.period}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوقت" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots
                      .filter((slot) => {
                        if (!selectedDay || !selectedDoctor?.workingSchedule) return false;
                        const daySchedule = selectedDoctor.workingSchedule[selectedDay];
                        if (!daySchedule) return false;
                        
                        if (formData.period === "morning") {
                          if (!daySchedule.morning) return false;
                          const [slotHour, slotMin] = slot.split(":").map(Number);
                          const [startHour, startMin] = daySchedule.morning.start.split(":").map(Number);
                          const [endHour, endMin] = daySchedule.morning.end.split(":").map(Number);
                          const slotMinutes = slotHour * 60 + slotMin;
                          const startMinutes = startHour * 60 + startMin;
                          const endMinutes = endHour * 60 + endMin;
                          return slotMinutes >= startMinutes && slotMinutes < endMinutes;
                        } else {
                          if (!daySchedule.evening) return false;
                          const [slotHour, slotMin] = slot.split(":").map(Number);
                          const [startHour, startMin] = daySchedule.evening.start.split(":").map(Number);
                          const [endHour, endMin] = daySchedule.evening.end.split(":").map(Number);
                          const slotMinutes = slotHour * 60 + slotMin;
                          const startMinutes = startHour * 60 + startMin;
                          const endMinutes = endHour * 60 + endMin;
                          return slotMinutes >= startMinutes && slotMinutes < endMinutes;
                        }
                      })
                      .map((slot) => (
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
                onClick={() => setIsAppointmentDialogOpen(false)}
                disabled={createAppointmentMutation.isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={createAppointmentMutation.isPending}>
                {createAppointmentMutation.isPending ? (
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
    </div>
  );
};

export default OnlineBookingPage;

