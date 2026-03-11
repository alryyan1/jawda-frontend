import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { admissionsDbOrMain } from "@/lib/firebaseAdmissions";
import {
  subscribeToAdmissionFirestore,
  type AdmissionFirestoreData,
  type FirestoreRequestedSurgery,
} from "@/services/admissionFirestoreService";
import { syncApprovalFromFirestore } from "@/services/admissionService";

/** Play a short notification sound when Firestore update is received. */
function playUpdateSound(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Silently ignore (e.g. user gesture required in some browsers)
  }
}

interface RequestedSurgeryWithApproval {
  id: number;
  status: string;
  approved_at: string | null;
  approved_by: number | null;
  in_firestore?: boolean;
  [key: string]: unknown;
}

/**
 * Merges Firestore data into requested surgery item.
 * Updates local approved_at, status, approved_by from Firestore (including null when unapproved).
 */
function mergeFirestoreIntoRequestedSurgery<T extends RequestedSurgeryWithApproval>(
  item: T,
  fs: FirestoreRequestedSurgery | undefined,
): T {
  if (!fs || fs.id !== item.id) {
    return { ...item, in_firestore: false };
  }
  return {
    ...item,
    status: fs.status ?? item.status,
    approved_at: fs.approved_at ?? null,
    approved_by: fs.approved_by ?? null,
    in_firestore: true,
  };
}

/**
 * Listens to Firestore admission document and merges approved_at/status
 * into the React Query cache for real-time UI updates.
 */
export function useAdmissionFirestoreListener(
  admissionId: string | number | undefined,
  queryKey: readonly unknown[],
): void {
  const queryClient = useQueryClient();
  const unsubRef = useRef<(() => void) | null>(null);
  const queryKeyRef = useRef(queryKey);
  const isFirstSnapshotRef = useRef(true);
  queryKeyRef.current = queryKey;

  useEffect(() => {
    if (admissionId == null || admissionId === "") return;

    const db = admissionsDbOrMain;
    if (!db) {
      if (import.meta.env.DEV) {
        console.warn("[Firestore] Cannot subscribe: db is null. Add VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID to .env");
      }
      return;
    }

    isFirstSnapshotRef.current = true;

    unsubRef.current = subscribeToAdmissionFirestore(db, admissionId, (data: AdmissionFirestoreData | null) => {
      const surgeries = data?.requested_surgeries;
      if (!surgeries?.length) return;

      const key = queryKeyRef.current;
      const toSync: FirestoreRequestedSurgery[] = [];

      queryClient.setQueryData<RequestedSurgeryWithApproval[]>(key, (prev) => {
        if (!prev?.length) return prev;
        const fsMap = new Map(surgeries.map((s) => [s.id, s]));
        const next = prev.map((item) => {
          const fs = fsMap.get(item.id);
          const merged = mergeFirestoreIntoRequestedSurgery(item, fs);
          if (fs && (fs.approved_at !== item.approved_at || fs.status !== item.status)) {
            toSync.push(fs);
          }
          return merged;
        });
        if (import.meta.env.DEV) {
          console.log("[Firestore] Merged into cache, surgeries updated:", next.filter((s) => fsMap.has(s.id)).map((s) => ({ id: s.id, status: s.status, approved_at: s.approved_at })));
        }
        return next;
      });

      if (!isFirstSnapshotRef.current) {
        playUpdateSound();
        toSync.forEach((fs) => {
          syncApprovalFromFirestore(admissionId, fs.id, {
            approved_at: fs.approved_at ?? null,
            approved_by: fs.approved_by ?? null,
            status: fs.status ?? "pending",
          }).catch((err) => console.warn("[Firestore] Sync to DB failed for surgery", fs.id, err));
        });
      }
      isFirstSnapshotRef.current = false;
    });

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [admissionId, queryClient]);
}
