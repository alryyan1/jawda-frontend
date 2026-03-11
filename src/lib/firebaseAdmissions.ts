/**
 * Firestore for admissions (pharmacies/one_care/admissions).
 * Uses the main Firebase db - same project as backend (sales-9e9b8).
 */
import { db } from "./firebase";

export const admissionsDbOrMain = db;
