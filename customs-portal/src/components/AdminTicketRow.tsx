"use client";

import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Clock, Send, ChevronDown, ChevronUp } from "lucide-react";

export default function AdminTicketRow({ ticket, onStatusUpdate }: { ticket: any, onStatusUpdate: (id: number, status: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let interval: any;
    if (isOpen) {
      fetchMessages();
      interval = setInterval(fetchMessages, 4000);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isUserTyping]);

  const fetchMessages = async () => {
    const res = await fetch(`/api/support/messages?ticketId=${ticket.id}`);
    const data = await res.json();
    if (Array.isArray(data)) {
       if (data.length > messages.length && messages.length > 0) {
          const lastMsg = data[data.length - 1];
          if (!lastMsg.is_staff) {
             const audio = new Audio("https://raw.githubusercontent.com/jadog128/vbll-scrim-bot/main/notification.mp3");
             audio.play().catch(() => {});
          }
       }
       setMessages(data);
    }

    // Refresh ticket to check user typing status
    const tRes = await fetch("/api/admin/tickets");
    const tData = await tRes.json();
    const currentTicket = tData.find((t: any) => t.id === ticket.id);
    if (currentTicket?.user_typing_at) {
       const last = new Date(currentTicket.user_typing_at.replace(' ', 'T') + 'Z').getTime();
       setIsUserTyping(Date.now() - last < 6000);
    }
  };

  const handleTyping = async () => {
    if (typingTimeoutRef.current) return;
    await fetch("/api/support/typing", {
      method: "POST",
      body: JSON.stringify({ ticketId: ticket.id })
    });
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 3000);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const content = input;
    setInput("");
    const res = await fetch("/api/support/messages", {
      method: "POST",
      body: JSON.stringify({ ticketId: ticket.id, content })
    });
    if (res.ok) fetchMessages();
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm hover:shadow-ambient transition-all">
       <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-error/5 flex items-center justify-center text-error">
                <ShieldAlert className="w-6 h-6" />
             </div>
             <div>
                <h4 className="font-bold text-on-surface truncate">{ticket.username}</h4>
                <div className="flex items-center gap-2">
                   <div className="text-[10px] font-black text-error uppercase tracking-widest">TICKET #{ticket.id}</div>
                   {ticket.source === 'web' ? (
                     <div className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded-full">Web Interface</div>
                   ) : (
                     <div className="px-2 py-0.5 bg-secondary/10 text-secondary text-[8px] font-black uppercase rounded-full">Discord Bot</div>
                   )}
                </div>
             </div>
          </div>
          <div className="text-[11px] font-black text-on-surface-variant opacity-30 flex items-center gap-1.5">
             <Clock className="w-3.5 h-3.5" />
             {new Date(ticket.created_at).toLocaleString()}
          </div>
       </div>

       <div className="bg-surface-container-low rounded-2xl p-6 mb-6">
          <p className="text-sm font-medium text-on-surface-variant italic leading-relaxed">
             "{ticket.issue}"
          </p>
       </div>

       <div className="flex gap-3">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="px-6 py-2.5 bg-surface-container-high text-on-surface text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container-highest transition-colors flex items-center gap-2"
          >
             {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             {isOpen ? "Close Chat" : "Open Chat"}
          </button>
          <button onClick={() => onStatusUpdate(ticket.id, 'closed')} className="px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform">
             Mark Resolved
          </button>
       </div>

       {isOpen && (
          <div className="mt-8 pt-8 border-t border-outline-variant/10 space-y-6">
             <div className="flex-1 overflow-y-auto max-h-80 space-y-4 pr-2" ref={scrollRef}>
                {messages.length === 0 && (
                  <p className="text-center text-xs text-on-surface-variant opacity-50 py-10">No messages yet. Send a reply below.</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.is_staff ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-xs font-medium ${
                      m.is_staff ? 'bg-primary text-white rounded-tr-none' : 'bg-surface-container-low text-on-surface rounded-tl-none'
                    }`}>
                       {!m.is_staff && (
                          <div className="flex items-center gap-1 mb-1 opacity-50 text-[9px] font-black uppercase">
                             User
                          </div>
                       )}
                       {m.content}
                    </div>
                  </div>
                ))}
                
                {isUserTyping && (
                  <div className="flex justify-start">
                     <div className="bg-surface-container-low px-4 py-2 rounded-full flex gap-1 items-center">
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        <span className="ml-2 text-[10px] font-black uppercase text-primary/50">User is typing</span>
                     </div>
                  </div>
                )}
             </div>

             <div className="flex gap-2">
                <input 
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a response..."
                  className="flex-1 px-5 py-3 bg-surface-container-low rounded-2xl text-sm border-none focus:ring-2 focus:ring-primary/20"
                />
                <button onClick={sendMessage} className="p-3.5 bg-primary text-white rounded-2xl hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                  <Send className="w-5 h-5" />
                </button>
             </div>
          </div>
       )}
    </div>
  );
}
