import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
// Font is registered dynamically based on settings
import type { Admission } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

interface AdmissionSummaryPdfProps {
  admission: Admission;
  settings: PdfSetting | null;
}

export default function AdmissionSummaryPdf({
  admission,
  settings,
}: AdmissionSummaryPdfProps) {
  const fontFamily = settings?.font_family || 'Amiri';
  const fontName = fontFamily; // Font is registered dynamically before PDF generation
  const fontSize = settings?.font_size || 10;

  const styles = StyleSheet.create({
    page: {
      padding: 15,
      paddingRight: 35, // Extra padding for vertical text
      fontFamily: fontName,
      direction: 'rtl',
      textAlign: 'right',
      fontSize: fontSize,
      position: 'relative',
    },
    // Vertical text on right edge - each character on new line
    verticalTextContainer: {
      position: 'absolute',
      right: 3,
      top: 150,
      width: 12,
      height: 350,
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    verticalTextChar: {
      fontSize: fontSize - 1,
      fontWeight: 'bold',
      lineHeight: 1.1,
      textAlign: 'center',
    },
    // Title section
    titleSection: {
      marginBottom: 15,
      marginTop: 10,
    },
    title: {
      fontSize: fontSize + 6,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 5,
    },
    // Two-column layout for patient info
    patientInfoContainer: {
      flexDirection: 'row-reverse',
      marginBottom: 15,
      border: '1 solid #000',
      padding: 10,
    },
    patientInfoLeftColumn: {
      width: '50%',
      paddingRight: 12,
      borderRight: '1 solid #ccc',
    },
    patientInfoRightColumn: {
      width: '50%',
      paddingLeft: 12,
    },
    patientInfoRow: {
      flexDirection: 'row-reverse',
      marginBottom: 8,
      fontSize: fontSize,
      alignItems: 'flex-start',
    },
    patientInfoLabel: {
      width: '40%',
      fontWeight: 'bold',
      textAlign: 'right',
      paddingRight: 6,
      fontSize: fontSize,
    },
    patientInfoValue: {
      width: '60%',
      textAlign: 'right',
      fontSize: fontSize,
    },
    // Social status checkboxes
    socialStatusContainer: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginTop: 2,
    },
    checkboxRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginLeft: 10,
      marginBottom: 3,
    },
    checkbox: {
      width: 8,
      height: 8,
      border: '1 solid #000',
      marginLeft: 6,
      marginRight: 3,
    },
    checkboxChecked: {
      width: 8,
      height: 8,
      border: '1 solid #000',
      marginLeft: 6,
      marginRight: 3,
      backgroundColor: '#000',
    },
    checkboxLabel: {
      fontSize: fontSize - 1,
      marginLeft: 3,
    },
    // Medical history section
    medicalHistorySection: {
      marginTop: 15,
      marginBottom: 12,
    },
    medicalHistoryTitle: {
      fontSize: fontSize + 2,
      fontWeight: 'bold',
      marginBottom: 8,
      borderBottom: '1 solid #000',
      paddingBottom: 4,
    },
    medicalHistoryContainer: {
      flexDirection: 'row-reverse',
    },
    medicalHistoryLeft: {
      width: '70%',
      paddingRight: 8,
    },
    medicalHistoryRight: {
      width: '30%',
      paddingLeft: 8,
      borderLeft: '1 solid #ccc',
    },
    medicalHistoryItem: {
      marginBottom: 10,
    },
    medicalHistoryLabel: {
      fontSize: fontSize,
      marginBottom: 4,
      fontWeight: 'bold',
    },
    medicalHistoryTextArea: {
      minHeight: 60,
      padding: 8,
      border: '1 solid #000',
      fontSize: fontSize - 1,
      textAlign: 'right',
      direction: 'rtl',
    },
    codesColumn: {
      fontSize: fontSize,
      fontWeight: 'bold',
      marginBottom: 6,
      textAlign: 'right',
    },
    codesTextArea: {
      minHeight: 220,
      padding: 8,
      border: '1 solid #000',
      fontSize: fontSize - 1,
      textAlign: 'right',
      direction: 'rtl',
    },
    // Discharge section
    dischargeSection: {
      marginTop: 15,
      marginBottom: 12,
    },
    dischargeTitle: {
      fontSize: fontSize + 2,
      fontWeight: 'bold',
      marginBottom: 8,
      borderBottom: '1 solid #000',
      paddingBottom: 4,
    },
    dischargeRow: {
      flexDirection: 'row-reverse',
      marginBottom: 6,
      fontSize: fontSize,
    },
    dischargeLabel: {
      fontWeight: 'bold',
      marginRight: 8,
    },
    // Signatures
    signatureRow: {
      flexDirection: 'row',
      marginTop: 25,
      marginBottom: 10,
      justifyContent: 'space-between',
    },
    signatureBox: {
      width: '45%',
      borderTop: '1 solid #000',
      paddingTop: 6,
      paddingBottom: 20,
      textAlign: 'center',
    },
    signatureText: {
      fontSize: fontSize,
      textAlign: 'center',
      marginTop: 4,
    },
  });

  const getSocialStatusCheckboxes = (status?: string | null) => {
    const statuses = [
      { value: 'single', label: 'عازب' },
      { value: 'married', label: 'متزوج' },
      { value: 'divorced', label: 'مطلق' },
      { value: 'widowed', label: 'أرمل' },
    ];

    return (
      <View style={styles.socialStatusContainer}>
        {statuses.map((s) => (
          <View key={s.value} style={styles.checkboxRow}>
            <View style={status === s.value ? styles.checkboxChecked : styles.checkbox} />
            <Text style={styles.checkboxLabel}>{String(s.label || '')}</Text>
          </View>
        ))}
      </View>
    );
  };

  const getGenderLabel = (gender?: string | null) => {
    switch (gender) {
      case 'male': return 'ذكر';
      case 'female': return 'أنثى';
      default: return '-';
    }
  };

  const formatAge = () => {
    const parts = [];
    const patient = admission.patient as any;
    if (patient?.age_year) parts.push(`${String(patient.age_year)} سنة`);
    if (patient?.age_month) parts.push(`${String(patient.age_month)} شهر`);
    if (patient?.age_day) parts.push(`${String(patient.age_day)} يوم`);
    return parts.length > 0 ? parts.join(' و ') : '-';
  };

  // Helper function to safely get text content
  const safeText = (value: any): string => {
    if (value === null || value === undefined) return '-';
    const str = String(value);
    return str.trim() === '' ? '-' : str;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Vertical text on right edge - simplified to avoid text layout issues */}
        {/* Note: React-pdf has limitations with vertical text, so we'll skip it for now */}
        {/* <View style={styles.verticalTextContainer}>
          <Text style={styles.verticalTextChar}>ADMISSION SUMMARY SHEET</Text>
        </View> */}

        <PdfHeader settings={settings} />

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{String('ADMISSION SUMMARY SHEET')}</Text>
          <Text style={styles.title}>{String('ملخص التنويم')}</Text>
        </View>

        {/* Patient Information - Two Column Layout */}
        <View style={styles.patientInfoContainer}>
          {/* Right Column (Arabic) */}
          <View style={styles.patientInfoRightColumn}>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('اسم المريض:')}</Text>
              <Text style={styles.patientInfoValue}>{safeText(admission.patient?.name)}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('العمر:')}</Text>
              <Text style={styles.patientInfoValue}>{safeText(formatAge())}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('اسم الطبيب المعالج:')}</Text>
              <Text style={styles.patientInfoValue}>{safeText(admission.doctor?.name)}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('العنبر:')}</Text>
              <Text style={styles.patientInfoValue}>{safeText(admission.ward?.name)}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('مصدر الدخل:')}</Text>
              <Text style={styles.patientInfoValue}>{safeText((admission.patient as any)?.income_source)}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('تاريخ الدخول:')}</Text>
              <Text style={styles.patientInfoValue}>{safeText(admission.admission_date)}</Text>
            </View>
            {admission.discharge_date && (
              <View style={styles.patientInfoRow}>
                <Text style={styles.patientInfoLabel}>{String('تاريخ الخروج:')}</Text>
                <Text style={styles.patientInfoValue}>{safeText(admission.discharge_date)}</Text>
              </View>
            )}
          </View>

          {/* Left Column (English/Arabic) */}
          <View style={styles.patientInfoLeftColumn}>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('U.N')}</Text>
              <Text style={styles.patientInfoValue}>{safeText(admission.id)}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('النمرة:')}</Text>
              <Text style={styles.patientInfoValue}>{safeText(admission.id)}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('الحالة الاجتماعية:')}</Text>
            </View>
            {getSocialStatusCheckboxes((admission.patient as any)?.social_status)}
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('النوع:')}</Text>
              <Text style={styles.patientInfoValue}>{safeText(getGenderLabel(admission.patient?.gender))}</Text>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>{String('العنوان:')}</Text>
              <Text style={styles.patientInfoValue}>{safeText((admission.patient as any)?.address)}</Text>
            </View>
          </View>
        </View>

        {/* Medical History Section */}
        <View style={styles.medicalHistorySection}>
          <Text style={styles.medicalHistoryTitle}>{String('السجل الطبي / Medical History')}</Text>
          
          <View style={styles.medicalHistoryContainer}>
            {/* Left side - Medical history items */}
            <View style={styles.medicalHistoryLeft}>
              <View style={styles.medicalHistoryItem}>
                <Text style={styles.medicalHistoryLabel}>{String('Ward transfers (with dates):')}</Text>
                <View style={styles.medicalHistoryTextArea}>
                  <Text style={{ fontSize: fontSize - 1 }}>{safeText('-')}</Text>
                </View>
              </View>

              <View style={styles.medicalHistoryItem}>
                <Text style={styles.medicalHistoryLabel}>{String('Provisional diagnosis:')}</Text>
                <View style={styles.medicalHistoryTextArea}>
                  <Text style={{ fontSize: fontSize - 1 }}>
                    {safeText(admission.provisional_diagnosis)}
                  </Text>
                </View>
              </View>

              <View style={styles.medicalHistoryItem}>
                <Text style={styles.medicalHistoryLabel}>{String('Operations (With dates):')}</Text>
                <View style={styles.medicalHistoryTextArea}>
                  <Text style={{ fontSize: fontSize - 1 }}>
                    {safeText(admission.operations)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Right side - Disease and Operation codes */}
            <View style={styles.medicalHistoryRight}>
              <Text style={styles.codesColumn}>{String('Disease and Operation codes:')}</Text>
              <View style={styles.codesTextArea}>
                <Text style={{ fontSize: fontSize - 1 }}>{safeText('-')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Discharge Information */}
        {admission.discharge_date && (
          <View style={styles.dischargeSection}>
            <Text style={styles.dischargeTitle}>{String('معلومات الخروج / Discharge Information')}</Text>
            <View style={styles.dischargeRow}>
              <Text style={styles.dischargeLabel}>{String('Discharged: To Return to OPD in Work a time')}</Text>
            </View>
            <View style={styles.dischargeRow}>
              <Text style={styles.dischargeLabel}>{String('Condition on discharges:')}</Text>
              <Text style={{ fontSize: fontSize }}>{safeText('-')}</Text>
            </View>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>{String('Medical Office')}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>{String('Consultant')}</Text>
          </View>
        </View>

        <PdfFooter settings={settings} />
      </Page>
    </Document>
  );
}
