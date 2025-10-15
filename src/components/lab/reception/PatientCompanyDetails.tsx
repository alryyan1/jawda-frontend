import React from "react";
import type { Patient } from "@/types/patients";
import showJsonDialog from "@/lib/showJsonDialog";

interface PatientCompanyDetailsProps {
  patient?: Patient;
}

const PatientCompanyDetails: React.FC<PatientCompanyDetailsProps> = ({ patient }) => {
  if (!patient || !patient.company) {
    return null;
  }
  // showJsonDialog(patient, { title: 'Patient JSON' });
  return (
    <div className="w-full bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-3 mb-2">
      <div className="text-center font-semibold text-blue-800 dark:text-blue-200 text-sm mb-2">
        بيانات التامين  
      </div>
      <table className="w-full text-xs">
        <tbody>
          <tr>
            <td className="text-right text-gray-700 pr-2">اسم الشركة</td>
            <td className="text-left font-medium text-lg text-blue-800 dark:text-blue-200">{patient.company.name}</td>
          </tr>
    
          {patient.subcompany && patient.subcompany.name && (
            <tr>
              <td className="text-right text-gray-700 pr-2">اسم الشركة الفرعية</td>
              <td className="text-left font-medium">{patient.subcompany.name}</td>
            </tr>
          )}
          {patient.insurance_no && (
            <tr>
              <td className="text-right text-gray-700 pr-2">رقم التأمين</td>
              <td className="text-left font-medium">{patient.insurance_no}</td>
            </tr>
          )}
          {patient.guarantor && (
            <tr>
              <td className="text-right text-gray-700 pr-2">الضامن</td>
              <td className="text-left font-medium">{patient.guarantor}</td>
            </tr>
          )}
          {patient.company_relation && (
            <tr>
              <td className="text-right text-gray-700 pr-2">اسم العلاقة</td>
              <td className="text-left font-medium">{patient.company_relation.name}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PatientCompanyDetails;