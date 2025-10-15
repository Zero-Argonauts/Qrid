import React, { useEffect, useRef, useState } from 'react';
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
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [visible, setVisible] = useState<Record<number, boolean>>({});

  const getAssetTag = (rowData: Record<string, any>): string | null => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const candidates = ['assettagging', 'assettag', 'assettagid', 'assetid'];
    for (const key of Object.keys(rowData)) {
      const n = normalize(key);
      if (candidates.includes(n)) {
        const value = rowData[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value);
        }
      }
    }
    return null;
  };

  // Reset visibility mapping when the dataset changes
  useEffect(() => {
    setVisible({});
  }, [qrCodes]);

  // Setup IntersectionObserver to lazily render QR codes when in view
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const target = entry.target as HTMLDivElement;
        const idxAttr = target.getAttribute('data-index');
        const index = idxAttr ? parseInt(idxAttr, 10) : -1;
        if (index >= 0 && entry.isIntersecting) {
          setVisible(prev => (prev[index] ? prev : { ...prev, [index]: true }));
          observerRef.current?.unobserve(target);
        }
      });
    }, { root: null, rootMargin: '100px 0px', threshold: 0.1 });

    containerRefs.current.forEach((el, index) => {
      if (el) {
        el.setAttribute('data-index', String(index));
        observerRef.current?.observe(el);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [qrCodes]);

  // Draw QR codes for items that became visible
  useEffect(() => {
    Object.entries(visible).forEach(([idxStr, isVisible]) => {
      if (!isVisible) return;
      const index = parseInt(idxStr, 10);
      const item = qrCodes[index];
      const canvas = canvasRefs.current[index];
      if (item && canvas) {
        QRCode.toCanvas(canvas, item.data, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }).catch(err => console.error('QR Code generation error:', err));
      }
    });
  }, [visible, qrCodes]);

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
              <div ref={el => containerRefs.current[index] = el} className="w-[200px] h-[200px] shrink-0 flex items-center justify-center bg-muted/20">
                <canvas
                  ref={el => canvasRefs.current[index] = el}
                  width={200}
                  height={200}
                  className="w-[200px] h-[200px] shrink-0"
                />
              </div>
              <div className="mt-2 text-center">
                <div className="text-xs text-muted-foreground">Row {index + 1}</div>
                {(() => {
                  const tag = getAssetTag(qrCode.rowData);
                  return tag ? (
                    <div className="text-sm mt-1 font-medium truncate" title={tag}>
                      Asset Tag: {tag}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {Object.keys(qrCode.rowData).length} fields
                    </div>
                  );
                })()}
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