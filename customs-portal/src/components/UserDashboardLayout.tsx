"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Layout, Save, X, Move, Package, History, Send, Settings2, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UserDashboardLayoutProps {
    statsSection: React.ReactNode;
    timelineSection: (requests: any[], isEditMode: boolean) => React.ReactNode;
    requests: any[];
    userId: string;
}

export default function UserDashboardLayout({ statsSection, timelineSection, requests: initialRequests, userId }: UserDashboardLayoutProps) {
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
                            {timelineSection(requests, isEditMode)}
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
