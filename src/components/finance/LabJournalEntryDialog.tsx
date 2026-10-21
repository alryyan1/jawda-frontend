import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress,
  Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography,
} from '@mui/material'
import CheckCircleIcon    from '@mui/icons-material/CheckCircle'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ContentCopyIcon    from '@mui/icons-material/ContentCopy'
import {
  type FinanceAccount, type FinanceGlobalAccounts,
  DEFAULT_GLOBAL,
  createJournalEntry, findJournalEntryByReference,
  fetchFinanceAccounts, fetchGlobalJournalSettings, fetchUserJournalAccounts,
} from '@/services/financeFirebaseService'
import type { UserRevenueItem } from '@/types/reports'

// ── journal preview table ─────────────────────────────────────────────────────

interface JLine { label: string; account: FinanceAccount | null; debit: number; credit: number }

function EntryTable({ lines }: { lines: JLine[] }) {
  const dr  = lines.reduce((s, l) => s + l.debit, 0)
  const cr  = lines.reduce((s, l) => s + l.credit, 0)
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 })
  return (
    <Box sx={{ mb: 1.5 }}>
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
                  ? <strong>{l.account.code} — {l.account.name}</strong>
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

export interface LabJournalEntryDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  shiftId: number
  shiftLabel: string
  date: string
  userRevenues: UserRevenueItem[]
}

// ── component ─────────────────────────────────────────────────────────────────

export default function LabJournalEntryDialog({
  open, onClose, onSuccess,
  shiftId, shiftLabel, date, userRevenues,
}: LabJournalEntryDialogProps) {
  const reference = `lab_shift_${shiftId}`

  const [global,    setGlobal]    = useState<FinanceGlobalAccounts>(DEFAULT_GLOBAL)
  const [accounts,  setAccounts]  = useState<FinanceAccount[]>([])
  interface UserAccsEntry { cashBoxAccountId: string | null; bankAccountId: string | null }
  const [userAccsMap, setUserAccsMap] = useState<Record<number, UserAccsEntry>>({})
  const [existingExport, setExistingExport] = useState<{ id: string; createdAt: string } | null>(null)

  const [loadingData, setLoadingData] = useState(false)
  const [dataError,   setDataError]   = useState<string | null>(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [errCopied,   setErrCopied]   = useState(false)

  const collectors = userRevenues
    .map(u => ({
      id: u.user_id,
      name: u.user_name,
      cash: Number(u.total_cash || 0),
      bank: Number(u.total_bank || 0),
    }))
    .filter(u => u.cash > 0 || u.bank > 0)

  useEffect(() => {
    if (!open) return
    setDone(null); setError(null)
    setLoadingData(true); setDataError(null)

    Promise.all([
      fetchFinanceAccounts(),
      fetchGlobalJournalSettings(),
      findJournalEntryByReference(reference),
      Promise.all(
        collectors.map(u =>
          fetchUserJournalAccounts(u.id)
            .then(a => [u.id, { cashBoxAccountId: a.cashBoxAccountId ?? null, bankAccountId: a.bankAccountId ?? null }] as const)
            .catch(() => [u.id, { cashBoxAccountId: null, bankAccountId: null }] as const)
        ),
      ),
    ])
      .then(([accs, g, existing, accsEntries]) => {
        setAccounts(accs)
        setGlobal(g)
        setExistingExport(existing)
        setUserAccsMap(Object.fromEntries(accsEntries))
      })
      .catch(() => setDataError('تعذّر تحميل البيانات من Firebase. تحقق من إعداد Firestore وإعدادات الحسابات الرئيسية.'))
      .finally(() => setLoadingData(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shiftId])

  const findAcc = (id: string | null | undefined) => accounts.find(a => a.id === id) ?? null
  const revenueAcc = findAcc(global.labRevenueAccountId)
  const revenueTotal = collectors.reduce((s, u) => s + u.cash + u.bank, 0)

  const debitLines: JLine[] = collectors.flatMap(u => {
    const a = userAccsMap[u.id]
    const lines: JLine[] = []
    if (u.cash > 0) lines.push({ label: `صندوق — ${u.name}`, account: findAcc(a?.cashBoxAccountId), debit: u.cash, credit: 0 })
    if (u.bank > 0) lines.push({ label: `بنك — ${u.name}`,   account: findAcc(a?.bankAccountId),    debit: u.bank, credit: 0 })
    return lines
  })

  const entryLines: JLine[] = [
    ...debitLines,
    { label: 'إيرادات المختبر', account: revenueAcc, debit: 0, credit: revenueTotal },
  ]

  const settingsReady = !!global.labRevenueAccountId
  const usersReady = collectors.every(u => {
    const a = userAccsMap[u.id]
    return (!u.cash || !!a?.cashBoxAccountId) && (!u.bank || !!a?.bankAccountId)
  })
  const canSubmit = settingsReady && usersReady && revenueTotal > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true); setError(null)
    try {
      const id = await createJournalEntry({
        date, reference,
        description: `إيرادات المختبر — مناوبة ${shiftLabel}`,
        lines: [
          ...debitLines.map(l => ({ account_id: l.account!.id, description: l.label, debit: l.debit, credit: 0 })),
          { account_id: revenueAcc!.id, description: 'إيرادات المختبر', debit: 0, credit: revenueTotal },
        ],
      })
      setDone(id)
      onSuccess?.()
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'فشل إنشاء القيد. تحقق من إعدادات Firebase.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => { setDone(null); setError(null); onClose() }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <AccountBalanceIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            قيد إيرادات المختبر — مناوبة {shiftLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary">{date} · {reference}</Typography>
        </Box>
        <Chip label={`${revenueTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.س`} size="small" color="primary" />
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 1.5 }}>
        {done ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 0.5 }} />
            <Typography variant="h6" color="success.main">تم إنشاء القيد بنجاح</Typography>
            <Typography variant="caption" color="text.secondary">محفوظ في Firebase — بانتظار الاستيراد في نظام المحاسبة</Typography>
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
                    يرجى ضبط <strong>الإعدادات ← المحاسبة ← الحسابات الرئيسية ← حساب إيرادات المختبر</strong> أولاً.
                  </Alert>
                )}
                {!usersReady && (
                  <Alert severity="warning" sx={{ py: 0, fontSize: 12 }}>
                    بعض المتحصلين ليس لهم حساب صندوق/بنك مربوط — يرجى ضبطها من <strong>الإعدادات ← المحاسبة ← الحسابات الرئيسية</strong>.
                  </Alert>
                )}
                {existingExport && (
                  <Alert severity="info" sx={{ py: 0, fontSize: 12 }}>
                    تم تصدير قيد لهذه المناوبة مسبقًا بتاريخ {new Date(existingExport.createdAt).toLocaleString('ar-EG')}. يمكنك المتابعة لإنشاء نسخة إضافية إذا لزم الأمر.
                  </Alert>
                )}
                {collectors.length === 0 && (
                  <Alert severity="warning" sx={{ py: 0, fontSize: 12 }}>لا توجد مبالغ محصّلة في هذه المناوبة.</Alert>
                )}

                <EntryTable lines={entryLines} />

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size="small" onClick={handleClose} disabled={submitting}>إلغاء</Button>
                  <Button
                    variant="contained" size="small"
                    disabled={!canSubmit || submitting}
                    onClick={handleSubmit}
                    startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined}
                  >
                    {submitting ? 'جاري الإنشاء...' : 'تصدير القيد'}
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
