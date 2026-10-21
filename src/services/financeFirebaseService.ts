import axios from 'axios'
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, writeBatch,
  query, where, limit,
  type Firestore, type DocumentReference, type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { projectFolder } from '@/pages/constants'
import { getSettings } from '@/services/settingService'

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

export interface FinanceGlobalAccounts {
  clinicRevenueAccountId:              string | null
  doctorReceivablesAccountId:          string | null
  doctorFeesExpenseAccountId:          string | null
  insuranceCopaymentRevenueAccountId:  string | null
  insuranceReceivableAccountId:        string | null
  labRevenueAccountId:                 string | null
}

export const DEFAULT_GLOBAL: FinanceGlobalAccounts = {
  clinicRevenueAccountId:              null,
  doctorReceivablesAccountId:          null,
  doctorFeesExpenseAccountId:          null,
  insuranceCopaymentRevenueAccountId:  null,
  insuranceReceivableAccountId:        null,
  labRevenueAccountId:                 null,
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
    /** External party reference, e.g. "jawda_doctor_5" — see externalDoctorPartyId(). */
    party_id?:    string | null
    /** Used only to auto-create the Party in finance-api on first sight. */
    party_name?:  string | null
    party_phone?: string | null
    party_email?: string | null
    description?: string | null
    debit:        number
    credit:       number
  }[]
}

/**
 * Builds the opaque external party reference for a Jawda doctor, in the same
 * "{system}_{type}_{id}" form sales-api uses for its clients
 * ("sales-api_client_{id}") — finance-api's import resolves it and
 * auto-creates the matching Party (type: "doctor") on first sight, so Jawda
 * never needs to pre-sync doctors as Firestore parties or manually link them.
 */
