import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  InputAdornment, Paper, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CloudUploadIcon        from '@mui/icons-material/CloudUpload'
import LinkOffIcon            from '@mui/icons-material/LinkOff'
import LocalHospitalIcon      from '@mui/icons-material/LocalHospital'
import SettingsIcon           from '@mui/icons-material/Settings'
import { toast } from 'sonner'
import {
  type FinanceAccount, type FinanceConnection, type FinanceParty,
  type FinanceGlobalAccounts, type FinanceUserAccounts,
  DEFAULT_GLOBAL,
  loadConnection,
  isGlobalComplete, isUserAccountsComplete,
  importAccountsFromFinanceApi, importPartiesFromFinanceApi, syncDoctorsAsParties,
  fetchFinanceAccounts, fetchFinanceParties,
  fetchGlobalJournalSettings, saveGlobalJournalSettings,
  fetchUserJournalAccounts, saveUserJournalAccounts,
  fetchDoctorPartyMappings, saveDoctorPartyMapping,
} from '@/services/financeFirebaseService'
import apiClient from '@/services/api'
import { getUsersList } from '@/services/userService'
import type { DoctorStripped } from '@/types/doctors'


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

// ── helpers ───────────────────────────────────────────────────────────────────

async function fetchAllDoctors(): Promise<DoctorStripped[]> {
  const all: DoctorStripped[] = []
  let page = 1
  while (true) {
    const res = await apiClient.get<{ data: DoctorStripped[]; meta: { current_page: number; last_page: number } }>(
      '/doctors', { params: { page }, skipAuthRedirect: true, suppressToast: true } as any,
    )
    all.push(...(res.data?.data ?? []))
    if (page >= (res.data?.meta?.last_page ?? 1)) break
    page++
  }
  return all
}

// ── component ─────────────────────────────────────────────────────────────────

