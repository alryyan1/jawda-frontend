import { useEffect, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  Dialog, DialogContent, DialogTitle, Divider,
  IconButton, Stack, TextField, Typography,
} from '@mui/material'
import CheckCircleIcon    from '@mui/icons-material/CheckCircle'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ContentCopyIcon    from '@mui/icons-material/ContentCopy'
import {
  type FinanceAccount, type FinanceParty,
  type FinanceGlobalAccounts, type FinanceUserAccounts,
  DEFAULT_GLOBAL, DEFAULT_USER,
  createJournalEntry,
  fetchDoctorPartyMappings, fetchFinanceAccounts, fetchFinanceParties,
  fetchGlobalJournalSettings, fetchUserJournalAccounts,
  isGlobalComplete, isUserAccountsComplete,
  saveDoctorPartyMapping,
} from '@/services/financeFirebaseService'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/services/api'
import { getUsersList } from '@/services/userService'
import type { DoctorShiftFinancialSummary } from '@/types/reports'

// ── journal preview table ─────────────────────────────────────────────────────

interface JLine { label: string; account: FinanceAccount | null; party?: FinanceParty | null; debit: number; credit: number }

function EntryTable({ lines, title }: { lines: JLine[]; title: string }) {
  const dr  = lines.reduce((s, l) => s + l.debit, 0)
  const cr  = lines.reduce((s, l) => s + l.credit, 0)
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 })
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}>{title}</Typography>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <Box component="thead">
          <Box component="tr" sx={{ bgcolor: '#1565C0', '& th': { color: '#fff', fontWeight: 700, p: '5px 8px', border: '1px solid #1565C0', textAlign: 'center' } }}>
            <Box component="th" sx={{ width: '50%' }}>الحساب</Box>
            <Box component="th">مدين</Box>
            <Box component="th">دائن</Box>
          </Box>
        </Box>
        <Box component="tbody">
          {lines.map((l, i) => (
            <Box component="tr" key={i} sx={{ bgcolor: i % 2 ? '#f9f9f9' : '#fff', '& td': { p: '4px 8px', border: '1px solid #ddd', textAlign: 'center' } }}>
              <Box component="td" sx={{ textAlign: 'center !important', fontSize: 12 }}>
                {l.account
                  ? <><strong>{l.account.code} — {l.account.name}</strong>{l.party && <Box component="span" sx={{ color: 'red', fontSize: 10, mr: 0.5 }}> [{l.party.name}]</Box>}</>
                  : <Box component="em" sx={{ color: 'error.main' }}>{l.label} (غير محدد)</Box>}
              </Box>
              <Box component="td" sx={{ direction: 'ltr', color: l.debit  > 0 ? '#1565C0' : '#bbb', fontWeight: l.debit  > 0 ? 600 : 400 }}>{l.debit  > 0 ? fmt(l.debit)  : '—'}</Box>
              <Box component="td" sx={{ direction: 'ltr', color: l.credit > 0 ? '#2e7d32' : '#bbb', fontWeight: l.credit > 0 ? 600 : 400 }}>{l.credit > 0 ? fmt(l.credit) : '—'}</Box>
            </Box>
          ))}
          <Box component="tr" sx={{ bgcolor: '#E3F2FD', '& td': { p: '4px 8px', border: '1px solid #90CAF9', fontWeight: 700, textAlign: 'center' } }}>
            <Box component="td">الإجمالي</Box>
            <Box component="td" sx={{ direction: 'ltr' }}>{fmt(dr)}</Box>
            <Box component="td" sx={{ direction: 'ltr' }}>{fmt(cr)}</Box>
          </Box>
        </Box>
      </Box>
      {Math.abs(dr - cr) > 0.01 && <Alert severity="error" sx={{ mt: 0.5, py: 0, fontSize: 11 }}>القيد غير متوازن</Alert>}
    </Box>
  )
}

// ── props ─────────────────────────────────────────────────────────────────────

