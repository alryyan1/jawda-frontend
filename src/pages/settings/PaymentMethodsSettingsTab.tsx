import { useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Paper, Stack, Switch, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod,
} from '@/services/paymentMethodService'
import type { PaymentMethod, PaymentMethodFormData } from '@/types/paymentMethods'

const QUERY_KEY = ['paymentMethods', 'all']

export default function PaymentMethodsSettingsTab() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null)

  const { data: methods = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getPaymentMethods(false),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: ['paymentMethods', 'active'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: PaymentMethodFormData) => createPaymentMethod(data),
    onSuccess: () => {
      toast.success('تم إضافة طريقة الدفع')
      setIsAddOpen(false)
      setNewName('')
      setNewCode('')
      invalidate()
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message || 'فشل إضافة طريقة الدفع'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updatePaymentMethod(id, { is_active }),
    onSuccess: () => {
      invalidate()
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message || 'فشل تحديث طريقة الدفع'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePaymentMethod(id),
    onSuccess: () => {
      toast.success('تم حذف طريقة الدفع')
      setDeleteTarget(null)
      invalidate()
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'فشل حذف طريقة الدفع')
      setDeleteTarget(null)
    },
  })

  const handleAdd = () => {
    if (!newName.trim() || !newCode.trim()) {
      toast.error('يرجى إدخال الاسم والرمز')
      return
    }
    createMutation.mutate({ name: newName.trim(), code: newCode.trim() })
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>طرق الدفع</Typography>
            <Typography variant="body2" color="text.secondary">
              تُستخدم عند تحصيل المدفوعات في استقبال المختبر والعيادات. يمكن تفعيل أو تعطيل أي طريقة، وإضافة طرق جديدة.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsAddOpen(true)}>
            إضافة طريقة دفع
          </Button>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الاسم</TableCell>
                  <TableCell>الرمز</TableCell>
                  <TableCell align="center">مفعّلة</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {methods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell>{method.name}</TableCell>
                    <TableCell>
                      <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: 13, color: 'text.secondary' }}>
                        {method.code}
                      </Typography>
                      {method.is_default && (
                        <Chip label="افتراضية" size="small" sx={{ ml: 1 }} color="primary" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={method.is_default ? 'لا يمكن تعطيل طريقة الدفع الافتراضية' : ''}>
                        <span>
                          <Switch
                            checked={method.is_active}
                            disabled={method.is_default || toggleActiveMutation.isPending}
                            onChange={(e) =>
                              toggleActiveMutation.mutate({ id: method.id, is_active: e.target.checked })
                            }
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={method.is_default ? 'لا يمكن حذف طريقة الدفع الافتراضية' : 'حذف'}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={method.is_default}
                            onClick={() => setDeleteTarget(method)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {methods.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        لا توجد طرق دفع
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add dialog */}
      <Dialog open={isAddOpen} onClose={() => setIsAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة طريقة دفع</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="الاسم"
              placeholder="مثال: فوري"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="الرمز (بالإنجليزية)"
              placeholder="مثال: fawry"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              fullWidth
              helperText="يستخدم داخلياً فقط، بحروف إنجليزية صغيرة بدون مسافات"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddOpen(false)} disabled={createMutation.isPending}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={createMutation.isPending}
            startIcon={createMutation.isPending ? <CircularProgress size={16} /> : undefined}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>حذف طريقة الدفع</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            هل تريد حذف طريقة الدفع "{deleteTarget?.name}"؟ إذا كانت مستخدمة في عمليات دفع سابقة سيتم رفض الحذف — يمكنك تعطيلها بدلاً من ذلك.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>إلغاء</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} /> : undefined}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
