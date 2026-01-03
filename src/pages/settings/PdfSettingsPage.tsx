import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  CircularProgress,
  Button,
} from "@mui/material";
import { FileText, Upload, X } from "lucide-react";
import { useForm, Controller, useWatch } from "react-hook-form";
import {
  getPdfSettings,
  updatePdfSettings,
  uploadLogo,
  uploadHeader,
  deleteLogo,
  deleteHeader,
} from "@/services/pdfSettingService";
import type { PdfSetting, PdfSettingFormData } from "@/types/pdfSettings";

const PdfSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);

  const { data: settings, isLoading } = useQuery<PdfSetting>({
    queryKey: ["pdfSettings"],
    queryFn: getPdfSettings,
  });

  const { control, handleSubmit, reset } = useForm<PdfSettingFormData>({
    defaultValues: {
      font_family: "Amiri",
      font_size: 10,
      logo_width: null,
      logo_height: null,
      logo_position: "right",
      hospital_name: null,
      footer_phone: null,
      footer_address: null,
      footer_email: null,
    },
  });

  const watchedLogoWidth = useWatch({ control, name: "logo_width" });
  const watchedLogoHeight = useWatch({ control, name: "logo_height" });

  useEffect(() => {
    if (settings) {
      reset({
        font_family: settings.font_family || "Amiri",
        font_size: settings.font_size || 10,
        logo_width: settings.logo_width,
        logo_height: settings.logo_height,
        logo_position: settings.logo_position || "right",
        hospital_name: settings.hospital_name || null,
        footer_phone: settings.footer_phone || null,
        footer_address: settings.footer_address || null,
        footer_email: settings.footer_email || null,
      });
      if (settings.logo_url) {
        setLogoPreview(settings.logo_url);
      } else if (settings.logo_path) {
        setLogoPreview(settings.logo_path);
      }
      if (settings.header_image_url) {
        setHeaderPreview(settings.header_image_url);
      } else if (settings.header_image_path) {
        setHeaderPreview(settings.header_image_path);
      }
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: PdfSettingFormData) => updatePdfSettings(data),
    onSuccess: () => {
      toast.success("تم تحديث إعدادات PDF بنجاح");
      queryClient.invalidateQueries({ queryKey: ["pdfSettings"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل تحديث إعدادات PDF");
    },
  });

  const logoUploadMutation = useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: (data) => {
      toast.success("تم رفع الشعار بنجاح");
      queryClient.invalidateQueries({ queryKey: ["pdfSettings"] });
      setLogoFile(null);
      // Update preview with the new logo URL from server
      if (data.logo_url) {
        setLogoPreview(data.logo_url);
      } else if (data.logo_path) {
        setLogoPreview(data.logo_path);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل رفع الشعار");
      setLogoFile(null);
    },
  });

  const headerUploadMutation = useMutation({
    mutationFn: (file: File) => uploadHeader(file),
    onSuccess: (data) => {
      toast.success("تم رفع صورة الهيدر بنجاح");
      queryClient.invalidateQueries({ queryKey: ["pdfSettings"] });
      setHeaderFile(null);
      // Update preview with the new header image URL from server
      if (data.header_image_url) {
        setHeaderPreview(data.header_image_url);
      } else if (data.header_image_path) {
        setHeaderPreview(data.header_image_path);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل رفع صورة الهيدر");
      setHeaderFile(null);
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => deleteLogo(),
    onSuccess: () => {
      toast.success("تم حذف الشعار بنجاح");
      queryClient.invalidateQueries({ queryKey: ["pdfSettings"] });
      setLogoPreview(null);
      setLogoFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل حذف الشعار");
    },
  });

  const deleteHeaderMutation = useMutation({
    mutationFn: () => deleteHeader(),
    onSuccess: () => {
      toast.success("تم حذف صورة الهيدر بنجاح");
      queryClient.invalidateQueries({ queryKey: ["pdfSettings"] });
      setHeaderPreview(null);
      setHeaderFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل حذف صورة الهيدر");
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("حجم الملف يجب أن يكون أقل من 2 ميجابايت");
        return;
      }
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        toast.error("نوع الملف غير مدعوم. يرجى اختيار صورة (JPG, PNG, WebP)");
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
        toast.error("حجم الملف يجب أن يكون أقل من 2 ميجابايت");
        return;
      }
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        toast.error("نوع الملف غير مدعوم. يرجى اختيار صورة (JPG, PNG, WebP)");
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <FileText size={28} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          إعدادات PDF
        </Typography>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="إعدادات الخط"
            subheader="تخصيص الخط وحجم الخط المستخدم في ملفات PDF"
          />
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3,
              }}
            >
              <Controller
                name="font_family"
                control={control}
                rules={{ required: "اسم الخط مطلوب" }}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth error={!!fieldState.error}>
                    <InputLabel>اسم الخط</InputLabel>
                    <Select {...field} label="اسم الخط">
                      <MenuItem value="Amiri">Amiri</MenuItem>
                      <MenuItem value="Arial">Arial</MenuItem>
                      <MenuItem value="Helvetica">Helvetica</MenuItem>
                      <MenuItem value="Times-Roman">Times-Roman</MenuItem>
                      <MenuItem value="Courier">Courier</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
              <Controller
                name="font_size"
                control={control}
                rules={{
                  required: "حجم الخط مطلوب",
                  min: { value: 6, message: "الحد الأدنى 6" },
                  max: { value: 72, message: "الحد الأقصى 72" },
                }}
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
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardHeader title="الشعار" subheader="رفع وتخصيص شعار المستشفى" />
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                gap: 3,
              }}
            >
              <Box sx={{ gridColumn: { xs: "1", md: "1 / 3" } }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  رفع الشعار
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleLogoChange}
                    style={{ display: "none" }}
                    id="logo-upload"
                  />
                  <Button
                    variant="outlined"
                    component="label"
                    htmlFor="logo-upload"
                    startIcon={<Upload size={16} />}
                    disabled={logoUploadMutation.isPending}
                  >
                    اختر ملف
                  </Button>
                  {logoFile && (
                    <Button
                      variant="contained"
                      startIcon={
                        logoUploadMutation.isPending ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Upload size={16} />
                        )
                      }
                      onClick={handleLogoUpload}
                      disabled={logoUploadMutation.isPending}
                    >
                      رفع
                    </Button>
                  )}
                  {(settings?.logo_path || settings?.logo_url) && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<X size={16} />}
                      onClick={() => deleteLogoMutation.mutate()}
                      disabled={deleteLogoMutation.isPending}
                    >
                      حذف
                    </Button>
                  )}
                </Box>
                {(logoPreview || settings?.logo_url || settings?.logo_path) && (
                  <Box sx={{ mt: 2 }}>
                    <img
                      src={
                        logoPreview ||
                        settings?.logo_url ||
                        settings?.logo_path ||
                        ""
                      }
                      alt="Logo Preview"
                      style={{
                        width: watchedLogoWidth
                          ? `${watchedLogoWidth}mm`
                          : "auto",
                        height: watchedLogoHeight
                          ? `${watchedLogoHeight}mm`
                          : "auto",
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </Box>
                )}
              </Box>
              <Controller
                name="logo_width"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="عرض الشعار (مم)"
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    value={field.value ?? ""}
                  />
                )}
              />
              <Controller
                name="logo_height"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="ارتفاع الشعار (مم)"
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    value={field.value ?? ""}
                  />
                )}
              />
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
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="صورة الهيدر"
            subheader="رفع صورة الهيدر (عرض كامل للصفحة)"
          />
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              رفع صورة الهيدر
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                alignItems: "center",
                mb: 2,
              }}
            >
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleHeaderChange}
                style={{ display: "none" }}
                id="header-upload"
              />
              <Button
                variant="outlined"
                component="label"
                htmlFor="header-upload"
                startIcon={<Upload size={16} />}
                disabled={headerUploadMutation.isPending}
              >
                اختر ملف
              </Button>
              {headerFile && (
                <Button
                  variant="contained"
                  startIcon={
                    headerUploadMutation.isPending ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Upload size={16} />
                    )
                  }
                  onClick={handleHeaderUpload}
                  disabled={headerUploadMutation.isPending}
                >
                  رفع
                </Button>
              )}
              {(settings?.header_image_path || settings?.header_image_url) && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<X size={16} />}
                  onClick={() => deleteHeaderMutation.mutate()}
                  disabled={deleteHeaderMutation.isPending}
                >
                  حذف
                </Button>
              )}
            </Box>
            {(headerPreview ||
              settings?.header_image_url ||
              settings?.header_image_path) && (
              <Box sx={{ mt: 2 }}>
                <img
                  src={
                    headerPreview ||
                    settings?.header_image_url ||
                    settings?.header_image_path ||
                    ""
                  }
                  alt="Header Preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "300px",
                    objectFit: "contain",
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="معلومات المستشفى"
            subheader="إدخال معلومات المستشفى"
          />
          <CardContent>
            <Controller
              name="hospital_name"
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="اسم المستشفى"
                  {...field}
                  value={field.value ?? ""}
                />
              )}
            />
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="معلومات الفوتر"
            subheader="إدخال معلومات الفوتر (الهاتف، العنوان، البريد الإلكتروني)"
          />
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3,
              }}
            >
              <Controller
                name="footer_phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="رقم الهاتف"
                    {...field}
                    value={field.value ?? ""}
                  />
                )}
              />
              <Controller
                name="footer_email"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="البريد الإلكتروني"
                    type="email"
                    {...field}
                    value={field.value ?? ""}
                  />
                )}
              />
              <Box sx={{ gridColumn: { xs: "1", md: "1 / 3" } }}>
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
                      value={field.value ?? ""}
                    />
                  )}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box
          sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}
        >
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={updateMutation.isPending}
            startIcon={
              updateMutation.isPending ? <CircularProgress size={20} /> : null
            }
          >
            {updateMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default PdfSettingsPage;
