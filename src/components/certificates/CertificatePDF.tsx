'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';

// Register fonts (using system fonts for now)
// You can add custom fonts later if needed

// Certificate data interface
interface CertificateData {
  studentName: string;
  courseName: string;
  iterationName: string;
  issuedDate: string;
  verificationCode: string;
  qrCodeDataUrl: string;
  issuerName: string;
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  container: {
    flex: 1,
    border: '3pt solid #1e3a5f',
    borderRadius: 8,
    padding: 40,
    position: 'relative',
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    border: '1pt solid #c4a052',
    borderRadius: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 14,
    color: '#1e3a5f',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    color: '#1e3a5f',
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 30,
  },
  body: {
    alignItems: 'center',
    marginBottom: 30,
  },
  presentedTo: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  studentName: {
    fontSize: 32,
    color: '#1e3a5f',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  completionText: {
    fontSize: 12,
    color: '#444444',
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 10,
  },
  courseName: {
    fontSize: 18,
    color: '#1e3a5f',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  iterationName: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 30,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 20,
  },
  signatureSection: {
    alignItems: 'center',
    width: '40%',
  },
  signatureLine: {
    width: '100%',
    borderBottom: '1pt solid #333333',
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 10,
    color: '#666666',
  },
  issuerName: {
    fontSize: 12,
    color: '#333333',
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  qrSection: {
    alignItems: 'center',
  },
  qrCode: {
    width: 80,
    height: 80,
    marginBottom: 4,
  },
  verificationCode: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
  },
  verificationLabel: {
    fontSize: 7,
    color: '#999999',
    textAlign: 'center',
    marginTop: 2,
  },
  dateSection: {
    alignItems: 'center',
    width: '40%',
  },
  date: {
    fontSize: 12,
    color: '#333333',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 10,
    color: '#666666',
  },
  decorativeCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
  },
  topLeft: {
    top: 20,
    left: 20,
    borderTop: '2pt solid #c4a052',
    borderLeft: '2pt solid #c4a052',
  },
  topRight: {
    top: 20,
    right: 20,
    borderTop: '2pt solid #c4a052',
    borderRight: '2pt solid #c4a052',
  },
  bottomLeft: {
    bottom: 20,
    left: 20,
    borderBottom: '2pt solid #c4a052',
    borderLeft: '2pt solid #c4a052',
  },
  bottomRight: {
    bottom: 20,
    right: 20,
    borderBottom: '2pt solid #c4a052',
    borderRight: '2pt solid #c4a052',
  },
});

// Certificate PDF Document Component
export function CertificatePDF({ data }: { data: CertificateData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.container}>
          {/* Decorative inner border */}
          <View style={styles.innerBorder} />

          {/* Decorative corners */}
          <View style={[styles.decorativeCorner, styles.topLeft]} />
          <View style={[styles.decorativeCorner, styles.topRight]} />
          <View style={[styles.decorativeCorner, styles.bottomLeft]} />
          <View style={[styles.decorativeCorner, styles.bottomRight]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>YALE MODEL AFRICAN UNION</Text>
            <Text style={styles.title}>Certificate of Completion</Text>
            <Text style={styles.subtitle}>Training Program Achievement</Text>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.presentedTo}>This is to certify that</Text>
            <Text style={styles.studentName}>{data.studentName}</Text>
            <Text style={styles.completionText}>
              has successfully completed all requirements for
            </Text>
            <Text style={styles.courseName}>{data.courseName}</Text>
            <Text style={styles.iterationName}>{data.iterationName}</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {/* Date Section */}
            <View style={styles.dateSection}>
              <Text style={styles.date}>{data.issuedDate}</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.dateLabel}>Date of Issue</Text>
            </View>

            {/* QR Code Section */}
            <View style={styles.qrSection}>
              {data.qrCodeDataUrl && (
                <Image style={styles.qrCode} src={data.qrCodeDataUrl} />
              )}
              <Text style={styles.verificationCode}>{data.verificationCode}</Text>
              <Text style={styles.verificationLabel}>Scan to verify</Text>
            </View>

            {/* Signature Section */}
            <View style={styles.signatureSection}>
              <Text style={styles.issuerName}>{data.issuerName}</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Program Director</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export type { CertificateData };
