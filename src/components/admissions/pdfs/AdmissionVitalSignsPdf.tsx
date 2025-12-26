import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { getAmiriFont } from '@/lib/pdfFonts';
import type { Admission, AdmissionVitalSign } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

// Static styles that don't depend on settings
const staticStyles = StyleSheet.create({
  section: {
    marginBottom: 15,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  value: {
    width: '70%',
    textAlign: 'right',
  },
  table: {
    marginTop: 10,
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
  },
  dateHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    backgroundColor: '#e0e0e0',
    padding: 5,
  },
});

interface AdmissionVitalSignsPdfProps {
  admission: Admission;
  vitalSigns: AdmissionVitalSign[];
  settings: PdfSetting | null;
}

export default function AdmissionVitalSignsPdf({
  admission,
  vitalSigns,
  settings,
}: AdmissionVitalSignsPdfProps) {
  const fontFamily = settings?.font_family || 'Amiri';
  const fontName = fontFamily === 'Amiri' ? getAmiriFont() : fontFamily;
  const fontSize = settings?.font_size || 10;

  const dynamicStyles = StyleSheet.create({
    page: {
      padding: 30,
      fontFamily: fontName,
      direction: 'rtl',
      textAlign: 'right',
      fontSize: fontSize,
    },
    title: {
      fontSize: fontSize + 10,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: fontSize + 4,
      fontWeight: 'bold',
      marginBottom: 8,
      borderBottom: '1 solid #000',
      paddingBottom: 4,
    },
    row: {
      flexDirection: 'row-reverse',
      marginBottom: 5,
      fontSize: fontSize,
    },
    tableHeader: {
      flexDirection: 'row-reverse',
      backgroundColor: '#f0f0f0',
      padding: 8,
      fontSize: fontSize - 1,
      fontWeight: 'bold',
    },
    tableRow: {
      flexDirection: 'row-reverse',
      padding: 6,
      fontSize: fontSize - 2,
      borderBottom: '1 solid #e0e0e0',
    },
  });

  // Group vital signs by date
  const groupedByDate = vitalSigns.reduce((acc, vs) => {
    const date = vs.reading_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(vs);
    return acc;
  }, {} as Record<string, AdmissionVitalSign[]>);

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Document>
      <Page size="A4" style={dynamicStyles.page}>
        <PdfHeader settings={settings} />
        <Text style={dynamicStyles.title}>تقرير العلامات الحيوية</Text>

        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>معلومات التنويم</Text>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>المريض:</Text>
            <Text style={staticStyles.value}>{admission.patient?.name || '-'}</Text>
          </View>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>تاريخ التنويم:</Text>
            <Text style={staticStyles.value}>{admission.admission_date || '-'}</Text>
          </View>
        </View>

        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>القراءات</Text>
          {sortedDates.map((date) => {
            const readings = groupedByDate[date].sort((a, b) =>
              b.reading_time.localeCompare(a.reading_time)
            );
            return (
              <View key={date} style={staticStyles.table}>
                <Text style={staticStyles.dateHeader}>
                  {new Date(date).toLocaleDateString('ar-SA')}
                </Text>
                <View style={dynamicStyles.tableHeader}>
                  <Text style={staticStyles.tableCell}>الوقت</Text>
                  <Text style={staticStyles.tableCell}>الحرارة</Text>
                  <Text style={staticStyles.tableCell}>ضغط الدم</Text>
                  <Text style={staticStyles.tableCell}>SpO2</Text>
                  <Text style={staticStyles.tableCell}>O2</Text>
                  <Text style={staticStyles.tableCell}>النبض</Text>
                </View>
                {readings.map((vs) => (
                  <View key={vs.id} style={dynamicStyles.tableRow}>
                    <Text style={staticStyles.tableCell}>{vs.reading_time}</Text>
                    <Text style={staticStyles.tableCell}>
                      {vs.temperature !== null ? `${vs.temperature}°C` : '-'}
                    </Text>
                    <Text style={staticStyles.tableCell}>
                      {vs.blood_pressure_systolic !== null &&
                      vs.blood_pressure_diastolic !== null
                        ? `${vs.blood_pressure_systolic}/${vs.blood_pressure_diastolic}`
                        : '-'}
                    </Text>
                    <Text style={staticStyles.tableCell}>
                      {vs.oxygen_saturation !== null ? `${vs.oxygen_saturation}%` : '-'}
                    </Text>
                    <Text style={staticStyles.tableCell}>
                      {vs.oxygen_flow !== null ? `${vs.oxygen_flow} L/min` : '-'}
                    </Text>
                    <Text style={staticStyles.tableCell}>
                      {vs.pulse_rate !== null ? `${vs.pulse_rate}` : '-'}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
          {vitalSigns.length === 0 && (
            <Text style={{ fontSize: fontSize, textAlign: 'center', marginTop: 20 }}>
              لا توجد قراءات للعلامات الحيوية
            </Text>
          )}
        </View>
        <PdfFooter settings={settings} />
      </Page>
    </Document>
  );
}

