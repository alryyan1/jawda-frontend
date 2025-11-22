import { collection, getDocs, query, orderBy, doc, where } from 'firebase/firestore';
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

// New interface matching the facility-level appointment structure
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
  time: string;
}

export const fetchDoctorAppointments = async (
  specializationId: string,
  doctorId: string,
  date?: string
): Promise<FacilityAppointment[]> => {
  try {
    if (!doctorId) {
      return [];
    }

    // Reference to the facility-level appointments collection: medicalFacilities/{facilityId}/appointments
    const facilityDocRef = doc(db, 'medicalFacilities', FACILITY_ID);
    const appointmentsRef = collection(facilityDocRef, 'appointments');
    
    // Build query constraints
    const queryConstraints: any[] = [
      where('doctorId', '==', doctorId)
    ];
    
    // Add date filter if provided
    if (date) {
      const datePart = new Date(date).toISOString().split('T')[0];
      queryConstraints.push(where('date', '==', datePart));
    }
    
    // Order by date descending (newest first)
    queryConstraints.push(orderBy('date', 'desc'));
    
    const q = query(appointmentsRef, ...queryConstraints);
    
    const querySnapshot = await getDocs(q);
    const appointments: FacilityAppointment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      appointments.push({
        id: doc.id,
        centralSpecialtyId: data.centralSpecialtyId || '',
        createdAt: data.createdAt,
        date: data.date,
        doctorId: data.doctorId,
        doctorName: data.doctorName || '',
        facilityId: data.facilityId || FACILITY_ID,
        isConfirmed: data.isConfirmed ?? false,
        patientId: data.patientId || '',
        patientName: data.patientName || '',
        patientPhone: data.patientPhone || '',
        period: data.period || 'morning',
        specializationName: data.specializationName || '',
        time: data.time || ''
      } as FacilityAppointment);
    });
    
    return appointments;
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    throw new Error('Failed to fetch appointments from Firestore');
  }
};