export interface JournalEntryDialogProps {
  open: boolean
  onClose: () => void
  doctorName: string
  doctorId: number
  totalAmount: number
  cashAmount: number
  bankAmount: number
  date: string
  reference?: string
  userName?: string
  clinicShiftId?: number | null
  doctorShiftId?: number | null
  clinicCashTotal?: number
  clinicBankTotal?: number
}

// ── component ─────────────────────────────────────────────────────────────────

export default function JournalEntryDialog({
  open, onClose,
  doctorName, doctorId,
  totalAmount, cashAmount, bankAmount,
  date, reference,
  userName, clinicShiftId, doctorShiftId,
  clinicCashTotal: clinicCashProp = 0,
  clinicBankTotal: clinicBankProp = 0,
}: JournalEntryDialogProps) {
  const { user } = useAuth()

  // ── settings (loaded from Firestore) ─────────────────────────────────────
  const [global,   setGlobal]   = useState<FinanceGlobalAccounts>(DEFAULT_GLOBAL)
  const [userAccs, setUserAccs] = useState<FinanceUserAccounts>(DEFAULT_USER)

  // ── data ──────────────────────────────────────────────────────────────────
  const [accounts,    setAccounts]    = useState<FinanceAccount[]>([])
  const [parties,     setParties]     = useState<FinanceParty[]>([])
  const [doctorParty, setDoctorParty] = useState<FinanceParty | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [dataError,   setDataError]   = useState<string | null>(null)

  const [usersList,      setUsersList]      = useState<{ id: number; name: string }[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  // ── amounts ───────────────────────────────────────────────────────────────
  const [clinicCash,       setClinicCash]       = useState(clinicCashProp)
  const [clinicBank,       setClinicBank]       = useState(clinicBankProp)
  const [amountsFromShift, setAmountsFromShift] = useState(false)

  // When no doctorShiftId, use props (manual entry mode).
  useEffect(() => {
    if (open && !doctorShiftId) {
      setClinicCash(clinicCashProp)
      setClinicBank(clinicBankProp)
      setAmountsFromShift(false)
    }
  }, [open, clinicCashProp, clinicBankProp, doctorShiftId])

  // Fetch doctor shift totals independently so Firestore errors don't block it.
  useEffect(() => {
    if (!open || !doctorShiftId) return
    setAmountsFromShift(false)
    apiClient
      .get<{ data: DoctorShiftFinancialSummary }>(
        `doctor-shifts/${doctorShiftId}/financial-summary`,
        { skipAuthRedirect: true, suppressToast: true } as any,
      )
      .then(r => {
        const s = r.data?.data
        if (!s) return
        setClinicCash(s.total_cash ?? 0)
        setClinicBank(s.total_bank ?? 0)
setAmountsFromShift(true)
      })
      .catch(() => {})
  }, [open, doctorShiftId])

  // ── users payment summary ─────────────────────────────────────────────────
  interface UserPayment { id: number; name: string; total_cash: number; total_bank: number; total: number }
  const [usersPayment,        setUsersPayment]        = useState<UserPayment[]>([])
  const [usersPaymentLoading, setUsersPaymentLoading] = useState(false)
  interface UserAccsEntry { cashBoxAccountId: string | null; bankAccountId: string | null }
  const [userAccsMap, setUserAccsMap] = useState<Record<number, UserAccsEntry>>({})

  const [payersList,    setPayersList]    = useState<UserPayment[]>([])
  const [payersAccsMap, setPayersAccsMap] = useState<Record<number, UserAccsEntry>>({})

  const [insurancePayers,    setInsurancePayers]    = useState<UserPayment[]>([])
  const [insurancePayersMap, setInsurancePayersMap] = useState<Record<number, UserAccsEntry>>({})


  const loadAccsMap = async (list: UserPayment[]): Promise<Record<number, UserAccsEntry>> => {
    const entries = await Promise.all(
      list.map(u =>
        fetchUserJournalAccounts(u.id)
          .then(a => [u.id, { cashBoxAccountId: a.cashBoxAccountId ?? null, bankAccountId: a.bankAccountId ?? null }] as const)
          .catch(() => [u.id, { cashBoxAccountId: null, bankAccountId: null }] as const)
      )
    )
    return Object.fromEntries(entries)
  }

  useEffect(() => {
    if (!open || !doctorShiftId) {
      setUsersPayment([]); setUserAccsMap({})
      setPayersList([]); setPayersAccsMap({})
      setInsurancePayers([]); setInsurancePayersMap({})
      return
    }
    setUsersPaymentLoading(true)
    Promise.all([
      apiClient.get<{ data: UserPayment[] }>(`doctor-shifts/${doctorShiftId}/users-payment-summary`),
      apiClient.get<{ data: UserPayment[] }>(`doctor-shifts/${doctorShiftId}/users-who-payed-doctor`),
      apiClient.get<{ data: UserPayment[] }>(`doctor-shifts/${doctorShiftId}/users-insurance-payment-summary`),
    ])
      .then(async ([collectedRes, payersRes, insRes]) => {
        const collected  = collectedRes.data?.data ?? []
        const payers     = payersRes.data?.data    ?? []
        const insPayers  = insRes.data?.data       ?? []
        setUsersPayment(collected)
        setPayersList(payers)
        setInsurancePayers(insPayers)
        const [collectedMap, payersMap, insMap] = await Promise.all([
          loadAccsMap(collected),
          loadAccsMap(payers),
          loadAccsMap(insPayers),
        ])
        setUserAccsMap(collectedMap)
        setPayersAccsMap(payersMap)
        setInsurancePayersMap(insMap)
      })
      .catch(() => { setUsersPayment([]); setPayersList([]); setInsurancePayers([]) })
      .finally(() => setUsersPaymentLoading(false))
  }, [open, doctorShiftId])

  // ── submit state ──────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState<string[] | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [errCopied,  setErrCopied]  = useState(false)

  // ── load Firestore data on open ───────────────────────────────────────────
  useEffect(() => {
    if (!open || !user) return
    setSelectedUserId(user.id)
    setLoadingData(true); setDataError(null)

    Promise.all([
      fetchFinanceAccounts(),
      fetchFinanceParties(),
      fetchGlobalJournalSettings(),
      fetchUserJournalAccounts(user.id),
      fetchDoctorPartyMappings(),
      getUsersList(),
    ])
      .then(([accs, parts, g, u, partyMap, users]) => {
        setAccounts(accs); setParties(parts)
        setGlobal(g); setUserAccs(u)
        setUsersList(users)
        const savedPartyId = partyMap[doctorId] ?? null
        if (savedPartyId) setDoctorParty(parts.find(p => p.id === savedPartyId) ?? null)
      })
      .catch(() => setDataError('تعذّر تحميل البيانات من Firebase. تحقق من إعداد Firestore وإعدادات الحسابات الرئيسية.'))
      .finally(() => setLoadingData(false))
  }, [open, user, doctorId])

  // ── reload accounts when selected user changes ────────────────────────────
  useEffect(() => {
    if (!open || !selectedUserId || !user || selectedUserId === user.id) return
    fetchUserJournalAccounts(selectedUserId).then(setUserAccs).catch(() => {})
  }, [selectedUserId])

  // ── helpers ───────────────────────────────────────────────────────────────
  const findAcc = (id: string | null | undefined) => accounts.find(a => a.id === id) ?? null

  const revenueAcc       = findAcc(global.clinicRevenueAccountId)
  const insRevAcc        = findAcc(global.insuranceCopaymentRevenueAccountId)
const receivablesAcc   = findAcc(global.doctorReceivablesAccountId)
  const feeAcc           = findAcc(global.doctorFeesExpenseAccountId)
  const cashBoxAcc       = findAcc(userAccs.cashBoxAccountId)
  const bankAcc          = findAcc(userAccs.bankAccountId)

  // Per-user net regular amounts (subtract insurance copayments from totals to avoid double-counting)
  const insPayersById = Object.fromEntries(insurancePayers.map(u => [u.id, u]))
  const regularPayersNet = usersPayment
    .map(u => {
      const ins = insPayersById[u.id]
      return {
        ...u,
        total_cash: Number(u.total_cash) - Number(ins?.total_cash ?? 0),
        total_bank: Number(u.total_bank) - Number(ins?.total_bank ?? 0),
      }
    })
    .filter(u => u.total_cash > 0 || u.total_bank > 0)

  const insRevTotal     = insurancePayers.reduce((s, u) => s + Number(u.total_cash) + Number(u.total_bank), 0)

  const regularRevTotal = regularPayersNet.length > 0
    ? regularPayersNet.reduce((s, u) => s + u.total_cash + u.total_bank, 0)
    : usersPayment.length === 0 ? clinicCash + clinicBank : 0

  const clinicRevTotal = regularRevTotal
  const hasRevEntry    = clinicRevTotal > 0
  const hasInsEntry    = insRevTotal > 0 && !!insRevAcc

  const globalComplete   = isGlobalComplete(global)
  const userAccsComplete = isUserAccountsComplete(userAccs)
  const settingsReady    = globalComplete && userAccsComplete

  // ── entry lines ───────────────────────────────────────────────────────────

  const buildPayerLines = (payers: UserPayment[]): JLine[] =>
    payers.flatMap(u => {
      const a = userAccsMap[u.id]
      const lines: JLine[] = []
      const cash = Number(u.total_cash); const bank = Number(u.total_bank)
      if (cash > 0) lines.push({ label: `صندوق — ${u.name}`, account: findAcc(a?.cashBoxAccountId), debit: cash, credit: 0 })
      if (bank > 0) lines.push({ label: `بنك — ${u.name}`,   account: findAcc(a?.bankAccountId),    debit: bank, credit: 0 })
      return lines
    })

  const buildInsPayerLines = (payers: UserPayment[]): JLine[] =>
    payers.flatMap(u => {
      const a = insurancePayersMap[u.id]
      const lines: JLine[] = []
      const cash = Number(u.total_cash); const bank = Number(u.total_bank)
      if (cash > 0) lines.push({ label: `صندوق — ${u.name}`, account: findAcc(a?.cashBoxAccountId), debit: cash, credit: 0 })
      if (bank > 0) lines.push({ label: `بنك — ${u.name}`,   account: findAcc(a?.bankAccountId),    debit: bank, credit: 0 })
      return lines
    })

  const entry0Lines: JLine[] = [
    ...(usersPayment.length > 0
      ? buildPayerLines(regularPayersNet)
      : [
          ...(clinicCash > 0 ? [{ label: 'صندوق الكاش', account: cashBoxAcc, debit: clinicCash, credit: 0 }] : []),
          ...(clinicBank > 0 ? [{ label: 'بنك / شبكة',  account: bankAcc,   debit: clinicBank, credit: 0 }] : []),
        ]
    ),
    { label: 'إيرادات العيادة', account: revenueAcc, party: doctorParty, debit: 0, credit: regularRevTotal },
  ]

  const entry0BLines: JLine[] = [
    ...buildInsPayerLines(insurancePayers),
    { label: 'إيرادات التأمين (التحملات)', account: insRevAcc, party: doctorParty, debit: 0, credit: insRevTotal },
  ]
  const entry1Lines: JLine[] = [
    { label: 'مصروف أتعاب', account: feeAcc,          debit: totalAmount, credit: 0 },
    { label: 'ذمم الأطباء', account: receivablesAcc,   party: doctorParty, debit: 0, credit: totalAmount },
  ]
  const entry2Lines: JLine[] = [
    { label: 'ذمم الأطباء', account: receivablesAcc, party: doctorParty, debit: totalAmount, credit: 0 },
    ...(payersList.length > 0
      ? payersList.flatMap(u => {
          const a = payersAccsMap[u.id]
          const lines: JLine[] = []
          const cash = Number(u.total_cash); const bank = Number(u.total_bank)
          if (cash > 0) lines.push({ label: `صندوق — ${u.name}`, account: findAcc(a?.cashBoxAccountId), debit: 0, credit: cash })
          if (bank > 0) lines.push({ label: `بنك — ${u.name}`,   account: findAcc(a?.bankAccountId),    debit: 0, credit: bank })
          return lines
        })
      : [
          ...(cashAmount > 0 ? [{ label: 'صندوق الكاش', account: cashBoxAcc, debit: 0, credit: cashAmount }] : []),
          ...(bankAmount > 0 ? [{ label: 'بنك / شبكة',  account: bankAcc,    debit: 0, credit: bankAmount  }] : []),
        ]
    ),
  ]

  const revUsersReady = usersPayment.length === 0
    ? (clinicCash <= 0 || !!cashBoxAcc) && (clinicBank <= 0 || !!bankAcc)
    : usersPayment.every(u => {
        const a = userAccsMap[u.id]
        return (!Number(u.total_cash) || !!a?.cashBoxAccountId) && (!Number(u.total_bank) || !!a?.bankAccountId)
      })

  const payUsersReady = payersList.length === 0
    ? (cashAmount <= 0 || !!cashBoxAcc) && (bankAmount <= 0 || !!bankAcc)
    : payersList.every(u => {
        const a = payersAccsMap[u.id]
        return (!Number(u.total_cash) || !!a?.cashBoxAccountId) && (!Number(u.total_bank) || !!a?.bankAccountId)
      })

  const canSubmit = settingsReady && !!doctorParty && payUsersReady &&
    (!hasRevEntry || (!!revenueAcc && revUsersReady))

  // ── submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true); setError(null)
    try {
      const ref  = reference || null
      const meta = [
        userName      ? `المستخدم: ${userName}`        : null,
        clinicShiftId ? `وردية: ${clinicShiftId}`       : null,
        doctorShiftId ? `وردية طبيب: ${doctorShiftId}` : null,
      ].filter(Boolean).join(' | ')
      const sfx   = meta ? ` | ${meta}` : ''
      const desc1 = `إثبات استحقاق أتعاب د. ${doctorName}${sfx}`
      const desc2 = `صرف أتعاب د. ${doctorName}${sfx}`

      const reqs: Promise<string>[] = []

      const buildSubmitPayerLines = (payers: UserPayment[], accsMap: Record<number, UserAccsEntry>) =>
        payers.flatMap(u => {
          const a = accsMap[u.id]
          const ls: { account_id: string; description: string; debit: number; credit: number }[] = []
          const cash = Number(u.total_cash); const bank = Number(u.total_bank)
          if (cash > 0 && a?.cashBoxAccountId) ls.push({ account_id: a.cashBoxAccountId, description: `كاش — ${u.name}`,  debit: cash, credit: 0 })
          if (bank > 0 && a?.bankAccountId)    ls.push({ account_id: a.bankAccountId,    description: `شبكة — ${u.name}`, debit: bank, credit: 0 })
          return ls
        })

      if (regularRevTotal > 0 && revenueAcc) {
        const regularDebitLines = usersPayment.length > 0
          ? buildSubmitPayerLines(regularPayersNet, userAccsMap)
          : [
              ...(clinicCash > 0 ? [{ account_id: userAccs.cashBoxAccountId!, description: 'كاش من المرضى',  debit: clinicCash,  credit: 0 }] : []),
              ...(clinicBank > 0 ? [{ account_id: userAccs.bankAccountId!,    description: 'شبكة من المرضى', debit: clinicBank,  credit: 0 }] : []),
            ]
        reqs.push(createJournalEntry({
          date, reference: ref,
          description: `إثبات إيراد العيادة | د. ${doctorName}${sfx}`,
          lines: [
            ...regularDebitLines,
            { account_id: global.clinicRevenueAccountId!, party_id: doctorParty!.id, description: 'إيراد العيادة', debit: 0, credit: regularRevTotal },
          ],
        }))
      }

      if (hasInsEntry) {
        reqs.push(createJournalEntry({
          date, reference: ref,
          description: `إثبات إيراد التأمين (تحملات) | د. ${doctorName}${sfx}`,
          lines: [
            ...buildSubmitPayerLines(insurancePayers, insurancePayersMap),
            { account_id: global.insuranceCopaymentRevenueAccountId!, party_id: doctorParty!.id, description: 'إيراد التأمين (التحملات)', debit: 0, credit: insRevTotal },
          ],
        }))
      }

      reqs.push(createJournalEntry({
        date, reference: ref, description: desc1,
        lines: [
          { account_id: global.doctorFeesExpenseAccountId!, description: desc1, debit: totalAmount, credit: 0 },
          { account_id: global.doctorReceivablesAccountId!, party_id: doctorParty!.id, description: desc1, debit: 0, credit: totalAmount },
        ],
      }))

      const payDebitLines = payersList.length > 0
        ? payersList.flatMap(u => {
            const a = payersAccsMap[u.id]
            const ls: { account_id: string; description: string; debit: number; credit: number }[] = []
            const cash = Number(u.total_cash); const bank = Number(u.total_bank)
            if (cash > 0 && a?.cashBoxAccountId) ls.push({ account_id: a.cashBoxAccountId, description: `صندوق — ${u.name}`, debit: 0, credit: cash })
            if (bank > 0 && a?.bankAccountId)    ls.push({ account_id: a.bankAccountId,    description: `بنك — ${u.name}`,   debit: 0, credit: bank })
            return ls
          })
        : [
            ...(cashAmount > 0 ? [{ account_id: userAccs.cashBoxAccountId!, description: 'صندوق', debit: 0, credit: cashAmount }] : []),
            ...(bankAmount > 0 ? [{ account_id: userAccs.bankAccountId!,    description: 'بنك',   debit: 0, credit: bankAmount  }] : []),
          ]

      reqs.push(createJournalEntry({
        date, reference: ref, description: desc2,
        lines: [
          { account_id: global.doctorReceivablesAccountId!, party_id: doctorParty!.id, description: desc2, debit: totalAmount, credit: 0 },
          ...payDebitLines,
        ],
      }))

      const ids = await Promise.all(reqs)
      setDone(ids)
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'فشل إنشاء القيود. تحقق من إعدادات Firebase.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => { setDone(null); setError(null); onClose() }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">

      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <AccountBalanceIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            قيود محاسبية — د. {doctorName}
          </Typography>
          <Typography variant="caption" color="text.secondary">{date} · {reference}</Typography>
        </Box>
        <Chip label={`${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.س`} size="small" color="primary" />
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 1.5 }}>

        {done ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 0.5 }} />
            <Typography variant="h6" color="success.main">تم إنشاء القيود بنجاح</Typography>
            <Typography variant="caption" color="text.secondary">{done.length} قيد محاسبي · محفوظ في Firebase</Typography>
            <Box sx={{ mt: 1.5 }}><Button variant="contained" size="small" onClick={handleClose}>إغلاق</Button></Box>
          </Box>
        ) : (
          <Stack gap={1}>
            {error && (
              <Alert severity="error" sx={{ py: 0 }} action={
                <IconButton size="small" onClick={() => { navigator.clipboard.writeText(error); setErrCopied(true); setTimeout(() => setErrCopied(false), 2000) }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              }>
                {errCopied ? 'تم النسخ' : error}
              </Alert>
            )}
            {dataError && <Alert severity="error" sx={{ py: 0 }}>{dataError}</Alert>}

            {loadingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
            ) : (
              <>
                {!settingsReady && (
                  <Alert severity="warning" sx={{ py: 0, fontSize: 12 }}>
                    يرجى ضبط <strong>الإعدادات ← المحاسبة ← الحسابات الرئيسية</strong> أولاً.
                  </Alert>
                )}

                {/* Row: user selector + doctor party */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                  <Autocomplete
                    options={usersList}
                    value={usersList.find(u => u.id === selectedUserId) ?? null}
                    onChange={(_, v) => setSelectedUserId(v?.id ?? user?.id ?? null)}
                    getOptionLabel={u => u.name}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    size="small"
                    renderInput={p => <TextField {...p} label="المستخدم (صندوق / بنك القيد 2)" />}
                  />
                  <Autocomplete
                    options={parties} value={doctorParty}
                    onChange={(_, v) => { setDoctorParty(v); if (v) saveDoctorPartyMapping(doctorId, v.id).catch(() => {}) }}
                    getOptionLabel={p => p.name}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    size="small"
                    renderInput={p => <TextField {...p} label={`الطبيب كطرف — ${doctorName} *`} />}
                  />
                       {/* Users payment table */}
                {doctorShiftId && (
                  <Box sx={{ border: '1px dashed', borderColor: 'info.light', borderRadius: 1, bgcolor: '#F0F7FF', overflow: 'hidden' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.dark', display: 'block', px: 1, pt: 0.5 }}>
                      متحصلين عيادة {doctorName}
                    </Typography>
                    {usersPaymentLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}><CircularProgress size={16} /></Box>
                    ) : usersPayment.length === 0 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ px: 1, pb: 0.5, display: 'block' }}>لا توجد مدفوعات</Typography>
                    ) : (
                      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <Box component="thead">
                          <Box component="tr" sx={{ bgcolor: '#1565C0', '& th': { color: '#fff', fontWeight: 700, p: '3px 6px', border: '1px solid #1565C0', textAlign: 'center' } }}>
                            <Box component="th" sx={{ textAlign: 'right !important' }}>المستخدم</Box>
                            <Box component="th">نقدي</Box>
                            <Box component="th">بنك</Box>
                            <Box component="th">الإجمالي</Box>
                            <Box component="th">📒</Box>
                            <Box component="th">🏦</Box>
                          </Box>
                        </Box>
                        <Box component="tbody">
                          {usersPayment.map((u, i) => {
                            const accs = userAccsMap[u.id]
                            return (
                              <Box component="tr" key={u.id} sx={{ bgcolor: i % 2 ? '#f0f7ff' : '#fff', '& td': { p: '2px 6px', border: '1px solid #ddd', textAlign: 'center', direction: 'ltr' } }}>
                                <Box component="td" sx={{ textAlign: 'right !important', direction: 'rtl', fontWeight: 600 }}>{u.name}</Box>
                                <Box component="td" sx={{ color: 'success.dark' }}>{Number(u.total_cash) > 0 ? Number(u.total_cash).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}</Box>
                                <Box component="td" sx={{ color: 'info.dark' }}>{Number(u.total_bank) > 0 ? Number(u.total_bank).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}</Box>
                                <Box component="td" sx={{ fontWeight: 700 }}>{Number(u.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Box>
                                <Box component="td">{accs == null ? '…' : accs.cashBoxAccountId ? '✅' : '❌'}</Box>
                                <Box component="td">{accs == null ? '…' : accs.bankAccountId    ? '✅' : '❌'}</Box>
                              </Box>
                            )
                          })}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                </Box>

           

                {regularRevTotal > 0 && <EntryTable lines={entry0Lines}  title="قيد 0 — إثبات إيراد العيادة" />}
                {hasInsEntry        && <EntryTable lines={entry0BLines} title="قيد 0ب — إثبات إيراد التأمين (التحملات)" />}
                <EntryTable lines={entry1Lines} title="قيد 1 — إثبات الأتعاب وذمة الطبيب" />
                <EntryTable lines={entry2Lines} title="قيد 2 — صرف الأتعاب" />

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size="small" onClick={handleClose} disabled={submitting}>إلغاء</Button>
                  <Button
                    variant="contained" size="small"
                    disabled={!canSubmit || submitting}
                    onClick={handleSubmit}
                    startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined}
                  >
                    {submitting ? 'جاري الإنشاء...' : `إنشاء ${2 + (regularRevTotal > 0 ? 1 : 0) + (hasInsEntry ? 1 : 0)} قيود`}
                  </Button>
                </Box>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
