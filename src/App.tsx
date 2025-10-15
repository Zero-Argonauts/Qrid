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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

// Describes a single QR code record rendered in the grid
interface QRCodeItem {
  id: string;
  data: string;
  rowData: Record<string, any>;
}

interface SheetQRData {
  name: string;
  qrCodes: QRCodeItem[];
}

export default function App() {
  // Application state
  const [sheets, setSheets] = useState<SheetQRData[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
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

  // Handle spreadsheet upload → generate QR lists per sheet
  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { cellDates: true });
      const baseUrl = "https://qrid.vercel.app/";

      // Helper: infer header row and data rows when the table starts mid-sheet
      const parseSheetWithHeaderInference = (sheet: XLSX.WorkSheet): Record<string, any>[] => {
        const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '', dateNF: 'yyyy-mm-dd' });
        if (!Array.isArray(aoa) || aoa.length === 0) return [];

        const isNonEmpty = (v: any) => v !== undefined && v !== null && String(v).trim() !== '';

        // Score each row as potential header: many non-empty cells, mostly strings
        let bestRow = 0;
        let bestScore = -1;
        for (let r = 0; r < aoa.length; r++) {
          const row = Array.isArray(aoa[r]) ? aoa[r] : [];
          const nonEmpty = row.filter(isNonEmpty);
          if (nonEmpty.length === 0) continue;
          const stringish = nonEmpty.filter(cell => typeof cell === 'string').length;
          const uniqueness = new Set(nonEmpty.map(c => String(c).toLowerCase())).size;
          const score = nonEmpty.length * 2 + stringish + uniqueness * 0.5;
          if (score > bestScore) {
            bestScore = score;
            bestRow = r;
          }
        }

        const headerRow = Array.isArray(aoa[bestRow]) ? aoa[bestRow] : [];

        // Determine active columns: those with header text or with values in next 10 rows
        const lookahead = 10;
        const colCount = headerRow.length || Math.max(...aoa.map(r => (Array.isArray(r) ? r.length : 0)), 0);
        const activeCols: number[] = [];
        for (let c = 0; c < colCount; c++) {
          const headerCell = headerRow[c];
          let hasDataBelow = false;
          for (let rr = bestRow + 1; rr < Math.min(aoa.length, bestRow + 1 + lookahead); rr++) {
            const row = Array.isArray(aoa[rr]) ? aoa[rr] : [];
            if (isNonEmpty(row[c])) { hasDataBelow = true; break; }
          }
          if (isNonEmpty(headerCell) || hasDataBelow) activeCols.push(c);
        }
        if (activeCols.length === 0) return [];

        // Build normalized headers
        const headers = activeCols.map((c, idx) => {
          const raw = headerRow[c];
          const name = isNonEmpty(raw) ? String(raw).trim() : `Column_${idx + 1}`;
          return name;
        });

        // Build rows from bestRow+1 downward until end; include rows with any non-empty in active columns
        const rows: Record<string, any>[] = [];
        for (let r = bestRow + 1; r < aoa.length; r++) {
          const arr = Array.isArray(aoa[r]) ? aoa[r] : [];
          const hasAny = activeCols.some(c => isNonEmpty(arr[c]));
          if (!hasAny) continue;
          const obj: Record<string, any> = {};
          activeCols.forEach((c, idx) => {
            const v = arr[c];
            const normalized = v instanceof Date
              ? new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().split('T')[0]
              : String(v ?? '');
            obj[headers[idx]] = normalized;
          });
          rows.push(obj);
        }
        return rows;
      };

      const parsedSheets: SheetQRData[] = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = parseSheetWithHeaderInference(sheet);

        const generatedUrls = rows.map(row => {
          const isOriginalCost = (key: string) => key.trim().toLowerCase() === 'original cost';
          const filtered = Object.entries(row).flatMap(([key, value]) => {
            const v = String(value ?? '').trim();
            if (v !== '') return [[key, value] as [string, any]];
            if (isOriginalCost(key)) return [[key, 'No Original Cost'] as [string, string]];
            return [] as [string, string][];
          });
          const rowStr = filtered
            .map(([key, value]) => `${key}=${value}`)
            .join("; ");
          return baseUrl + rowStr;
        });

        const qrCodes: QRCodeItem[] = generatedUrls.map((url, index) => ({
          id: `${sheetName}-qr-${index + 1}`,
          data: url,
          rowData: rows[index] ?? {}
        }));

        return { name: sheetName, qrCodes };
      });

      setSheets(parsedSheets);
      setActiveSheet(parsedSheets[0]?.name ?? '');

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
    const isOriginalCost = (key: string) => key.trim().toLowerCase() === 'original cost';
    const filtered = Object.entries(data).flatMap(([key, value]) => {
      const v = String(value ?? '').trim();
      if (v !== '') return [[key, value] as [string, string]];
      if (isOriginalCost(key)) return [[key, 'No Original Cost'] as [string, string]];
      return [] as [string, string][];
    });
    const rowStr = filtered
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
    const qrData = baseUrl + rowStr;

    const newQrCode: QRCodeItem = {
      id: `manual-qr-${Date.now()}`,
      data: qrData,
      rowData: data
    };

    // If no sheet yet, create a default Manual sheet; otherwise prepend to active sheet
    setSheets(prev => {
      if (!prev.length) {
        return [{ name: 'Manual', qrCodes: [newQrCode] }];
      }
      const targetName = activeSheet || prev[0].name;
      return prev.map(s => s.name === targetName ? { ...s, qrCodes: [newQrCode, ...s.qrCodes] } : s);
    });
    if (!activeSheet) setActiveSheet('Manual');
    setFileName('Manual Entry');
  };

  const HomeView = () => {
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
              <Card className='p-5'>

                <Table>
                  <TableBody>
                    {pathPairs.map((p, i) => (
                      <TableRow key={`${p.column}-${i}`} className='flex flex-col'>
                        <TableCell className="font-medium">{p.column}</TableCell>
                        <TableCell>{p.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

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
            <div className="flex">
              <SignOutButton redirectUrl="/">
                <Button variant="outline" size="sm">Log out</Button>
              </SignOutButton>
            </div>
          </SignedIn>
          {/* Header */}
          <div className="space-y-2 flex flex-col items-center">
            <div className='flex justify-between w-full'>
              {/* <img src="/university-logo.svg" alt="" className='xs:w-35 sm:w-60' /> */}
              <img src="/ssbas.svg" alt="" className='xs:w-35 sm:w-60' />
              <img src="Trust.svg" alt="" className='xs:w-15 sm:w-20' />
            </div>
            <p className="text-muted-foreground text-lg">
              SSBAS - Inventory Management System
            </p>
          </div>

          <SignedIn>
            <Card>
              <CardContent className="space-y-4 mt-6">
                <div className="flex sm:flex-row xs:flex-col items-start sm:items-center justify-between gap-4">
                  <FileUpload
                    onFileUpload={processExcelFile}
                    hasData={(sheets.find(s => s.name === activeSheet)?.qrCodes.length ?? 0) > 0}
                  />
                  <ExportButtons
                    qrCodes={sheets.find(s => s.name === activeSheet)?.qrCodes ?? []}
                    disabled={isProcessing}
                  />
                </div>

                {fileName && (
                  <div className="text-sm text-muted-foreground">
                    Current file: <span className="font-medium">{fileName}</span>
                    {(sheets.find(s => s.name === activeSheet)?.qrCodes.length ?? 0) > 0 && (
                      <span className="ml-2">
                        ({sheets.find(s => s.name === activeSheet)?.qrCodes.length} QR code{(sheets.find(s => s.name === activeSheet)?.qrCodes.length ?? 0) !== 1 ? 's' : ''} generated)
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

            {/* QR Code Grid by Sheet */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeSheet ? `${activeSheet} — ` : ''}QR Codes ({sheets.find(s => s.name === activeSheet)?.qrCodes.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {isProcessing ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground">Processing Excel file...</p>
                    </div>
                  </div>
                ) : (
                  sheets.length > 0 ? (
                    <Tabs value={activeSheet} onValueChange={setActiveSheet}>
                      <TabsList>
                        {sheets.map(s => (
                          <TabsTrigger key={s.name} value={s.name}>{s.name} ({s.qrCodes.length})</TabsTrigger>
                        ))}
                      </TabsList>
                      {sheets.map(s => (
                        <TabsContent key={s.name} value={s.name}>
                          <QRCodeGrid qrCodes={s.qrCodes} />
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    <QRCodeGrid qrCodes={[]} />
                  )
                )}
              </CardContent>
            </Card>
          </SignedIn>
          <SignedOut>
            <CardContent style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '50vh'
            }}>
              <SignIn appearance={{ elements: { formButtonPrimary: "w-full" } }} />
            </CardContent>
          </SignedOut>

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