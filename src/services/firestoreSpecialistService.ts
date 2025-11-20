import { collection, getDocs, query, where, orderBy, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FirestoreSpecialist {
  id: string;
  centralSpecialtyId: string;
  createdAt: any; // Firestore timestamp
  description: string;
  isActive: boolean;
  order: number;
  specName: string;
}

export interface ApiSpecialization {
  id?: string;
  createdAt: string | { seconds?: number; nanoseconds?: number } | any; // Timestamp
  isActive: boolean;
  order: number;
  specName: string;
}

export interface AllDoctor {
  id: string;
  name: string;
  phoneNumber: string;
  specialization: string;
}

// Firestore path structure: medicalFacilities/{facilityId}/specializations
const FACILITY_ID = 'KyKrjLBHMBGHtLzU3RS3';

export const fetchFirestoreSpecialists = async (): Promise<FirestoreSpecialist[]> => {
  try {
    // Reference to the parent document
    const facilityDocRef = doc(db, 'medicalFacilities', FACILITY_ID);
    // Reference to the subcollection
    const specialistsRef = collection(facilityDocRef, 'specializations');
    
    // Query to get only active specialists, ordered by order field
    const q = query(
      specialistsRef,
      where('isActive', '==', true),
      orderBy('order', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const specialists: FirestoreSpecialist[] = [];
    console.log(querySnapshot.docs,'querySnapshot');
    querySnapshot.forEach((doc) => {
      specialists.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreSpecialist);
    });
    
    return specialists;
  } catch (error) {
    console.error('Error fetching Firestore specialists:', error);
    throw new Error('Failed to fetch specialists from Firestore');
  }
};

export const fetchAllFirestoreSpecialists = async (): Promise<FirestoreSpecialist[]> => {
  try {
    // Reference to the parent document
    const facilityDocRef = doc(db, 'medicalFacilities', FACILITY_ID);
    // Reference to the subcollection
    const specialistsRef = collection(facilityDocRef, 'specializations');
    
    // Query to get all specialists, ordered by order field
    const q = query(
      specialistsRef,
      orderBy('order', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const specialists: FirestoreSpecialist[] = [];
    
    querySnapshot.forEach((doc) => {
      specialists.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreSpecialist);
    });
    
    return specialists;
  } catch (error) {
    console.error('Error fetching all Firestore specialists:', error);
    throw new Error('Failed to fetch specialists from Firestore');
  }
};

export interface WorkingScheduleTime {
  start: string;
  end: string;
}

export interface DaySchedule {
  morning?: WorkingScheduleTime;
  evening?: WorkingScheduleTime;
}

export interface WorkingSchedule {
  [dayName: string]: DaySchedule; // e.g., "الاثنين", "الأربعاء", etc.
}

export interface FirestoreDoctor {
  id: string;
  centralDoctorId: string;
  createdAt: any; // Firestore timestamp
  docName: string;
  eveningPatientLimit: number;
  isActive: boolean;
  isBookingEnabled: boolean;
  morningPatientLimit: number;
  phoneNumber: string;
  photoUrl: string;
  specialization: string;
  updatedAt: any; // Firestore timestamp
  workingSchedule: WorkingSchedule;
}

export const fetchDoctorsBySpecialist = async (specialistId: string): Promise<FirestoreDoctor[]> => {
  try {
    // Reference to the specialist document
    const specialistDocRef = doc(db, 'medicalFacilities', FACILITY_ID, 'specializations', specialistId);
    // Reference to the doctors subcollection
    const doctorsRef = collection(specialistDocRef, 'doctors');
    
    // Query to get only active doctors with booking enabled
    const q = query(
      doctorsRef,
      where('isActive', '==', true),
      where('isBookingEnabled', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const doctors: FirestoreDoctor[] = [];
    
    querySnapshot.forEach((doc) => {
      doctors.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreDoctor);
    });
    
    return doctors;
  } catch (error) {
    console.error('Error fetching doctors for specialist:', error);
    throw new Error('Failed to fetch doctors from Firestore');
  }
};

export const fetchAllDoctorsBySpecialist = async (specialistId: string): Promise<FirestoreDoctor[]> => {
  try {
    // Reference to the specialist document
    const specialistDocRef = doc(db, 'medicalFacilities', FACILITY_ID, 'specializations', specialistId);
    // Reference to the doctors subcollection
    const doctorsRef = collection(specialistDocRef, 'doctors');
    
    // Query to get all doctors
    const querySnapshot = await getDocs(doctorsRef);
    const doctors: FirestoreDoctor[] = [];
    
    querySnapshot.forEach((doc) => {
      doctors.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreDoctor);
    });
    
    return doctors;
  } catch (error) {
    console.error('Error fetching all doctors for specialist:', error);
    throw new Error('Failed to fetch doctors from Firestore');
  }
};

export interface FirestoreAppointment {
  id: string;
  createdAt: any; // Firestore timestamp
  date: string;
  isConfirmed: boolean;
  patientId: string;
  patientName: string;
  patientPhone: string;
  period: "morning" | "evening";
  time: string;
}

// New appointment structure from /medicalFacilities/{facilityId}/appointments
export interface FacilityAppointment {
  id: string;
  centralSpecialtyId: string;
  createdAt: any; // Firestore timestamp
  date: string;
  doctorId: string;
  doctorName: string;
  facilityId: string;
  isConfirmed: boolean;
  patientId: string;
  patientName: string;
  patientPhone: string;
  period: "morning" | "evening";
  specializationName: string;
}

export const fetchAppointmentsByDoctor = async (
  specialistId: string,
  doctorId: string,
  date?: string
): Promise<FirestoreAppointment[]> => {
  try {
    // Reference to the doctor document
    const doctorDocRef = doc(
      db,
      'medicalFacilities',
      FACILITY_ID,
      'specializations',
      specialistId,
      'doctors',
      doctorId
    );
    // Reference to the appointments subcollection
    const appointmentsRef = collection(doctorDocRef, 'appointments');
    
    // Build query with optional date filter
    const queryConstraints: any[] = [];
    
    if (date) {
      queryConstraints.push(where('date', '==', date));
    }
    
    queryConstraints.push(orderBy('date', 'asc'));
    queryConstraints.push(orderBy('time', 'asc'));
    
    const q = query(appointmentsRef, ...queryConstraints);
    
    const querySnapshot = await getDocs(q);
    const appointments: FirestoreAppointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreAppointment);
    });
    
    return appointments;
  } catch (error) {
    console.error('Error fetching appointments for doctor:', error);
    throw new Error('Failed to fetch appointments from Firestore');
  }
};



