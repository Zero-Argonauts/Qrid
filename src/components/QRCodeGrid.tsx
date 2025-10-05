import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Card } from './ui/card';

interface QRCodeItem {
  id: string;
  data: string;
  rowData: Record<string, any>;
}

interface QRCodeGridProps {
  qrCodes: QRCodeItem[];
}

export function QRCodeGrid({ qrCodes }: QRCodeGridProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    qrCodes.forEach((qrCode, index) => {
      const canvas = canvasRefs.current[index];
      if (canvas) {
        QRCode.toCanvas(canvas, qrCode.data, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }).catch(err => console.error('QR Code generation error:', err));
      }
    });
  }, [qrCodes]);

  if (qrCodes.length === 0) {
    return (
      <div className="grid xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-8">
        {Array.from({ length: 9 }, (_, i) => (
          <Card key={i} className="h-60 aspect-ratio flex items-center justify-center bg-muted/50 p-4">
            <div className="bg-muted/30 rounded flex items-center justify-center">
              <span className="text-muted-foreground">No QR Code</span>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid xs:grid-cols-1 sb:grid-cols-2 md:grid-cols-3 gap-4 p-10">
      {qrCodes.map((qrCode, index) => (
        <Card key={qrCode.id} className="aspect-ratio flex flex-col items-center justify-center p-4">
          {qrCode.data ? (
            <>
              <canvas
                ref={el => canvasRefs.current[index] = el}
                width={200}
                height={200}
                className="w-[200px] h-[200px] shrink-0"
              />
              <div className="mt-2 text-center">
                <div className="text-xs text-muted-foreground">
                  Row {index + 1}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {Object.keys(qrCode.rowData).length} fields
                </div>
              </div>
            </>
          ) : (
            <div className="w-full aspect-square max-w-[220px] sm:max-w-[240px] md:max-w-[260px] min-w-[160px] bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              No QR Code
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}