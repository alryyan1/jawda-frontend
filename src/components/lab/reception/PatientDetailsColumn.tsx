import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

// Shadcn UI Components
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  User,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
  Mail,
  Hash,
  DollarSign,
  Activity,
  Printer,
  Lock,
  Unlock,
  Users,
  Stethoscope,
  TestTube,
  IdCard,
  Loader2,
} from "lucide-react";

// Services & Types
import { getDoctorVisitById } from "@/services/visitService";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import type { DoctorVisit } from "@/types/visits";

interface PatientDetailsColumnProps {
  selectedPatient: PatientLabQueueItem | null;
  activeVisitId: number | null;
  visit?: DoctorVisit;
  isLoading?: boolean;
  error?: Error | null;
}

const PatientDetailsColumn: React.FC<PatientDetailsColumnProps> = ({
  selectedPatient,
  activeVisitId,
  visit,
  isLoading,
  error,
}) => {
  const { t } = useTranslation(["labReception", "common", "patients", "clinic"]);

  // Use the visit data passed from parent instead of fetching it
  const visitDetails = visit;

  const getPaymentStatusColor = (isPaid: boolean) => {
    return isPaid
      ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400"
      : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400";
  };

  const getPaymentStatusIcon = (isPaid: boolean) => {
    return isPaid ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : (
      <XCircle className="h-3 w-3" />
    );
  };

  // No patient selected state
  if (!selectedPatient) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <div className="text-center space-y-4">
          <User className="h-16 w-16 mx-auto opacity-30" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {t("noPatientSelected", "No patient selected")}
            </p>
            <p className="text-sm max-w-xs mx-auto leading-relaxed">
              {t("selectPatientToView", "Select a patient to view their detailed information")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("common:loading")}...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="font-semibold text-red-600">
            {t("common:error.loadFailed")}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {error?.message || t("common:noDataAvailable")}
          </p>
        </div>
      </div>
    );
  }

  const patient = visitDetails?.patient || selectedPatient;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Patient Header Card */}
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <User className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-1">
                  {selectedPatient.patient_name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Hash className="h-3 w-3" />
                  <span>Patient ID: {selectedPatient.patient_id}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visit Information */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                {t("patientDetailsColumn.visitInformation", "Visit Information")}
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t("visitId", "Visit ID")}:
                </span>
                <Badge variant="outline" className="font-mono">
                  #{selectedPatient.visit_id}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t("patientDetailsColumn.labNumber", "Lab Number")}:
                </span>
                <Badge variant="outline" className="font-mono">
                  {selectedPatient.lab_number}
                </Badge>
              </div>
              {selectedPatient.sample_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {t("patientDetailsColumn.sampleId", "Sample ID")}:
                  </span>
                  <Badge variant="outline" className="font-mono">
                    {selectedPatient.sample_id}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t("patientDetailsColumn.visitTime", "Visit Time")}:
                </span>
                <span className="text-sm font-medium">
                  {new Date(selectedPatient.oldest_request_time).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                {t("patientDetailsColumn.contactInformation", "Contact Information")}
              </h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">
                    {selectedPatient.phone || t("common:notAvailable")}
                  </p>
                  <p className="text-xs text-slate-500">{t("patientDetailsColumn.phoneNumber", "Phone Number")}</p>
                </div>
              </div>
              {visitDetails?.patient?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">{visitDetails.patient.email}</p>
                    <p className="text-xs text-slate-500">{t("patientDetailsColumn.emailAddress", "Email Address")}</p>
                  </div>
                </div>
              )}
              {visitDetails?.patient?.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">{visitDetails.patient.address}</p>
                    <p className="text-xs text-slate-500">{t("patientDetailsColumn.address", "Address")}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lab Requests Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TestTube className="h-4 w-4 text-purple-600" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                {t("patientDetailsColumn.labRequestsStatus", "Lab Requests Status")}
              </h4>
            </div>
            <div className="space-y-3">
              {/* Payment Status */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium">{t("patientDetailsColumn.paymentStatus", "Payment Status")}</span>
                </div>
                <Badge
                  className={`${getPaymentStatusColor(selectedPatient.all_requests_paid)}`}
                >
                  {getPaymentStatusIcon(selectedPatient.all_requests_paid)}
                  <span className="ml-1">
                    {selectedPatient.all_requests_paid
                      ? t("patientDetailsColumn.paid", "Paid")
                      : t("patientDetailsColumn.unpaid", "Unpaid")}
                  </span>
                </Badge>
              </div>

              {/* Request Count */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium">{t("patientDetailsColumn.totalRequests", "Total Requests")}</span>
                </div>
                <Badge variant="outline">
                  {selectedPatient.lab_request_ids?.length || 0} {t("patientDetailsColumn.requests", "requests")}
                </Badge>
              </div>

              {/* Test Count */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium">{t("patientDetailsColumn.testCount", "Test Count")}</span>
                </div>
                <Badge variant="outline">
                  {selectedPatient.test_count} {t("patientDetailsColumn.tests", "tests")}
                </Badge>
              </div>

              {/* Result Status */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  {selectedPatient.result_is_locked ? (
                    <Lock className="h-4 w-4 text-slate-600" />
                  ) : (
                    <Unlock className="h-4 w-4 text-slate-600" />
                  )}
                  <span className="text-sm font-medium">{t("patientDetailsColumn.resultStatus", "Result Status")}</span>
                </div>
                <Badge
                  variant={selectedPatient.result_is_locked ? "default" : "secondary"}
                >
                  {selectedPatient.result_is_locked ? (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      {t("patientDetailsColumn.locked", "Locked")}
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3 w-3 mr-1" />
                      {t("patientDetailsColumn.unlocked", "Unlocked")}
                    </>
                  )}
                </Badge>
              </div>

              {/* Print Status */}
              {selectedPatient.is_printed && (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{t("patientDetailsColumn.printStatus", "Print Status")}</span>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t("patientDetailsColumn.printed", "Printed")}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Doctor & Company Information */}
        {visitDetails && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  {t("patientDetailsColumn.doctorAndCompany", "Doctor & Company")}
                </h4>
              </div>
              <div className="space-y-3">
                {visitDetails.doctor && (
                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">{visitDetails.doctor.name}</p>
                      <p className="text-xs text-slate-500">{t("patientDetailsColumn.attendingDoctor", "Attending Doctor")}</p>
                    </div>
                  </div>
                )}
                {visitDetails.company && (
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">{visitDetails.company.name}</p>
                      <p className="text-xs text-slate-500">{t("patientDetailsColumn.company", "Company")}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Patient Details */}
        {visitDetails?.patient && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <IdCard className="h-4 w-4 text-indigo-600" />
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  {t("patientDetailsColumn.additionalDetails", "Additional Details")}
                </h4>
              </div>
              <div className="space-y-3">
                {visitDetails.patient.date_of_birth && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {t("patientDetailsColumn.dateOfBirth", "Date of Birth")}:
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(visitDetails.patient.date_of_birth).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {visitDetails.patient.gender && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {t("patientDetailsColumn.gender", "Gender")}:
                    </span>
                    <Badge variant="outline">
                      {visitDetails.patient.gender}
                    </Badge>
                  </div>
                )}
                {visitDetails.patient.nationality && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {t("patientDetailsColumn.nationality", "Nationality")}:
                    </span>
                    <span className="text-sm font-medium">
                      {visitDetails.patient.nationality}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-600" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                {t("patientDetailsColumn.timeline", "Timeline")}
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-slate-600 dark:text-slate-400">
                  {t("patientDetailsColumn.visitCreated", "Visit created")}:{" "}
                  {new Date(selectedPatient.oldest_request_time).toLocaleString()}
                </span>
              </div>
              {selectedPatient.is_printed && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-slate-600 dark:text-slate-400">
                    {t("patientDetailsColumn.resultsPrinted", "Results printed")}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default PatientDetailsColumn; 