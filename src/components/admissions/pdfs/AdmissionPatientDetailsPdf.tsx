import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
// Font is registered dynamically based on settings
import type { Admission } from '@/types/admissions';
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
  notesBox: {
    marginTop: 10,
    padding: 10,
    border: '1 solid #000',
    fontSize: 10,
    minHeight: 50,
  },
});

interface AdmissionPatientDetailsPdfProps {
  admission: Admission;
  settings: PdfSetting | null;
}

export default function AdmissionPatientDetailsPdf({
  admission,
  settings,
}: AdmissionPatientDetailsPdfProps) {
  const roomTypeLabel =
    admission.room?.room_type === 'normal'
      ? 'عادي'
      : admission.room?.room_type === 'vip'
      ? 'VIP'
      : '';

  const fontFamily = settings?.font_family || 'Amiri';
  const fontName = fontFamily; // Font is registered dynamically before PDF generation
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
  });

  return (
    <Document>
      <Page size="A4" style={dynamicStyles.page}>
        <PdfHeader settings={settings} />
        <Text style={dynamicStyles.title}>تفاصيل المريض - التنويم</Text>

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

        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>تفاصيل التنويم</Text>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>تاريخ التنويم:</Text>
            <Text style={staticStyles.value}>{admission.admission_date || '-'}</Text>
          </View>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>وقت التنويم:</Text>
            <Text style={staticStyles.value}>{admission.admission_time || '-'}</Text>
          </View>
          {admission.discharge_date && (
            <>
              <View style={dynamicStyles.row}>
                <Text style={staticStyles.label}>تاريخ الخروج:</Text>
                <Text style={staticStyles.value}>{admission.discharge_date}</Text>
              </View>
              <View style={dynamicStyles.row}>
                <Text style={staticStyles.label}>وقت الخروج:</Text>
                <Text style={staticStyles.value}>{admission.discharge_time || '-'}</Text>
              </View>
            </>
          )}
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>نوع التنويم:</Text>
            <Text style={staticStyles.value}>{admission.admission_type || '-'}</Text>
          </View>
          {admission.days_admitted !== undefined && (
            <View style={dynamicStyles.row}>
              <Text style={staticStyles.label}>عدد الأيام:</Text>
              <Text style={staticStyles.value}>{admission.days_admitted} يوم</Text>
            </View>
          )}
        </View>

        <View style={staticStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>المعلومات الطبية</Text>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>الطبيب:</Text>
            <Text style={staticStyles.value}>{admission.doctor?.name || '-'}</Text>
          </View>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>سبب التنويم:</Text>
            <Text style={staticStyles.value}>{admission.admission_reason || '-'}</Text>
          </View>
          <View style={dynamicStyles.row}>
            <Text style={staticStyles.label}>التشخيص الطبي:</Text>
            <Text style={staticStyles.value}>{admission.diagnosis || '-'}</Text>
          </View>
        </View>

        {admission.notes && (
          <View style={staticStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>الملاحظات الطبية</Text>
            <View style={staticStyles.notesBox}>
              <Text>{admission.notes}</Text>
            </View>
          </View>
        )}
        <PdfFooter settings={settings} />
      </Page>
    </Document>
  );
}

