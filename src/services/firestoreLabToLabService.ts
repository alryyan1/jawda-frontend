import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FirestoreLabToLab {
  id: string;
  ownerUserName: string;
  phone: string;
  whatsApp: string;
  address: string;
  name: string;
  isApproved: boolean;
  order: number;
  createdAt: {
    type: string;
    seconds: number;
    nanoseconds: number;
  };
  available: boolean;
  password: string;
}

// Test function to debug Firestore connection
export const testFirestoreConnection = async (): Promise<void> => {
  if (!db) {
    console.warn('Firebase is disabled. Cannot test Firestore connection.');
    return;
  }
  try {
    console.log('Testing Firestore connection...');
    const labToLabRef = collection(db, 'labToLap');
    const querySnapshot = await getDocs(labToLabRef);
    console.log('Connection successful! Documents found:', querySnapshot.docs.length);
    
    if (querySnapshot.docs.length > 0) {
      const firstDoc = querySnapshot.docs[0];
      console.log('Sample document structure:', {
        id: firstDoc.id,
        data: firstDoc.data()
      });
    }
  } catch (error) {
    console.error('Firestore connection test failed:', error);
  }
};

export const fetchFirestoreLabToLab = async (): Promise<FirestoreLabToLab[]> => {
  if (!db) {
    console.warn('Firebase is disabled. Cannot fetch lab-to-lab companies.');
    return [];
  }
  try {
    // Reference to the labToLap collection
    const labToLabRef = collection(db, 'labToLap');
    
    // Query to get all lab-to-lab companies, ordered by name
    console.log('Attempting to fetch from labToLap collection...');
    const q = query(
      labToLabRef,
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    console.log('Total documents found:', querySnapshot.docs.length);
    
    if (querySnapshot.docs.length === 0) {
      console.log('No documents found in labToLap collection');
      return [];
    }
    
    // Log the first document to see its structure
    const firstDoc = querySnapshot.docs[0];
    console.log('First document ID:', firstDoc.id);
    console.log('First document data:', firstDoc.data());
    
    const labToLabCompanies: FirestoreLabToLab[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Processing document:', doc.id, 'Fields:', Object.keys(data));
      labToLabCompanies.push({
        id: doc.id,
        ...data
      } as FirestoreLabToLab);
    });
    
    console.log('Returning', labToLabCompanies.length, 'companies');
    return labToLabCompanies;
  } catch (error) {
    console.error('Error fetching Firestore lab-to-lab companies:', error);
    console.error('Error details:', error);
    throw new Error('Failed to fetch lab-to-lab companies from Firestore');
  }
};