export function externalDoctorPartyId(doctorId: number): string {
  return `jawda_doctor_${doctorId}`
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

async function batchDelete(database: Firestore, refs: DocumentReference<DocumentData>[]) {
  const CHUNK = 490
  for (let i = 0; i < refs.length; i += CHUNK) {
    const batch = writeBatch(database)
    for (const ref of refs.slice(i, i + CHUNK)) batch.delete(ref)
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

/**
 * Thrown by importAccountsFromFinanceApi when `conn` points at a different
 * finance-api project than the one last imported from. Account IDs are
 * finance-api auto-increment integers reused across unrelated projects —
 * re-importing from a different source without wiping the previous one first
 * would silently overwrite existing account docs with unrelated data under
 * the same IDs, corrupting every saved reference (global/per-user account
 * links, pending journal entries) without any error. Callers should confirm
 * with the user, then retry passing `force: true` to proceed (this wipes the
 * previously imported accounts and their linking settings).
 */
export class ImportSourceChangedError extends Error {
  readonly previousBaseUrl: string
  readonly newBaseUrl: string

  constructor(previousBaseUrl: string, newBaseUrl: string) {
    super(`Import source changed: ${previousBaseUrl} → ${newBaseUrl}`)
    this.previousBaseUrl = previousBaseUrl
    this.newBaseUrl = newBaseUrl
  }
}

interface ImportSourceDoc {
  accountsBaseUrl?: string
}

/**
 * Deletes the global journal accounts (config/global) and every per-user
 * journal accounts doc (config/user_{id}) — the "account linking" settings
 * shown in the "ربط الحسابات الرئيسية" tab. These store raw account IDs, so
 * once the accounts they point to are wiped and re-imported there is no way
 * to tell whether an old ID still refers to the same account; they must be
 * re-linked from scratch rather than silently keep pointing at stale IDs.
 * config/importSource is left untouched — it isn't an account link.
 */
async function clearAccountLinkingSettings(database: Firestore, hospital: string): Promise<void> {
  const snap = await getDocs(col(database, hospital, 'config'))
  const refs = snap.docs
    .filter(d => d.id === 'global' || d.id.startsWith('user_'))
    .map(d => d.ref)
  await batchDelete(database, refs)
}

/**
 * Imports accounts from `conn` into Firestore. When `conn.baseUrl` matches the
 * source last imported from (or nothing was imported yet), this is a plain
 * upsert — existing accounts are kept and merely refreshed/added to. Only when
 * `conn.baseUrl` differs from the last recorded source does this wipe the
 * existing `accounts` collection (and the global/per-user account-linking
 * settings that referenced those IDs — see clearAccountLinkingSettings)
 * before re-importing, since finance-api account IDs are meaningless across
 * unrelated projects. That wipe requires `force: true` (see
 * ImportSourceChangedError) so the caller can confirm with the user first.
 */
export async function importAccountsFromFinanceApi(conn: FinanceConnection, force = false): Promise<number> {
  const [database, hospital] = [getDb(), await getHospitalName()]

  const sourceRef  = docRef(database, hospital, 'config', 'importSource')
  const sourceSnap = await getDoc(sourceRef)
  const priorBaseUrl = sourceSnap.exists() ? (sourceSnap.data() as ImportSourceDoc).accountsBaseUrl : undefined

  if (priorBaseUrl && priorBaseUrl !== conn.baseUrl) {
    if (!force) throw new ImportSourceChangedError(priorBaseUrl, conn.baseUrl)
    const existing = await getDocs(col(database, hospital, 'accounts'))
    await batchDelete(database, existing.docs.map(d => d.ref))
    await clearAccountLinkingSettings(database, hospital)
  }
  await setDoc(sourceRef, { accountsBaseUrl: conn.baseUrl }, { merge: true })

  const { data } = await importClient(conn).get('/accounts')
  const raw: { id: number; code: string; name: string; type: string; parent_id: number | null }[] =
    Array.isArray(data) ? data : (data?.data ?? [])

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

// ── accounts ───────────────────────────────────────────────────────────────────

/**
 * Sorted by code, same as finance-api's own Account::orderBy('code') — a plain
 * string comparison, not numeric. Account codes are hierarchical prefix codes
 * (e.g. "1", "11", "111", "1111", "111101", "1112", "2", ...), a scheme
 * deliberately designed so plain lexicographic order already walks the tree
 * parent-before-children, sibling-by-sibling. Firestore itself returns these
 * documents in an unrelated order (by doc id, which is finance-api's own
 * unrelated numeric account id), so every caller needs this applied here
 * rather than sorting ad hoc after fetching.
 */
export async function fetchFinanceAccounts(): Promise<FinanceAccount[]> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  const snap = await getDocs(col(database, hospital, 'accounts'))
  return snap.docs
    .map(d => d.data() as FinanceAccount)
    .sort((a, b) => a.code < b.code ? -1 : a.code > b.code ? 1 : 0)
}

// ── global journal settings ───────────────────────────────────────────────────

export async function fetchGlobalJournalSettings(): Promise<FinanceGlobalAccounts> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  // alert('s')
  // console.log('fetchGlobalJournalSettings', database, hospital)
  const snap = await getDoc(docRef(database, hospital, 'config', 'global'))
  if (!snap.exists()) return { ...DEFAULT_GLOBAL }
  const d = snap.data()
  console.log('fetchGlobalJournalSettings', d)
  return {
    clinicRevenueAccountId:             d.clinicRevenueAccountId             ?? null,
    doctorReceivablesAccountId:         d.doctorReceivablesAccountId         ?? null,
    doctorFeesExpenseAccountId:         d.doctorFeesExpenseAccountId         ?? null,
    insuranceCopaymentRevenueAccountId: d.insuranceCopaymentRevenueAccountId ?? null,
    insuranceReceivableAccountId:       d.insuranceReceivableAccountId       ?? null,
    labRevenueAccountId:                d.labRevenueAccountId                ?? null,
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

// ── journal entries ───────────────────────────────────────────────────────────

export async function createJournalEntry(payload: JournalEntryPayload): Promise<string> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  const ref = await addDoc(col(database, hospital, 'journal_entries'), {
    ...payload,
    createdAt: new Date().toISOString(),
  })
  return ref.id
}

/** Find a previously exported journal entry by its `reference` (e.g. "lab_shift_123"). */
export async function findJournalEntryByReference(
  reference: string,
): Promise<{ id: string; createdAt: string } | null> {
  const [database, hospital] = [getDb(), await getHospitalName()]
  const q = query(col(database, hospital, 'journal_entries'), where('reference', '==', reference), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, createdAt: d.data().createdAt as string }
}
