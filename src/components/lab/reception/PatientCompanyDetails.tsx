import React from "react";
import { useTranslation } from "react-i18next";
import type { Patient } from "@/types/patients";

interface PatientCompanyDetailsProps {
  patient?: Patient;
}

const PatientCompanyDetails: React.FC<PatientCompanyDetailsProps> = ({ patient }) => {
  const { t } = useTranslation(["labReception", "common"]);

  if (!patient || !patient.company) {
    return null;
  }

  return (
    <div className="w-full bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-3 mb-2">
      <div className="text-center font-semibold text-blue-800 dark:text-blue-200 text-sm mb-2">
        {t("patientCompanyDetails.title", "Patient Company Information")}
      </div>
      <table className="w-full text-xs">
        <tbody>
          <tr>
            <td className="text-right text-gray-700 pr-2">{t("patientCompanyDetails.companyName", "Company Name")}</td>
            <td className="text-left font-medium">{patient.company.name}</td>
          </tr>
    
          {patient.subcompany && patient.subcompany.name && (
            <tr>
              <td className="text-right text-gray-700 pr-2">{t("patientCompanyDetails.subcompanyName", "Subcompany Name")}</td>
              <td className="text-left font-medium">{patient.subcompany.name}</td>
            </tr>
          )}
          {patient.insurance_no && (
            <tr>
              <td className="text-right text-gray-700 pr-2">{t("patientCompanyDetails.insuranceNo", "Insurance Number")}</td>
              <td className="text-left font-medium">{patient.insurance_no}</td>
            </tr>
          )}
          {patient.guarantor && (
            <tr>
              <td className="text-right text-gray-700 pr-2">{t("patientCompanyDetails.guarantor", "Guarantor")}</td>
              <td className="text-left font-medium">{patient.guarantor}</td>
            </tr>
          )}
          {patient.company_relation && (
            <tr>
              <td className="text-right text-gray-700 pr-2">{t("patientCompanyDetails.relationName", "Relation Name")}</td>
              <td className="text-left font-medium">{patient.company_relation.name}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PatientCompanyDetails; 