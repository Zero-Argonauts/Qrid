import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileUpload } from './components/FileUpload';
import { QRCodeGrid } from './components/QRCodeGrid';
import { ExportButtons } from './components/ExportButtons';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Alert, AlertDescription } from './components/ui/alert';
import { Button } from './components/ui/button';
import { Info } from 'lucide-react';
import { ManualQRInput } from './components/ManualQRInput';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { SignedIn, SignedOut, SignIn, SignOutButton } from '@clerk/clerk-react'
import { useLocation, Routes, Route } from 'react-router-dom';
import SignUpPage from './pages/SignUp';
import SignInPage from './pages/SignIn';


// Describes a single QR code record rendered in the grid
interface QRCodeItem {
  id: string;
  data: string;
  rowData: Record<string, any>;
}

export default function App() {
  // Application state
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const location = useLocation();
  
  // Parse key=value pairs from the URL path (used for viewer mode)
  const pathPairs = useMemo(() => {
    const raw = location.pathname.slice(1);
    if (!raw) return [] as { column: string; value: string }[];
    const decoded = decodeURIComponent(raw).trim();
    if (!decoded) return [] as { column: string; value: string }[];
    if (!decoded.includes('=')) return [] as { column: string; value: string }[];
    return decoded
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map(seg => {
        const [column, ...rest] = seg.split('=');
        return { column: column ?? '', value: rest.join('=') ?? '' };
      })
      .filter(p => p.column);
  }, [location.pathname]);

  // Handle spreadsheet upload → generate QR list
  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        raw: false,
        defval: '',
        dateNF: 'yyyy-mm-dd'
      });


      const baseUrl = "https://qrid.vercel.app/";
      const generatedUrls = (rows as Record<string, any>[]).map(row => {
        // Build "key=value; key=value" string for each row
        const rowStr = Object.entries(row)
          .map(([key, value]) => {
            // Normalize dates and other types to strings
            const v = value instanceof Date
              ? new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().split('T')[0]
              : String(value);
            return `${key}=${v}`;
          })
          .join("; ");
        return baseUrl + rowStr;
      });

      const newQrCodes: QRCodeItem[] = generatedUrls.map((url, index) => ({
        id: `qr-${index + 1}`,
        data: url,
        rowData: (rows as Record<string, any>[])[index] ?? {}
      }));

      setQrCodes(newQrCodes);

    } catch (error) {
      console.error('Error processing Excel file:', error);
      alert('Error processing Excel file. Please make sure it\'s a valid Excel file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle manual form input → prepend newest QR to grid
  const handleManualGenerate = (data: Record<string, string>) => {
    // Build URL with base + semicolon-delimited key=value pairs
    const baseUrl = "https://qrid.vercel.app/";
    const rowStr = Object.entries(data)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
    const qrData = baseUrl + rowStr;

    const newQrCode: QRCodeItem = {
      id: `manual-qr-${Date.now()}`,
      data: qrData,
      rowData: data
    };

    setQrCodes([newQrCode, ...qrCodes]);
    setFileName('Manual Entry');
  };

  // Main routed view for "/": shows either the viewer (if path has key=value)
  // or the primary app interface (upload, manual entry, grid)
  const HomeView = () => {
    // Viewer mode when the URL contains key=value pairs
    if (pathPairs.length > 0) {
      return (
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-6xl mx-auto space-y-6">
          <SignedIn>
            <div className="flex justify-end">
              <SignOutButton redirectUrl="/">
                <Button variant="outline" size="sm">Log out</Button>
              </SignOutButton>
            </div>
          </SignedIn>
            <SignedIn>
              <Card>
                <CardHeader>
                  <CardTitle>Asset Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Field</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pathPairs.map((p, i) => (
                        <TableRow key={`${p.column}-${i}`}>
                          <TableCell className="font-medium">{p.column}</TableCell>
                          <TableCell>{p.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </SignedIn>
            <SignedOut>
              <CardContent style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh'
              }}>
              <SignIn appearance={{ elements: { formButtonPrimary: "w-full" } }} />
            </CardContent>
          </SignedOut>
        </div>
        </div >
      );
}

return (
  <div className="min-h-screen bg-background p-6">
    <div className="max-w-6xl mx-auto space-y-6">
        {/* Signed-in header actions */}
        <SignedIn>
          <div className="flex justify-end">
            <SignOutButton redirectUrl="/">
              <Button variant="outline" size="sm">Log out</Button>
            </SignOutButton>
          </div>
        </SignedIn>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl">Qrid</h1>
        <p className="text-muted-foreground">
          Upload an Excel file and convert each row into a QR code
        </p>
      </div>

      {/* Controls */}
      <Card>
        {/* <CardHeader>
              <CardTitle></CardTitle>
            </CardHeader> */}
        <div></div>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <FileUpload
              onFileUpload={processExcelFile}
              hasData={qrCodes.length > 0}
            />
            <ExportButtons
              qrCodes={qrCodes}
              disabled={isProcessing}
            />
          </div>

          {fileName && (
            <div className="text-sm text-muted-foreground">
              Current file: <span className="font-medium">{fileName}</span>
              {qrCodes.length > 0 && (
                <span className="ml-2">
                  ({qrCodes.length} QR code{qrCodes.length !== 1 ? 's' : ''} generated)
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Manual QR Input */}
      <ManualQRInput onGenerate={handleManualGenerate} />
      {/* Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Upload an Excel file (.xlsx or .xls) to generate QR codes from each row.
        </AlertDescription>
      </Alert>

      {/* QR Code Grid */}
      <Card>
        <CardHeader>
          <CardTitle>QR Codes ({qrCodes.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isProcessing ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Processing Excel file...</p>
              </div>
            </div>
          ) : (
            <QRCodeGrid qrCodes={qrCodes} />
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Each QR code stores the data from its Excel row.</p>
      </div>
    </div>
  </div>
);
  };

// Application routes
return (
  <Routes>
    <Route path="/sign-up/*" element={<SignUpPage />} />
    <Route path="/sign-in/*" element={<SignInPage />} />
    <Route path="/*" element={<HomeView />} />
  </Routes>
);
}