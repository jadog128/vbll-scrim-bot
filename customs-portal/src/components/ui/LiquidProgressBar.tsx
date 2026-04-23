"use client";

import { motion } from "framer-motion";

interface LiquidProgressBarProps {
    progress: number; // 0 to 100
    label?: string;
    height?: string;
}

export default function LiquidProgressBar({ progress, label, height = "h-4" }: LiquidProgressBarProps) {
    return (
        <div className="w-full space-y-3">
            {label && (
                <div className="flex justify-between items-end px-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40">{label}</span>
                    <span className="text-[14px] font-black font-mono text-primary">{Math.round(progress)}%</span>
                </div>
            )}
            
            <div className={`relative w-full ${height} bg-surface-container rounded-full overflow-hidden border border-white/10 shadow-inner group`}>
                {/* Glossy Overlay */}
                <div className="absolute inset-0 z-20 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                
                {/* The "Liquid" Container */}
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                    className="absolute inset-y-0 left-0 bg-primary/90 relative"
                >
                    {/* Glowing Surface Line */}
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_#fff] z-30" />

                    {/* Wave Layers */}
                    <div className="absolute top-0 right-0 w-[200px] h-full overflow-hidden pointer-events-none">
                        <motion.div 
                            animate={{ 
                                x: [-200, 0],
                                rotate: [0, 2, 0, -2, 0]
                            }}
                            transition={{ 
                                x: { repeat: Infinity, duration: 4, ease: "linear" },
                                rotate: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                            }}
                            className="absolute top-[-50%] right-0 w-[400px] h-[200%] opacity-40"
                        >
                            <svg viewBox="0 0 1000 1000" className="w-full h-full fill-white/30 scale-y-50">
                                <path d="M0,500 C150,400 350,600 500,500 C650,400 850,600 1000,500 L1000,1000 L0,1000 Z" />
                            </svg>
                        </motion.div>

                        <motion.div 
                            animate={{ 
                                x: [-200, 0],
                                rotate: [0, -4, 0, 4, 0]
                            }}
                            transition={{ 
                                x: { repeat: Infinity, duration: 3, ease: "linear" },
                                rotate: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
                            }}
                            className="absolute top-[-70%] right-0 w-[400px] h-[200%] opacity-20"
                        >
                            <svg viewBox="0 0 1000 1000" className="w-full h-full fill-white/20 scale-y-75">
                                <path d="M0,500 C150,600 350,400 500,500 C650,600 850,400 1000,500 L1000,1000 L0,1000 Z" />
                            </svg>
                        </motion.div>
                    </div>

                    {/* Inner Bubbles */}
                    <div className="absolute inset-0 overflow-hidden">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                animate={{ 
                                    y: [-20, 20],
                                    opacity: [0, 1, 0],
                                    x: [Math.random() * 100, Math.random() * 100]
                                }}
                                transition={{ 
                                    duration: 2 + i,
                                    repeat: Infinity,
                                    delay: i * 0.5
                                }}
                                className="absolute w-1 h-1 bg-white rounded-full"
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Sub-surface Glow */}
                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(11,70,51,0.2)] pointer-events-none" />
            </div>
        </div>
    );
}
