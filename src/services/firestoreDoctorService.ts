import { collection, getDocs, query, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OnlineAppointment } from '@/types/doctors';

export interface FirestoreDoctor {
  id: string;
  centralDoctorId: string;
  createdAt: unknown; // Firestore timestamp
  docName: string;
  eveningPatientLimit: number;
  isActive: boolean;
  isBookingEnabled: boolean;
  morningPatientLimit: number;
  phoneNumber: string;
  photoUrl: string;
  specialization: string;
  workingSchedule: {
    [key: string]: {
      morning?: {
        start: string;
        end: string;
      };
      evening?: {
        start: string;
        end: string;
      };
    };
  };
}

const FACILITY_ID = 'KyKrjLBHMBGHtLzU3RS3';

export const fetchFirestoreDoctors = async (specializationId: string): Promise<FirestoreDoctor[]> => {
  try {
    if (!specializationId) {
      return [];
    }

    // Reference to the parent document path: medicalFacilities/{facilityId}/specializations/{specializationId}/doctors
    const specializationDocRef = doc(db, 'medicalFacilities', FACILITY_ID, 'specializations', specializationId);
    const doctorsRef = collection(specializationDocRef, 'doctors');
    
    // Query to get only active doctors, ordered by docName
    const q = query(
      doctorsRef,
    //   where('isActive', '==', true),
      orderBy('docName', 'asc')
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
    console.error('Error fetching Firestore doctors:', error);
    throw new Error('Failed to fetch doctors from Firestore');
  }
};

export const fetchAllFirestoreDoctors = async (specializationId: string): Promise<FirestoreDoctor[]> => {
  try {
    if (!specializationId) {
      return [];
    }

    // Reference to the parent document path: medicalFacilities/{facilityId}/specializations/{specializationId}/doctors
    const specializationDocRef = doc(db, 'medicalFacilities', FACILITY_ID, 'specializations', specializationId);
    const doctorsRef = collection(specializationDocRef, 'doctors');
    
    // Query to get all doctors, ordered by docName
    const q = query(
      doctorsRef,
      orderBy('docName', 'asc')
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
    console.error('Error fetching all Firestore doctors:', error);
    throw new Error('Failed to fetch doctors from Firestore');
  }
};

export const fetchDoctorAppointments = async (specializationId: string, doctorId: string): Promise<OnlineAppointment[]> => {
  try {
    if (!specializationId || !doctorId) {
      return [];
    }

    // Reference to the appointments collection: medicalFacilities/{facilityId}/specializations/{specializationId}/doctors/{doctorId}/appointments
    const doctorDocRef = doc(db, 'medicalFacilities', FACILITY_ID, 'specializations', specializationId, 'doctors', doctorId);
    const appointmentsRef = collection(doctorDocRef, 'appointments');
    
    // Query to get all appointments, ordered by date and time
    const q = query(
      appointmentsRef,
      orderBy('date', 'asc'),
      orderBy('time', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const appointments: OnlineAppointment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      appointments.push({
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        date: data.date,
        isConfirmed: data.isConfirmed,
        patientId: data.patientId,
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        period: data.period,
        time: data.time
      } as OnlineAppointment);
    });
    
    return appointments;
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    throw new Error('Failed to fetch appointments from Firestore');
  }
};
