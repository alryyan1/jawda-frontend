import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { smsService } from "@/services/smsService";
import { 
  fetchAllFirestoreSpecialists, 
  fetchAllDoctorsBySpecialist,
  fetchAppointmentsByDoctor,
  createFacilityAppointment,
  updateDoctor,
  fetchAllFacilityAppointments,
  fetchSpecializationsFromApi,
  fetchAllDoctors,
  type FirestoreSpecialist,
  type FirestoreDoctor,
  type FirestoreAppointment,
  type FacilityAppointment,
  type DaySchedule,
  type UpdateDoctorData,
  type ApiSpecialization,
  type AllDoctor
} from "@/services/firestoreSpecialistService";
import { format } from "date-fns";
import { arabicDayToNumber, getDateForDay, formatDateDisplay, formatRelativeTime } from "./utils/dateHelpers";
import SpecialistsList from "./components/SpecialistsList";
import DoctorsList from "./components/DoctorsList";
import DoctorSchedule from "./components/DoctorSchedule";
import AppointmentsList from "./components/AppointmentsList";
import AppointmentDialog from "./components/AppointmentDialog";
import EditDoctorDialog from "./components/EditDoctorDialog";
import AllAppointmentsDialog from "./components/AllAppointmentsDialog";
import SpecializationsDialog from "./components/SpecializationsDialog";
import AllDoctorsDialog from "./components/AllDoctorsDialog";

const OnlineBookingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<FirestoreDoctor | null>(null);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditDoctorDialogOpen, setIsEditDoctorDialogOpen] = useState(false);
  const [doctorToEdit, setDoctorToEdit] = useState<FirestoreDoctor | null>(null);
  const [doctorEditForm, setDoctorEditForm] = useState<UpdateDoctorData>({});
  const [isAllAppointmentsDialogOpen, setIsAllAppointmentsDialogOpen] = useState(false);
  const [isSpecializationsDialogOpen, setIsSpecializationsDialogOpen] = useState(false);
  const [isAllDoctorsDialogOpen, setIsAllDoctorsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    patientName: "",
    patientPhone: "",
    period: "morning" as "morning" | "evening",
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
        const futureAppointments = query.data.filter((appointment: FirestoreAppointment) => {
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

  // Fetch all facility appointments (from the new path)
  const { data: appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useQuery<FacilityAppointment[], Error>({
    queryKey: ["facilityAppointments"],
    queryFn: fetchAllFacilityAppointments,
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
    mutationFn: async (data: { patientName: string; patientPhone: string; period: "morning" | "evening" }) => {
      if (!selectedSpecialistId || !selectedDoctor?.id || !specialists) {
        throw new Error("No doctor or specialist selected");
      }
      
      // Find the selected specialist to get centralSpecialtyId and specializationName
      const selectedSpecialist = specialists.find(s => s.id === selectedSpecialistId);
      if (!selectedSpecialist) {
        throw new Error("Specialist not found");
      }
      
      return createFacilityAppointment({
        centralSpecialtyId: selectedSpecialist.centralSpecialtyId,
        date: selectedDate,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.docName,
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        period: data.period,
        specializationName: selectedSpecialist.specName,
        isConfirmed: false,
      });
    },
    onSuccess: async (_, variables) => {
      toast.success("تم إنشاء الموعد بنجاح");
      
      // Send SMS notification
      try {
        toast.info("جاري إرسال رسالة SMS...");
        
        // Format phone number (add 249 prefix if needed)
        const phoneNumber = variables.patientPhone.startsWith('249') 
          ? variables.patientPhone 
          : `249${variables.patientPhone.replace(/^0/, '')}`;
        
        // Create Arabic SMS template
        const periodText = variables.period === "morning" ? "صباح" : "مساء";
        const doctorName = selectedDoctor?.docName || "الطبيب";
        const dateDisplay = formatDateDisplay(selectedDate);
        const smsMessage = `تم حجز موعدك بنجاح!\n\nالطبيب: ${doctorName}\nالتاريخ: ${dateDisplay}\nالفترة: ${periodText}\n\nنتمنى لك دوام الصحة والعافية\nعيادة جودة الطبية`;
        
        const smsResponse = await smsService.sendSms(phoneNumber, smsMessage, "Jawda");
        
        if (smsResponse.success) {
          toast.success("تم إرسال رسالة SMS بنجاح");
        } else {
          toast.warning(`تم إنشاء الموعد ولكن فشل إرسال SMS: ${smsResponse.error || "خطأ غير معروف"}`);
        }
      } catch (smsError: unknown) {
        console.error('SMS sending failed:', smsError);
        const errorMessage = (smsError as { response?: { data?: { error?: string; message?: string } }; message?: string })?.response?.data?.error 
          || (smsError as { response?: { data?: { error?: string; message?: string } }; message?: string })?.response?.data?.message 
          || (smsError as { message?: string })?.message 
          || "خطأ غير معروف";
        toast.warning(`تم إنشاء الموعد ولكن فشل إرسال SMS: ${errorMessage}`);
      }
      
      setIsAppointmentDialogOpen(false);
      setFormData({ patientName: "", patientPhone: "", period: "morning" });
      // Invalidate appointments query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["facilityAppointments"] });
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
  // Note: Search is now handled in AppointmentsList component
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    
    // Sort by newest first (date descending, then createdAt descending)
    return appointments.sort((a, b) => {
      // First compare dates (descending - newest first)
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      
      // If dates are the same, compare createdAt (descending - latest first)
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [appointments]);

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


  // Handle day row click - filter appointments by date (removed, using search instead)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDayRowClick = (_day: string, _dateString: string) => {
    // Note: Date filtering is now handled via search in AppointmentsList
    // Parameters are kept for compatibility with DoctorSchedule component
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
    setFormData({
      patientName: "",
      patientPhone: "",
      period: daySchedule.morning ? "morning" : "evening",
    });
    setIsAppointmentDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientName.trim() || !formData.patientPhone.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    
    createAppointmentMutation.mutate(formData);
  };

  // Fetch all appointments for the all appointments dialog
  const { data: allAppointments, isLoading: isLoadingAllAppointments } = useQuery<FacilityAppointment[], Error>({
    queryKey: ["facilityAppointments"],
    queryFn: fetchAllFacilityAppointments,
    enabled: isAllAppointmentsDialogOpen,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Fetch specializations from API for the specializations dialog
  const { data: apiSpecializations, isLoading: isLoadingApiSpecializations } = useQuery<ApiSpecialization[], Error>({
    queryKey: ["apiSpecializations"],
    queryFn: () => fetchSpecializationsFromApi('KyKrjLBHMBGHtLzU3RS3'),
    enabled: isSpecializationsDialogOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all doctors from Firestore for the all doctors dialog
  const { data: allDoctors, isLoading: isLoadingAllDoctors } = useQuery<AllDoctor[], Error>({
    queryKey: ["allDoctors"],
    queryFn: fetchAllDoctors,
    enabled: isAllDoctorsDialogOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <div className="container mx-auto py-1 sm:py-6 lg:py-1 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* <h1 className="text-2xl font-bold">الحجز الإلكتروني</h1> */}
        <div className="flex gap-2">
          <Button
            onClick={() => setIsSpecializationsDialogOpen(true)}
            variant="outline"
          >
            التخصصات
          </Button>
          <Button
            onClick={() => setIsAllDoctorsDialogOpen(true)}
            variant="outline"
          >
            الأطباء
          </Button>
          <Button
            onClick={() => setIsAllAppointmentsDialogOpen(true)}
            variant="outline"
          >
            عرض جميع المواعيد
          </Button>
        </div>
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
          appointments={filteredAppointments}
          isLoading={isLoadingAppointments}
          error={appointmentsError}
          formatDateDisplay={formatDateDisplay}
          formatRelativeTime={formatRelativeTime}
          onSearchChange={setAppointmentSearch}
          appointmentSearch={appointmentSearch}
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
        formatDateDisplay={formatDateDisplay}
      />

      {/* Specializations Dialog */}
      <SpecializationsDialog
        isOpen={isSpecializationsDialogOpen}
        onOpenChange={setIsSpecializationsDialogOpen}
        specializations={apiSpecializations}
        isLoading={isLoadingApiSpecializations}
      />

      {/* All Doctors Dialog */}
      <AllDoctorsDialog
        isOpen={isAllDoctorsDialogOpen}
        onOpenChange={setIsAllDoctorsDialogOpen}
        doctors={allDoctors}
        isLoading={isLoadingAllDoctors}
      />
    </div>
  );
};

export default OnlineBookingPage;

