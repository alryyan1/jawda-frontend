import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  fetchAllFirestoreSpecialists, 
  fetchAllDoctorsBySpecialist,
  fetchAppointmentsByDoctor,
  createAppointment,
  updateDoctor,
  fetchAllAppointments,
  type FirestoreSpecialist,
  type FirestoreDoctor,
  type FirestoreAppointment,
  type DaySchedule,
  type UpdateDoctorData,
  type AppointmentWithDoctor
} from "@/services/firestoreSpecialistService";
import { format } from "date-fns";
import { arabicDayToNumber, getDateForDay, formatDateDisplay, formatRelativeTime, generateTimeSlots } from "./utils/dateHelpers";
import SpecialistsList from "./components/SpecialistsList";
import DoctorsList from "./components/DoctorsList";
import DoctorSchedule from "./components/DoctorSchedule";
import AppointmentsList from "./components/AppointmentsList";
import AppointmentDialog from "./components/AppointmentDialog";
import EditDoctorDialog from "./components/EditDoctorDialog";
import AllAppointmentsDialog from "./components/AllAppointmentsDialog";

const OnlineBookingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<FirestoreDoctor | null>(null);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [filteredDate, setFilteredDate] = useState<string | null>(null);
  const [isEditDoctorDialogOpen, setIsEditDoctorDialogOpen] = useState(false);
  const [doctorToEdit, setDoctorToEdit] = useState<FirestoreDoctor | null>(null);
  const [doctorEditForm, setDoctorEditForm] = useState<UpdateDoctorData>({});
  const [isAllAppointmentsDialogOpen, setIsAllAppointmentsDialogOpen] = useState(false);
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

  // Fetch appointments for all doctors to show counts
  const appointmentsQueries = useQueries({
    queries: (doctors || []).map((doctor) => ({
      queryKey: ["firestoreAppointmentsCount", selectedSpecialistId, doctor.id],
      queryFn: () => fetchAppointmentsByDoctor(selectedSpecialistId!, doctor.id),
      enabled: !!selectedSpecialistId && !!doctor.id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    })),
  });

  // Calculate appointment counts per doctor (today and future only)
  const doctorAppointmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const today = format(new Date(), "yyyy-MM-dd");
    
    appointmentsQueries.forEach((query, index) => {
      if (query.data && doctors?.[index]) {
        const doctorId = doctors[index].id;
        const futureAppointments = query.data.filter((appointment) => {
          return appointment.date >= today;
        });
        counts[doctorId] = futureAppointments.length;
      }
    });
    
    return counts;
  }, [appointmentsQueries, doctors]);

  // Fetch all appointments for selected doctor (unfiltered) for schedule counts
  const { data: allAppointmentsForDoctor } = useQuery<FirestoreAppointment[], Error>({
    queryKey: ["firestoreAppointmentsAll", selectedSpecialistId, selectedDoctor?.id],
    queryFn: () => fetchAppointmentsByDoctor(selectedSpecialistId!, selectedDoctor!.id),
    enabled: !!selectedSpecialistId && !!selectedDoctor?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch appointments for selected doctor (with optional date filter)
  const { data: appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useQuery<FirestoreAppointment[], Error>({
    queryKey: ["firestoreAppointments", selectedSpecialistId, selectedDoctor?.id, filteredDate],
    queryFn: () => fetchAppointmentsByDoctor(selectedSpecialistId!, selectedDoctor!.id, filteredDate || undefined),
    enabled: !!selectedSpecialistId && !!selectedDoctor?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Update doctor mutation
  const updateDoctorMutation = useMutation({
    mutationFn: async (data: UpdateDoctorData) => {
      if (!selectedSpecialistId || !doctorToEdit?.id) throw new Error("No doctor selected");
      return updateDoctor(selectedSpecialistId, doctorToEdit.id, data);
    },
    onSuccess: () => {
      toast.success("تم تحديث بيانات الطبيب بنجاح");
      setIsEditDoctorDialogOpen(false);
      setDoctorToEdit(null);
      // Invalidate doctors query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["firestoreDoctors", selectedSpecialistId] });
      // If the updated doctor is the selected one, update it
      if (selectedDoctor?.id === doctorToEdit?.id && selectedDoctor?.id) {
        queryClient.invalidateQueries({ queryKey: ["firestoreAppointments", selectedSpecialistId, selectedDoctor.id] });
      }
    },
    onError: (error: Error) => {
      toast.error(`فشل تحديث بيانات الطبيب: ${error.message}`);
    },
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
      // Invalidate all appointments query for schedule counts
      queryClient.invalidateQueries({ queryKey: ["firestoreAppointmentsAll", selectedSpecialistId, selectedDoctor?.id] });
      // Invalidate appointment counts for all doctors
      queryClient.invalidateQueries({ queryKey: ["firestoreAppointmentsCount", selectedSpecialistId] });
    },
    onError: (error: Error) => {
      toast.error(`فشل إنشاء الموعد: ${error.message}`);
    },
  });

  // Filter and sort appointments based on search (newest first)
  // Note: Date filtering is now done on the server side
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    
    let filtered = appointments;
    
    // Apply search filter if search term exists
    if (appointmentSearch.trim()) {
      const searchLower = appointmentSearch.toLowerCase();
      filtered = filtered.filter((appointment) => {
        return (
          appointment.patientName.toLowerCase().includes(searchLower) ||
          appointment.patientPhone.includes(searchLower) ||
          appointment.date.includes(searchLower) ||
          appointment.time.includes(searchLower)
        );
      });
    }
    
    // Sort by newest first (date descending, then time descending)
    return filtered.sort((a, b) => {
      // First compare dates (descending - newest first)
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      
      // If dates are the same, compare times (descending - latest first)
      return b.time.localeCompare(a.time);
    });
  }, [appointments, appointmentSearch]);

  // Reset selected doctor and search when specialist changes
  useEffect(() => {
    setSelectedDoctor(null);
    setAppointmentSearch("");
    setFilteredDate(null);
  }, [selectedSpecialistId]);

  // Reset search and date filter when doctor changes
  useEffect(() => {
    setAppointmentSearch("");
    setFilteredDate(null);
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

  // Calculate appointment counts per schedule day
  const scheduleDayAppointmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    if (!allAppointmentsForDoctor || !selectedDoctor?.workingSchedule) {
      return counts;
    }
    
    // For each day in the schedule, count appointments for that date
    Object.keys(selectedDoctor.workingSchedule).forEach((day) => {
      const dateString = getDateForDay(day);
      if (dateString) {
        const dayAppointments = allAppointmentsForDoctor.filter(
          (appointment) => appointment.date === dateString
        );
        counts[dateString] = dayAppointments.length;
      }
    });
    
    return counts;
  }, [allAppointmentsForDoctor, selectedDoctor?.workingSchedule]);

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

  // Handle day row click - filter appointments by date
  const handleDayRowClick = (day: string, dateString: string) => {
    if (!selectedDoctor) return;
    
    const daySchedule = selectedDoctor.workingSchedule[day];
    if (!daySchedule || (!daySchedule.morning && !daySchedule.evening)) {
      toast.info("لا يوجد جدول متاح لهذا اليوم");
      return;
    }
    
    // Filter appointments by selected date
    setFilteredDate(dateString);
  };

  // Handle booking button click - open booking form
  const handleDayClick = (day: string, dateString: string) => {
    if (!selectedDoctor) return;
    
    const daySchedule = selectedDoctor.workingSchedule[day];
    if (!daySchedule || (!daySchedule.morning && !daySchedule.evening)) {
      toast.info("لا يوجد جدول متاح لهذا اليوم");
      return;
    }
    
    setSelectedDay(day);
    setSelectedDate(dateString);
    setFilteredDate(dateString); // Filter appointments by selected date
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

  // Fetch all appointments for the all appointments dialog
  const { data: allAppointments, isLoading: isLoadingAllAppointments } = useQuery<AppointmentWithDoctor[], Error>({
    queryKey: ["allAppointments"],
    queryFn: fetchAllAppointments,
    enabled: isAllAppointmentsDialogOpen,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  return (
    <div className="container mx-auto py-1 sm:py-6 lg:py-1 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* <h1 className="text-2xl font-bold">الحجز الإلكتروني</h1> */}
        <Button
          onClick={() => setIsAllAppointmentsDialogOpen(true)}
          variant="outline"
        >
          عرض جميع المواعيد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* First Column - Specialists List */}
        <SpecialistsList
          specialists={specialists}
          isLoading={isLoading}
          error={error}
          selectedSpecialistId={selectedSpecialistId}
          onSelectSpecialist={setSelectedSpecialistId}
        />

        {/* Second Column - Doctors List */}
        <DoctorsList
          doctors={doctors}
          isLoading={isLoadingDoctors}
          error={doctorsError}
          selectedSpecialistId={selectedSpecialistId}
          selectedDoctor={selectedDoctor}
          specialists={specialists}
          doctorAppointmentCounts={doctorAppointmentCounts}
          onSelectDoctor={setSelectedDoctor}
          onEditDoctor={(doctor) => {
            setDoctorToEdit(doctor);
            setDoctorEditForm({
              docName: doctor.docName || "",
              eveningPatientLimit: doctor.eveningPatientLimit || 0,
              isActive: doctor.isActive ?? true,
              isBookingEnabled: doctor.isBookingEnabled ?? false,
              morningPatientLimit: doctor.morningPatientLimit || 0,
              phoneNumber: doctor.phoneNumber || "",
            });
            setIsEditDoctorDialogOpen(true);
          }}
        />

        {/* Third Column - Doctor Schedule */}
        <DoctorSchedule
          selectedDoctor={selectedDoctor}
          sortedScheduleDays={sortedScheduleDays}
          scheduleDayAppointmentCounts={scheduleDayAppointmentCounts}
          getDateForDay={getDateForDay}
          formatDateDisplay={formatDateDisplay}
          onDayRowClick={handleDayRowClick}
          onDayClick={handleDayClick}
        />

        {/* Fourth Column - Appointments */}
        <AppointmentsList
          selectedDoctor={selectedDoctor}
          appointments={appointments}
          isLoading={isLoadingAppointments}
          error={appointmentsError}
          filteredAppointments={filteredAppointments}
          appointmentSearch={appointmentSearch}
          filteredDate={filteredDate}
          formatDateDisplay={formatDateDisplay}
          formatRelativeTime={formatRelativeTime}
          onSearchChange={setAppointmentSearch}
          onClearDateFilter={() => setFilteredDate(null)}
        />
      </div>

      {/* Appointment Dialog */}
      <AppointmentDialog
        isOpen={isAppointmentDialogOpen}
        onOpenChange={setIsAppointmentDialogOpen}
        selectedDay={selectedDay}
        selectedDate={selectedDate}
        selectedDoctor={selectedDoctor}
        formData={formData}
        availableTimeSlots={availableTimeSlots}
        formatDateDisplay={formatDateDisplay}
        isPending={createAppointmentMutation.isPending}
        onFormDataChange={(data) => setFormData({ ...formData, ...data })}
        onSubmit={handleSubmit}
      />

      {/* Edit Doctor Dialog */}
      <EditDoctorDialog
        isOpen={isEditDoctorDialogOpen}
        onOpenChange={setIsEditDoctorDialogOpen}
        doctorToEdit={doctorToEdit}
        doctorEditForm={doctorEditForm}
        isPending={updateDoctorMutation.isPending}
        onFormChange={setDoctorEditForm}
        onSubmit={(e) => {
          e.preventDefault();
          updateDoctorMutation.mutate(doctorEditForm);
        }}
      />

      {/* All Appointments Dialog */}
      <AllAppointmentsDialog
        isOpen={isAllAppointmentsDialogOpen}
        onOpenChange={setIsAllAppointmentsDialogOpen}
        appointments={allAppointments}
        isLoading={isLoadingAllAppointments}
        formatRelativeTime={formatRelativeTime}
      />
    </div>
  );
};

export default OnlineBookingPage;

