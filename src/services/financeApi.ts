import axios from 'axios'

// ── connection settings (localStorage) ───────────────────────────────────────

const CONN_KEY = 'finance_connection'

export interface FinanceConnection {
  baseUrl: string
  token: string
}

const DEFAULT_CONN: FinanceConnection = {
  baseUrl: 'http://localhost/finance-api/public',
  token: '',
}

export function loadConnection(): FinanceConnection {
  try { return { ...DEFAULT_CONN, ...JSON.parse(localStorage.getItem(CONN_KEY) ?? '{}') } }
  catch { return { ...DEFAULT_CONN } }
}
export function saveConnection(c: FinanceConnection) {
  localStorage.setItem(CONN_KEY, JSON.stringify(c))
}
export function isConnected(c: FinanceConnection) {
  return c.baseUrl.trim() !== '' && c.token.trim() !== ''
}

// ── account/party interfaces ───────────────────────────────────────────────────

export interface FinanceAccount {
  id: number
  code: string
  name: string
  type: string
  parent_id: number | null
}

export interface FinanceParty {
  id: number
  name: string
  type: string
}

// ── phase 1: global accounts ──────────────────────────────────────────────────

export interface FinanceGlobalAccounts {
  clinicRevenueAccountId:     number | null
  doctorReceivablesAccountId: number | null
  doctorFeesExpenseAccountId: number | null
}

export const DEFAULT_GLOBAL: FinanceGlobalAccounts = {
  clinicRevenueAccountId:     null,
  doctorReceivablesAccountId: null,
  doctorFeesExpenseAccountId: null,
}

export function isGlobalComplete(a: FinanceGlobalAccounts) {
  return !!(a.clinicRevenueAccountId && a.doctorReceivablesAccountId && a.doctorFeesExpenseAccountId)
}

// ── phase 2: user accounts ────────────────────────────────────────────────────

export interface FinanceUserAccounts {
  cashBoxAccountId: number | null
  bankAccountId:    number | null
}

export const DEFAULT_USER: FinanceUserAccounts = {
  cashBoxAccountId: null,
  bankAccountId:    null,
}

export function isUserAccountsComplete(a: FinanceUserAccounts) {
  return !!(a.cashBoxAccountId && a.bankAccountId)
}

// ── session-level cache (keyed on baseUrl|token) ──────────────────────────────

let _cacheKey    = ''
let _globalCache: FinanceGlobalAccounts | null = null
let _userCache:   FinanceUserAccounts   | null = null
let _partyMap:    Record<number, number> | null = null

function cacheKey(conn: FinanceConnection) { return `${conn.baseUrl}|${conn.token}` }

function checkCache(conn: FinanceConnection) {
  if (_cacheKey !== cacheKey(conn)) {
    _globalCache = _userCache = _partyMap = null
    _cacheKey = cacheKey(conn)
  }
}

export function invalidateJournalCache() {
  _globalCache = _userCache = _partyMap = null
}

// ── axios client ───────────────────────────────────────────────────────────────

function client(conn: FinanceConnection) {
  return axios.create({
    baseURL: conn.baseUrl.replace(/\/+$/, '') + '/api',
    headers: {
      Authorization: `Bearer ${conn.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  })
}

// ── API calls ──────────────────────────────────────────────────────────────────

export async function fetchFinanceAccounts(conn: FinanceConnection): Promise<FinanceAccount[]> {
  const { data } = await client(conn).get('/accounts')
  return Array.isArray(data) ? data : (data?.data ?? [])
}

export async function fetchFinanceParties(conn: FinanceConnection): Promise<FinanceParty[]> {
  const { data } = await client(conn).get('/parties')
  return Array.isArray(data) ? data : (data?.data ?? [])
}

// ── Phase 1: global journal accounts ─────────────────────────────────────────

function toInt(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function fetchGlobalJournalSettings(conn: FinanceConnection): Promise<FinanceGlobalAccounts> {
  checkCache(conn)
  if (_globalCache) return _globalCache

  const { data } = await client(conn).get<Record<string, unknown>>('/settings')
  const result: FinanceGlobalAccounts = {
    clinicRevenueAccountId:     toInt(data.journal_clinic_revenue_account_id),
    doctorReceivablesAccountId: toInt(data.journal_doctor_receivables_account_id),
    doctorFeesExpenseAccountId: toInt(data.journal_doctor_fees_expense_account_id),
  }
  _globalCache = result
  return result
}

export async function saveGlobalJournalSettings(conn: FinanceConnection, data: FinanceGlobalAccounts): Promise<void> {
  await client(conn).put('/settings', {
    journal_clinic_revenue_account_id:      data.clinicRevenueAccountId,
    journal_doctor_receivables_account_id:  data.doctorReceivablesAccountId,
    journal_doctor_fees_expense_account_id: data.doctorFeesExpenseAccountId,
  })
  _globalCache = data
}

// ── Phase 2: per-user journal accounts ───────────────────────────────────────

export async function fetchUserJournalAccounts(conn: FinanceConnection): Promise<FinanceUserAccounts> {
  checkCache(conn)
  if (_userCache) return _userCache

  const { data } = await client(conn).get<{ cash_box_account_id: number | null; bank_account_id: number | null }>('/user/journal-accounts')
  const result: FinanceUserAccounts = {
    cashBoxAccountId: data.cash_box_account_id,
    bankAccountId:    data.bank_account_id,
  }
  _userCache = result
  return result
}

export async function saveUserJournalAccounts(conn: FinanceConnection, data: FinanceUserAccounts): Promise<void> {
  await client(conn).put('/user/journal-accounts', {
    cash_box_account_id: data.cashBoxAccountId,
    bank_account_id:     data.bankAccountId,
  })
  _userCache = data
}

// ── Phase 3: doctor → party mappings ─────────────────────────────────────────

export async function fetchDoctorPartyMappings(conn: FinanceConnection): Promise<Record<number, number>> {
  checkCache(conn)
  if (_partyMap) return _partyMap

  const { data } = await client(conn).get<Record<string, number>>('/doctor-party-mappings')
  const result: Record<number, number> = {}
  for (const [k, v] of Object.entries(data)) {
    result[Number(k)] = v
  }
  _partyMap = result
  return result
}

export async function saveDoctorPartyMapping(
  conn: FinanceConnection,
  jawdaDoctorId: number,
  financePartyId: number,
): Promise<void> {
  await client(conn).put(`/doctor-party-mappings/${jawdaDoctorId}`, { finance_party_id: financePartyId })
  if (_partyMap) _partyMap[jawdaDoctorId] = financePartyId
}

// ── journal entry ─────────────────────────────────────────────────────────────

export interface JournalEntryPayload {
  date: string
  reference?: string | null
  description: string
  lines: {
    account_id: number
    party_id?: number | null
    description?: string | null
    debit: number
    credit: number
  }[]
}

export async function createJournalEntry(
  conn: FinanceConnection,
  payload: JournalEntryPayload,
): Promise<{ id: number }> {
  const { data } = await client(conn).post('/journal-entries', payload)
  return data?.data ?? data
}
