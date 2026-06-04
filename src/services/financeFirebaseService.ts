import axios from 'axios'
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, writeBatch,
  type Firestore, type DocumentReference, type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { projectFolder } from '@/pages/constants'
import { getSettings } from '@/services/settingService'
import type { DoctorStripped } from '@/types/doctors'

// ── hospital namespace ────────────────────────────────────────────────────────
// All finance data lives under finance/{storage_name}/ (from General Settings).
// Fetched once and cached; falls back to projectFolder if not configured.

let _hospital: string | null = null

export async function getHospitalName(): Promise<string> {
  if (_hospital) return _hospital
  try {
    const s = await getSettings()
    _hospital = s?.storage_name?.trim() || projectFolder
  } catch {
    _hospital = projectFolder
  }
  return _hospital
}

// Call this after saving new storage_name in General Settings.
export function invalidateHospitalCache() { _hospital = null }

const col = (database: Firestore, hospital: string, name: string) =>
  collection(database, 'finance', hospital, name)
const docRef = (database: Firestore, hospital: string, name: string, id: string) =>
  doc(database, 'finance', hospital, name, id)

// ── connection (used only for one-time data import) ───────────────────────────

export interface FinanceConnection {
  baseUrl: string
  token:   string
}

const CONN_KEY = 'finance_connection'
const DEFAULT_CONN: FinanceConnection = { baseUrl: 'http://localhost/finance-api/public', token: '' }

export function loadConnection(): FinanceConnection {
  try { return { ...DEFAULT_CONN, ...JSON.parse(localStorage.getItem(CONN_KEY) ?? '{}') } }
  catch { return { ...DEFAULT_CONN } }
}

export function saveConnection(conn: FinanceConnection): void {
  localStorage.setItem(CONN_KEY, JSON.stringify(conn))
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface FinanceAccount {
  id:        string
  code:      string
  name:      string
  type:      string
  parent_id: string | null
}

export interface FinanceParty {
  id:   string
  name: string
  type: string
}

export interface FinanceGlobalAccounts {
  clinicRevenueAccountId:     string | null
  doctorReceivablesAccountId: string | null
  doctorFeesExpenseAccountId: string | null
}

export const DEFAULT_GLOBAL: FinanceGlobalAccounts = {
  clinicRevenueAccountId:     null,
  doctorReceivablesAccountId: null,
  doctorFeesExpenseAccountId: null,
}

export function isGlobalComplete(a: FinanceGlobalAccounts) {
  return !!(a.clinicRevenueAccountId && a.doctorReceivablesAccountId && a.doctorFeesExpenseAccountId)
}

export interface FinanceUserAccounts {
  cashBoxAccountId: string | null
  bankAccountId:    string | null
}

export const DEFAULT_USER: FinanceUserAccounts = {
  cashBoxAccountId: null,
  bankAccountId:    null,
}

export function isUserAccountsComplete(a: FinanceUserAccounts) {
  return !!(a.cashBoxAccountId && a.bankAccountId)
}

export interface JournalEntryPayload {
  date:        string
  reference?:  string | null
  description: string
  lines: {
    account_id:   string
    party_id?:    string | null
    description?: string | null
    debit:        number
    credit:       number
  }[]
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

function getDb(): Firestore {
  if (!db) throw new Error('Firebase غير مُهيأ — تحقق من إعدادات المشروع')
  return db
}

// Firestore limits batches to 500 writes; chunk larger sets automatically.
async function batchSet(
  database: Firestore,
  items: { ref: DocumentReference<DocumentData>; data: DocumentData }[],
) {
  const CHUNK = 490
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(database)
    for (const item of items.slice(i, i + CHUNK)) batch.set(item.ref, item.data)
    await batch.commit()
  }
}

// ── one-time import from finance-api ─────────────────────────────────────────

function importClient(conn: FinanceConnection) {
  return axios.create({
    baseURL: conn.baseUrl.replace(/\/+$/, '') + '/api',
    headers: { Authorization: `Bearer ${conn.token}`, Accept: 'application/json' },
    timeout: 15000,
  })
}

export async function importAccountsFromFinanceApi(conn: FinanceConnection): Promise<number> {
  const { data } = await importClient(conn).get('/accounts')
  const raw: { id: number; code: string; name: string; type: string; parent_id: number | null }[] =
    Array.isArray(data) ? data : (data?.data ?? [])

  const [database, hospital] = [getDb(), await getHospitalName()]
  await batchSet(database, raw.map(a => ({
    ref: docRef(database, hospital, 'accounts', String(a.id)),
    data: {
      id:        String(a.id),
      code:      a.code  ?? '',
      name:      a.name  ?? '',
      type:      a.type  ?? '',
      parent_id: a.parent_id != null ? String(a.parent_id) : null,
    },
  })))
  return raw.length
}

export async function importPartiesFromFinanceApi(conn: FinanceConnection): Promise<number> {
  const { data } = await importClient(conn).get('/parties')
  const raw: { id: number; name: string; type: string }[] =
    Array.isArray(data) ? data : (data?.data ?? [])

  const [database, hospital] = [getDb(), await getHospitalName()]
  await batchSet(database, raw.map(p => ({
    ref: docRef(database, hospital, 'parties', String(p.id)),
    data: { id: String(p.id), name: p.name ?? '', type: p.type ?? '' },
  })))
  return raw.length
}

// Uses "doctor_{id}" as doc ID to avoid collision with imported finance-api party IDs.
export async function syncDoctorsAsParties(doctors: DoctorStripped[]): Promise<number> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  await batchSet(database, doctors.map(d => ({
    ref: docRef(database, hospital, 'parties', `doctor_${d.id}`),
    data: { id: `doctor_${d.id}`, name: d.name, type: 'doctor' },
  })))
  return doctors.length
}

