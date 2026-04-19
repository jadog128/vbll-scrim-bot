"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Move, Layout, Save, X } from "lucide-react";

interface DraggableDashboardProps {
  stats: any;
  analytics: any;
  deployments: any;
  management: any;
  guildId: string;
}

export default function DraggableDashboard({ stats, analytics, deployments, management, guildId }: DraggableDashboardProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [order, setOrder] = useState<string[]>(["stats", "analytics", "deployments", "management"]);

  useEffect(() => {
    const savedOrder = localStorage.getItem(`dashboard_order_${guildId}`);
    if (savedOrder) {
      try {
        setOrder(JSON.parse(savedOrder));
      } catch (e) {}
    }
  }, [guildId]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(order);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrder(items);
  };

  const handleSave = () => {
    localStorage.setItem(`dashboard_order_${guildId}`, JSON.stringify(order));
    setIsEditMode(false);
  };

  const sectionMap: Record<string, React.ReactNode> = {
    stats: stats,
    analytics: analytics,
    deployments: deployments,
    management: management,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {!isEditMode ? (
          <button 
            onClick={() => setIsEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-2xl hover:bg-surface-container-highest transition-colors text-xs font-bold"
          >
            <Layout className="w-4 h-4" />
            Customize Layout
          </button>
        ) : (
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setIsEditMode(false)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-outline-variant/10 text-xs font-bold"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 text-xs font-bold"
            >
              <Save className="w-4 h-4" />
              Save Layout
            </button>
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-10">
              {order.map((id, index) => (
                <Draggable key={id} draggableId={id} index={index} isDragDisabled={!isEditMode}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`relative group ${snapshot.isDragging ? "z-50" : ""}`}
                    >
                      {isEditMode && (
                        <div 
                          {...provided.dragHandleProps}
                          className="absolute -top-4 -left-4 z-10 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing border-4 border-white animate-in zoom-in"
                        >
                          <Move className="w-5 h-5" />
                        </div>
                      )}
                      <div className={`${isEditMode ? "ring-4 ring-primary/20 rounded-[3rem] transition-all" : ""}`}>
                        {sectionMap[id]}
                      </div>
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
