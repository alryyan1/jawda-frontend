import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Typography,
  Chip,
} from "@mui/material";
import RichTextEditor from "@/components/common/RichTextEditor";
import {
  ArrowLeft,
  CheckCircle,
  ClipboardList,
  User,
  Phone,
  Stethoscope,
  PlayCircle,
  Save,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import {
  getDiagnosisPageData,
  startDiagnosis,
  updateDiagnosis,
  openDiagnosisPdf,
} from "@/services/diagnosisService";
import { useAuth } from "@/contexts/AuthContext";

// ─── CT report default template ──────────────────────────────────────────────
const CT_REPORT_TEMPLATE = `
<h2>Clinical Information</h2>
<p></p>

<h2>Technique</h2>
<p>CT scan was performed with/without intravenous contrast.</p>

<h2>Findings</h2>

<h3>Lungs &amp; Pleura</h3>
<p></p>

<h3>Mediastinum &amp; Heart</h3>
<p></p>

<h3>Chest Wall &amp; Soft Tissues</h3>
<p></p>

<h3>Abdomen</h3>
<p></p>

<h3>Liver &amp; Biliary System</h3>
<p></p>

<h3>Spleen</h3>
<p></p>

<h3>Pancreas</h3>
<p></p>

<h3>Kidneys &amp; Adrenals</h3>
<p></p>

<h3>Bowel &amp; Mesentery</h3>
<p></p>

<h3>Pelvis</h3>
<p></p>

<h3>Bones &amp; Spine</h3>
<p></p>

<h2>Impression</h2>
<p></p>
`.trim();

// ─── Hidden print template ────────────────────────────────────────────────────
const PrintTemplate = React.forwardRef<
  HTMLDivElement,
  {
    patientName: string;
    serviceName: string;
    doctorName: string;
    diagnosedBy: string;
    createdAt: string;
    completedAt: string | null;
    html: string;
  }
>(({ patientName, serviceName, doctorName, diagnosedBy, createdAt, completedAt, html }, ref) => (
  <div
    ref={ref}
    style={{
      fontFamily: "Arial, sans-serif",
      direction: "ltr",
      padding: "32px 40px",
      color: "#111",
      fontSize: "14px",
      lineHeight: "1.8",
    }}
  >
    {/* ── Title ── */}
    <div style={{ borderBottom: "2px solid #333", paddingBottom: 10, marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Diagnosis Report</h2>
    </div>

    <style>{`@media print { body { -webkit-print-color-adjust: exact; } }`}</style>

    {/* ── Row 1: Patient | Service | Doctor ── */}
    {(() => {
      const row1 = [
        { label: "Patient", value: patientName },
        { label: "Service", value: serviceName },
        { label: "Doctor", value: doctorName },
      ];
      return (
        <div style={{ display: "flex", border: "1px solid #ccc", marginBottom: 0 }}>
          {row1.map(({ label, value }, i) => (
            <div
              key={label}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRight: i < row1.length - 1 ? "1px solid #ccc" : "none",
              }}
            >
              <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{value}</div>
            </div>
          ))}
        </div>
      );
    })()}

    {/* ── Row 2: Diagnosed By | Requested | Completed ── */}
    {(() => {
      const row2 = [
        { label: "Diagnosed By", value: diagnosedBy },
        { label: "Requested At", value: dayjs(createdAt).format("YYYY-MM-DD hh:mm A") },
        completedAt
          ? { label: "Completed At", value: dayjs(completedAt).format("YYYY-MM-DD hh:mm A") }
          : { label: "Status", value: "In Progress" },
      ];
      return (
        <div style={{ display: "flex", border: "1px solid #ccc", borderTop: "none", marginBottom: 20 }}>
          {row2.map(({ label, value }, i) => (
            <div
              key={label}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRight: i < row2.length - 1 ? "1px solid #ccc" : "none",
              }}
            >
              <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontSize: 13 }}>{value}</div>
            </div>
          ))}
        </div>
      );
    })()}

    <div style={{ borderTop: "1px solid #ccc", marginBottom: 20 }} />

    {/* ── Diagnosis body — exact TipTap HTML ── */}
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ minHeight: 200 }}
    />

    {/* ── Footer ── */}
    <div style={{ borderTop: "1px solid #ccc", marginTop: 40, paddingTop: 8, fontSize: 11, color: "#888", display: "flex", justifyContent: "space-between" }}>
      <span>Printed: {dayjs().format("YYYY-MM-DD hh:mm A")}</span>
      <span>{diagnosedBy}</span>
    </div>
  </div>
));

