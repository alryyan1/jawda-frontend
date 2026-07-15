import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { labToLabDb } from '@/lib/firebase';

/** Realtime count of lab2lab patients received today, from /labToLap/global/patients. */
export function useLab2LabTodayCount(): number {
  const [count, setCount] = useState(0);

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

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setCount(querySnapshot.size);
    }, (err) => {
      console.error('Error listening to lab2lab today count:', err);
    });

    return () => unsubscribe();
  }, []);

  return count;
}