export interface CreateAppointmentData {
  date: string;
  patientName: string;
  patientPhone: string;
  period: "morning" | "evening";
  time: string;
  patientId?: string;
  isConfirmed?: boolean;
}

export interface CreateFacilityAppointmentData {
  centralSpecialtyId: string;
  date: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  patientPhone: string;
  period: "morning" | "evening";
  specializationName: string;
  time?: string;
  isConfirmed?: boolean;
  patientId?: string;
}

export const createFacilityAppointment = async (
  appointmentData: CreateFacilityAppointmentData
): Promise<string> => {
  try {
    // Reference to the facility document
    const facilityDocRef = doc(db, 'medicalFacilities', FACILITY_ID);
    // Reference to the appointments collection
    const appointmentsRef = collection(facilityDocRef, 'appointments');
    
    // Generate patientId if not provided
    const patientId = appointmentData.patientId || `patient_${Date.now()}_${appointmentData.patientPhone.replace(/\D/g, '')}`;
    
    // Generate default time based on period if not provided
    const time = appointmentData.time || (appointmentData.period === "morning" ? "09:00" : "18:00");
    
    // Create appointment document
    const newAppointment = {
      centralSpecialtyId: appointmentData.centralSpecialtyId,
      createdAt: serverTimestamp(),
      date: appointmentData.date,
      doctorId: appointmentData.doctorId,
      doctorName: appointmentData.doctorName,
      facilityId: FACILITY_ID,
      isConfirmed: appointmentData.isConfirmed ?? false,
      patientId: patientId,
      patientName: appointmentData.patientName,
      patientPhone: appointmentData.patientPhone,
      period: appointmentData.period,
      specializationName: appointmentData.specializationName,
      time: time,
    };
    
    const docRef = await addDoc(appointmentsRef, newAppointment);
    return docRef.id;
  } catch (error) {
    console.error('Error creating facility appointment:', error);
    throw new Error('Failed to create appointment in Firestore');
  }
};