// ─── Main page ────────────────────────────────────────────────────────────────
const DiagnosisPage: React.FC = () => {
  const { requestedServiceId } = useParams<{ requestedServiceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const rsId = Number(requestedServiceId);
  const queryKey = ["diagnosisPageData", rsId];

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => getDiagnosisPageData(rsId),
    enabled: !!rsId,
  });

  const diagnosis = data?.data ?? null;
  const rs = data?.requested_service;

  const [diagnosisText, setDiagnosisText] = useState("");

  // Sync editor when diagnosis loads
  useEffect(() => {
    if (diagnosis?.diagnosis) {
      setDiagnosisText(diagnosis.diagnosis);
    }
  }, [diagnosis?.id]);

  const startMutation = useMutation({
    mutationFn: () => startDiagnosis(rsId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم استلام الحالة");
    },
    onError: () => toast.error("فشل استلام الحالة"),
  });

  const saveMutation = useMutation({
    mutationFn: (text: string) =>
      updateDiagnosis(diagnosis!.id, { diagnosis: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم حفظ التشخيص");
    },
    onError: () => toast.error("فشل حفظ التشخيص"),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      updateDiagnosis(diagnosis!.id, {
        diagnosis: diagnosisText,
        complete: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم إكمال الحالة");
    },
    onError: () => toast.error("فشل إكمال الحالة"),
  });

  const isOwner = !!diagnosis && diagnosis.user_id === user?.id;
  const canEdit = isOwner && !diagnosis.complete;

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !rs) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">فشل تحميل بيانات الخدمة</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", px: 2, pt: 2 }}>
      {/* ── Top bar (fixed height, never scrolls) ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5, flexShrink: 0 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowLeft size={16} />}
          onClick={() => navigate(-1)}
        >
          رجوع
        </Button>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          صفحة التشخيص
        </Typography>
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            color="info"
            onClick={() => setDiagnosisText(CT_REPORT_TEMPLATE)}
          >
            إدراج قالب CT
          </Button>
        )}
        {diagnosis?.complete ? (
          <Chip icon={<CheckCircle size={14} />} label="مكتملة" color="success" size="small" />
        ) : diagnosis ? (
          <Chip label="قيد التنفيذ" color="primary" size="small" />
        ) : (
          <Chip label="لم تُستلم بعد" color="default" size="small" />
        )}
      </Box>

      {/* ── Two-column layout (fills remaining height, each col scrolls independently) ── */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "300px 1fr" },
          gap: 2,
        }}
      >
        {/* ── LEFT column: scrollable ── */}
        <Box sx={{ overflowY: "auto", height: "100%", pb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Info card */}
          <Card variant="outlined">
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ClipboardList size={18} />
                  <Typography variant="subtitle1" fontWeight={700}>بيانات الحالة</Typography>
                </Box>
              }
              sx={{ pb: 0, pt: 1.5, px: 2 }}
            />
            <CardContent sx={{ pt: 1, pb: "12px !important", px: 2 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <User size={15} color="gray" style={{ marginTop: 2 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">المريض</Typography>
                    <Typography variant="body2" fontWeight={700}>{rs.patient_name}</Typography>
                  </Box>
                </Box>

                {rs.patient_phone && (
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <Phone size={15} color="gray" style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">الهاتف</Typography>
                      <Typography variant="body2">{rs.patient_phone}</Typography>
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Stethoscope size={15} color="gray" style={{ marginTop: 2 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">الخدمة</Typography>
                    <Typography variant="body2" fontWeight={600}>{rs.service_name}</Typography>
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">العياده</Typography>
                  <Typography variant="body2">{rs.doctor_name}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">تاريخ الطلب</Typography>
                  <Typography variant="body2">{dayjs(rs.created_at).format("YYYY-MM-DD hh:mm A")}</Typography>
                </Box>

                {diagnosis?.user && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">الاخصائي</Typography>
                    <Typography variant="body2">{diagnosis.user.name}</Typography>
                  </Box>
                )}

                {diagnosis?.completed_at && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">وقت الإكمال</Typography>
                    <Typography variant="body2">
                      {dayjs(diagnosis.completed_at).format("YYYY-MM-DD hh:mm A")}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Receive / action buttons */}
          {!diagnosis && (
            <Button
              variant="contained"
              fullWidth
              startIcon={
                startMutation.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <PlayCircle size={18} />
                )
              }
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate()}
              sx={{ py: 1.25 }}
            >
              استلام الحالة / بدء التشخيص
            </Button>
          )}

          {canEdit && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={
                  saveMutation.isPending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Save size={16} />
                  )
                }
                disabled={saveMutation.isPending || completeMutation.isPending}
                onClick={() => saveMutation.mutate(diagnosisText)}
              >
                حفظ
              </Button>
              <Button
                variant="contained"
                color="success"
                fullWidth
                startIcon={
                  completeMutation.isPending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <CheckCircle size={16} />
                  )
                }
                disabled={
                  !diagnosisText.trim() ||
                  saveMutation.isPending ||
                  completeMutation.isPending
                }
                onClick={() => completeMutation.mutate()}
                sx={{ py: 1.25 }}
              >
                إكمال الحالة
              </Button>
            </Box>
          )}

          {!canEdit && diagnosis && !diagnosis.complete && (
            <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
              مستلمة من قِبل {diagnosis.user?.name}
            </Alert>
          )}

          {diagnosis?.complete && (
            <Alert severity="success" icon={<CheckCircle size={16} />} sx={{ fontSize: "0.8rem" }}>
              أكملها {diagnosis.user?.name}
              {diagnosis.completed_at
                ? ` — ${dayjs(diagnosis.completed_at).format("hh:mm A")}`
                : ""}
            </Alert>
          )}

          {/* Print buttons — only when there is content */}
          {diagnosis && diagnosisText && (
            <>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Printer size={16} />}
                onClick={() => handlePrint()}
              >
                طباعة (Browser)
              </Button>
              <Button
                variant="outlined"
                fullWidth
                color="error"
                startIcon={<Printer size={16} />}
                onClick={() => openDiagnosisPdf(diagnosis.id)}
              >
                طباعة (PDF)
              </Button>
            </>
          )}
        </Box>

        {/* ── RIGHT column: scrollable ── */}
        <Box sx={{ overflowY: "auto", height: "100%", pb: 2 }}>
      
          {diagnosis ? (
            <RichTextEditor
              value={diagnosisText}
              onChange={setDiagnosisText}
              disabled={!canEdit}
              minHeight={500}
              placeholder="اكتب التشخيص هنا..."
            />
          ) : (
            <Card
              variant="outlined"
              sx={{
                minHeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "grey.50",
              }}
            >
              <Typography color="text.disabled">
                استلم الحالة أولاً لبدء كتابة التشخيص
              </Typography>
            </Card>
          )}
        </Box>
      </Box>

      {/* Hidden print template — never visible on screen */}
      <Box sx={{ display: "none" }}>
        <PrintTemplate
          ref={printRef}
          patientName={rs.patient_name}
          serviceName={rs.service_name}
          doctorName={rs.doctor_name}
          diagnosedBy={diagnosis?.user?.name ?? user?.name ?? ""}
          createdAt={rs.created_at}
          completedAt={diagnosis?.completed_at ?? null}
          html={diagnosisText}
        />
      </Box>
    </Box>
  );
};

export default DiagnosisPage;
