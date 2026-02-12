import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdmissionById } from "@/services/admissionService";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  CircularProgress,
  Button,
  Tabs,
  Tab,
} from "@mui/material";
import { ArrowLeft } from "lucide-react";
import DischargeDialog from "@/components/admissions/DischargeDialog";
import TransferDialog from "@/components/admissions/TransferDialog";
import { useState } from "react";
import AdmissionOverviewTab from "@/components/admissions/tabs/AdmissionOverviewTab";
import AdmissionVitalSignsTab from "@/components/admissions/tabs/AdmissionVitalSignsTab";
import AdmissionServicesTab from "@/components/admissions/tabs/AdmissionServicesTab";
import AdmissionDocumentsTab from "@/components/admissions/tabs/AdmissionDocumentsTab";
import AdmissionLedgerTab from "@/components/admissions/tabs/AdmissionLedgerTab";
import AdmissionLabTestsTab from "@/components/admissions/tabs/AdmissionLabTestsTab";
import AdmissionOperationsTab from "@/components/admissions/tabs/AdmissionOperationsTab";
import AdmissionPatientFileTab from "@/components/admissions/tabs/AdmissionPatientFileTab";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admission-tabpanel-${index}`}
      aria-labelledby={`admission-tab-${index}`}
      {...other}
      style={{ height: "100%", overflow: "auto" }}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdmissionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

  const {
    data: admissionData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admission", id],
    queryFn: () => getAdmissionById(Number(id)).then((res) => res.data),
    enabled: !!id,
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !admissionData) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">
            حدث خطأ أثناء جلب بيانات التنويم
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="max-w-7dxl mx-auto h-full flex flex-col">
        <CardHeader
          sx={{ flexShrink: 0 }}
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                component={Link}
                to="/admissions"
                startIcon={<ArrowLeft />}
                variant="outlined"
                size="small"
              >
                رجوع
              </Button>
              <Box>
                <Typography variant="h5">
                  {admissionData.patient?.name || "مريض"}
                  {admissionData.specialist_doctor?.name && (
                    <Typography
                      component="span"
                      variant="h5"
                      sx={{ color: "text.secondary", fontWeight: 400 }}
                    >
                      {" "}
                      ({admissionData.specialist_doctor.name})
                    </Typography>
                  )}
                </Typography>
                {admissionData.admission_date && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    تاريخ التنويم: {admissionData.admission_date}
                  </Typography>
                )}
              </Box>
            </Box>
          }
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              {admissionData.status === "admitted" && (
                <>
                  <Button
                    variant="outlined"
                    color="info"
                    onClick={() => setTransferDialogOpen(true)}
                  >
                    نقل
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => setDischargeDialogOpen(true)}
                  >
                    خروج
                  </Button>
                </>
              )}
            </Box>
          }
        />
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            p: 0,
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              aria-label="admission tabs"
            >
              <Tab label="نظرة عامة" />
              <Tab label="العلامات الحيوية" />
              <Tab label="الخدمات الطبية" />
              <Tab label="كشف الحساب" />
              <Tab label="العمليات" />
              <Tab label="الوثائق" />
              <Tab label="الفحوصات المختبرية" />
              <Tab label="ملف الإقامة" />
            </Tabs>
          </Box>
          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <TabPanel value={currentTab} index={0}>
              <AdmissionOverviewTab admission={admissionData} />
            </TabPanel>
            <TabPanel value={currentTab} index={1}>
              <AdmissionVitalSignsTab admissionId={admissionData.id} />
            </TabPanel>
            <TabPanel value={currentTab} index={2}>
              <AdmissionServicesTab admissionId={admissionData.id} />
            </TabPanel>
            <TabPanel value={currentTab} index={3}>
              <AdmissionLedgerTab admissionId={admissionData.id} />
            </TabPanel>
            <TabPanel value={currentTab} index={4}>
              <AdmissionOperationsTab admissionId={admissionData.id} />
            </TabPanel>
            <TabPanel value={currentTab} index={5}>
              <AdmissionDocumentsTab admission={admissionData} />
            </TabPanel>
            <TabPanel value={currentTab} index={6}>
              <AdmissionLabTestsTab admissionId={admissionData.id} />
            </TabPanel>
            <TabPanel value={currentTab} index={7}>
              <AdmissionPatientFileTab admissionId={admissionData.id} />
            </TabPanel>
          </Box>
        </CardContent>
      </Card>

      {admissionData && (
        <>
          <DischargeDialog
            open={dischargeDialogOpen}
            onClose={() => setDischargeDialogOpen(false)}
            admission={admissionData}
          />
          <TransferDialog
            open={transferDialogOpen}
            onClose={() => setTransferDialogOpen(false)}
            admission={admissionData}
          />
        </>
      )}
    </>
  );
}
