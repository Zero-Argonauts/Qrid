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
      <div className="grid grid-cols-3 gap-4 p-8">
        {Array.from({ length: 9 }, (_, i) => (
          <Card key={i} className="aspect-square flex items-center justify-center bg-muted/50">
            <div className="text-muted-foreground">No QR Code</div>
          </Card>
        ))}
      </div>
    );
  }

  // Fill empty slots with placeholder cards
  // const displayItems = [...qrCodes];
  // while (displayItems.length < 9) {
  //   displayItems.push({
  //     id: `empty-${displayItems.length}`,
  //     data: '',
  //     rowData: {}
  //   });
  // }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8">
      {qrCodes.map((qrCode, index) => (
        <Card key={qrCode.id} className="aspect-square flex flex-col items-center justify-center p-4">
          {qrCode.data ? (
            <>
              <canvas
                ref={el => canvasRefs.current[index] = el}
                className="max-w-full max-h-full"
              />
              <div className="mt-2 text-center">
                <div className="text-xs text-muted-foreground">
                  Row {index + 1}
                </div>
                <div className="text-xs text-muted-foreground mt-1 max-w-full truncate">
                  {Object.keys(qrCode.rowData).length} fields
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">No QR Code</div>
          )}
        </Card>
      ))}
    </div>
  );
}