// ── accounts & parties ────────────────────────────────────────────────────────

export async function fetchFinanceAccounts(): Promise<FinanceAccount[]> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  const snap = await getDocs(col(database, hospital, 'accounts'))
  return snap.docs.map(d => d.data() as FinanceAccount)
}

export async function fetchFinanceParties(): Promise<FinanceParty[]> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  const snap = await getDocs(col(database, hospital, 'parties'))
  return snap.docs.map(d => d.data() as FinanceParty)
}

// ── global journal settings ───────────────────────────────────────────────────

export async function fetchGlobalJournalSettings(): Promise<FinanceGlobalAccounts> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  const snap = await getDoc(docRef(database, hospital, 'config', 'global'))
  if (!snap.exists()) return { ...DEFAULT_GLOBAL }
  const d = snap.data()
  return {
    clinicRevenueAccountId:     d.clinicRevenueAccountId     ?? null,
    doctorReceivablesAccountId: d.doctorReceivablesAccountId ?? null,
    doctorFeesExpenseAccountId: d.doctorFeesExpenseAccountId ?? null,
  }
}

export async function saveGlobalJournalSettings(data: FinanceGlobalAccounts): Promise<void> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  await setDoc(docRef(database, hospital, 'config', 'global'), data)
}

// ── per-user journal settings ─────────────────────────────────────────────────

export async function fetchUserJournalAccounts(userId: number): Promise<FinanceUserAccounts> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  const snap = await getDoc(docRef(database, hospital, 'config', `user_${userId}`))
  if (!snap.exists()) return { ...DEFAULT_USER }
  const d = snap.data()
  return {
    cashBoxAccountId: d.cashBoxAccountId ?? null,
    bankAccountId:    d.bankAccountId    ?? null,
  }
}

export async function saveUserJournalAccounts(userId: number, data: FinanceUserAccounts): Promise<void> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  await setDoc(docRef(database, hospital, 'config', `user_${userId}`), data)
}

// ── doctor → party mappings ───────────────────────────────────────────────────

export async function fetchDoctorPartyMappings(): Promise<Record<number, string>> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  const snap = await getDocs(col(database, hospital, 'doctor_mappings'))
  const result: Record<number, string> = {}
  for (const d of snap.docs) result[Number(d.id)] = d.data().partyId as string
  return result
}

export async function saveDoctorPartyMapping(jawdaDoctorId: number, partyId: string): Promise<void> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  await setDoc(docRef(database, hospital, 'doctor_mappings', String(jawdaDoctorId)), { partyId })
}

// ── journal entries ───────────────────────────────────────────────────────────

export async function createJournalEntry(payload: JournalEntryPayload): Promise<string> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  const ref = await addDoc(col(database, hospital, 'journal_entries'), {
    ...payload,
    createdAt: new Date().toISOString(),
  })
  return ref.id
}
