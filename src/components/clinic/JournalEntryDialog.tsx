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
              <Box component="td" sx={{ textAlign: 'right !important', fontSize: 12 }}>
                {l.account
                  ? <><strong>{l.account.code} — {l.account.name}</strong>{l.party && <Box component="span" sx={{ color: 'text.secondary', fontSize: 10, mr: 0.5 }}> [{l.party.name}]</Box>}</>
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

  const revenueAcc     = findAcc(global.clinicRevenueAccountId)
  const receivablesAcc = findAcc(global.doctorReceivablesAccountId)
  const feeAcc         = findAcc(global.doctorFeesExpenseAccountId)
  const cashBoxAcc     = findAcc(userAccs.cashBoxAccountId)
  const bankAcc        = findAcc(userAccs.bankAccountId)

  const clinicRevTotal = clinicCash + clinicBank
  const hasRevEntry    = clinicRevTotal > 0

  const globalComplete   = isGlobalComplete(global)
  const userAccsComplete = isUserAccountsComplete(userAccs)
  const settingsReady    = globalComplete && userAccsComplete

  // ── entry lines ───────────────────────────────────────────────────────────

  const entry0Lines: JLine[] = [
    ...(clinicCash > 0 ? [{ label: 'صندوق الكاش', account: cashBoxAcc, debit: clinicCash, credit: 0 }] : []),
    ...(clinicBank > 0 ? [{ label: 'بنك / شبكة',  account: bankAcc,   debit: clinicBank, credit: 0 }] : []),
    {                    label: 'إيرادات العيادة',  account: revenueAcc, party: doctorParty, debit: 0, credit: clinicRevTotal },
  ]
  const entry1Lines: JLine[] = [
    { label: 'مصروف أتعاب', account: feeAcc,          debit: totalAmount, credit: 0 },
    { label: 'ذمم الأطباء', account: receivablesAcc,   party: doctorParty, debit: 0, credit: totalAmount },
  ]
  const entry2Lines: JLine[] = [
    { label: 'ذمم الأطباء', account: receivablesAcc,   party: doctorParty, debit: totalAmount, credit: 0 },
    ...(cashAmount > 0 ? [{ label: 'صندوق الكاش', account: cashBoxAcc, debit: 0, credit: cashAmount }] : []),
    ...(bankAmount > 0 ? [{ label: 'بنك / شبكة',  account: bankAcc,    debit: 0, credit: bankAmount  }] : []),
  ]

  const canSubmit = settingsReady && !!doctorParty &&
    (cashAmount <= 0 || !!cashBoxAcc) && (bankAmount <= 0 || !!bankAcc) &&
    (!hasRevEntry || (!!revenueAcc && (clinicCash <= 0 || !!cashBoxAcc) && (clinicBank <= 0 || !!bankAcc)))

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

      if (hasRevEntry && revenueAcc) {
        reqs.push(createJournalEntry({
          date, reference: ref,
          description: `إثبات إيراد العيادة | د. ${doctorName}${sfx}`,
          lines: [
            ...(clinicCash > 0 ? [{ account_id: userAccs.cashBoxAccountId!, description: 'كاش من المرضى',  debit: clinicCash,  credit: 0 }] : []),
            ...(clinicBank > 0 ? [{ account_id: userAccs.bankAccountId!,    description: 'شبكة من المرضى', debit: clinicBank,  credit: 0 }] : []),
            { account_id: global.clinicRevenueAccountId!, party_id: doctorParty!.id, description: 'إيراد العيادة', debit: 0, credit: clinicRevTotal },
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

      reqs.push(createJournalEntry({
        date, reference: ref, description: desc2,
        lines: [
          { account_id: global.doctorReceivablesAccountId!, party_id: doctorParty!.id, description: desc2, debit: totalAmount, credit: 0 },
          ...(cashAmount > 0 ? [{ account_id: userAccs.cashBoxAccountId!, description: 'صندوق', debit: 0, credit: cashAmount }] : []),
          ...(bankAmount > 0 ? [{ account_id: userAccs.bankAccountId!,    description: 'بنك',   debit: 0, credit: bankAmount  }] : []),
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

      <DialogContent sx={{ pt: 2 }}>

        {/* Done */}
        {done && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" color="success.main">تم إنشاء القيود بنجاح</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {done.length} قيد محاسبي · محفوظ في Firebase
            </Typography>
            <Button sx={{ mt: 2 }} variant="contained" onClick={handleClose}>إغلاق</Button>
          </Box>
        )}

        {!done && (
          <Stack gap={2}>
            {error && (
              <Alert severity="error" action={
                <IconButton size="small" onClick={() => { navigator.clipboard.writeText(error); setErrCopied(true); setTimeout(() => setErrCopied(false), 2000) }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              }>
                {errCopied ? 'تم النسخ' : error}
              </Alert>
            )}
            {dataError && <Alert severity="error">{dataError}</Alert>}

            {loadingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : (
              <>
                {/* Settings incomplete warning */}
                {!settingsReady && (
                  <Alert severity="warning">
                    لم يتم ضبط إعدادات المحاسبة بعد. يرجى الذهاب إلى <strong>الإعدادات ← المحاسبة ← الحسابات الرئيسية</strong> وتحديد حسابات الإيراد والأتعاب والصندوق والبنك أولاً.
                  </Alert>
                )}

                {/* User selector */}
                <Autocomplete
                  options={usersList}
                  value={usersList.find(u => u.id === selectedUserId) ?? null}
                  onChange={(_, v) => setSelectedUserId(v?.id ?? user?.id ?? null)}
                  getOptionLabel={u => u.name}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  size="small"
                  renderInput={p => (
                    <TextField {...p}
                      label="المستخدم (حسابات الصندوق والبنك)"
                      helperText="حسابات الصندوق والبنك المستخدمة في القيود"
                    />
                  )}
                />

                {/* Doctor party */}
                <Autocomplete
                  options={parties} value={doctorParty}
                  onChange={(_, v) => {
                    setDoctorParty(v)
                    if (v) saveDoctorPartyMapping(doctorId, v.id).catch(() => {})
                  }}
                  getOptionLabel={p => p.name}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  size="small"
                  renderInput={p => (
                    <TextField {...p}
                      label={`الطبيب كطرف في نظام المحاسبة * — ${doctorName}`}
                      helperText="يُحفظ تلقائياً لهذا الطبيب في المرات القادمة"
                    />
                  )}
                />

                {/* Clinic revenue amounts */}
                <Box sx={{ p: 1.5, border: '1px dashed', borderColor: 'success.light', borderRadius: 1, bgcolor: '#F8FFF8' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.dark', flex: 1 }}>
                      مبالغ التحصيل من المرضى — لقيد إثبات الإيراد (اتركها صفر لتخطي هذا القيد)
                    </Typography>
                    {amountsFromShift && (
                      <Chip label="محسوب من وردية الطبيب" size="small" color="success" variant="outlined" sx={{ fontSize: 10 }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField size="small" type="number" label="نقدي من المرضى"
                      value={clinicCash} onChange={e => setClinicCash(Math.max(0, Number(e.target.value)))}
                      slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
                    <TextField size="small" type="number" label="شبكة / بنك من المرضى"
                      value={clinicBank} onChange={e => setClinicBank(Math.max(0, Number(e.target.value)))}
                      slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
                  </Box>
                </Box>

                <Divider />

                {hasRevEntry && <EntryTable lines={entry0Lines} title="قيد 0 — إثبات إيراد العيادة (نقدي / شبكة من المرضى)" />}
                <EntryTable lines={entry1Lines} title="قيد 1 — إثبات استحقاق الأتعاب وإنشاء ذمة الطبيب" />
                <EntryTable lines={entry2Lines} title="قيد 2 — صرف الأتعاب وإغلاق ذمة الطبيب" />

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Button onClick={handleClose} disabled={submitting}>إلغاء</Button>
                  <Button
                    variant="contained" size="large"
                    disabled={!canSubmit || submitting}
                    onClick={handleSubmit}
                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                  >
                    {submitting ? 'جاري الإنشاء...' : `إنشاء ${hasRevEntry ? '3' : '2'} قيود`}
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
