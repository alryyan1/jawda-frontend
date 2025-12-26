import React from 'react';
import VitalSignsList from '@/components/admissions/VitalSignsList';

interface AdmissionVitalSignsTabProps {
  admissionId: number;
}

export default function AdmissionVitalSignsTab({ admissionId }: AdmissionVitalSignsTabProps) {
  return <VitalSignsList admissionId={admissionId} />;
}


