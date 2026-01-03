import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Admission } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

interface OperationSheetPdfProps {
  admission: Admission;
  settings: PdfSetting | null;
}

export default function OperationSheetPdf({
  admission,
  settings,
}: OperationSheetPdfProps) {
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
      marginBottom: 20,
      marginTop: 10,
    },
    fieldRow: {
      flexDirection: 'row',
      marginBottom: 12,
      alignItems: 'flex-start',
    },
    fieldLabel: {
      fontSize: fontSize,
      fontWeight: 'bold',
      minWidth: 100,
      marginRight: 10,
    },
    fieldDots: {
      flex: 1,
      borderBottom: '1 dotted #000',
      paddingBottom: 2,
      minHeight: 16,
    },
    fieldValue: {
      fontSize: fontSize,
      paddingLeft: 4,
    },
    procedureSection: {
      marginTop: 20,
    },
    procedureLabel: {
      fontSize: fontSize,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    procedureLines: {
      marginTop: 8,
    },
    procedureLine: {
      borderBottom: '1 dotted #000',
      marginBottom: 8,
      minHeight: 16,
    },
  });

  // Helper function to safely get text content
  const safeText = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return str.trim() === '' ? '' : str;
  };

  // Generate dotted lines for procedure section
  const procedureLines = Array.from({ length: 15 }, (_, i) => i);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader settings={settings} />

        {/* Title */}
        <Text style={styles.title}>Operation Sheet :</Text>

        {/* Information Fields */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Date:</Text>
          <View style={styles.fieldDots}>
            <Text style={styles.fieldValue}>{safeText(admission.admission_date)}</Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Time:</Text>
          <View style={styles.fieldDots}>
            <Text style={styles.fieldValue}>{' '}</Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Operation:</Text>
          <View style={styles.fieldDots}>
            <Text style={styles.fieldValue}>{safeText(admission.operations)}</Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Operator:</Text>
          <View style={styles.fieldDots}>
            <Text style={styles.fieldValue}>{safeText(admission.doctor?.name)}</Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Anesthetist:</Text>
          <View style={styles.fieldDots}>
            <Text style={styles.fieldValue}>{' '}</Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Assistant:</Text>
          <View style={styles.fieldDots}>
            <Text style={styles.fieldValue}>{' '}</Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Findings:</Text>
          <View style={styles.fieldDots}>
            <Text style={styles.fieldValue}>{' '}</Text>
          </View>
        </View>

        {/* Procedure Section */}
        <View style={styles.procedureSection}>
          <Text style={styles.procedureLabel}>Procedure:</Text>
          <View style={styles.procedureLines}>
            {procedureLines.map((_, index) => (
              <View key={index} style={styles.procedureLine}>
                <Text>{' '}</Text>
              </View>
            ))}
          </View>
        </View>

        <PdfFooter settings={settings} />
      </Page>
    </Document>
  );
}