export const createAppointment = async (
  specialistId: string,
  doctorId: string,
  appointmentData: CreateAppointmentData
): Promise<string> => {
  try {
    // Reference to the doctor document
    const doctorDocRef = doc(
      db,
      'medicalFacilities',
      FACILITY_ID,
      'specializations',
      specialistId,
      'doctors',
      doctorId
    );
    // Reference to the appointments subcollection
    const appointmentsRef = collection(doctorDocRef, 'appointments');
    
    // Create appointment document
    const newAppointment = {
      ...appointmentData,
      createdAt: serverTimestamp(),
      isConfirmed: appointmentData.isConfirmed ?? false,
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(appointmentsRef, newAppointment);
    return docRef.id;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw new Error('Failed to create appointment in Firestore');
  }
};

export interface UpdateDoctorData {
  centralDoctorId?: string;
  docName?: string;
  eveningPatientLimit?: number;
  isActive?: boolean;
  isBookingEnabled?: boolean;
  morningPatientLimit?: number;
  phoneNumber?: string;
  photoUrl?: string;
  specialization?: string;
}

export const updateDoctor = async (
  specialistId: string,
  doctorId: string,
  doctorData: UpdateDoctorData
): Promise<void> => {
  try {
    // Reference to the doctor document
    const doctorDocRef = doc(
      db,
      'medicalFacilities',
      FACILITY_ID,
      'specializations',
      specialistId,
      'doctors',
      doctorId
    );
    
    // Update doctor document
    await updateDoc(doctorDocRef, {
      ...doctorData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating doctor:', error);
    throw new Error('Failed to update doctor in Firestore');
  }
};

export interface AppointmentWithDoctor extends FirestoreAppointment {
  doctorId: string;
  doctorName: string;
  specialistId: string;
  specialistName: string;
}

// Fetch all appointments from the facility-level appointments collection
export const fetchAllFacilityAppointments = async (): Promise<FacilityAppointment[]> => {
  try {
    // Reference to the facility document
    const facilityDocRef = doc(db, 'medicalFacilities', FACILITY_ID);
    // Reference to the appointments collection
    const appointmentsRef = collection(facilityDocRef, 'appointments');
    
    // Query to get all appointments, ordered by date (newest first)
    const q = query(
      appointmentsRef,
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const appointments: FacilityAppointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      } as FacilityAppointment);
    });
    
    return appointments;
  } catch (error) {
    console.error('Error fetching facility appointments:', error);
    throw new Error('Failed to fetch appointments from Firestore');
  }
};

export const fetchAllAppointments = async (): Promise<AppointmentWithDoctor[]> => {
  try {
    const allAppointments: AppointmentWithDoctor[] = [];
    
    // Get all specialists
    const specialists = await fetchAllFirestoreSpecialists();
    
    // For each specialist, get all doctors and their appointments
    for (const specialist of specialists) {
      const doctors = await fetchAllDoctorsBySpecialist(specialist.id);
      
      for (const doctor of doctors) {
        try {
          const appointments = await fetchAppointmentsByDoctor(specialist.id, doctor.id);
          
          // Add doctor and specialist info to each appointment
          appointments.forEach((appointment) => {
            allAppointments.push({
              ...appointment,
              doctorId: doctor.id,
              doctorName: doctor.docName,
              specialistId: specialist.id,
              specialistName: specialist.specName,
            });
          });
        } catch (error) {
          console.error(`Error fetching appointments for doctor ${doctor.id}:`, error);
          // Continue with other doctors
        }
      }
    }
    
    // Sort by date and time (newest first)
    return allAppointments.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
  } catch (error) {
    console.error('Error fetching all appointments:', error);
    throw new Error('Failed to fetch all appointments from Firestore');
  }
};

// Fetch specializations from Firestore
export const fetchSpecializationsFromApi = async (facilityId: string = 'KyKrjLBHMBGHtLzU3RS3'): Promise<ApiSpecialization[]> => {
  try {
    // Reference to the parent document
    const facilityDocRef = doc(db, 'medicalFacilities', facilityId);
    // Reference to the subcollection
    const specialistsRef = collection(facilityDocRef, 'specializations');
    
    // Query to get all specialists, ordered by order field
    const q = query(
      specialistsRef,
      orderBy('order', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const specializations: ApiSpecialization[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      specializations.push({
        id: doc.id,
        createdAt: data.createdAt,
        isActive: data.isActive ?? true,
        order: data.order ?? 0,
        specName: data.specName || '',
      });
    });
    
    return specializations;
  } catch (error) {
    console.error('Error fetching specializations from Firestore:', error);
    throw new Error('Failed to fetch specializations from Firestore');
  }
};

// Fetch all doctors from Firestore allDoctors collection
export const fetchAllDoctors = async (): Promise<AllDoctor[]> => {
  try {
    // Reference to the allDoctors collection
    const doctorsRef = collection(db, 'allDoctors');
    
    // Query to get all doctors
    const querySnapshot = await getDocs(doctorsRef);
    const doctors: AllDoctor[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      doctors.push({
        id: doc.id,
        name: data.name || '',
        phoneNumber: data.phoneNumber || '',
        specialization: data.specialization || '',
      });
    });
    
    return doctors;
  } catch (error) {
    console.error('Error fetching all doctors from Firestore:', error);
    throw new Error('Failed to fetch all doctors from Firestore');
  }
};