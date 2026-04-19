"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Move, Layout, Save, X } from "lucide-react";

interface DraggableGridProps {
  leftContent: { id: string; content: React.ReactNode }[];
  rightContent: { id: string; content: React.ReactNode }[];
  guildId: string;
}

export default function DraggableGrid({ leftContent, rightContent, guildId }: DraggableGridProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [columns, setColumns] = useState({
    left: leftContent.map(c => c.id),
    right: rightContent.map(c => c.id)
  });

  useEffect(() => {
    const saved = localStorage.getItem(`grid_layout_${guildId}`);
    if (saved) {
      try {
        setColumns(JSON.parse(saved));
      } catch (e) {}
    }
  }, [guildId]);

  const onDragEnd = (result: any) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId) {
      const colId = source.droppableId as 'left' | 'right';
      const items = Array.from(columns[colId]);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setColumns({ ...columns, [colId]: items });
    } else {
      const sourceCol = source.droppableId as 'left' | 'right';
      const destCol = destination.droppableId as 'left' | 'right';
      const sourceItems = Array.from(columns[sourceCol]);
      const destItems = Array.from(columns[destCol]);
      const [movedItem] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, movedItem);
      setColumns({
        ...columns,
        [sourceCol]: sourceItems,
        [destCol]: destItems
      });
    }
  };

  const handleSave = () => {
    localStorage.setItem(`grid_layout_${guildId}`, JSON.stringify(columns));
    setIsEditMode(false);
  };

  const allItems = [...leftContent, ...rightContent];
  const getContent = (id: string) => allItems.find(i => i.id === id)?.content;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {!isEditMode ? (
          <button 
            onClick={() => setIsEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-2xl hover:bg-surface-container-highest transition-colors text-xs font-bold"
          >
            <Layout className="w-4 h-4" />
            Edit Dashboard Layout
          </button>
        ) : (
          <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-300">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <Droppable droppableId="left">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-8 min-h-[100px]">
                {columns.left.map((id, index) => (
                  <Draggable key={id} draggableId={id} index={index} isDragDisabled={!isEditMode}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} className="relative group">
                        {isEditMode && (
                          <div 
                            {...provided.dragHandleProps}
                            className="absolute -top-3 -left-3 z-20 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing border-2 border-white transition-transform hover:scale-110"
                          >
                            <Move className="w-4 h-4" />
                          </div>
                        )}
                        <div className={`${isEditMode ? "ring-2 ring-primary/20 rounded-[2.5rem] p-1 transition-all" : ""}`}>
                          {getContent(id)}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Right Column */}
          <Droppable droppableId="right">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-8 min-h-[100px]">
                {columns.right.map((id, index) => (
                  <Draggable key={id} draggableId={id} index={index} isDragDisabled={!isEditMode}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} className="relative group">
                        {isEditMode && (
                          <div 
                            {...provided.dragHandleProps}
                            className="absolute -top-3 -left-3 z-20 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing border-2 border-white transition-transform hover:scale-110"
                          >
                            <Move className="w-4 h-4" />
                          </div>
                        )}
                        <div className={`${isEditMode ? "ring-2 ring-primary/20 rounded-[2.5rem] p-1 transition-all" : ""}`}>
                          {getContent(id)}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  );
}
