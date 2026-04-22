"use client";

import { useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { Download, X, Award, CheckCircle2, Hexagon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CertificateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
}

export default function CertificateDialog({ isOpen, onClose, request }: CertificateDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!request) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      // Small delay to ensure styles are perfectly applied before capture
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3, // High-res export
      });
      const link = document.createElement('a');
      link.download = `Certificate_${request.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export image", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md relative"
          >
            {/* The actual exportable card wrapper */}
            <div 
              ref={cardRef} 
              className="relative rounded-[2.5rem] bg-gradient-to-br from-surface to-surface-container-high p-8 shadow-2xl border border-white/20 overflow-hidden"
              style={{ padding: '2rem', background: '#fafafa' }}
            >
                {/* Holographic background elements */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center p-[2px] shadow-lg">
                        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                            <Award className="w-10 h-10 text-primary" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tighter text-on-surface uppercase pb-1 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            Certificate of Authenticity
                        </h2>
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                            Official Custom Registration
                        </p>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent my-4" />

                    <div className="w-full space-y-4 text-left">
                        <div>
                            <p className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-[0.2em] mb-1">Item Title</p>
                            <p className="font-black text-xl text-on-surface tracking-tight leading-tight">{request.type}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-[0.2em] mb-1">League / Project</p>
                                <p className="font-bold text-sm text-on-surface-variant">{request.league_name || "Legacy Auth"}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-[0.2em] mb-1">Issue Date</p>
                                <p className="font-bold text-sm text-on-surface-variant">{new Date(request.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-[0.2em] mb-1">Serial Code</p>
                            <div className="font-mono text-sm font-bold bg-surface-container-low px-3 py-2 rounded-xl text-primary/80 border border-primary/10 w-fit">
                                VBLL-{request.id.toString().toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 w-full flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest">Verified Valid</span>
                        </div>
                        <Hexagon className="w-8 h-8 text-outline-variant/20" />
                    </div>
                </div>
            </div>

            {/* Controls (Outside the exportable ref) */}
            <div className="mt-6 flex items-center gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white text-on-surface rounded-2xl font-black uppercase tracking-widest text-xs border border-outline-variant/10 hover:bg-surface-container-lowest transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isExporting ? "Rendering..." : (
                      <>
                          <Download className="w-4 h-4" /> Save High-Res Card
                      </>
                  )}
                </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
