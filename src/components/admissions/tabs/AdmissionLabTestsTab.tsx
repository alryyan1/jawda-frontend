import React from 'react';
import AdmissionLabTestsList from '@/components/admissions/AdmissionLabTestsList';

interface AdmissionLabTestsTabProps {
  admissionId: number;
}

export default function AdmissionLabTestsTab({ admissionId }: AdmissionLabTestsTabProps) {
  return <AdmissionLabTestsList admissionId={admissionId} />;
}

