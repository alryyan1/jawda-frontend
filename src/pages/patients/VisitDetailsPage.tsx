// src/pages/patients/VisitDetailsPage.tsx
import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Typography, CircularProgress, Button, Tabs, Tab } from "@mui/material";
import { ArrowLeft } from "lucide-react";

import { getDoctorVisitById } from "@/services/visitService";
import type { DoctorVisit } from "@/types/visits";
import type { Patient } from "@/types/patients";
import LabRequestsColumn from "@/components/lab/reception/LabRequestsColumn";
import SelectedPatientWorkspace from "@/components/clinic/SelectedPatientWorkspace";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`visit-tabpanel-${index}`}
      aria-labelledby={`visit-tab-${index}`}
      style={{ height: "100%", overflow: "auto" }}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const VisitDetailsPage: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const id = visitId ? parseInt(visitId, 10) : NaN;
  const [currentTab, setCurrentTab] = useState(0);

  const { data: visit, isLoading: isLoadingVisit } = useQuery<DoctorVisit>({
    queryKey: ["doctorVisit", id],
    queryFn: () => getDoctorVisitById(id),
    enabled: !isNaN(id),
  });

  if (isNaN(id)) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">معرف الزيارة غير صالح</Typography>
        <Button component={Link} to="/patients" startIcon={<ArrowLeft size={18} />} sx={{ mt: 2 }}>
          العودة
        </Button>
      </Box>
    );
  }

  if (isLoadingVisit || !visit) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  const patient = visit.patient as Patient;

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Button
          component={Link}
          to="/patients"
          startIcon={<ArrowLeft size={18} />}
          variant="outlined"
          size="small"
        >
          العودة
        </Button>
        <Typography variant="h5" fontWeight={700}>
          تفاصيل الزيارة #{visit.id} – {patient?.name}
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="visit tabs">
          <Tab label="المختبر" id="visit-tab-0" aria-controls="visit-tabpanel-0" />
          <Tab label="الخدمات" id="visit-tab-1" aria-controls="visit-tabpanel-1" />
        </Tabs>
      </Box>

      <Box sx={{ minHeight: 400 }}>
     
        <TabPanel value={currentTab} index={0}>
          <LabRequestsColumn
            activeVisitId={visit.id}
            visit={visit}
            isLoading={isLoadingVisit}
            onPrintReceipt={() => {}}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <SelectedPatientWorkspace
            selectedPatientVisit={visit}
            initialPatient={patient}
            visitId={visit.id}
          />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default VisitDetailsPage;
