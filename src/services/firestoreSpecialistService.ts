import { collection, getDocs, query, where, orderBy, doc } from 'firebase/firestore';
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