export default function FinanceSettingsTab() {
  const [activeTab, setActiveTab] = useState(0)

  // ── shared data (accounts + parties loaded from Firestore) ────────────────
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [parties,  setParties]  = useState<FinanceParty[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const loadSharedData = async () => {
    setDataLoading(true)
    try {
      const [accs, parts] = await Promise.all([fetchFinanceAccounts(), fetchFinanceParties()])
      setAccounts(accs)
      // exclude auto-synced doctor_X entries — only show imported finance-api parties
      setParties(parts.filter(p => /^\d+$/.test(p.id)))
    } catch { /* Firebase may not be configured yet */ }
    finally { setDataLoading(false) }
  }

  useEffect(() => { loadSharedData() }, [])

  // ── Tab 0: import ─────────────────────────────────────────────────────────
  const [conn,            setConn]            = useState<FinanceConnection>(loadConnection)
  const [importingAccs,   setImportingAccs]   = useState(false)
  const [importingParties, setImportingParties] = useState(false)
  const [syncingDoctors,  setSyncingDoctors]  = useState(false)
  const [importedAccsCount,   setImportedAccsCount]   = useState<number | null>(null)
  const [importedPartiesCount, setImportedPartiesCount] = useState<number | null>(null)
  const [syncedDoctorsCount,  setSyncedDoctorsCount]  = useState<number | null>(null)

  const handleImportAccounts = async () => {
    setImportingAccs(true)
    try {
      const n = await importAccountsFromFinanceApi(conn)
      setImportedAccsCount(n)
      toast.success(`تم استيراد ${n} حساب إلى Firebase`)
      loadSharedData()
    } catch (e: unknown) {
      toast.error(`فشل استيراد الحسابات — ${(e as Error).message}`)
    } finally { setImportingAccs(false) }
  }

  const handleImportParties = async () => {
    setImportingParties(true)
    try {
      const n = await importPartiesFromFinanceApi(conn)
      setImportedPartiesCount(n)
      toast.success(`تم استيراد ${n} طرف إلى Firebase`)
      loadSharedData()
    } catch (e: unknown) {
      toast.error(`فشل استيراد الأطراف — ${(e as Error).message}`)
    } finally { setImportingParties(false) }
  }

  const handleSyncDoctors = async () => {
    setSyncingDoctors(true)
    try {
      const doctors = await fetchAllDoctors()
      const n = await syncDoctorsAsParties(doctors)
      setSyncedDoctorsCount(n)
      toast.success(`تم مزامنة ${n} طبيب كأطراف في Firebase`)
      loadSharedData()
    } catch (e: unknown) {
      toast.error(`فشل مزامنة الأطباء — ${(e as Error).message}`)
    } finally { setSyncingDoctors(false) }
  }

  // ── Tab 1: key accounts ───────────────────────────────────────────────────
  const [globalAccs,   setGlobalAccs]   = useState<FinanceGlobalAccounts>(DEFAULT_GLOBAL)
  const [tab1Loading,  setTab1Loading]  = useState(false)
  const [savingGlobal, setSavingGlobal] = useState(false)

  // per-user accounts: userId → FinanceUserAccounts
  const [usersList,    setUsersList]    = useState<{ id: number; name: string }[]>([])
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

  const handleSaveGlobal = async () => {
    setSavingGlobal(true)
    try {
      await saveGlobalJournalSettings(globalAccs)
      toast.success('تم حفظ الحسابات الرئيسية')
    } catch { toast.error('فشل الحفظ') }
    finally { setSavingGlobal(false) }
  }

  const handleSaveUserAccs = async (userId: number) => {
    const accs = allUserAccs[userId]
    if (!accs) return
    setSavingUserId(userId)
    try {
      await saveUserJournalAccounts(userId, accs)
      toast.success('تم الحفظ')
    } catch { toast.error('فشل الحفظ') }
    finally { setSavingUserId(null) }
  }

  const setUserAccs = (userId: number, patch: Partial<FinanceUserAccounts>) =>
    setAllUserAccs(m => ({ ...m, [userId]: { ...m[userId], ...patch } }))

  // ── Tab 2: doctor linking ─────────────────────────────────────────────────
  const [partyMap,   setPartyMap]   = useState<Record<number, string>>({})
  const [tab2Loading, setTab2Loading] = useState(false)
  const [savingLink, setSavingLink] = useState<number | null>(null)

  useEffect(() => {
    if (activeTab !== 2) return
    setTab2Loading(true)
    fetchDoctorPartyMappings()
      .then(m => setPartyMap(m))
      .catch(() => {})
      .finally(() => setTab2Loading(false))
  }, [activeTab])

  const [localDoctors,   setLocalDoctors]   = useState<DoctorStripped[]>([])
  const [doctorsSearch,  setDoctorsSearch]  = useState('')
  useEffect(() => {
    if (activeTab !== 2) return
    fetchAllDoctors().then(setLocalDoctors).catch(() => {})
  }, [activeTab])

  const handleLinkDoctor = async (doctorId: number, party: FinanceParty | null) => {
    if (!party) return
    setSavingLink(doctorId)
    try {
      await saveDoctorPartyMapping(doctorId, party.id)
      setPartyMap(m => ({ ...m, [doctorId]: party.id }))
      toast.success('تم ربط الطبيب بالطرف')
    } catch { toast.error('فشل ربط الطبيب') }
    finally { setSavingLink(null) }
  }

  // ── shared account picker ─────────────────────────────────────────────────
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
          <Tab icon={<CloudUploadIcon fontSize="small" />}   iconPosition="start" label="استيراد البيانات" />
          <Tab icon={<SettingsIcon fontSize="small" />}      iconPosition="start" label="الحسابات الرئيسية" />
          <Tab icon={<LocalHospitalIcon fontSize="small" />} iconPosition="start" label="ربط الأطباء" />
        </Tabs>
      </Box>

      {/* ── Tab 0: Data Import ──────────────────────────────────────────── */}
      {activeTab === 0 && (
        <Stack spacing={3}>
          {/* Firestore status chips */}
          {(accounts.length > 0 || parties.length > 0) && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {accounts.length > 0 && <Chip label={`${accounts.length} حساب في Firebase`} color="success" size="small" />}
              {parties.length  > 0 && <Chip label={`${parties.length} طرف في Firebase`}   color="success" size="small" />}
            </Box>
          )}

          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>استيراد من Finance API (مرة واحدة)</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              أدخل بيانات الاتصال بـ Finance API لاستيراد الحسابات والأطراف إلى Firebase. بعد الاستيراد لن تحتاج لهذا الاتصال مجدداً.
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
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  disabled={!conn.baseUrl.trim() || !conn.token.trim() || importingAccs}
                  onClick={handleImportAccounts}
                  startIcon={importingAccs ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                  {importingAccs ? 'جاري الاستيراد...' : 'استيراد الحسابات'}
                </Button>
                <Button
                  variant="outlined"
                  disabled={!conn.baseUrl.trim() || !conn.token.trim() || importingParties}
                  onClick={handleImportParties}
                  startIcon={importingParties ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                  {importingParties ? 'جاري الاستيراد...' : 'استيراد الأطراف'}
                </Button>
              </Stack>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {importedAccsCount   != null && <Chip label={`✓ ${importedAccsCount} حساب`}   color="success" size="small" />}
                {importedPartiesCount != null && <Chip label={`✓ ${importedPartiesCount} طرف`} color="success" size="small" />}
              </Box>
            </Stack>
          </Paper>

          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>مزامنة الأطباء كأطراف</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              يُنشئ طرفاً في Firebase لكل طبيب مسجّل في جودة — يمكن تكرار هذه العملية عند إضافة أطباء جدد.
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="outlined"
                disabled={syncingDoctors}
                onClick={handleSyncDoctors}
                startIcon={syncingDoctors ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                {syncingDoctors ? 'جاري المزامنة...' : 'مزامنة الأطباء'}
              </Button>
              {syncedDoctorsCount != null && (
                <Chip label={`✓ ${syncedDoctorsCount} طبيب`} color="success" size="small" />
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
                <Typography variant="h6" gutterBottom>الحسابات الرئيسية للعيادة</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  تُستخدم في جميع قيود الأطباء تلقائياً
                </Typography>
                <Stack spacing={2}>
                  <AccPicker
                    label="حساب إيرادات العيادة *"
                    value={findAcc(globalAccs.clinicRevenueAccountId)}
                    onChange={v => setGlobalAccs(g => ({ ...g, clinicRevenueAccountId: v?.id ?? null }))}
                  />
                  <AccPicker
                    label="حساب ذمم الأطباء (الدائنون) *"
                    value={findAcc(globalAccs.doctorReceivablesAccountId)}
                    onChange={v => setGlobalAccs(g => ({ ...g, doctorReceivablesAccountId: v?.id ?? null }))}
                  />
                  <AccPicker
                    label="حساب مصروف أتعاب الأطباء *"
                    value={findAcc(globalAccs.doctorFeesExpenseAccountId)}
                    onChange={v => setGlobalAccs(g => ({ ...g, doctorFeesExpenseAccountId: v?.id ?? null }))}
                  />
                  <Box>
                    <Button
                      variant="contained"
                      disabled={!isGlobalComplete(globalAccs) || savingGlobal}
                      onClick={handleSaveGlobal}
                      startIcon={savingGlobal ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                      {savingGlobal ? 'جاري الحفظ...' : 'حفظ الحسابات الرئيسية'}
                    </Button>
                  </Box>
                </Stack>
              </Paper>

              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>حسابات الصندوق والبنك لكل مستخدم</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  حدد حساب الصندوق والبنك لكل مستخدم — تُستخدم في قيود تحصيل الإيرادات وصرف حقوق الأطباء
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
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>{u.name}</Typography>
                        <Stack spacing={1.5}>
                          <AccPicker
                            label="حساب الصندوق (كاش)"
                            value={findAcc(accs.cashBoxAccountId)}
                            onChange={v => setUserAccs(u.id, { cashBoxAccountId: v?.id ?? null })}
                          />
                          <AccPicker
                            label="حساب البنك / الشبكة"
                            value={findAcc(accs.bankAccountId)}
                            onChange={v => setUserAccs(u.id, { bankAccountId: v?.id ?? null })}
                          />
                          <Box>
                            <Button
                              size="small" variant="contained"
                              disabled={!isUserAccountsComplete(accs) || isSaving}
                              onClick={() => handleSaveUserAccs(u.id)}
                              startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : undefined}
                            >
                              {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                            </Button>
                          </Box>
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

      {/* ── Tab 2: Doctor Linking ───────────────────────────────────────── */}
      {activeTab === 2 && (
        <Stack spacing={3}>
          {(tab2Loading || dataLoading) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress /></Box>
          )}

          {parties.length === 0 && !tab2Loading && !dataLoading && (
            <Alert severity="warning">
              لا توجد أطراف في Firebase — يرجى استيراد الأطراف أو مزامنة الأطباء من تبويب "استيراد البيانات".
            </Alert>
          )}

          {parties.length > 0 && (
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>ربط الأطباء بالأطراف في نظام المحاسبة</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                حدد الطرف المقابل لكل طبيب — يُحفظ تلقائياً عند الاختيار
              </Typography>
              <TextField
                size="small" fullWidth placeholder="بحث باسم الطبيب..."
                value={doctorsSearch}
                onChange={e => setDoctorsSearch(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Stack spacing={1.5}>
                {localDoctors.filter(d => d.name.toLowerCase().includes(doctorsSearch.toLowerCase())).map(doc => {
                  const linkedPartyId = partyMap[doc.id] ?? null
                  const linkedParty   = parties.find(p => p.id === linkedPartyId) ?? null
                  const isSaving      = savingLink === doc.id
                  return (
                    <Box key={doc.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 1.5, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {doc.name}
                        {doc.specialist_name && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                            {' '}— {doc.specialist_name}
                          </Typography>
                        )}
                      </Typography>
                      <Autocomplete
                        options={parties}
                        value={linkedParty}
                        onChange={(_, v) => handleLinkDoctor(doc.id, v)}
                        getOptionLabel={p => p.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        size="small"
                        disabled={isSaving}
                        renderInput={p => <TextField {...p} placeholder="اختر الطرف..." size="small" />}
                      />
                      <Box sx={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                        {isSaving
                          ? <CircularProgress size={18} />
                          : linkedParty
                            ? <CheckCircleOutlineIcon fontSize="small" color="success" />
                            : <LinkOffIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
                      </Box>
                    </Box>
                  )
                })}
                {localDoctors.length === 0 && !tab2Loading && (
                  <Typography variant="body2" color="text.secondary">لا يوجد أطباء مسجّلون.</Typography>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      )}
    </Stack>
  )
}
