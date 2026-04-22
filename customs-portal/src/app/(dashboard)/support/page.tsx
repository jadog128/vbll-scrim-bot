"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, Send, MessageSquare, Plus, Loader2, ArrowLeft, CheckCircle2, History, Info, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { toast } from "sonner";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function SupportVaultPage() {
    const { data: ticket, mutate: mutateTicket } = useSWR('/api/support/ticket', fetcher);
    const [issue, setIssue] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!issue.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch('/api/support/ticket', {
                method: 'POST',
                body: JSON.stringify({ issue }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                toast.success("Ticket opened in the Vault");
                mutateTicket();
            }
        } catch (err) {
            toast.error("Failed to open ticket");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-on-surface tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                             <Shield className="text-primary w-8 h-8" />
                        </div>
                        The Support Vault
                    </h1>
                    <p className="text-on-surface-variant font-medium opacity-60">Direct communication with league officials.</p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!ticket ? (
                    <motion.div 
                        key="no-ticket"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-[3rem] p-12 border border-outline-variant/10 shadow-ambient flex flex-col items-center text-center space-y-8"
                    >
                        <div className="w-24 h-24 rounded-[2.5rem] bg-surface-container-high flex items-center justify-center text-on-surface-variant/20 shadow-inner">
                            <MessageSquare className="w-10 h-10" />
                        </div>
                        <div className="space-y-3 max-w-md">
                            <h2 className="text-2xl font-black text-on-surface tracking-tight">Access Restricted</h2>
                            <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                                You don't have any active support sessions. If you need assistance with your requests or league standing, open a secure line below.
                            </p>
                        </div>

                        <form onSubmit={handleCreateTicket} className="w-full max-w-lg space-y-4">
                            <textarea 
                                value={issue}
                                onChange={(e) => setIssue(e.target.value)}
                                placeholder="Describe your issue or question..."
                                className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-[2rem] p-6 text-sm font-bold text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all min-h-[120px]"
                            />
                            <button 
                                type="submit"
                                disabled={isCreating || !issue.trim()}
                                className="w-full bg-primary text-black py-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white hover:text-black hover:shadow-glow transition-all disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Open Secure Support Line
                            </button>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="chat-box"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[3rem] border border-outline-variant/10 shadow-massive overflow-hidden flex flex-col h-[700px]"
                    >
                        <div className="bg-surface-container-low px-8 py-6 flex items-center justify-between border-b border-outline-variant/10">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-success/10 rounded-xl">
                                    <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-glow" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest mb-0.5">Secure Session Active</div>
                                    <h3 className="text-sm font-black text-on-surface tracking-tight">Active Ticket #{ticket.id}</h3>
                                </div>
                            </div>
                            <div className="bg-surface-container-high px-4 py-2 rounded-2xl flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase text-on-surface-variant opacity-40">Status</span>
                                <span className="text-[10px] font-black uppercase text-success tracking-widest">{ticket.status}</span>
                            </div>
                        </div>

                        <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-surface-container-lowest/30">
                            <div className="p-6 bg-surface-container rounded-3xl border border-outline-variant/10 max-w-[80%]">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Original Issue</p>
                                <p className="text-sm font-bold text-on-surface opacity-80">{ticket.issue}</p>
                                <p className="text-[9px] font-medium text-on-surface-variant mt-2">{new Date(ticket.created_at).toLocaleString()}</p>
                            </div>
                            
                            <ChatMessages ticketId={ticket.id} />
                        </div>

                        <ChatInput ticketId={ticket.id} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ChatMessages({ ticketId }: { ticketId: string }) {
    const { data: messages, mutate } = useSWR(`/api/support/messages?ticketId=${ticketId}`, fetcher, {
        refreshInterval: 4000 
    });
    const { data: ticket } = useSWR('/api/support/ticket', fetcher, {
        refreshInterval: 4000
    });
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isStaffTyping, setIsStaffTyping] = useState(false);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isStaffTyping]);

    useEffect(() => {
        if (ticket?.staff_typing_at) {
            // Check if typing happened in last 6 seconds
            const lastTyping = new Date(ticket.staff_typing_at.replace(' ', 'T') + 'Z').getTime();
            const now = Date.now();
            setIsStaffTyping(now - lastTyping < 6000);
        }
    }, [ticket]);

    if (!messages) return null;

    return (
        <div className="space-y-6 pb-4">
            {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.is_staff ? 'justify-start' : 'justify-end'}`}>
                    <div className={`p-5 rounded-[2rem] max-w-[85%] space-y-1 relative group ${
                        msg.is_staff 
                            ? 'bg-white border border-outline-variant/10 shadow-sm rounded-tl-none' 
                            : 'bg-primary text-black shadow-glow rounded-tr-none font-bold'
                    }`}>
                        {msg.is_staff && (
                            <p className="text-[8px] font-black uppercase tracking-widest text-primary mb-1">Staff Member</p>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className={`text-[8px] opacity-40 ${msg.is_staff ? 'text-on-surface-variant' : 'text-black'}`}>
                             {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            ))}

            {isStaffTyping && (
                <div className="flex justify-start">
                    <div className="bg-surface-container-low px-5 py-3 rounded-2xl flex gap-1 items-center border border-outline-variant/10 shadow-sm">
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        <span className="ml-2 text-[10px] font-black uppercase text-primary tracking-widest">Staff is typing</span>
                    </div>
                </div>
            )}
            <div ref={scrollRef} />
        </div>
    );
}

function ChatInput({ ticketId }: { ticketId: string }) {
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const typingTimeoutRef = useRef<any>(null);
    const { mutate } = useSWR(`/api/support/messages?ticketId=${ticketId}`, fetcher);

    const handleTyping = async () => {
        if (typingTimeoutRef.current) return;
        // Notify typing
        fetch("/api/support/typing", {
            method: "POST",
            body: JSON.stringify({ ticketId }),
            headers: { 'Content-Type': 'application/json' }
        });
        typingTimeoutRef.current = setTimeout(() => {
            typingTimeoutRef.current = null;
        }, 3000);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isSending) return;

        setIsSending(true);
        try {
            const res = await fetch('/api/support/messages', {
                method: 'POST',
                body: JSON.stringify({ ticketId, content: message }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setMessage("");
                mutate();
            }
        } catch (err) {
            toast.error("Failed to deliver message");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <form onSubmit={handleSendMessage} className="p-8 bg-white border-t border-outline-variant/10 flex gap-4 items-center">
            <input 
                type="text"
                value={message}
                onChange={(e) => {
                    setMessage(e.target.value);
                    handleTyping();
                }}
                placeholder="Secure message..."
                disabled={isSending}
                className="flex-1 bg-surface-container p-5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all border border-outline-variant/5"
            />
            <button 
                type="submit"
                disabled={!message.trim() || isSending}
                className="p-5 bg-black text-white rounded-2xl hover:bg-primary hover:text-black transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg"
            >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
        </form>
    );
}

