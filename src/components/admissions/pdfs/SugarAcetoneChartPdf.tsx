import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Admission } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

interface SugarAcetoneChartPdfProps {
  admission: Admission;
  settings: PdfSetting | null;
}

export default function SugarAcetoneChartPdf({
  admission,
  settings,
}: SugarAcetoneChartPdfProps) {
  const fontFamily = settings?.font_family || 'Amiri';
  const fontName = fontFamily;
  const fontSize = settings?.font_size || 10;

  const styles = StyleSheet.create({
    page: {
      padding: 20,
      fontFamily: fontName,
      direction: 'ltr', // LTR for English form
      textAlign: 'left',
      fontSize: fontSize,
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
      flexDirection: 'row',
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
      borderRight: '1 solid #ccc',
    },
    tableRow: {
      flexDirection: 'row',
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
    // Column widths (7 columns)
    colDate: {
      width: '12%',
    },
    colTime: {
      width: '12%',
    },
    colSugar: {
      width: '15%',
    },
    colAcetone: {
      width: '15%',
    },
    colInsulin: {
      width: '15%',
    },
    colShift: {
      width: '15%',
    },
    colSign: {
      width: '16%',
    },
  });

  // Generate empty rows for the table
  const emptyRows = Array.from({ length: 30 }, (_, i) => i);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader settings={settings} />

        {/* Title */}
        <Text style={styles.title}>Sugar and acetone chart</Text>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, styles.colDate]}>
              <Text>Date</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colTime]}>
              <Text>Time</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colSugar]}>
              <Text>Sugar</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colAcetone]}>
              <Text>Acetone</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colInsulin]}>
              <Text>Insulin</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colShift]}>
              <Text>Shift</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colSign]}>
              <Text>Sign</Text>
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
              <View style={[styles.tableCell, styles.colSugar]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colAcetone]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colInsulin]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colShift]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colSign]}>
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

