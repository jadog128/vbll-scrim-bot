"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Layout, Save, X, Move, Package, History, Send, Settings2, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UserDashboardLayoutProps {
    statsSection: React.ReactNode;
    timelineSection: React.ReactNode;
    userId: string;
}

export default function UserDashboardLayout({ statsSection, timelineSection, userId }: UserDashboardLayoutProps) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [layout, setLayout] = useState<string[]>(['stats', 'timeline']);

    useEffect(() => {
        const saved = localStorage.getItem(`user_layout_${userId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setLayout(parsed);
                }
            } catch (e) {}
        }
    }, [userId]);

    const handleSave = () => {
        localStorage.setItem(`user_layout_${userId}`, JSON.stringify(layout));
        setIsEditMode(false);
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(layout);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setLayout(items);
    };

    const renderSection = (id: string) => {
        switch (id) {
            case 'stats':
                return (
                    <div className="relative group">
                        {isEditMode && (
                             <div className="absolute -top-3 -right-3 z-30 bg-primary text-white p-2 rounded-xl shadow-xl animate-bounce">
                                <Move className="w-4 h-4" />
                             </div>
                        )}
                        <div className={isEditMode ? "ring-2 ring-primary/20 rounded-[2.5rem] p-4 bg-surface-container-low/20 transition-all border-2 border-dashed border-primary/10" : ""}>
                            {statsSection}
                        </div>
                    </div>
                );
            case 'timeline':
                return (
                    <div className="relative group">
                        {isEditMode && (
                             <div className="absolute -top-3 -right-3 z-30 bg-primary text-white p-2 rounded-xl shadow-xl animate-bounce">
                                <Move className="w-4 h-4" />
                             </div>
                        )}
                        <div className={isEditMode ? "ring-2 ring-primary/20 rounded-[2.5rem] p-4 bg-surface-container-low/20 transition-all border-2 border-dashed border-primary/10" : ""}>
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
                        Welcome back! Manage your active customs and track status in real-time.
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
                                Edit Dashboard
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
                                    Save Layout
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
