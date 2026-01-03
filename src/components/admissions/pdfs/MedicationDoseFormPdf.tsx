import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Admission } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

interface MedicationDoseFormPdfProps {
  admission: Admission;
  settings: PdfSetting | null;
}

export default function MedicationDoseFormPdf({
  admission,
  settings,
}: MedicationDoseFormPdfProps) {
  const fontFamily = settings?.font_family || 'Amiri';
  const fontName = fontFamily;
  const fontSize = settings?.font_size || 10;

  const styles = StyleSheet.create({
    page: {
      padding: 20,
      fontFamily: fontName,
      direction: 'rtl',
      textAlign: 'right',
      fontSize: fontSize,
    },
    patientInfoSection: {
      flexDirection: 'row-reverse',
      marginBottom: 15,
      paddingBottom: 10,
      borderBottom: '1 solid #ccc',
    },
    patientInfoLeft: {
      width: '50%',
      paddingRight: 15,
    },
    patientInfoRight: {
      width: '50%',
      paddingLeft: 15,
    },
    patientInfoRow: {
      flexDirection: 'row-reverse',
      marginBottom: 8,
      fontSize: fontSize,
      alignItems: 'center',
    },
    patientInfoLabel: {
      marginLeft: 10,
      fontWeight: 'bold',
      minWidth: 80,
    },
    patientInfoDots: {
      flex: 1,
      borderBottom: '1 dotted #000',
      marginLeft: 10,
      paddingBottom: 2,
    },
    table: {
      marginTop: 15,
    },
    tableHeader: {
      flexDirection: 'row-reverse',
      borderBottom: '2 solid #000',
      paddingBottom: 6,
      marginBottom: 4,
      backgroundColor: '#f5f5f5',
    },
    tableHeaderCell: {
      fontSize: fontSize,
      fontWeight: 'bold',
      textAlign: 'center',
      padding: 4,
      borderLeft: '1 solid #ccc',
    },
    tableRow: {
      flexDirection: 'row-reverse',
      borderBottom: '1 solid #ccc',
      minHeight: 25,
      paddingVertical: 4,
    },
    tableCell: {
      fontSize: fontSize - 1,
      textAlign: 'center',
      padding: 4,
      borderLeft: '1 solid #ccc',
    },
    // Column widths (4 columns)
    colDate: {
      width: '25%',
    },
    colTime: {
      width: '25%',
    },
    colDose: {
      width: '25%',
    },
    colSignature: {
      width: '25%',
    },
  });

  // Helper function to safely get text content
  const safeText = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return str.trim() === '' ? '' : str;
  };

  // Generate empty rows for the table
  const emptyRows = Array.from({ length: 30 }, (_, i) => i);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader settings={settings} />

        {/* Patient Information Section */}
        <View style={styles.patientInfoSection}>
          <View style={styles.patientInfoLeft}>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>اسم المريض:</Text>
              <View style={styles.patientInfoDots}>
                <Text>{safeText(admission.patient?.name)}</Text>
              </View>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>رقم الغرفة:</Text>
              <View style={styles.patientInfoDots}>
                <Text>{safeText(admission.room?.room_number)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.patientInfoRight}>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>سرير:</Text>
              <View style={styles.patientInfoDots}>
                <Text>{safeText(admission.bed?.bed_number)}</Text>
              </View>
            </View>
            <View style={styles.patientInfoRow}>
              <Text style={styles.patientInfoLabel}>التاريخ:</Text>
              <View style={styles.patientInfoDots}>
                <Text>{safeText(admission.admission_date)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, styles.colDate]}>
              <Text>التاريخ</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colTime]}>
              <Text>الزمن</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colDose]}>
              <Text>الجرعة</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colSignature]}>
              <Text>التوقيع</Text>
            </View>
          </View>

          {/* Table Rows */}
          {emptyRows.map((_, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.colDate]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colTime]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colDose]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colSignature]}>
                <Text>{' '}</Text>
              </View>
            </View>
          ))}
        </View>

        <PdfFooter settings={settings} />
      </Page>
    </Document>
  );
}

