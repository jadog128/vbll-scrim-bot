"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function StaffHeartbeat() {
    const { data: session } = useSession();

    useEffect(() => {
        if (!session?.user) return;

        const sendHeartbeat = async () => {
            try {
                await fetch("/api/staff/activity", { method: "POST" });
            } catch (e) {}
        };

        // Initial heartbeat
        sendHeartbeat();

        // Every 2 minutes
        const interval = setInterval(sendHeartbeat, 120000);
        return () => clearInterval(interval);
    }, [session]);

    return null;
}
