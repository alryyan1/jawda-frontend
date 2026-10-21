import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  InputAdornment, Paper, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import SettingsIcon    from '@mui/icons-material/Settings'
import { toast } from 'sonner'
import {
  type FinanceAccount, type FinanceConnection,
  type FinanceGlobalAccounts, type FinanceUserAccounts,
  DEFAULT_GLOBAL, DEFAULT_USER,
  loadConnection, saveConnection,
  isGlobalComplete, isUserAccountsComplete,
  importAccountsFromFinanceApi, ImportSourceChangedError, clearFinanceAccountsData,
  fetchFinanceAccounts,
  fetchGlobalJournalSettings, saveGlobalJournalSettings,
  fetchUserJournalAccounts, saveUserJournalAccounts,
} from '@/services/financeFirebaseService'
import { getUsersList } from '@/services/userService'


// ── account depth colours ─────────────────────────────────────────────────────

const DEPTH_COLORS = ['#0D47A1','#1565C0','#1976D2','#2196F3','#64B5F6','#90CAF9']

function buildDepthMap(accounts: FinanceAccount[]): Map<string, number> {
  const idMap = new Map(accounts.map(a => [a.id, a]))
  const cache = new Map<string, number>()
  function depth(a: FinanceAccount): number {
    if (cache.has(a.id)) return cache.get(a.id)!
    const d = a.parent_id ? ((depth(idMap.get(a.parent_id)!)) ?? 0) + 1 : 1
    cache.set(a.id, d); return d
  }
  accounts.forEach(a => depth(a))
  return cache
}

