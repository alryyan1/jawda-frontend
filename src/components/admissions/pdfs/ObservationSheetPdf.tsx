import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Admission } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

interface ObservationSheetPdfProps {
  admission: Admission;
  settings: PdfSetting | null;
}

export default function ObservationSheetPdf({
  admission,
  settings,
}: ObservationSheetPdfProps) {
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
    // Column widths (9 columns)
    colDate: {
      width: '11%',
    },
    colTime: {
      width: '11%',
    },
    colBP: {
      width: '11%',
    },
    colPulse: {
      width: '11%',
    },
    colTemp: {
      width: '11%',
    },
    colB: {
      width: '11%',
    },
    colR: {
      width: '11%',
    },
    colSlit: {
      width: '11%',
    },
    colSign: {
      width: '12%',
    },
  });

  // Generate empty rows for the table
  const emptyRows = Array.from({ length: 28 }, (_, i) => i);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader settings={settings} />

        {/* Title */}
        <Text style={styles.title}>OBSERVATION - SHEET</Text>

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
            <View style={[styles.tableHeaderCell, styles.colBP]}>
              <Text>B.P.</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colPulse]}>
              <Text>Pulse</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colTemp]}>
              <Text>Temp</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colB]}>
              <Text>B</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colR]}>
              <Text>R</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colSlit]}>
              <Text>Slit</Text>
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
              <View style={[styles.tableCell, styles.colBP]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colPulse]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colTemp]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colB]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colR]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colSlit]}>
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




