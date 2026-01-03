import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Admission } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

interface ClaimFormPdfProps {
  admission: Admission;
  settings: PdfSetting | null;
}

export default function ClaimFormPdf({
  admission,
  settings,
}: ClaimFormPdfProps) {
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
    subtitle: {
      fontSize: fontSize,
      textAlign: 'center',
      marginBottom: 5,
      marginTop: 5,
    },
    title: {
      fontSize: fontSize + 4,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 15,
      marginTop: 10,
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
    // Column widths (5 columns)
    colPatientName: {
      width: '25%',
    },
    colSpecialist: {
      width: '25%',
    },
    colDate: {
      width: '20%',
    },
    colVisitTime: {
      width: '15%',
    },
    colSignature: {
      width: '15%',
    },
  });

  // Generate empty rows for the table
  const emptyRows = Array.from({ length: 25 }, (_, i) => i);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader settings={settings} />

        {/* Subtitle */}
        <Text style={styles.subtitle}>لاستعمال الأخصائي</Text>

        {/* Title */}
        <Text style={styles.title}>أورنيك مطالبة</Text>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, styles.colPatientName]}>
              <Text>اسم المريض</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colSpecialist]}>
              <Text>الأخصائي</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colDate]}>
              <Text>التاريخ</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colVisitTime]}>
              <Text>زمن الزيارة</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colSignature]}>
              <Text>التوقيع</Text>
            </View>
          </View>

          {/* Table Rows */}
          {emptyRows.map((_, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.colPatientName]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colSpecialist]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colDate]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colVisitTime]}>
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




