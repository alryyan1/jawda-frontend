import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Box, Fade } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { toast } from "sonner";
import { smsService } from "@/services/smsService";
import { sendUltramsgText } from "@/services/ultramsgService";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  fetchAllFirestoreSpecialists, 
  fetchAllDoctorsBySpecialist,
  createFacilityAppointment,
  updateDoctor,
  fetchAllFacilityAppointments,
  fetchFacilityAppointmentsByDoctor,
  fetchSpecializationsFromApi,
  fetchAllDoctors,
  type FirestoreSpecialist,
  type FirestoreDoctor,
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
import AppointmentsColumn from "./components/AppointmentsColumn";
import DoctorsListDialog from "./components/DoctorsListDialog";

const OnlineBookingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<FirestoreDoctor | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditDoctorDialogOpen, setIsEditDoctorDialogOpen] = useState(false);
  const [doctorToEdit, setDoctorToEdit] = useState<FirestoreDoctor | null>(null);
  const [doctorEditForm, setDoctorEditForm] = useState<UpdateDoctorData>({});
  const [isAllAppointmentsDialogOpen, setIsAllAppointmentsDialogOpen] = useState(false);
  const [isSpecializationsDialogOpen, setIsSpecializationsDialogOpen] = useState(false);
  const [isAllDoctorsDialogOpen, setIsAllDoctorsDialogOpen] = useState(false);
  const [isDoctorsListDialogOpen, setIsDoctorsListDialogOpen] = useState(false);
  const [showAppointmentsView, setShowAppointmentsView] = useState(false);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [appConfig, setAppConfig] = useState<{ updatrUrl?: string }>({});
  const [selectedDayForViewing, setSelectedDayForViewing] = useState<string | null>(null);
  const [selectedDateForViewing, setSelectedDateForViewing] = useState<string>("");
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

  // Fetch appointments for all doctors to show counts (from facility appointments)
  const appointmentsQueries = useQueries({
    queries: (doctors || []).map((doctor) => ({
      queryKey: ["facilityAppointmentsCount", doctor.id],
      queryFn: () => fetchFacilityAppointmentsByDoctor(doctor.id),
      enabled: !!doctor.id,
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
        const futureAppointments = query.data.filter((appointment: FacilityAppointment) => {
          return appointment.date >= today;
        });
        counts[doctorId] = futureAppointments.length;
      }
    });
    
    return counts;
  }, [appointmentsQueries, doctors]);

  // Fetch all appointments for selected doctor from facility appointments (for schedule counts)
  const { data: allAppointmentsForDoctor } = useQuery<FacilityAppointment[], Error>({
    queryKey: ["facilityAppointmentsByDoctor", selectedDoctor?.id],
    queryFn: () => fetchFacilityAppointmentsByDoctor(selectedDoctor!.id),
    enabled: !!selectedDoctor?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch all facility appointments (from the new path) for appointments view
  const { data: appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useQuery<FacilityAppointment[], Error>({
    queryKey: ["facilityAppointments"],
    queryFn: fetchAllFacilityAppointments,
    enabled: showAppointmentsView || !!selectedDateForViewing,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Filter appointments for selected doctor and date
  const filteredDayAppointments = useMemo(() => {
    if (!appointments || !selectedDateForViewing || !selectedDoctor) return [];
    
    return appointments.filter((appointment) => {
      return appointment.date === selectedDateForViewing && 
             appointment.doctorId === selectedDoctor.id;
    });
  }, [appointments, selectedDateForViewing, selectedDoctor]);

  // Filter and sort appointments based on search (newest first)
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
        queryClient.invalidateQueries({ queryKey: ["facilityAppointmentsByDoctor", selectedDoctor.id] });
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
       console.log("selectedSpecialist", selectedSpecialist);
      // Validate that centralSpecialtyId exists
      if (!selectedSpecialist.centralSpecialtyId) {
        throw new Error("Specialist centralSpecialtyId is missing");
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
        const updateUrl = appConfig?.updatrUrl || "";
        console.log("updateUrl", updateUrl);
        const urlText = updateUrl ? `\n\nرابط التطبيق: ${updateUrl}` : "";
        const smsMessage = `تم حجز موعدك بنجاح!\n\nالطبيب: ${doctorName}\nالتاريخ: ${dateDisplay}\nالفترة: ${periodText}${urlText}\n\nنتمنى لك دوام الصحة والعافية  `;
        
        // Send SMS and WhatsApp in parallel
        const [smsResponse, whatsappResponse] = await Promise.allSettled([
          smsService.sendSms(phoneNumber, smsMessage, "Jawda"),
          sendUltramsgText({
            to: phoneNumber,
            body: smsMessage
          })
        ]);
        
        // Handle SMS response
        if (smsResponse.status === 'fulfilled' && smsResponse.value.success) {
          toast.success("تم إرسال رسالة SMS بنجاح");
        } else if (smsResponse.status === 'fulfilled') {
          toast.warning(`تم إنشاء الموعد ولكن فشل إرسال SMS: ${smsResponse.value.error || "خطأ غير معروف"}`);
        } else {
          const errorMessage = (smsResponse.reason as { response?: { data?: { error?: string; message?: string } }; message?: string })?.response?.data?.error 
            || (smsResponse.reason as { response?: { data?: { error?: string; message?: string } }; message?: string })?.response?.data?.message 
            || (smsResponse.reason as { message?: string })?.message 
            || "خطأ غير معروف";
          toast.warning(`تم إنشاء الموعد ولكن فشل إرسال SMS: ${errorMessage}`);
        }
        
        // Handle WhatsApp response
        if (whatsappResponse.status === 'fulfilled' && whatsappResponse.value.success) {
          toast.success("تم إرسال رسالة WhatsApp بنجاح");
        } else if (whatsappResponse.status === 'fulfilled') {
          toast.warning(`تم إنشاء الموعد ولكن فشل إرسال WhatsApp: ${whatsappResponse.value.error || "خطأ غير معروف"}`);
        } else {
          const errorMessage = (whatsappResponse.reason as { response?: { data?: { error?: string; message?: string } }; message?: string })?.response?.data?.error 
            || (whatsappResponse.reason as { response?: { data?: { error?: string; message?: string } }; message?: string })?.response?.data?.message 
            || (whatsappResponse.reason as { message?: string })?.message 
            || "خطأ غير معروف";
          toast.warning(`تم إنشاء الموعد ولكن فشل إرسال WhatsApp: ${errorMessage}`);
        }
      } catch (error: unknown) {
        console.error('Sending messages failed:', error);
        const errorMessage = (error as { response?: { data?: { error?: string; message?: string } }; message?: string })?.response?.data?.error 
          || (error as { response?: { data?: { error?: string; message?: string } }; message?: string })?.response?.data?.message 
          || (error as { message?: string })?.message 
          || "خطأ غير معروف";
        toast.warning(`تم إنشاء الموعد ولكن فشل إرسال الرسائل: ${errorMessage}`);
      }
      
      setIsAppointmentDialogOpen(false);
      setFormData({ patientName: "", patientPhone: "", period: "morning" });
      // Invalidate appointments query to refresh the list (keeps 3-column layout)
      queryClient.invalidateQueries({ queryKey: ["facilityAppointments"] });
      // Invalidate all appointments query for schedule counts
      queryClient.invalidateQueries({ queryKey: ["facilityAppointmentsByDoctor", selectedDoctor?.id] });
      // Invalidate appointment counts for all doctors
      queryClient.invalidateQueries({ queryKey: ["facilityAppointmentsCount"] });
    },
    onError: (error: Error) => {
      toast.error(`فشل إنشاء الموعد: ${error.message}`);
    },
  });


  // Reset selected doctor when specialist changes
  useEffect(() => {
    setSelectedDoctor(null);
    setSelectedDayForViewing(null);
    setSelectedDateForViewing("");
  }, [selectedSpecialistId]);

  // Sort schedule days starting from today
  const sortedScheduleDays = useMemo(() => {
    if (!selectedDoctor?.workingSchedule) return [];

    const today = new Date();
    const todayDay = today.getDay(); // 0 = Sunday, 6 = Saturday

    const scheduleEntries = Object.entries(selectedDoctor.workingSchedule) as [string, DaySchedule][];
    
    // Sort days starting from today
    return scheduleEntries.sort(([dayA], [dayB]) => {
      const dayANum = arabicDayToNumber[dayA] ?? -1;
      const dayBNum = arabicDayToNumber[dayB] ?? -1;

      if (dayANum === -1 || dayBNum === -1) return 0;

      // Calculate days until each day (starting from today)
      const daysUntilA = dayANum >= todayDay 
        ? dayANum - todayDay 
        : 7 - todayDay + dayANum;
      const daysUntilB = dayBNum >= todayDay 
        ? dayBNum - todayDay 
        : 7 - todayDay + dayBNum;

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


  // Handle day row click - show appointments for selected day
  const handleDayRowClick = (day: string, dateString: string) => {
    setSelectedDayForViewing(day);
    setSelectedDateForViewing(dateString);
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

  // Filter and sort all appointments for dialog (today and future only, newest first)
  const filteredAllAppointments = useMemo(() => {
    if (!allAppointments) return [];
    
    const today = format(new Date(), "yyyy-MM-dd");
    
    // Filter to only include today and future dates
    const futureAppointments = allAppointments.filter((appointment) => {
      return appointment.date >= today;
    });
    
    // Sort by newest first (date descending, then createdAt descending)
    return futureAppointments.sort((a, b) => {
      // First compare dates (descending - newest first)
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      
      // If dates are the same, compare createdAt (descending - latest first)
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [allAppointments]);

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

  // Fetch all doctors from Firestore for the doctors list dialog
  const { data: doctorsList, isLoading: isLoadingDoctorsList } = useQuery<AllDoctor[], Error>({
    queryKey: ["doctorsList"],
    queryFn: fetchAllDoctors,
    enabled: isDoctorsListDialogOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch app config to get updateUrl from Firestore
  useEffect(() => {
    const fetchAppConfig = async () => {
      if (!db) {
        console.warn('Firebase is not initialized');
        return;
      }
      try {
        const versionDocRef = doc(db, 'appConfig', 'version');
        const versionDoc = await getDoc(versionDocRef);
        console.log("versionDoc", versionDoc.data());
        if (versionDoc.exists()) {
          console.log("versionDoc", versionDoc.data());
          setAppConfig(versionDoc.data() as { updatrUrl?: string });
        }
      } catch (error) {
        console.error('Error fetching app config:', error);
      }
    };
    
    fetchAppConfig();
  }, []);

  return (
    // <Container maxWidth={false} sx={{ py: { xs: 1, sm: 6, lg: 1 } }}>
    <>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedDoctor && (
            <Button
              onClick={() => {
                setSelectedDoctor(null);
                setSelectedDayForViewing(null);
                setSelectedDateForViewing("");
              }}
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              color="primary"
            >
              العودة للتخصصات
            </Button>
          )}
          <Button
            onClick={() => setIsSpecializationsDialogOpen(true)}
            variant="outlined"
          >
            التخصصات
          </Button>
          <Button
            onClick={() => setIsAllDoctorsDialogOpen(true)}
            variant="outlined"
          >
            الأطباء
          </Button>
          <Button
            onClick={() => setIsDoctorsListDialogOpen(true)}
            variant="outlined"
          >
            قائمة الأطباء من Firestore
          </Button>
          <Button
            onClick={() => setIsAllAppointmentsDialogOpen(true)}
            variant="outlined"
          >
            عرض جميع المواعيد
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            onClick={() => setShowAppointmentsView(!showAppointmentsView)}
            variant={showAppointmentsView ? "contained" : "outlined"}
            color="primary"
            sx={{ minWidth: 150 }}
          >
            {showAppointmentsView ? "عرض الجدول (3 أعمدة)" : "عرض المواعيد"}
          </Button>
        </Box>
      </Box>

      {showAppointmentsView ? (
        /* Appointments View - Full Width */
        <Box>
          <AppointmentsList
            appointments={filteredAppointments}
            isLoading={isLoadingAppointments}
            error={appointmentsError}
            formatDateDisplay={formatDateDisplay}
            formatRelativeTime={formatRelativeTime}
            onSearchChange={setAppointmentSearch}
            appointmentSearch={appointmentSearch}
          />
        </Box>
      ) : (
        /* Three Columns View */
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: selectedDateForViewing && selectedDoctor
            ? { xs: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(3, 1fr)' }
            : selectedDoctor 
            ? { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(2, 1fr)' }
            : selectedSpecialistId
            ? { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(2, 1fr)' }
            : { xs: 'repeat(3, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 2,
          position: 'relative',
          transition: 'grid-template-columns 0.3s ease-in-out'
        }}>
          {/* First Column - Specialists List (completely hidden when doctor is selected) */}
          {!selectedDoctor && (
            <Fade in={!selectedDoctor} timeout={300} unmountOnExit>
              <Box sx={{ 
                transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out'
              }}>
                <SpecialistsList
                  specialists={specialists}
                  isLoading={isLoading}
                  error={error}
                  selectedSpecialistId={selectedSpecialistId}
                  onSelectSpecialist={setSelectedSpecialistId}
                />
              </Box>
            </Fade>
          )}

          {/* Doctors List - Moves to first column position when doctor is selected */}
          {selectedSpecialistId && (
            <Fade in={!!selectedSpecialistId} timeout={300}>
              <Box sx={{ 
                transition: 'all 0.3s ease-in-out',
                transform: selectedDoctor ? 'translateX(0)' : 'translateX(0)'
              }}>
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
                      workingSchedule: doctor.workingSchedule || {},
                    });
                    setIsEditDoctorDialogOpen(true);
                  }}
                />
              </Box>
            </Fade>
          )}

          {/* Doctor Schedule - Only show if doctor is selected */}
          {selectedDoctor && (
            <Fade in={!!selectedDoctor} timeout={300}>
              <Box sx={{ 
                transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out'
              }}>
                <DoctorSchedule
                  selectedDoctor={selectedDoctor}
                  sortedScheduleDays={sortedScheduleDays}
                  scheduleDayAppointmentCounts={scheduleDayAppointmentCounts}
                  getDateForDay={getDateForDay}
                  formatDateDisplay={formatDateDisplay}
                  onDayRowClick={handleDayRowClick}
                  onDayClick={handleDayClick}
                  selectedDayForViewing={selectedDayForViewing}
                />
              </Box>
            </Fade>
          )}

          {/* Appointments Column - Show when a day is selected */}
          {selectedDateForViewing && selectedDoctor && (
            <Fade in={!!selectedDateForViewing} timeout={300}>
              <Box sx={{ 
                transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out'
              }}>
                <AppointmentsColumn
                  appointments={filteredDayAppointments}
                  isLoading={isLoadingAppointments}
                  selectedDate={selectedDateForViewing}
                  selectedDoctorName={selectedDoctor.docName}
                  formatRelativeTime={formatRelativeTime}
                  formatDateDisplay={formatDateDisplay}
                  onClose={() => {
                    setSelectedDayForViewing(null);
                    setSelectedDateForViewing("");
                  }}
                />
              </Box>
            </Fade>
          )}
        </Box>
      )}

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
        appointments={filteredAllAppointments}
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

      {/* Doctors List Dialog */}
      <DoctorsListDialog
        isOpen={isDoctorsListDialogOpen}
        onOpenChange={setIsDoctorsListDialogOpen}
        doctors={doctorsList}
        isLoading={isLoadingDoctorsList}
      />
    </>
    // </Container>
  );
};

export default OnlineBookingPage;

