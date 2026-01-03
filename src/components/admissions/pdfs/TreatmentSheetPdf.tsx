import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Admission } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

interface TreatmentSheetPdfProps {
  admission: Admission;
  settings: PdfSetting | null;
}

export default function TreatmentSheetPdf({
  admission,
  settings,
}: TreatmentSheetPdfProps) {
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
    // Column widths - approximate based on image
    colDateStart1: {
      width: '10%',
    },
    colDateEnd1: {
      width: '10%',
    },
    colMedication: {
      width: '25%',
    },
    colDateStart2: {
      width: '10%',
    },
    colDateEnd2: {
      width: '10%',
    },
    colDirt: {
      width: '15%',
    },
    colOtherTreatment: {
      width: '20%',
    },
  });

  // Generate empty rows for the table
  const emptyRows = Array.from({ length: 25 }, (_, i) => i);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader settings={settings} />

        {/* Title */}
        <Text style={styles.title}>TREATMENT SHEET</Text>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, styles.colDateStart1]}>
              <Text>Date Start</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colDateEnd1]}>
              <Text>Date End</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colMedication]}>
              <Text>MEDICATION</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colDateStart2]}>
              <Text>Date Start</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colDateEnd2]}>
              <Text>Date End</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colDirt]}>
              <Text>DIRT</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colOtherTreatment]}>
              <Text>OTHER TREATMENT</Text>
            </View>
          </View>

          {/* Table Rows */}
          {emptyRows.map((_, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.colDateStart1]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colDateEnd1]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colMedication]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colDateStart2]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colDateEnd2]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colDirt]}>
                <Text>{' '}</Text>
              </View>
              <View style={[styles.tableCell, styles.colOtherTreatment]}>
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

