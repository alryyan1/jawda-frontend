/**
 * Firestore listener for admission documents.
 * Listens to pharmacies/one_care/admissions/{admissionId} for real-time updates
 * (e.g. approved_at when approval happens via app or external source).
 *
 * Uses the same Firebase project as the backend (sales-9e9b8) for admissions.
 * Configure VITE_FIREBASE_ADMISSIONS_PROJECT_ID if different from main app.
 */
import {
  doc,
  getDoc,
  onSnapshot,
  type Unsubscribe,
  type DocumentSnapshot,
  type Firestore,
} from "firebase/firestore";

export interface FirestoreRequestedSurgery {
  id: number;
  surgery_name?: string;
  initial_price?: number;
  status?: string;
  total_price?: number;
  approved_by?: number | null;
  approved_at?: string | null;
  download_url?: string | null;
  finances?: Array<Record<string, unknown>>;
}

export interface AdmissionFirestoreData {
  admission_id?: number;
  patient_name?: string;
  patient_phone?: string;
  requested_surgeries?: FirestoreRequestedSurgery[];
  updated_at?: string;
}

function parseFirestoreValue(val: unknown): unknown {
  if (val == null) return null;
  if (typeof val === "object" && "toDate" in val && typeof (val as { toDate: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return val;
}

function parseRequestedSurgeries(raw: unknown): FirestoreRequestedSurgery[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (item == null || typeof item !== "object") return {} as FirestoreRequestedSurgery;
    const obj = item as Record<string, unknown>;
    return {
      id: Number(parseFirestoreValue(obj.id)) || 0,
      surgery_name: String(parseFirestoreValue(obj.surgery_name) ?? ""),
      initial_price: Number(parseFirestoreValue(obj.initial_price)) || 0,
      status: String(parseFirestoreValue(obj.status) ?? ""),
      total_price: Number(parseFirestoreValue(obj.total_price)) || 0,
      approved_by: obj.approved_by != null ? Number(parseFirestoreValue(obj.approved_by)) : null,
      approved_at: obj.approved_at != null ? String(parseFirestoreValue(obj.approved_at)) : null,
      download_url: obj.download_url != null ? String(parseFirestoreValue(obj.download_url)) : null,
      finances: Array.isArray(obj.finances) ? obj.finances : [],
    };
  });
}

/**
 * Subscribe to admission document in Firestore. Returns unsubscribe function.
 */
export function subscribeToAdmissionFirestore(
  db: Firestore | null,
  admissionId: string | number,
  onUpdate: (data: AdmissionFirestoreData | null) => void,
): Unsubscribe | null {
  if (!db) return null;

  const docRef = doc(db, "pharmacies", "one_care", "admissions", String(admissionId));

  const docPath = `pharmacies/one_care/admissions/${admissionId}`;
  if (import.meta.env.DEV) {
    console.log("[Firestore] Subscribing to:", docPath);
  }

  const unsub = onSnapshot(
    docRef,
    (snapshot: DocumentSnapshot) => {
      if (!snapshot.exists()) {
        if (import.meta.env.DEV) console.log("[Firestore] Document does not exist:", docPath);
        onUpdate(null);
        return;
      }
      const data = snapshot.data() as Record<string, unknown> | undefined;
      if (!data) {
        onUpdate(null);
        return;
      }
      if (import.meta.env.DEV) {
        console.log("[Firestore] Raw document fields:", Object.keys(data), "requested_surgeries type:", typeof data.requested_surgeries, Array.isArray(data.requested_surgeries) ? `length=${(data.requested_surgeries as unknown[]).length}` : "");
      }
      const requestedSurgeries = parseRequestedSurgeries(data.requested_surgeries);
      if (import.meta.env.DEV) {
        console.log("[Firestore] Update received:", docPath, { requestedSurgeriesCount: requestedSurgeries.length, surgeries: requestedSurgeries });
      }
      onUpdate({
        admission_id: data.admission_id != null ? Number(data.admission_id) : undefined,
        patient_name: data.patient_name != null ? String(data.patient_name) : undefined,
        patient_phone: data.patient_phone != null ? String(data.patient_phone) : undefined,
        requested_surgeries: requestedSurgeries,
        updated_at: data.updated_at != null ? String(data.updated_at) : undefined,
      });
    },
    (err) => {
      console.error("[Firestore] Listener error for", docPath, err);
      onUpdate(null);
    },
  );

  return unsub;
}

/**
 * Fetch admission document from Firestore once (for manual sync).
 */
export async function fetchAdmissionFirestoreDoc(
  db: Firestore | null,
  admissionId: string | number,
): Promise<AdmissionFirestoreData | null> {
  if (!db) return null;

  const docRef = doc(db, "pharmacies", "one_care", "admissions", String(admissionId));
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Record<string, unknown> | undefined;
  if (!data) return null;

  const requestedSurgeries = parseRequestedSurgeries(data.requested_surgeries);
  return {
    admission_id: data.admission_id != null ? Number(data.admission_id) : undefined,
    patient_name: data.patient_name != null ? String(data.patient_name) : undefined,
    patient_phone: data.patient_phone != null ? String(data.patient_phone) : undefined,
    requested_surgeries: requestedSurgeries,
    updated_at: data.updated_at != null ? String(data.updated_at) : undefined,
  };
}
