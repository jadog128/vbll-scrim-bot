"use client";

import { motion } from "framer-motion";

interface EmbedProps {
  title?: string;
  description?: string;
  color?: string;
  authorName?: string;
  authorIcon?: string;
  footerText?: string;
  timestamp?: boolean;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export default function DiscordEmbedPreview({ embed }: { embed: EmbedProps }) {
  const hexColor = embed.color?.startsWith("#") ? embed.color : "#5865f2";

  return (
    <div className="bg-[#313338] rounded-md p-4 flex gap-4 font-sans max-w-full overflow-hidden">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl">robot_2</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#F2F3F5] font-bold text-sm">Lucid Bot</span>
          <span className="bg-[#5865F2] text-white text-[10px] px-1 rounded-sm font-bold uppercase">Bot</span>
          <span className="text-[#949BA4] text-xs font-medium">Today at 1:33 PM</span>
        </div>
        
        <div className="relative mt-1">
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
            style={{ backgroundColor: hexColor }}
          />
          <div className="bg-[#2B2D31] rounded-r-md p-4 ml-1 space-y-2">
            {embed.authorName && (
                <div className="flex items-center gap-2 mb-2">
                    {embed.authorIcon && <img src={embed.authorIcon} className="w-6 h-6 rounded-full" />}
                    <span className="text-white font-bold text-xs">{embed.authorName}</span>
                </div>
            )}
            
            {embed.title && (
              <h4 className="text-white font-bold text-base hover:underline cursor-pointer">
                {embed.title}
              </h4>
            )}
            
            {embed.description && (
              <p className="text-[#DBDEE1] text-sm whitespace-pre-wrap leading-relaxed">
                {embed.description}
              </p>
            )}

            {embed.fields && embed.fields.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                    {embed.fields.map((f, i) => (
                        <div key={i} className={f.inline ? "" : "col-span-2"}>
                            <div className="text-white text-xs font-bold mb-1">{f.name}</div>
                            <div className="text-[#DBDEE1] text-xs">{f.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {(embed.footerText || embed.timestamp) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                <span className="text-[#949BA4] text-[10px] font-medium">
                  {embed.footerText} {embed.timestamp && ` • Today at 1:33 PM`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
