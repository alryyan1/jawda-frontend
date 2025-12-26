import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { getAmiriFont } from '@/lib/pdfFonts';
import type { Admission, AdmissionRequestedService, AdmissionVitalSign } from '@/types/admissions';
import type { PdfSetting } from '@/types/pdfSettings';
import { formatNumber } from '@/lib/utils';
import PdfHeader from './PdfHeader';
import PdfFooter from './PdfFooter';

// Static styles that don't depend on settings
const staticStyles = StyleSheet.create({
  section: {
    marginBottom: 15,
    marginTop: 10,
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
});

interface AdmissionFullDataPdfProps {
  admission: Admission;
  services: AdmissionRequestedService[];
  vitalSigns: AdmissionVitalSign[];
  settings: PdfSetting | null;
}

export default function AdmissionFullDataPdf({
  admission,
  services,
  vitalSigns,
  settings,
}: AdmissionFullDataPdfProps) {
  const totalDebit = services.reduce((sum, s) => sum + (s.total_price || 0), 0);
  const totalCredit = services.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
  const totalBalance = totalDebit - totalCredit;

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

  const roomTypeLabel =
    admission.room?.room_type === 'normal'
      ? 'عادي'
      : admission.room?.room_type === 'vip'
      ? 'VIP'
      : '';

  // Group vital signs by date
  const groupedByDate = vitalSigns.reduce((acc, vs) => {
    const date = vs.reading_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(vs);
    return acc;
  }, {} as Record<string, AdmissionVitalSign[]>);

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Document>
      <Page size="A4" style={dynamicStyles.page}>
        <PdfHeader settings={settings} />
        <Text style={dynamicStyles.title}>التقرير الكامل - التنويم</Text>

        {/* Patient Info */}
        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>معلومات المريض</Text>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>اسم المريض:</Text>
            <Text style={staticStyles.value}>{admission.patient?.name || '-'}</Text>
          </View>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>الحالة:</Text>
            <Text style={staticStyles.value}>
              {admission.status === 'admitted'
                ? 'مقيم'
                : admission.status === 'discharged'
                ? 'مخرج'
                : 'منقول'}
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>الموقع</Text>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>القسم:</Text>
            <Text style={staticStyles.value}>{admission.ward?.name || '-'}</Text>
          </View>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>الغرفة:</Text>
            <Text style={staticStyles.value}>
              {admission.room?.room_number || '-'}
              {roomTypeLabel ? ` (${roomTypeLabel})` : ''}
            </Text>
          </View>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>السرير:</Text>
            <Text style={staticStyles.value}>{admission.bed?.bed_number || '-'}</Text>
          </View>
        </View>

        {/* Admission Details */}
        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>تفاصيل التنويم</Text>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>تاريخ القبول:</Text>
            <Text style={staticStyles.value}>{admission.admission_date || '-'}</Text>
          </View>
          {admission.days_admitted !== undefined && (
            <View style={dynamicStyles.row}>
              <Text style={staticStyles.label}>عدد الأيام:</Text>
              <Text style={staticStyles.value}>{admission.days_admitted} يوم</Text>
            </View>
          )}
        </View>

        {/* Services */}
        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>الخدمات الطبية المطلوبة</Text>
          {services.length > 0 ? (
            <View style={staticStyles.table}>
              <View style={dynamicStyles.tableHeader}>
                <Text style={staticStyles.tableCell}>الخدمة</Text>
                <Text style={staticStyles.tableCell}>السعر</Text>
                <Text style={staticStyles.tableCell}>المدفوع</Text>
                <Text style={staticStyles.tableCell}>المتبقي</Text>
              </View>
              {services.map((service) => (
                <View key={service.id} style={dynamicStyles.tableRow}>
                  <Text style={staticStyles.tableCell}>{service.service?.name || '-'}</Text>
                  <Text style={staticStyles.tableCell}>{formatNumber(service.total_price || 0)}</Text>
                  <Text style={staticStyles.tableCell}>{formatNumber(service.amount_paid || 0)}</Text>
                  <Text style={staticStyles.tableCell}>
                    {formatNumber((service.total_price || 0) - (service.amount_paid || 0))}
                  </Text>
                </View>
              ))}
              <View style={[dynamicStyles.tableRow, { backgroundColor: '#f5f5f5', fontWeight: 'bold' }]}>
                <Text style={staticStyles.tableCell}>الإجمالي</Text>
                <Text style={staticStyles.tableCell}>{formatNumber(totalDebit)}</Text>
                <Text style={staticStyles.tableCell}>{formatNumber(totalCredit)}</Text>
                <Text style={staticStyles.tableCell}>{formatNumber(totalBalance)}</Text>
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: fontSize }}>لا توجد خدمات</Text>
          )}
        </View>

        {/* Vital Signs */}
        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>العلامات الحيوية</Text>
          {sortedDates.length > 0 ? (
            sortedDates.map((date) => {
              const readings = groupedByDate[date].sort((a, b) =>
                b.reading_time.localeCompare(a.reading_time)
              );
              return (
                <View key={date} style={staticStyles.table}>
                  <Text style={{ fontSize: fontSize, fontWeight: 'bold', marginBottom: 5 }}>
                    {new Date(date).toLocaleDateString('ar-SA')}
                  </Text>
                  <View style={dynamicStyles.tableHeader}>
                    <Text style={staticStyles.tableCell}>الوقت</Text>
                    <Text style={staticStyles.tableCell}>الحرارة</Text>
                    <Text style={staticStyles.tableCell}>ضغط الدم</Text>
                    <Text style={staticStyles.tableCell}>SpO2</Text>
                  </View>
                  {readings.slice(0, 5).map((vs) => (
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
                    </View>
                  ))}
                </View>
              );
            })
          ) : (
            <Text style={{ fontSize: fontSize }}>لا توجد قراءات</Text>
          )}
        </View>
        <PdfFooter settings={settings} />
      </Page>
    </Document>
  );
}

