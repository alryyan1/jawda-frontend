import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Admission } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

interface AdmissionDischargeFormPdfProps {
  admission: Admission;
  settings: PdfSetting | null;
}

export default function AdmissionDischargeFormPdf({
  admission,
  settings,
}: AdmissionDischargeFormPdfProps) {
  const fontFamily = settings?.font_family || 'Amiri';
  const fontName = fontFamily;
  const fontSize = settings?.font_size || 10;

  const styles = StyleSheet.create({
    page: {
      padding: 15,
      fontFamily: fontName,
      direction: 'rtl',
      textAlign: 'right',
      fontSize: fontSize,
    },
    title: {
      fontSize: fontSize + 3,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 5,
      marginTop: 10,
    },
    subtitle: {
      fontSize: fontSize + 1,
      textAlign: 'center',
      marginBottom: 15,
    },
    section: {
      marginBottom: 15,
    },
    fieldRow: {
      flexDirection: 'row-reverse',
      marginBottom: 10,
      alignItems: 'flex-start',
    },
    fieldNumber: {
      fontSize: fontSize,
      fontWeight: 'bold',
      marginLeft: 8,
      minWidth: 20,
    },
    fieldLabel: {
      fontSize: fontSize,
      marginLeft: 8,
      minWidth: 120,
    },
    fieldDots: {
      flex: 1,
      borderBottom: '1 dotted #000',
      paddingBottom: 2,
      minHeight: 16,
      marginLeft: 8,
    },
    fieldValue: {
      fontSize: fontSize,
      paddingRight: 4,
    },
    checkboxRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginLeft: 10,
      marginBottom: 5,
    },
    checkbox: {
      width: 8,
      height: 8,
      border: '1 solid #000',
      marginLeft: 6,
      marginRight: 3,
    },
    checkboxLabel: {
      fontSize: fontSize - 1,
      marginLeft: 3,
    },
    sectionTitle: {
      fontSize: fontSize + 1,
      fontWeight: 'bold',
      marginBottom: 8,
      marginTop: 10,
      borderBottom: '1 solid #000',
      paddingBottom: 4,
    },
    footerRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    footerText: {
      fontSize: fontSize - 1,
      // Removed fontStyle: 'italic' as Arial italic is not registered
    },
    footerSignature: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginTop: 15,
    },
  });

  // Helper function to safely get text content
  const safeText = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return str.trim() === '' ? '' : str;
  };

  const getGenderLabel = (gender?: string | null) => {
    switch (gender) {
      case 'male': return 'ذكر';
      case 'female': return 'أنثى';
      default: return '';
    }
  };

  const formatAge = () => {
    const parts = [];
    const patient = admission.patient as any;
    if (patient?.age_year) parts.push(`${String(patient.age_year)} سنة`);
    if (patient?.age_month) parts.push(`${String(patient.age_month)} شهر`);
    if (patient?.age_day) parts.push(`${String(patient.age_day)} يوم`);
    return parts.length > 0 ? parts.join(' و ') : '';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader settings={settings} />

        {/* Title */}
        <Text style={styles.title}>استمارة دخول وخروج من المستشفيات</Text>
        <Text style={styles.subtitle}>اورنيك صحي رقم (1) المعدل</Text>

        {/* Hospital and Patient Identification Section */}
        <View style={styles.section}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>اسم المستشفى:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{safeText(settings?.hospital_name)}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>رقم القيد والسجل:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{safeText(admission.id)}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>1.</Text>
            <Text style={styles.fieldLabel}>اسم المريض:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{safeText(admission.patient?.name)}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>2.</Text>
            <Text style={styles.fieldLabel}>الجنس:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{safeText(getGenderLabel(admission.patient?.gender))}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>3.</Text>
            <Text style={styles.fieldLabel}>العمر:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{safeText(formatAge())}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>4.</Text>
            <Text style={styles.fieldLabel}>عنوان المريض:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{safeText((admission.patient as any)?.address)}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>5.</Text>
            <Text style={styles.fieldLabel}>مهنة المريض:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{' '}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>6.</Text>
            <Text style={styles.fieldLabel}>تاريخ الدخول:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{safeText(admission.admission_date)}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>7.</Text>
            <Text style={styles.fieldLabel}>تاريخ الخروج:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{safeText(admission.discharge_date)}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>8.</Text>
            <Text style={styles.fieldLabel}>التشخيص النهائي:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{safeText(admission.diagnosis)}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>9.</Text>
            <Text style={styles.fieldLabel}>الأمراض الأخرى والمضاعفات (إن وجدت):</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{' '}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>القسم:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{safeText(admission.ward?.name)}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>الفرقة:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{' '}</Text>
            </View>
          </View>
        </View>

        {/* Accident/Injury Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>في حالة الحوادث كانت الإصابة عن طريق:</Text>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>الرياضة</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>المنزل</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>العمل</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>الطريق</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>الحريق</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>أخرى</Text>
            <View style={[styles.fieldDots, { flex: 0.5, marginLeft: 8 }]}>
              <Text style={styles.fieldValue}>حدد</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>10.</Text>
            <Text style={styles.fieldLabel}>تاريخ الحادثة:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{' '}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>11.</Text>
            <Text style={styles.fieldLabel}>وقت الحادث:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{' '}</Text>
            </View>
          </View>
        </View>

        {/* Medical Tests and Immunization Section */}
        <View style={styles.section}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>12.</Text>
            <Text style={styles.fieldLabel}>اختبار السكر:</Text>
            <View style={{ flexDirection: 'row-reverse', marginLeft: 10 }}>
              <View style={styles.checkboxRow}>
                <View style={styles.checkbox} />
                <Text style={styles.checkboxLabel}>إيجابي</Text>
              </View>
              <View style={[styles.checkboxRow, { marginLeft: 15 }]}>
                <View style={styles.checkbox} />
                <Text style={styles.checkboxLabel}>عادي</Text>
              </View>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>13.</Text>
            <Text style={styles.fieldLabel}>التحصين من الأمراض السنة:</Text>
            <View style={{ flexDirection: 'row-reverse', marginLeft: 10, flexWrap: 'wrap' }}>
              <View style={styles.checkboxRow}>
                <View style={styles.checkbox} />
                <Text style={styles.checkboxLabel}>لم يحصن</Text>
              </View>
              <View style={[styles.checkboxRow, { marginLeft: 10 }]}>
                <View style={styles.checkbox} />
                <Text style={styles.checkboxLabel}>تحصين كلي</Text>
              </View>
              <View style={[styles.checkboxRow, { marginLeft: 10 }]}>
                <View style={styles.checkbox} />
                <Text style={styles.checkboxLabel}>تحصين جزئي</Text>
              </View>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>14.</Text>
            <Text style={styles.fieldLabel}>تاريخ التحصين:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{' '}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>15.</Text>
            <Text style={styles.fieldLabel}>مكان التحصين:</Text>
            <View style={styles.fieldDots}>
              <Text style={styles.fieldValue}>{' '}</Text>
            </View>
          </View>
        </View>

        {/* Discharge Status Section */}
        <View style={styles.section}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldNumber}>16.</Text>
            <Text style={styles.fieldLabel}>حالة المريض عند تركه المستشفى:</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>شفاء</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>لم يتحسن صحته</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>لم يعالج</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>هرب</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>توفي</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>حالة المريض عند تركه المستشفى هل شرحت للجنة:</Text>
            <View style={{ flexDirection: 'row-reverse', marginLeft: 10 }}>
              <View style={styles.checkboxRow}>
                <View style={styles.checkbox} />
                <Text style={styles.checkboxLabel}>نعم</Text>
              </View>
              <View style={[styles.checkboxRow, { marginLeft: 15 }]}>
                <View style={styles.checkbox} />
                <Text style={styles.checkboxLabel}>لا</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>انظر التعليمات بظاهرة</Text>
          <View style={styles.footerSignature}>
            <Text style={styles.fieldLabel}>توقيع الطبيب المعالج:</Text>
            <View style={[styles.fieldDots, { flex: 0.6, marginLeft: 8 }]}>
              <Text style={styles.fieldValue}>{' '}</Text>
            </View>
          </View>
        </View>

        <PdfFooter settings={settings} />
      </Page>
    </Document>
  );
}

