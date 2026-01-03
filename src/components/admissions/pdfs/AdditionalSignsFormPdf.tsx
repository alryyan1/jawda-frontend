import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Admission } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

interface AdditionalSignsFormPdfProps {
  admission: Admission;
  settings: PdfSetting | null;
}

export default function AdditionalSignsFormPdf({
  admission,
  settings,
}: AdditionalSignsFormPdfProps) {
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
    title: {
      fontSize: fontSize + 4,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 15,
      marginTop: 10,
    },
    servicesList: {
      marginBottom: 15,
      paddingRight: 10,
    },
    serviceItem: {
      flexDirection: 'row-reverse',
      marginBottom: 6,
      fontSize: fontSize,
    },
    serviceNumber: {
      marginLeft: 8,
      fontWeight: 'bold',
    },
    patientNameField: {
      flexDirection: 'row-reverse',
      marginBottom: 15,
      fontSize: fontSize,
      alignItems: 'center',
    },
    patientNameLabel: {
      marginLeft: 10,
      fontWeight: 'bold',
    },
    patientNameDots: {
      flex: 1,
      borderBottom: '1 solid #000',
      marginLeft: 10,
      paddingBottom: 2,
    },
    table: {
      marginTop: 10,
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
      borderRight: '1 solid #ccc',
    },
    // Column widths (5 columns)
    colDate: {
      width: '15%',
    },
    colTreatment: {
      width: '30%',
    },
    colQuantity: {
      width: '20%',
    },
    colSignature: {
      width: '20%',
    },
    colFees: {
      width: '15%',
    },
  });

  // Helper function to safely get text content
  const safeText = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return str.trim() === '' ? '' : str;
  };

  // Generate empty rows for the table
  const emptyRows = Array.from({ length: 20 }, (_, i) => i);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader settings={settings} />

        {/* Title */}
        <Text style={styles.title}>أورنيك العلامات الإضافية</Text>

        {/* Services List */}
        <View style={styles.servicesList}>
          <View style={styles.serviceItem}>
            <Text style={styles.serviceNumber}>1.</Text>
            <Text>الأكسجين</Text>
          </View>
          <View style={styles.serviceItem}>
            <Text style={styles.serviceNumber}>2.</Text>
            <Text>حضانة الأطفال</Text>
          </View>
          <View style={styles.serviceItem}>
            <Text style={styles.serviceNumber}>3.</Text>
            <Text>نوبيو الأزر</Text>
          </View>
          <View style={styles.serviceItem}>
            <Text style={styles.serviceNumber}>4.</Text>
            <Text>العلاج الضوئي</Text>
          </View>
          <View style={styles.serviceItem}>
            <Text style={styles.serviceNumber}>5.</Text>
            <Text>رسم القلب</Text>
          </View>
        </View>

        {/* Patient Name Field */}
        <View style={styles.patientNameField}>
          <Text style={styles.patientNameLabel}>اسم المريض:</Text>
          <View style={styles.patientNameDots}>
            <Text>{safeText(admission.patient?.name)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, styles.colDate]}>
              <Text>التاريخ</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colTreatment]}>
              <Text>نوع العلاج الإضافي</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colQuantity]}>
              <Text>العدد أو الكمية</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colSignature]}>
              <Text>الإمضاء</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colFees]}>
              <Text>الرسوم</Text>
            </View>
          </View>

          {/* Table Rows */}
          {emptyRows.map((_, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.colDate]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colTreatment]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colQuantity]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colSignature]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colFees]}>
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

