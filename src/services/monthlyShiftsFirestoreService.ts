/**
 * Firestore persistence for Monthly Shifts Report.
 * Stores full report data and per-cell edits (original vs edited values).
 * Doc path: pharmacies/one_care/closings/{year}_{month}
 */
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  type Unsubscribe,
  type Firestore,
} from "firebase/firestore";
import type { MonthlyShiftsSummaryResponse } from "@/services/reportService";

export type EditableField =
  | "revenue_cash"
  | "revenue_bank"
  | "cost_cash"
  | "cost_bank"
  | "refund_cash"
  | "refund_bank";

export interface CellEdit {
  original: number;
  edited: number;
}

export interface MonthlyShiftsFirestoreDoc {
  full_data: MonthlyShiftsSummaryResponse;
  edits: Record<string, CellEdit>; // key: "{shiftId}_{field}"
  updated_at?: string;
}

function docId(year: number, month: number): string {
  return `${year}_${month}`;
}

function editKey(shiftId: number, field: EditableField): string {
  return `${shiftId}_${field}`;
}

/**
 * Get Firestore document path for a report.
 */
export function getReportDocPath(year: number, month: number): string {
  return `pharmacies/one_care/closings/${docId(year, month)}`;
}

/**
 * Save full report data to Firestore (on first load or refresh).
 */
export async function saveFullReport(
  db: Firestore | null,
  year: number,
  month: number,
  data: MonthlyShiftsSummaryResponse
): Promise<void> {
  if (!db) return;

  const docRef = doc(db, "pharmacies", "one_care", "closings", docId(year, month));
  const snapshot = await getDoc(docRef);

  const payload: Partial<MonthlyShiftsFirestoreDoc> = {
    full_data: data,
    updated_at: new Date().toISOString(),
  };

  if (snapshot.exists()) {
    await updateDoc(docRef, {
      full_data: data,
      updated_at: serverTimestamp(),
    });
  } else {
    await setDoc(docRef, {
      ...payload,
      edits: {},
      updated_at: serverTimestamp(),
    });
  }
}

/**
 * Update a single cell edit in Firestore.
 */
export async function updateCellEdit(
  db: Firestore | null,
  year: number,
  month: number,
  shiftId: number,
  field: EditableField,
  original: number,
  edited: number
): Promise<void> {
  if (!db) return;

  const docRef = doc(db, "pharmacies", "one_care", "closings", docId(year, month));
  const key = editKey(shiftId, field);

  const snapshot = await getDoc(docRef);
  const existingEdits: Record<string, CellEdit> = snapshot.exists()
    ? (snapshot.data() as MonthlyShiftsFirestoreDoc).edits ?? {}
    : {};

  const newEdits = { ...existingEdits, [key]: { original, edited } };

  if (snapshot.exists()) {
    await updateDoc(docRef, {
      edits: newEdits,
      updated_at: serverTimestamp(),
    });
  } else {
    await setDoc(docRef, {
      full_data: { data: [], summary: {} as MonthlyShiftsSummaryResponse["summary"], report_period: { month, year, from: "", to: "" } },
      edits: newEdits,
      updated_at: serverTimestamp(),
    });
  }
}

/**
 * Remove a cell edit (revert to original).
 */
export async function removeCellEdit(
  db: Firestore | null,
  year: number,
  month: number,
  shiftId: number,
  field: EditableField
): Promise<void> {
  if (!db) return;

  const docRef = doc(db, "pharmacies", "one_care", "closings", docId(year, month));
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return;

  const existing = snapshot.data() as MonthlyShiftsFirestoreDoc;
  const key = editKey(shiftId, field);
  const { [key]: _, ...rest } = existing.edits ?? {};

  await updateDoc(docRef, {
    edits: rest,
    updated_at: serverTimestamp(),
  });
}

/**
 * Fetch report document from Firestore once.
 */
export async function getReportFromFirestore(
  db: Firestore | null,
  year: number,
  month: number
): Promise<MonthlyShiftsFirestoreDoc | null> {
  if (!db) return null;

  const docRef = doc(db, "reports", "monthly_shifts", docId(year, month));
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;
  return snapshot.data() as MonthlyShiftsFirestoreDoc;
}

/**
 * Subscribe to report document for real-time updates.
 */
export function subscribeToReport(
  db: Firestore | null,
  year: number,
  month: number,
  onUpdate: (doc: MonthlyShiftsFirestoreDoc | null) => void
): Unsubscribe | null {
  if (!db) return null;

  const docRef = doc(db, "pharmacies", "one_care", "closings", docId(year, month));

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate(snapshot.data() as MonthlyShiftsFirestoreDoc);
    },
    (err) => {
      console.error("[Firestore] Monthly shifts report listener error:", err);
      onUpdate(null);
    }
  );
}
