"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [issue, setIssue] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTicket();
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: any;
    if (isOpen && ticket) {
      fetchMessages();
      interval = setInterval(fetchMessages, 5000);
    }
    return () => clearInterval(interval);
  }, [isOpen, ticket]);

  useEffect(() => {
    if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchTicket = async () => {
    const res = await fetch("/api/support/ticket");
    const data = await res.json();
    setTicket(data);
  };

  const fetchMessages = async () => {
    if (!ticket) return;
    const res = await fetch(`/api/support/messages?ticketId=${ticket.id}`);
    const data = await res.json();
    if (Array.isArray(data)) setMessages(data);
  };

  const startTicket = async () => {
    if (!issue.trim()) return;
    setLoading(true);
    const res = await fetch("/api/support/ticket", {
      method: "POST",
      body: JSON.stringify({ issue })
    });
    if (res.ok) fetchTicket();
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !ticket) return;
    const content = input;
    setInput("");
    const res = await fetch("/api/support/messages", {
      method: "POST",
      body: JSON.stringify({ ticketId: ticket.id, content })
    });
    if (res.ok) fetchMessages();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-80 md:w-96 bg-white rounded-[2rem] shadow-ambient border border-outline-variant/10 overflow-hidden flex flex-col h-[500px]"
          >
            {/* Header */}
            <div className="p-6 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="text-sm font-black tracking-tight">Support Center</h4>
                    <p className="text-[10px] font-medium opacity-70">Always online for you</p>
                 </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
              {!ticket ? (
                <div className="space-y-6 py-4">
                   <div className="text-center space-y-2">
                      <h3 className="font-bold text-on-surface">Need help?</h3>
                      <p className="text-xs text-on-surface-variant">Explain your issue and a staff member will chat with you here.</p>
                   </div>
                   <textarea 
                     value={issue}
                     onChange={(e) => setIssue(e.target.value)}
                     placeholder="Type your problem here..."
                     className="w-full p-4 bg-surface-container-low rounded-2xl text-sm border-none focus:ring-2 focus:ring-primary/20 resize-none h-32"
                   />
                   <button 
                     onClick={startTicket}
                     disabled={loading}
                     className="w-full py-4 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-transform"
                   >
                     {loading ? "Creating..." : "Start Chat"}
                   </button>
                </div>
              ) : (
                <>
                  <div className="text-center text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest py-2">
                    Conversation Started
                  </div>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.is_staff ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                        m.is_staff ? 'bg-surface-container-high text-on-surface rounded-tl-none' : 'bg-primary text-white rounded-tr-none'
                      }`}>
                         {m.is_staff && (
                            <div className="flex items-center gap-1 mb-1 opacity-50 text-[9px] font-black uppercase">
                               <ShieldCheck className="w-2.5 h-2.5" /> Staff
                            </div>
                         )}
                         {m.content}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Input */}
            {ticket && (
              <div className="p-4 border-t border-outline-variant/10 flex gap-2">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl text-sm border-none focus:ring-2 focus:ring-primary/20"
                />
                <button onClick={sendMessage} className="p-2.5 bg-primary text-white rounded-xl hover:scale-110 transition-transform">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl shadow-ambient flex items-center justify-center transition-all ${
          isOpen ? 'bg-on-surface text-white' : 'bg-primary text-white hover:scale-110'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
