import React from 'react';
import AdmissionServicesList from '@/components/admissions/AdmissionServicesList';

interface AdmissionServicesTabProps {
  admissionId: number;
}

export default function AdmissionServicesTab({ admissionId }: AdmissionServicesTabProps) {
  return <AdmissionServicesList admissionId={admissionId} />;
}



