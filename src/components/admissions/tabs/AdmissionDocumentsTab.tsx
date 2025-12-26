import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { FileText, Download } from "lucide-react";
import {
  generateServicesPdf,
  generatePatientDetailsPdf,
  generateVitalSignsPdf,
  generateFullAdmissionPdf,
  generateFilePdf,
  generateLedgerPdf,
  openPdfInNewTab,
} from "@/services/admissionPdfService";
import { getAdmissionServices } from "@/services/admissionServiceService";
import { getAdmissionVitalSigns } from "@/services/admissionVitalSignService";
import { getAdmissionLedger } from "@/services/admissionService";
import type { Admission } from "@/types/admissions";
import { toast } from "sonner";

interface AdmissionDocumentsTabProps {
  admission: Admission;
}

export default function AdmissionDocumentsTab({
  admission,
}: AdmissionDocumentsTabProps) {
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [pdfMenuAnchor, setPdfMenuAnchor] = useState<null | HTMLElement>(null);

  const handlePdfMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setPdfMenuAnchor(event.currentTarget);
  };

  const handlePdfMenuClose = () => {
    setPdfMenuAnchor(null);
  };

  const handleGeneratePdf = async (
    type: "services" | "patient" | "vital-signs" | "full" | "file" | "ledger"
  ) => {
    setGeneratingPdf(type);
    handlePdfMenuClose();

    try {
      let blob: Blob;

      switch (type) {
        case "services": {
          const services = await getAdmissionServices(admission.id);
          blob = await generateServicesPdf(admission, services);
          break;
        }
        case "patient":
          blob = await generatePatientDetailsPdf(admission);
          break;
        case "vital-signs": {
          const vitalSigns = await getAdmissionVitalSigns(admission.id);
          blob = await generateVitalSignsPdf(admission, vitalSigns);
          break;
        }
        case "full": {
          const [services, vitalSigns] = await Promise.all([
            getAdmissionServices(admission.id),
            getAdmissionVitalSigns(admission.id),
          ]);
          blob = await generateFullAdmissionPdf(
            admission,
            services,
            vitalSigns
          );
          break;
        }
        case "file": {
          const [services, vitalSigns] = await Promise.all([
            getAdmissionServices(admission.id),
            getAdmissionVitalSigns(admission.id),
          ]);
          blob = await generateFilePdf(admission, services, vitalSigns);
          break;
        }
        case "ledger": {
          const ledger = await getAdmissionLedger(admission.id);
          blob = await generateLedgerPdf(admission, ledger);
          break;
        }
      }

      openPdfInNewTab(blob);
      toast.success("تم إنشاء ملف PDF بنجاح");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("حدث خطأ أثناء إنشاء PDF");
    } finally {
      setGeneratingPdf(null);
    }
  };

  const pdfOptions = [
    {
      type: "services" as const,
      label: "تقرير الخدمات الطبية المطلوبة",
      icon: FileText,
    },
    { type: "patient" as const, label: "تفاصيل المريض", icon: FileText },
    {
      type: "vital-signs" as const,
      label: "تقرير العلامات الحيوية",
      icon: FileText,
    },
    { type: "full" as const, label: "التقرير الكامل", icon: FileText },
    { type: "file" as const, label: "ملف التنويم", icon: FileText },
    { type: "ledger" as const, label: "كشف الحساب", icon: FileText },
  ];

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              mb: 3,
              fontWeight: 600,
              color: "text.secondary",
              borderBottom: 1,
              borderColor: "divider",
              pb: 1,
            }}
          >
            الوثائق والتقارير
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<FileText size={16} />}
              onClick={handlePdfMenuOpen}
              disabled={!!generatingPdf}
              sx={{ alignSelf: "flex-start" }}
            >
              {generatingPdf ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  جاري الإنشاء...
                </>
              ) : (
                "إنشاء PDF"
              )}
            </Button>

            <List>
              {pdfOptions.map((option) => (
                <ListItem key={option.type} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleGeneratePdf(option.type)}
                    disabled={generatingPdf === option.type}
                    sx={{
                      borderRadius: 1,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <ListItemIcon>
                      {generatingPdf === option.type ? (
                        <CircularProgress size={20} />
                      ) : (
                        <option.icon size={20} />
                      )}
                    </ListItemIcon>
                    <ListItemText primary={option.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </CardContent>
      </Card>

      <Menu
        anchorEl={pdfMenuAnchor}
        open={Boolean(pdfMenuAnchor)}
        onClose={handlePdfMenuClose}
      >
        {pdfOptions.map((option) => (
          <MenuItem
            key={option.type}
            onClick={() => handleGeneratePdf(option.type)}
            disabled={!!generatingPdf}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
