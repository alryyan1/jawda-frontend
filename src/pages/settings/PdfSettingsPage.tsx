import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Grid,
  Typography,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { FileText, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import {
  getPdfSettings,
  updatePdfSettings,
  uploadLogo,
  uploadHeader,
  deleteLogo,
  deleteHeader,
} from '@/services/pdfSettingService';
import type { PdfSetting, PdfSettingFormData } from '@/types/pdfSettings';

const PdfSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);

  const { data: settings, isLoading } = useQuery<PdfSetting>({
    queryKey: ['pdfSettings'],
    queryFn: getPdfSettings,
  });

  const { control, handleSubmit, reset, watch } = useForm<PdfSettingFormData>({
    defaultValues: {
      font_family: 'Amiri',
      font_size: 10,
      logo_width: null,
      logo_height: null,
      logo_position: 'right',
      hospital_name: null,
      footer_phone: null,
      footer_address: null,
      footer_email: null,
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        font_family: settings.font_family || 'Amiri',
        font_size: settings.font_size || 10,
        logo_width: settings.logo_width,
        logo_height: settings.logo_height,
        logo_position: settings.logo_position || 'right',
        hospital_name: settings.hospital_name || null,
        footer_phone: settings.footer_phone || null,
        footer_address: settings.footer_address || null,
        footer_email: settings.footer_email || null,
      });
      if (settings.logo_url) {
        setLogoPreview(settings.logo_url);
      }
      if (settings.header_image_url) {
        setHeaderPreview(settings.header_image_url);
      }
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: PdfSettingFormData) => updatePdfSettings(data),
    onSuccess: () => {
      toast.success('تم تحديث إعدادات PDF بنجاح');
      queryClient.invalidateQueries({ queryKey: ['pdfSettings'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل تحديث إعدادات PDF');
    },
  });

  const logoUploadMutation = useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: () => {
      toast.success('تم رفع الشعار بنجاح');
      queryClient.invalidateQueries({ queryKey: ['pdfSettings'] });
      setLogoFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل رفع الشعار');
    },
  });

  const headerUploadMutation = useMutation({
    mutationFn: (file: File) => uploadHeader(file),
    onSuccess: () => {
      toast.success('تم رفع صورة الهيدر بنجاح');
      queryClient.invalidateQueries({ queryKey: ['pdfSettings'] });
      setHeaderFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل رفع صورة الهيدر');
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => deleteLogo(),
    onSuccess: () => {
      toast.success('تم حذف الشعار بنجاح');
      queryClient.invalidateQueries({ queryKey: ['pdfSettings'] });
      setLogoPreview(null);
      setLogoFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حذف الشعار');
    },
  });

  const deleteHeaderMutation = useMutation({
    mutationFn: () => deleteHeader(),
    onSuccess: () => {
      toast.success('تم حذف صورة الهيدر بنجاح');
      queryClient.invalidateQueries({ queryKey: ['pdfSettings'] });
      setHeaderPreview(null);
      setHeaderFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حذف صورة الهيدر');
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 2 ميجابايت');
        return;
      }
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        toast.error('نوع الملف غير مدعوم. يرجى اختيار صورة (JPG, PNG, WebP)');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 2 ميجابايت');
        return;
      }
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        toast.error('نوع الملف غير مدعوم. يرجى اختيار صورة (JPG, PNG, WebP)');
        return;
      }
      setHeaderFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeaderPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      logoUploadMutation.mutate(logoFile);
    }
  };

  const handleHeaderUpload = () => {
    if (headerFile) {
      headerUploadMutation.mutate(headerFile);
    }
  };

  const onSubmit = (data: PdfSettingFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">إعدادات PDF</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>إعدادات الخط</CardTitle>
            <CardDescription>تخصيص الخط وحجم الخط المستخدم في ملفات PDF</CardDescription>
          </CardHeader>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="font_family"
                  control={control}
                  rules={{ required: 'اسم الخط مطلوب' }}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth error={!!fieldState.error}>
                      <InputLabel>اسم الخط</InputLabel>
                      <Select {...field} label="اسم الخط">
                        <MenuItem value="Amiri">Amiri</MenuItem>
                        <MenuItem value="Helvetica">Helvetica</MenuItem>
                        <MenuItem value="Times-Roman">Times-Roman</MenuItem>
                        <MenuItem value="Courier">Courier</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="font_size"
                  control={control}
                  rules={{ required: 'حجم الخط مطلوب', min: { value: 6, message: 'الحد الأدنى 6' }, max: { value: 72, message: 'الحد الأقصى 72' } }}
                  render={({ field, fieldState }) => (
                    <TextField
                      fullWidth
                      label="حجم الخط"
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>الشعار</CardTitle>
            <CardDescription>رفع وتخصيص شعار المستشفى</CardDescription>
          </CardHeader>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    رفع الشعار
                  </Typography>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleLogoChange}
                    style={{ display: 'none' }}
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<Upload size={16} />}
                      disabled={logoUploadMutation.isPending}
                    >
                      اختر ملف
                    </Button>
                  </label>
                  {logoFile && (
                    <Button
                      variant="contained"
                      startIcon={<Upload size={16} />}
                      onClick={handleLogoUpload}
                      disabled={logoUploadMutation.isPending}
                      sx={{ ml: 2 }}
                    >
                      {logoUploadMutation.isPending ? <CircularProgress size={16} /> : 'رفع'}
                    </Button>
                  )}
                  {settings?.logo_path && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<X size={16} />}
                      onClick={() => deleteLogoMutation.mutate()}
                      disabled={deleteLogoMutation.isPending}
                      sx={{ ml: 2 }}
                    >
                      حذف
                    </Button>
                  )}
                </Box>
                {(logoPreview || settings?.logo_url) && (
                  <Box sx={{ mt: 2 }}>
                    <img
                      src={logoPreview || settings?.logo_url || ''}
                      alt="Logo Preview"
                      style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                    />
                  </Box>
                )}
              </Grid>
              <Grid item xs={12} md={3}>
                <Controller
                  name="logo_width"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="عرض الشعار (مم)"
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Controller
                  name="logo_height"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="ارتفاع الشعار (مم)"
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="logo_position"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>موضع الشعار</InputLabel>
                      <Select {...field} label="موضع الشعار">
                        <MenuItem value="left">يسار</MenuItem>
                        <MenuItem value="right">يمين</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>صورة الهيدر</CardTitle>
            <CardDescription>رفع صورة الهيدر (عرض كامل للصفحة)</CardDescription>
          </CardHeader>
          <CardContent>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                رفع صورة الهيدر
              </Typography>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleHeaderChange}
                style={{ display: 'none' }}
                id="header-upload"
              />
              <label htmlFor="header-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<Upload size={16} />}
                  disabled={headerUploadMutation.isPending}
                >
                  اختر ملف
                </Button>
              </label>
              {headerFile && (
                <Button
                  variant="contained"
                  startIcon={<Upload size={16} />}
                  onClick={handleHeaderUpload}
                  disabled={headerUploadMutation.isPending}
                  sx={{ ml: 2 }}
                >
                  {headerUploadMutation.isPending ? <CircularProgress size={16} /> : 'رفع'}
                </Button>
              )}
              {settings?.header_image_path && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<X size={16} />}
                  onClick={() => deleteHeaderMutation.mutate()}
                  disabled={deleteHeaderMutation.isPending}
                  sx={{ ml: 2 }}
                >
                  حذف
                </Button>
              )}
            </Box>
            {(headerPreview || settings?.header_image_url) && (
              <Box sx={{ mt: 2 }}>
                <img
                  src={headerPreview || settings?.header_image_url || ''}
                  alt="Header Preview"
                  style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>معلومات المستشفى</CardTitle>
            <CardDescription>إدخال معلومات المستشفى</CardDescription>
          </CardHeader>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Controller
                  name="hospital_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="اسم المستشفى"
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>معلومات الفوتر</CardTitle>
            <CardDescription>إدخال معلومات الفوتر (الهاتف، العنوان، البريد الإلكتروني)</CardDescription>
          </CardHeader>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Controller
                  name="footer_phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="رقم الهاتف"
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="footer_email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="البريد الإلكتروني"
                      type="email"
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="footer_address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="العنوان"
                      multiline
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <CircularProgress size={20} /> : 'حفظ الإعدادات'}
          </Button>
        </Box>
      </form>
    </div>
  );
};

export default PdfSettingsPage;

