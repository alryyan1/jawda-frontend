import React from "react";
import { View, Image, Text, StyleSheet } from "@react-pdf/renderer";
import type { PdfSetting } from "@/types/pdfSettings";
// Font is registered dynamically based on settings

interface PdfHeaderProps {
  settings: PdfSetting | null;
}

const PdfHeader: React.FC<PdfHeaderProps> = ({ settings }) => {
  const fontFamily = settings?.font_family || "Amiri";
  const fontName = fontFamily; // Font is registered dynamically before PDF generation
  console.log(settings,'inside pdf header');
  // If header image exists, display it full width
  if (settings?.header_image_url || settings?.header_image_path) {
    return (
      <View style={styles.headerImageContainer}>
        <Image
          src={settings.header_image_url || settings.header_image_path || ""}
          style={styles.headerImage}
        />
      </View>
    );
  }

  // Otherwise, display hospital name and logo
  return (
    <View style={styles.headerContainer}>
      {(settings?.logo_url || settings?.logo_path) && (
        <View
          style={[
            styles.logoContainer,
            settings.logo_position === "left"
              ? styles.logoLeft
              : styles.logoRight,
          ]}
        >
          <Image
            src={settings.logo_url || settings.logo_path || ""}
            style={[
              styles.logo,
              ...(settings.logo_width
                ? [{ width: `${settings.logo_width}mm` }]
                : []),
              ...(settings.logo_height
                ? [{ height: `${settings.logo_height}mm` }]
                : []),
            ]}
          />
        </View>
      )}
      {settings?.hospital_name && (
        <View style={styles.hospitalNameContainer}>
          <Text style={[styles.hospitalName, { fontFamily: fontName }]}>
            {String(settings.hospital_name || '')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerImageContainer: {
    width: "100%",
    marginBottom: 10,
  },
  headerImage: {
    width: "100%",
    objectFit: "contain",
  },
  headerContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  logoContainer: {
    flexShrink: 0,
  },
  logoLeft: {
    marginRight: "auto",
    marginLeft: 0,
  },
  logoRight: {
    marginLeft: "auto",
    marginRight: 0,
  },
  logo: {
    maxWidth: "50mm",
    maxHeight: "30mm",
    objectFit: "contain",
  },
  hospitalNameContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "right",
    color: "#000",
  },
});

export default PdfHeader;


