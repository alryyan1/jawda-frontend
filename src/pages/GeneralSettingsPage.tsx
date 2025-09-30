import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Building2, MessageSquare, Settings } from "lucide-react";
import { 
  Box, 
  Paper, 
  Typography, 
  Stack, 
  Avatar,
  IconButton,
  Chip,
  TextField,
  Button,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
  Container,
  CircularProgress
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

import type { Setting } from "@/types/settings";
import { getSettings, updateSettings } from "@/services/settingService";
import { api } from "@/lib/axios";
import apiClient from "@/services/api";
import showJsonDialog from "@/lib/showJsonDialog";
import { webUrl } from "./constants";

// Settings form data type
type SettingsFormData = {
  // Basic Information
  phone?: string;
  email?: string;
  address?: string;
  hospital_name?: string;
  lab_name?: string;
  currency?: string;
  vatin?: string;
  cr?: string;
  
  // Ultramsg WhatsApp Settings
  ultramsg_instance_id?: string;
  ultramsg_token?: string;
  ultramsg_base_url?: string;
  ultramsg_default_country_code?: string;
  
  // Lab Workflow Settings
  send_result_after_auth?: boolean;
  send_result_after_result?: boolean;
  edit_result_after_auth?: boolean;
  print_direct?: boolean;
  disable_doctor_service_check?: boolean;
  barcode?: boolean;
  show_water_mark?: boolean;
  
  // Notification Settings
  inventory_notification_number?: string;
  welcome_message?: string;
  send_welcome_message?: boolean;
  
  // Report Settings
  is_header?: boolean;
  is_footer?: boolean;
  is_logo?: boolean;
  header_content?: string;
  footer_content?: string;
  report_header_company_name?: string;
  report_header_address_line1?: string;
  report_header_address_line2?: string;
  report_header_phone?: string;
  report_header_email?: string;
  report_header_vatin?: string;
  report_header_cr?: string;
  default_lab_report_template?: string;
  // Report assets (paths in storage)
  header_base64?: string;
  footer_base64?: string;
};

const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");

  const {
    data: settings,
    isLoading: isLoadingSettings,
    isError,
    error,
  } = useQuery<Setting | null, Error>({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const form = useForm<SettingsFormData>({
    defaultValues: {
      // Basic Information
      phone: undefined,
      email: undefined,
      address: undefined,
      hospital_name: undefined,
      lab_name: undefined,
      currency: undefined,
      vatin: undefined,
      cr: undefined,
      
      // Ultramsg WhatsApp Settings
      ultramsg_instance_id: undefined,
      ultramsg_token: undefined,
      ultramsg_base_url: undefined,
      ultramsg_default_country_code: undefined,
      
      // Lab Workflow Settings
      send_result_after_auth: undefined,
      send_result_after_result: undefined,
      edit_result_after_auth: undefined,
      print_direct: undefined,
      disable_doctor_service_check: undefined,
      barcode: undefined,
      show_water_mark: undefined,
      
      // Notification Settings
      inventory_notification_number: undefined,
      welcome_message: undefined,
      send_welcome_message: undefined,
      
      // Report Settings
      is_header: undefined,
      is_footer: undefined,
      is_logo: undefined,
      header_content: undefined,
      footer_content: undefined,
      report_header_company_name: undefined,
      report_header_address_line1: undefined,
      report_header_address_line2: undefined,
      report_header_phone: undefined,
      report_header_email: undefined,
      report_header_vatin: undefined,
      report_header_cr: undefined,
      default_lab_report_template: undefined,
      header_base64: undefined,
      footer_base64: undefined,
    },
  });
  const { control, handleSubmit, reset, watch } = form;
  const { setValue } = form;
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [footerPreview, setFooterPreview] = useState<string | null>(null);

  // Watch form values for immediate updates
  const watchedValues = watch();
  // showJsonDialog(watchedValues);
  console.log(`${webUrl}${watchedValues.header_base64}`);
  useEffect(() => {
    if (settings) {
      reset({
        // Basic Information
        phone: settings.phone?.toString() || undefined,
        email: settings.email || undefined,
        address: settings.address || undefined,
        hospital_name: settings.hospital_name || undefined,
        lab_name: settings.lab_name || undefined,
        currency: settings.currency || undefined,
        vatin: settings.vatin || undefined,
        cr: settings.cr || undefined,
        
        // Ultramsg WhatsApp Settings
        ultramsg_instance_id: settings.ultramsg_instance_id || undefined,
        ultramsg_token: settings.ultramsg_token || undefined,
        ultramsg_base_url: settings.ultramsg_base_url || undefined,
        ultramsg_default_country_code: settings.ultramsg_default_country_code || undefined,
        
        // Lab Workflow Settings
        send_result_after_auth: settings.send_result_after_auth || undefined,
        send_result_after_result: settings.send_result_after_result || undefined,
        edit_result_after_auth: settings.edit_result_after_auth || undefined,
        print_direct: settings.print_direct || undefined,
        disable_doctor_service_check: settings.disable_doctor_service_check || undefined,
        barcode: settings.barcode || undefined,
        show_water_mark: settings.show_water_mark || undefined,
        
        // Notification Settings
        inventory_notification_number: settings.inventory_notification_number || undefined,
        welcome_message: settings.welcome_message || undefined,
        send_welcome_message: settings.send_welcome_message || undefined,
        
        // Report Settings
        is_header: settings.is_header || undefined,
        is_footer: settings.is_footer || undefined,
        is_logo: settings.is_logo || undefined,
        header_content: settings.header_content || undefined,
        footer_content: settings.footer_content || undefined,
        report_header_company_name: settings.report_header_company_name || undefined,
        report_header_address_line1: settings.report_header_address_line1 || undefined,
        report_header_address_line2: settings.report_header_address_line2 || undefined,
        report_header_phone: settings.report_header_phone || undefined,
        report_header_email: settings.report_header_email || undefined,
        report_header_vatin: settings.report_header_vatin || undefined,
        report_header_cr: settings.report_header_cr || undefined,
        default_lab_report_template: settings.default_lab_report_template || undefined,
        header_base64: (settings as Setting & { header_base64?: string }).header_base64 || undefined,
        footer_base64: (settings as Setting & { footer_base64?: string }).footer_base64 || undefined,
      });
    }
  }, [settings, reset]);

  const mutation = useMutation<Setting, Error, SettingsFormData>({
    mutationFn: async (data) => {
      return updateSettings(data as Setting);
    },
    onSuccess: (updatedSettings) => {
      toast.success("تم حفظ الإعدادات بنجاح");
      queryClient.setQueryData(["settings"], updatedSettings);
    },
    onError: (error: Error) => {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || error?.message || "فشل حفظ الإعدادات";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    // All fields are now optional, so we can save without validation
    mutation.mutate(data);
  };

  // Upload helper for report header/footer assets
  const uploadSettingAsset = async (field: 'header_base64' | 'footer_base64', file: File) => {
    // Show preview immediately
    const localUrl = URL.createObjectURL(file);
    if (field === 'header_base64') setHeaderPreview(localUrl);
    if (field === 'footer_base64') setFooterPreview(localUrl);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('field', field);
    try {
      const res = await apiClient.post('/settings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data;
      const path: string = data?.path || data?.url || '';
      if (!path) throw new Error('Invalid upload response');
      setValue(field, path);
      await mutation.mutateAsync({ [field]: path } as unknown as SettingsFormData);
      toast.success(field === 'header_base64' ? 'تم رفع ترويسة التقرير' : 'تم رفع تذييل التقرير');
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = error?.response?.data?.message || error?.message || 'فشل رفع الملف';
      toast.error(msg);
      // Clear preview on error
      if (field === 'header_base64') setHeaderPreview(null);
      if (field === 'footer_base64') setFooterPreview(null);
    }
  };

  if (isLoadingSettings)
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress />
            <Typography>جاري تحميل الإعدادات...</Typography>
          </Stack>
        </Box>
      </Container>
    );

  if (isError || !settings)
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box textAlign="center" color="error.main">
          <Typography variant="h6" gutterBottom>فشل جلب الإعدادات</Typography>
          <Typography variant="body2" component="pre">
            {error?.message}
          </Typography>
        </Box>
      </Container>
    );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          الإعدادات العامة
        </Typography>
        <Typography variant="body1" color="text.secondary">
          إدارة جميع إعدادات النظام والمختبر
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Paper elevation={1} sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              value="basic" 
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Building2 size={16} />
                  <span>الأساسية</span>
                </Stack>
              } 
            />
            <Tab 
              value="whatsapp" 
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <MessageSquare size={16} />
                  <span>واتساب</span>
                </Stack>
              } 
            />
            <Tab 
              value="workflow" 
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Settings size={16} />
                  <span>سير العمل</span>
                </Stack>
              } 
            />
          </Tabs>
        </Paper>

            {/* Basic Information Tab */}
        {activeTab === "basic" && (
          <Stack spacing={3}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                المعلومات الأساسية
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                المعلومات الأساسية للمستشفى والمختبر
              </Typography>
              
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                  <TextField
                    {...control.register("phone")}
                    label="رقم الهاتف"
                    placeholder="0xxxxxxxxx"
                    fullWidth
                    variant="outlined"
                  />
                  <TextField
                    {...control.register("email")}
                    label="البريد الإلكتروني"
                    type="email"
                    placeholder="example@mail.com"
                    fullWidth
                    variant="outlined"
                  />
                </Stack>
                
                <TextField
                  {...control.register("address")}
                  label="العنوان"
                  placeholder="العنوان الكامل"
                  fullWidth
                  variant="outlined"
                />
                
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                  <TextField
                    {...control.register("hospital_name")}
                    label="اسم المستشفى"
                    placeholder="اسم المستشفى"
                    fullWidth
                    variant="outlined"
                  />
                  <TextField
                    {...control.register("lab_name")}
                    label="اسم المختبر"
                    placeholder="اسم المختبر"
                    fullWidth
                    variant="outlined"
                  />
                </Stack>
                
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                  <TextField
                    {...control.register("currency")}
                    label="العملة"
                    placeholder="SDG"
                    fullWidth
                    variant="outlined"
                  />
                  <TextField
                    {...control.register("vatin")}
                    label="الرقم الضريبي"
                    placeholder="الرقم الضريبي"
                    fullWidth
                    variant="outlined"
                  />
                  <TextField
                    {...control.register("cr")}
                    label="رقم السجل التجاري"
                    placeholder="رقم السجل التجاري"
                    fullWidth
                    variant="outlined"
                  />
                </Stack>
              </Stack>
            </Paper>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                ملفات تقرير المختبر
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                رفع صور الترويسة والتذييل لاستخدامها في تقارير النتائج
              </Typography>
              
              <Stack spacing={3}>
                {/* Header Image Upload */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    صورة  (Header)
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <input
                      type="file"
                      accept="image/*"
                      id="header-upload"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadSettingAsset('header_base64', file);
                      }}
                    />
                    <label htmlFor="header-upload">
                      <IconButton
                        color="primary"
                        component="span"
                        sx={{ 
                          border: '2px dashed',
                          borderColor: 'primary.main',
                          borderRadius: 2,
                          p: 2
                        }}
                      >
                        <CloudUpload sx={{ fontSize: 32 }} />
                      </IconButton>
                    </label>
                    {(headerPreview || watchedValues.header_base64) && (
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          src={headerPreview || `${webUrl}${watchedValues.header_base64}`}
                          variant="rounded"
                          sx={{ width: 80, height: 60 }}
                        />
                        <Box>
                          <Chip 
                            label="تم الرفع" 
                            color="success" 
                            size="small" 
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="caption" display="block" color="text.secondary">
                            {watchedValues.header_base64}
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                  </Stack>
                </Box>

                {/* Footer Image Upload */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    صورة الفوتر (Footer)
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                              <input
                      type="file"
                      accept="image/*"
                      id="footer-upload"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadSettingAsset('footer_base64', file);
                      }}
                    />
                    <label htmlFor="footer-upload">
                      <IconButton
                        color="primary"
                        component="span"
                        sx={{ 
                          border: '2px dashed',
                          borderColor: 'primary.main',
                          borderRadius: 2,
                          p: 2
                        }}
                      >
                        <CloudUpload sx={{ fontSize: 32 }} />
                      </IconButton>
                    </label>
                    {(footerPreview || watchedValues.footer_base64) && (
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          src={footerPreview || watchedValues.footer_base64!}
                          variant="rounded"
                          sx={{ width: 80, height: 60 }}
                        />
                        <Box>
                          <Chip 
                            label="تم الرفع" 
                            color="success" 
                            size="small" 
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="caption" display="block" color="text.secondary">
                            {watchedValues.footer_base64}
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        )}

            {/* WhatsApp Settings Tab */}
        {activeTab === "whatsapp" && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              إعدادات واتساب
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              إعدادات خدمة واتساب
            </Typography>
            
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <TextField
                  {...control.register("ultramsg_instance_id")}
                  label="instance id"
                  placeholder="instance140877"
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  {...control.register("ultramsg_token")}
                  label="token"
                  type="password"
                  placeholder="df2r46jz82otkegg"
                  fullWidth
                  variant="outlined"
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <TextField
                  {...control.register("ultramsg_base_url")}
                  label="رابط الخدمة"
                  placeholder="https://api.ultramsg.com"
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  {...control.register("ultramsg_default_country_code")}
                  label="رمز الدولة الافتراضي"
                  placeholder="249"
                  fullWidth
                  variant="outlined"
                />
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* Workflow Settings Tab */}
        {activeTab === "workflow" && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              إعدادات سير العمل
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              إعدادات تدفق العمل والرسائل
            </Typography>
            
            <Stack spacing={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    {...control.register("send_welcome_message")}
                    checked={!!watchedValues.send_welcome_message}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      إرسال رسالة ترحيبية تلقائياً
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                                عند تفعيل هذا الخيار سيتم إرسال رسالة ترحيبية عند تسجيل زيارة جديدة
                    </Typography>
                  </Box>
                }
              />
              
              <TextField
                {...control.register("welcome_message")}
                label="نص الرسالة الترحيبية"
                            placeholder="مرحباً {name}، نرحب بكم في مستشفى {hospital}. تم تسجيل زيارتكم بنجاح."
                multiline
                rows={8}
                fullWidth
                variant="outlined"
                helperText="يمكنك استخدام المتغيرات: {name} ، {hospital}"
              />
            </Stack>
          </Paper>
        )}

        <Box display="flex" justifyContent="flex-end" pt={3}>
          <Button 
            type="submit" 
            variant="contained" 
            size="large"
            disabled={mutation.isPending}
            startIcon={mutation.isPending ? <CircularProgress size={20} /> : null}
          >
              حفظ الإعدادات
            </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default SettingsPage;