function AccountOption(
  props: React.HTMLAttributes<HTMLLIElement> & { key?: React.Key },
  acc: FinanceAccount,
  depthMap: Map<string, number>,
) {
  const { key, ...liProps } = props
  const d     = depthMap.get(acc.id) ?? 1
  const color = DEPTH_COLORS[Math.min(d - 1, DEPTH_COLORS.length - 1)]
  return (
    <Box key={key} component="li" {...liProps}
      sx={{ pl: `${d * 14}px !important`, display: 'flex !important', alignItems: 'center', gap: '6px' }}>
      <Box component="span" sx={{ color, fontWeight: d <= 2 ? 700 : 400, fontSize: 12, minWidth: 56, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
        {acc.code}
      </Box>
      <Box component="span" sx={{ fontSize: 13, color: d <= 2 ? color : 'text.primary', fontWeight: d <= 2 ? 600 : 400 }}>
        {acc.name}
      </Box>
    </Box>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export default function FinanceSettingsTab() {
  const [activeTab, setActiveTab] = useState(0)

  // ── shared data (accounts loaded from Firestore) ───────────────────────────
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const loadSharedData = async () => {
    setDataLoading(true)
    try {
      const accs = await fetchFinanceAccounts()
      console.log('loaded accounts from Firebase', accs)
      setAccounts(accs)
    } catch { /* Firebase may not be configured yet */ }
    finally { setDataLoading(false) }
  }

  useEffect(() => { loadSharedData() }, [])

  // ── Tab 0: import ─────────────────────────────────────────────────────────
  const [conn,          setConn]          = useState<FinanceConnection>(loadConnection)
  const [importingAccs, setImportingAccs] = useState(false)
  const [clearingAccs,  setClearingAccs]  = useState(false)
  const [importedAccsCount, setImportedAccsCount] = useState<number | null>(null)

  const handleSaveConnection = () => {
    saveConnection(conn)
    toast.success('تم حفظ بيانات الاتصال')
  }

  const handleImportAccounts = async () => {
    setImportingAccs(true)
    try {
      let n: number
      try {
        n = await importAccountsFromFinanceApi(conn)
      } catch (e: unknown) {
        if (!(e instanceof ImportSourceChangedError)) throw e
        const ok = window.confirm(
          `تم استيراد الحسابات سابقاً من مشروع finance-api مختلف (${e.previousBaseUrl}).\n` +
          `الاستمرار سيحذف كل الحسابات المستوردة سابقاً وإعدادات ربط الحسابات الرئيسية وحسابات كل مستخدم، ` +
          `ثم يستوردها من جديد من (${e.newBaseUrl}). ستحتاج لإعادة ضبط الربط بعد ذلك.\n\n` +
          `هل تريد المتابعة؟`
        )
        if (!ok) return
        n = await importAccountsFromFinanceApi(conn, true)
      }
      setImportedAccsCount(n)
      toast.success(`تم استيراد ${n} حساب إلى Firebase`)
      loadSharedData()
    } catch (e: unknown) {
      toast.error(`فشل استيراد الحسابات — ${(e as Error).message}`)
    } finally { setImportingAccs(false) }
  }

  const handleClearFirestoreData = async () => {
    const ok = window.confirm(
      'سيتم حذف جميع الحسابات، وإعدادات ربط الحسابات الرئيسية وحسابات كل مستخدم، نهائياً من Firebase.\n' +
      'هذا الإجراء لا يمكن التراجع عنه.\n\n' +
      'هل تريد المتابعة؟'
    )
    if (!ok) return
    setClearingAccs(true)
    try {
      await clearFinanceAccountsData()
      setImportedAccsCount(null)
      toast.success('تم حذف بيانات Firebase')
      loadSharedData()
    } catch (e: unknown) {
      toast.error(`فشل حذف البيانات — ${(e as Error).message}`)
    } finally { setClearingAccs(false) }
  }

  // ── Tab 1: key accounts ───────────────────────────────────────────────────
  const [globalAccs,   setGlobalAccs]   = useState<FinanceGlobalAccounts>(DEFAULT_GLOBAL)
  const [tab1Loading,  setTab1Loading]  = useState(false)
  const [savingGlobal, setSavingGlobal] = useState(false)

  // per-user accounts: userId → FinanceUserAccounts
  const [usersList,    setUsersList]    = useState<{ id: number; name: string; username: string }[]>([])
  const [allUserAccs,  setAllUserAccs]  = useState<Record<number, FinanceUserAccounts>>({})
  const [savingUserId, setSavingUserId] = useState<number | null>(null)
  const [usersSearch,  setUsersSearch]  = useState('')

  useEffect(() => {
    if (activeTab !== 1) return
    setTab1Loading(true)

    Promise.all([
      fetchGlobalJournalSettings(),
      getUsersList(),
    ])
      .then(async ([g, users]) => {
        setGlobalAccs(g)
        setUsersList(users)
        // load every user's Firestore accounts in parallel
        const entries = await Promise.all(
          users.map(u => fetchUserJournalAccounts(u.id).then(accs => [u.id, accs] as const))
        )
        setAllUserAccs(Object.fromEntries(entries))
      })
      .catch(() => toast.error('فشل تحميل إعدادات الحسابات من Firebase'))
      .finally(() => setTab1Loading(false))
  }, [activeTab])

  // Firestore's setDoc overwrites the whole document, so every autosave must
  // send the complete merged object — not just the field that changed — or it
  // would wipe out the other already-saved accounts.
  const updateGlobalAcc = async (patch: Partial<FinanceGlobalAccounts>) => {
    const next = { ...globalAccs, ...patch }
    setGlobalAccs(next)
    setSavingGlobal(true)
    try {
      await saveGlobalJournalSettings(next)
    } catch { toast.error('فشل حفظ الحسابات الرئيسية') }
    finally { setSavingGlobal(false) }
  }

  const updateUserAcc = async (userId: number, patch: Partial<FinanceUserAccounts>) => {
    const next = { ...(allUserAccs[userId] ?? DEFAULT_USER), ...patch }
    setAllUserAccs(m => ({ ...m, [userId]: next }))
    setSavingUserId(userId)
    try {
      await saveUserJournalAccounts(userId, next)
    } catch { toast.error('فشل حفظ حسابات المستخدم') }
    finally { setSavingUserId(null) }
  }

  // ── shared account picker ─────────────────────────────────────────────────
  // accounts is already sorted by code (see fetchFinanceAccounts).
  const depthMap        = useMemo(() => buildDepthMap(accounts), [accounts])
  const renderAccOption = (props: React.HTMLAttributes<HTMLLIElement> & { key?: React.Key }, acc: FinanceAccount) =>
    AccountOption(props, acc, depthMap)
  const findAcc = (id: string | null | undefined) => accounts.find(a => a.id === id) ?? null

  const AccPicker = ({ label, value, onChange }: {
    label: string; value: FinanceAccount | null; onChange: (v: FinanceAccount | null) => void
  }) => (
    <Autocomplete
      options={accounts} value={value}
      onChange={(_, v) => onChange(v)}
      getOptionLabel={a => `${a.code} — ${a.name}`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderOption={renderAccOption} size="small"
      loading={dataLoading}
      renderInput={p => <TextField {...p} label={label} />}
    />
  )

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Stack spacing={3}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<CloudUploadIcon fontSize="small" />} iconPosition="start" label="استيراد البيانات" />
          <Tab icon={<SettingsIcon fontSize="small" />}    iconPosition="start" label="الحسابات الرئيسية" />
        </Tabs>
      </Box>

      {/* ── Tab 0: Data Import ──────────────────────────────────────────── */}
      {activeTab === 0 && (
        <Stack spacing={3}>
          {/* Firestore status chips */}
          {accounts.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`${accounts.length} حساب في Firebase`} color="success" size="small" />
            </Box>
          )}

          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>استيراد من Finance API (مرة واحدة)</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              أدخل بيانات الاتصال بـ Finance API لاستيراد الحسابات إلى Firebase. بعد الاستيراد لن تحتاج لهذا الاتصال مجدداً.
            </Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  size="small" label="عنوان Finance API" fullWidth
                  value={conn.baseUrl}
                  onChange={e => setConn(c => ({ ...c, baseUrl: e.target.value }))}
                />
                <TextField
                  size="small" label="Bearer Token" type="password" fullWidth
                  value={conn.token}
                  onChange={e => setConn(c => ({ ...c, token: e.target.value }))}
                  slotProps={{
                    input: {
                      endAdornment: conn.token
                        ? <InputAdornment position="end"><Chip label="Token" size="small" color="info" /></InputAdornment>
                        : undefined,
                    },
                  }}
                />
              </Stack>
              <Box>
                <Button
                  variant="contained"
                  disabled={!conn.baseUrl.trim() || !conn.token.trim()}
                  onClick={handleSaveConnection}
                >
                  حفظ بيانات الاتصال
                </Button>
              </Box>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  disabled={!conn.baseUrl.trim() || !conn.token.trim() || importingAccs}
                  onClick={handleImportAccounts}
                  startIcon={importingAccs ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                  {importingAccs ? 'جاري الاستيراد...' : 'استيراد الحسابات'}
                </Button>
                <Button
                  variant="outlined" color="error"
                  disabled={clearingAccs || accounts.length === 0}
                  onClick={handleClearFirestoreData}
                  startIcon={clearingAccs ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                  {clearingAccs ? 'جاري الحذف...' : 'مسح بيانات Firebase'}
                </Button>
              </Stack>
              {importedAccsCount != null && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`✓ ${importedAccsCount} حساب`} color="success" size="small" />
                </Box>
              )}
            </Stack>
          </Paper>
        </Stack>
      )}

      {/* ── Tab 1: Key Accounts ─────────────────────────────────────────── */}
      {activeTab === 1 && (
        <Stack spacing={3}>
          {tab1Loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress /></Box>}

          {accounts.length === 0 && !tab1Loading && (
            <Alert severity="warning">
              لا توجد حسابات في Firebase بعد — يرجى استيراد الحسابات من تبويب "استيراد البيانات" أولاً.
            </Alert>
          )}

          {accounts.length > 0 && (
            <>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 0 }}> ربط الحسابات الرئيسية </Typography>
                  {savingGlobal && <CircularProgress size={14} />}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  تُستخدم في جميع قيود الأطباء تلقائياً — يُحفظ تلقائياً عند كل اختيار
                </Typography>
                {!isGlobalComplete(globalAccs) && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    بعض الحسابات المطلوبة (*) غير محددة بعد.
                  </Alert>
                )}
                <Stack spacing={2}>
                  <AccPicker
                    label="حساب إيرادات العيادة *"
                    value={findAcc(globalAccs.clinicRevenueAccountId)}
                    onChange={v => updateGlobalAcc({ clinicRevenueAccountId: v?.id ?? null })}
                  />
                  <AccPicker
                    label="حساب ذمم الأطباء (الدائنون) *"
                    value={findAcc(globalAccs.doctorReceivablesAccountId)}
                    onChange={v => updateGlobalAcc({ doctorReceivablesAccountId: v?.id ?? null })}
                  />
                  <AccPicker
                    label="حساب مصروف أتعاب الأطباء *"
                    value={findAcc(globalAccs.doctorFeesExpenseAccountId)}
                    onChange={v => updateGlobalAcc({ doctorFeesExpenseAccountId: v?.id ?? null })}
                  />
                  <AccPicker
                    label="حساب إيرادات التأمين (التحملات)"
                    value={findAcc(globalAccs.insuranceCopaymentRevenueAccountId)}
                    onChange={v => updateGlobalAcc({ insuranceCopaymentRevenueAccountId: v?.id ?? null })}
                  />
                  <AccPicker
                    label="حساب ذمم التأمين (المستحق من الشركات)"
                    value={findAcc(globalAccs.insuranceReceivableAccountId)}
                    onChange={v => updateGlobalAcc({ insuranceReceivableAccountId: v?.id ?? null })}
                  />
                  <AccPicker
                    label="حساب إيرادات المختبر"
                    value={findAcc(globalAccs.labRevenueAccountId)}
                    onChange={v => updateGlobalAcc({ labRevenueAccountId: v?.id ?? null })}
                  />
                </Stack>
              </Paper>

              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>حسابات الصندوق والبنك لكل مستخدم</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  حدد حساب الصندوق والبنك لكل مستخدم — تُستخدم في قيود تحصيل الإيرادات وصرف حقوق الأطباء، يُحفظ تلقائياً عند كل اختيار
                </Typography>
                <TextField
                  size="small" fullWidth placeholder="بحث باسم المستخدم..."
                  value={usersSearch}
                  onChange={e => setUsersSearch(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Stack spacing={2}>
                  {usersList.filter(u => u.name.toLowerCase().includes(usersSearch.toLowerCase())).map(u => {
                    const accs    = allUserAccs[u.id] ?? { cashBoxAccountId: null, bankAccountId: null }
                    const isSaving = savingUserId === u.id
                    return (
                      <Box key={u.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {u.name}
                            <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary', fontSize: 12, ml: 1 }}>
                              @{u.username} · #{u.id}
                            </Box>
                          </Typography>
                          {isSaving && <CircularProgress size={14} />}
                          {!isSaving && isUserAccountsComplete(accs) && (
                            <Typography variant="caption" color="success.main">✓ مكتمل</Typography>
                          )}
                        </Box>
                        <Stack spacing={1.5}>
                          <AccPicker
                            label="حساب الصندوق (كاش)"
                            value={findAcc(accs.cashBoxAccountId)}
                            onChange={v => updateUserAcc(u.id, { cashBoxAccountId: v?.id ?? null })}
                          />
                          <AccPicker
                            label="حساب البنك / الشبكة"
                            value={findAcc(accs.bankAccountId)}
                            onChange={v => updateUserAcc(u.id, { bankAccountId: v?.id ?? null })}
                          />
                        </Stack>
                      </Box>
                    )
                  })}
                  {usersList.length === 0 && !tab1Loading && (
                    <Typography variant="body2" color="text.secondary">لا يوجد مستخدمون.</Typography>
                  )}
                  {usersList.length > 0 && usersSearch && !usersList.some(u => u.name.toLowerCase().includes(usersSearch.toLowerCase())) && (
                    <Typography variant="body2" color="text.secondary">لا توجد نتائج للبحث.</Typography>
                  )}
                </Stack>
              </Paper>
            </>
          )}
        </Stack>
      )}
    </Stack>
  )
}
