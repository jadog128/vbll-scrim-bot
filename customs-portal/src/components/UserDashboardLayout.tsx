"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Layout, Save, X, Move, Package, Send, Settings2, Zap, HelpCircle, CheckCircle2, Clock, History as HistoryIcon, RefreshCw, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UserDashboardLayoutProps {
    statsSection: React.ReactNode;
    requests: any[];
    userId: string;
}

export default function UserDashboardLayout({ statsSection, requests: initialRequests, userId }: UserDashboardLayoutProps) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [layout, setLayout] = useState<string[]>(['stats', 'timeline']);
    const [requests, setRequests] = useState<any[]>(initialRequests);

    useEffect(() => {
        const savedLayout = localStorage.getItem(`user_layout_${userId}`);
        const savedOrder = localStorage.getItem(`user_order_${userId}`);
        
        if (savedLayout) {
            try {
                const parsed = JSON.parse(savedLayout);
                if (Array.isArray(parsed) && parsed.length > 0) setLayout(parsed);
            } catch (e) {}
        }

        if (savedOrder && initialRequests.length > 0) {
            try {
                const orderIds = JSON.parse(savedOrder);
                const ordered = [...initialRequests].sort((a, b) => {
                    const idxA = orderIds.indexOf(a.id);
                    const idxB = orderIds.indexOf(b.id);
                    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                });
                setRequests(ordered);
            } catch (e) {}
        } else {
            setRequests(initialRequests);
        }
    }, [userId, initialRequests]);

    const getProgress = (req: any) => {
        if (req.status === 'completed' && req.batch_status === 'sent') return 100;
        if (req.status === 'completed' && req.batch_status === 'released') return 75;
        if (req.status === 'completed' && !req.batch_status) return 50;
        if (req.status === 'pending') return 25;
        return 10;
    };

    const getStageName = (req: any) => {
        if (req.status === 'completed' && req.batch_status === 'sent') return "Delivered In-Game";
        if (req.status === 'completed' && req.batch_status === 'released') return "Batch Released - Awaiting Dev";
        if (req.status === 'completed') return `In Batch #${req.batch_id} (${req.batch_count}/8)`;
        if (req.status === 'pending') return "Verified - Staff Queue";
        if (req.status === 'rejected') return "Rejected by Staff";
        return "Initial Verification";
    };

    const handleSave = () => {
        localStorage.setItem(`user_layout_${userId}`, JSON.stringify(layout));
        localStorage.setItem(`user_order_${userId}`, JSON.stringify(requests.map(r => r.id)));
        setIsEditMode(false);
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const { source, destination, droppableId } = result;

        if (droppableId === 'dashboard-sections') {
            const items = Array.from(layout);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            setLayout(items);
        } else if (droppableId === 'request-grid') {
            const items = Array.from(requests);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            setRequests(items);
        }
    };

    const timelineSection = (
        <div className="space-y-8">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl font-black text-on-surface flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <HistoryIcon className="w-5 h-5" />
                    </div>
                    Submission Timeline
                </h2>
                {!isEditMode && (
                    <button onClick={() => window.location.reload()} className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                        <RefreshCw className="w-3 h-3" />
                        Live Feed
                    </button>
                )}
            </div>

            <Droppable droppableId="request-grid">
                {(provided) => (
                    <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef} 
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[200px]"
                    >
                        {requests.map((req: any, index: number) => (
                            <Draggable key={req.id} draggableId={req.id.toString()} index={index} isDragDisabled={!isEditMode}>
                                {(provided, snapshot) => (
                                    <div 
                                        ref={provided.innerRef} 
                                        {...provided.draggableProps} 
                                        className={`bg-white rounded-[2.5rem] p-8 shadow-ambient border border-white hover:border-primary/20 transition-all group relative ${snapshot.isDragging ? 'shadow-2xl scale-105 z-50 ring-4 ring-primary/20' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-8">
                                            <div className={`p-4 rounded-[1.5rem] transition-colors ${
                                                req.status === 'completed' ? 'bg-primary/10 text-primary shadow-lg shadow-primary/10' : 
                                                req.status === 'pending' ? 'bg-secondary/10 text-secondary shadow-lg shadow-secondary/10' : 'bg-surface-container-high text-on-surface-variant'
                                            }`}>
                                                {req.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                            </div>

                                            {isEditMode ? (
                                                <div 
                                                    {...provided.dragHandleProps}
                                                    className="bg-primary/10 text-primary p-3 rounded-2xl cursor-grab active:cursor-grabbing hover:bg-primary hover:text-white transition-all shadow-sm"
                                                >
                                                    <Move className="w-5 h-5" />
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 bg-surface-container-lowest px-3 py-1.5 rounded-full border border-outline-variant/10">
                                                    ID: #{req.id.toString().slice(-4)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 mb-8">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xl font-black text-on-surface group-hover:text-primary transition-colors tracking-tight">{req.type}</h4>
                                                <div className="px-3 py-1 bg-surface-container-high rounded-lg text-[9px] font-black text-primary/50 uppercase tracking-[0.2em]">
                                                    {req.league_name || 'Legacy'}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-[11px] font-black text-primary uppercase tracking-widest">
                                                    <span>Progress</span>
                                                    <span>{getProgress(req)}%</span>
                                                </div>
                                                <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden p-0.5 border border-white shadow-inner">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${req.status === 'rejected' ? 'bg-error' : 'bg-gradient-to-r from-primary/80 to-primary'}`} 
                                                        style={{ width: `${getProgress(req)}%` }} 
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-[0.1em] pt-2">{getStageName(req)}</p>
                                        </div>

                                        <div className="pt-8 border-t border-outline-variant/10 flex items-center justify-between">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-2 h-2 rounded-full ${req.status === 'completed' ? 'bg-primary' : 'bg-primary animate-pulse shadow-glow'}`}></div>
                                                    <span className="text-[11px] font-black uppercase tracking-tighter text-on-surface">{req.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {initialRequests.length === 0 && (
                            <div className="col-span-full py-40 bg-surface-container-low/20 rounded-[4rem] border-4 border-dashed border-outline-variant/10 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-24 h-24 rounded-[2rem] bg-surface-container-high flex items-center justify-center text-on-surface-variant/20 shadow-inner">
                                    <Send className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-on-surface tracking-tighter">Your timeline is empty</h3>
                                    <p className="text-sm text-on-surface-variant font-bold uppercase tracking-widest opacity-50">Create your first request using the side menu</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    );

    const renderSection = (id: string) => {
        switch (id) {
            case 'stats':
                return (
                    <div className="relative group">
                        {isEditMode && (
                             <div className="absolute top-4 right-4 z-40 bg-primary text-white p-2 rounded-xl shadow-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <Move className="w-3.5 h-3.5" /> Move Section
                             </div>
                        )}
                        <div className={isEditMode ? "ring-2 ring-primary/20 rounded-[3rem] p-6 bg-surface-container-low/20 transition-all border-2 border-dashed border-primary/10" : ""}>
                            {statsSection}
                        </div>
                    </div>
                );
            case 'timeline':
                return (
                    <div className="relative group">
                        {isEditMode && (
                             <div className="absolute top-4 right-4 z-40 bg-secondary text-white p-2 rounded-xl shadow-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <Move className="w-3.5 h-3.5" /> Move Section
                             </div>
                        )}
                        <div className={isEditMode ? "ring-2 ring-secondary/20 rounded-[3rem] p-6 bg-surface-container-low/20 transition-all border-2 border-dashed border-secondary/10" : ""}>
                            {timelineSection}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-on-surface tracking-tighter">Command Center</h1>
                    <p className="text-sm font-medium text-on-surface-variant flex items-center gap-2">
                        Welcome back! Reorder items or widgets to suit your workflow.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <AnimatePresence mode="wait">
                        {!isEditMode ? (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => setIsEditMode(true)}
                                className="px-5 py-3 bg-surface-container-high rounded-2xl hover:bg-surface-container-highest transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2 group"
                            >
                                <Settings2 className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                                Customize Layout
                            </motion.button>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center gap-2"
                            >
                                <button
                                    onClick={() => setIsEditMode(false)}
                                    className="px-5 py-3 bg-white rounded-2xl border border-outline-variant/10 text-xs font-black uppercase tracking-widest flex items-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-5 py-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 text-xs font-black uppercase tracking-widest flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Finish Editing
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="dashboard-sections">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-12">
                            {layout.map((id, index) => (
                                <Draggable key={id} draggableId={id} index={index} isDragDisabled={!isEditMode}>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                            {renderSection(id)}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );
}
