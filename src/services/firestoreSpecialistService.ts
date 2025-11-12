import { collection, getDocs, query, where, orderBy, doc, addDoc, serverTimestamp } from 'firebase/firestore';
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

export const fetchAppointmentsByDoctor = async (
  specialistId: string,
  doctorId: string
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
    
    // Query to get all appointments, ordered by date
    const q = query(
      appointmentsRef,
      orderBy('date', 'asc'),
      orderBy('time', 'asc')
    );
    
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