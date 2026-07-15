import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { labToLabDb } from '@/lib/firebase';

/**
 * Fires `onNewPatient` whenever a new lab2lab patient document is added today.
 * Skips the initial snapshot, which lists all existing docs as "added".
 */
export function useLab2LabNewPatientAlert(onNewPatient: (patientName: string) => void): void {
  const callbackRef = useRef(onNewPatient);
  callbackRef.current = onNewPatient;

  useEffect(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const patientsRef = collection(labToLabDb!, 'labToLap', 'global', 'patients');
    const q = query(
      patientsRef,
      where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
      where('createdAt', '<=', Timestamp.fromDate(endOfDay))
    );

    let isInitialSnapshot = true;

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          return;
        }

        querySnapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            callbackRef.current((data.name as string) || 'مريض جديد');
          }
        });
      },
      (err) => {
        console.error('Error listening for new lab2lab patients:', err);
      }
    );

    return () => unsubscribe();
  }, []);
}
