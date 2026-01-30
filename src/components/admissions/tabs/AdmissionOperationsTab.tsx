import React from "react";
import AdmissionOperationsList from "../AdmissionOperationsList";
import { Box } from "@mui/material";

interface AdmissionOperationsTabProps {
  admissionId: number;
}

export default function AdmissionOperationsTab({
  admissionId,
}: AdmissionOperationsTabProps) {
  return (
    <Box>
      <AdmissionOperationsList admissionId={admissionId} />
    </Box>
  );
}
