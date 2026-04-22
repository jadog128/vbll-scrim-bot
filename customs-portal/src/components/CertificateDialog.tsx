"use client";

import { useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { Download, CheckCircle2, Hexagon, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CertificateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
}

export default function CertificateDialog({ isOpen, onClose, request }: CertificateDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  if (!request) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    // Reset rotation before capture
    setRotation({ x: 0, y: 0 });
    try {
      await new Promise(r => setTimeout(r, 150));
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3, 
        skipFonts: false,
      });
      const link = document.createElement('a');
      link.download = `VBLL_Card_${request.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export image", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!tiltRef.current || isExporting) return;
      const rect = tiltRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;
      
      setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
      if(isExporting) return;
      setRotation({ x: 0, y: 0 });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl perspective-1000">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="w-full max-w-[400px] flex flex-col items-center"
          >
            {/* Tilt Container */}
            <motion.div 
                ref={tiltRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                animate={{ rotateX: rotation.x, rotateY: rotation.y }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ transformStyle: "preserve-3d" }}
                className="w-full relative shadow-2xl"
            >
                {/* The Exportable Slab Container */}
                <div 
                    ref={cardRef} 
                    className="relative w-full rounded-2xl bg-[#111111] overflow-hidden flex flex-col"
                    style={{ 
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1), inset 0 0 0 4px rgba(0,0,0,0.8), 0 25px 50px -12px rgba(0,0,0,0.8)',
                        padding: '1.5rem',
                        // Outer acrylic thick border effect
                        border: '4px solid #1a1a1a',
                        borderRightColor: '#333',
                        borderBottomColor: '#333',
                    }}
                >
                    {/* Acrylic Shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none z-50 mix-blend-screen" />
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-[60px] pointer-events-none z-50 mix-blend-overlay" />

                    {/* PSA Style Header Plate */}
                    <div className="w-full flex justify-center mb-4 relative z-40" style={{ transform: "translateZ(20px)" }}>
                        <div className="bg-[#111] border border-white/10 px-8 py-2 rounded-md shadow-inner flex flex-col items-center text-center relative overflow-hidden bg-gradient-to-b from-[#222] to-[#0a0a0a]">
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] mix-blend-overlay" />
                            <div className="flex items-center gap-2 mb-0.5 relative z-10">
                                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] font-black uppercase text-white tracking-[0.3em]">VBLL Grading</span>
                            </div>
                            <div className="text-[10px] font-bold text-white/60 tracking-widest relative z-10 uppercase">Authentic / Mint 10</div>
                        </div>
                    </div>

                    {/* Inner Trading Card */}
                    <div className="relative flex-1 bg-[#050505] rounded-xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,1)] border-[3px] border-[#222] flex flex-col" style={{ aspectRatio: '3/4', transform: "translateZ(10px)" }}>
                        
                        {/* Holographic Inner Background & Vignette */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/30 mix-blend-screen" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />

                        {/* Repeating Border Text (Like the mockup) */}
                        <div className="absolute inset-1 border border-white/10 z-20 flex" style={{ pointerEvents: 'none' }}>
                             {/* Left vertical */}
                             <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col items-center justify-center overflow-hidden border-r border-white/10 bg-black/40 backdrop-blur-sm">
                                 <span className="text-[6px] text-primary/70 font-black uppercase tracking-[0.3em] -rotate-90 whitespace-nowrap">▲ VBLL CUSTOM ▲ VBLL CUSTOM ▲ VBLL CUSTOM</span>
                             </div>
                             {/* Right vertical */}
                             <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col items-center justify-center overflow-hidden border-l border-white/10 bg-black/40 backdrop-blur-sm">
                                 <span className="text-[6px] text-primary/70 font-black uppercase tracking-[0.3em] rotate-90 whitespace-nowrap">▲ AUTHENTIC ▲ AUTHENTIC ▲ AUTHENTIC</span>
                             </div>
                        </div>

                        {/* Card Content Layer - Absolute position over background */}
                        <div className="absolute inset-0 z-30 p-8 flex flex-col justify-between">
                            
                            {/* Top info */}
                            <div className="flex justify-between items-start pt-2">
                                <div className="space-y-1">
                                    <h3 className="text-[10px] font-black uppercase text-white/50 tracking-[0.2em]">{request.league_name || "Legacy"}</h3>
                                    <div className="text-secondary font-black text-2xl tracking-tighter leading-none">{request.type}</div>
                                </div>
                                <div className="bg-white text-black px-2 py-1 rounded text-xl font-black tracking-tighter shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                                    #10
                                </div>
                            </div>

                            {/* Massive Vertical Typography Effect */}
                            <div className="absolute -left-12 bottom-16 -rotate-90 origin-bottom-left text-[6rem] font-black text-white/5 tracking-tighter leading-none mix-blend-overlay uppercase whitespace-nowrap">
                                CUSTOM
                            </div>

                            {/* Center Holographic Graphic */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                <Hexagon className="w-48 h-48 text-white" strokeWidth={1} style={{ filter: 'drop-shadow(0 0 20px #00f0ff)' }} />
                            </div>

                            {/* Bottom Card Footer */}
                            <div className="space-y-4">
                               <div className="flex items-end justify-between border-b border-white/20 pb-3">
                                   <div>
                                       <div className="text-[8px] font-black text-white/50 uppercase tracking-[0.3em] mb-1">Owner</div>
                                       <div className="text-lg font-black text-white tracking-tight leading-none uppercase max-w-[200px] truncate">{request.username}</div>
                                   </div>
                                   <div className="text-right">
                                       <div className="text-[8px] font-black text-white/50 uppercase tracking-[0.3em] mb-1">Date</div>
                                       <div className="text-sm font-bold text-white tracking-widest">{new Date(request.created_at).toLocaleDateString()}</div>
                                   </div>
                               </div>
                               
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-primary" />
                                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/80">Blockchain Verified</span>
                                  </div>
                                  <div className="font-mono text-[10px] font-bold text-white/30 tracking-widest">
                                      VBLL-{request.id.toString().substring(0, 8).toUpperCase()}
                                  </div>
                               </div>
                            </div>
                        </div>

                        {/* Holo Foil Glare Effect based on Mouse Tilt */}
                        <motion.div 
                           className="absolute inset-0 z-40 pointer-events-none mix-blend-color-dodge opacity-50"
                           style={{
                               background: `radial-gradient(circle at ${50 + rotation.y * 3}% ${50 - rotation.x * 3}%, rgba(255,255,255,0.4) 0%, rgba(0,255,255,0.1) 30%, transparent 60%)`
                           }}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Controls */}
            <div className="mt-8 flex items-center gap-4 w-full px-4">
                <button 
                  onClick={onClose}
                  className="flex-1 px-4 py-3.5 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/20 transition-colors backdrop-blur-md"
                >
                  Close
                </button>
                <button 
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3.5 bg-primary text-black rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(var(--primary),0.4)] hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] transition-all disabled:opacity-50"
                >
                  {isExporting ? "Rendering Slab..." : (
                      <>
                          <Download className="w-4 h-4" /> Export Trading Card
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
