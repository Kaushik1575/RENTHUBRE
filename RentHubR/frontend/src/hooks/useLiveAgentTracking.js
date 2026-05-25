import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const POLL_MS = 4000;

/**
 * Subscribes to agent GPS via Supabase Realtime + HTTP polling fallback.
 */
export function useLiveAgentTracking(agentId, { enabled = true, onLocation, onAgentInfo } = {}) {
    const lastPollRef = useRef(0);

    const applyAgent = useCallback((row) => {
        if (!row) return;
        if (row.full_name || row.mobile) {
            onAgentInfo?.({
                full_name: row.full_name || 'Delivery Partner',
                mobile: row.mobile || row.phone_number || ''
            });
        }
        if (row.current_lat != null && row.current_lng != null) {
            onLocation?.({ lat: Number(row.current_lat), lng: Number(row.current_lng) });
        }
    }, [onLocation, onAgentInfo]);

    const fetchLocation = useCallback(async () => {
        if (!agentId) return;
        try {
            const res = await fetch(`/api/agent/location/${agentId}`);
            const json = await res.json();
            if (json.success && json.data) applyAgent(json.data);
        } catch (e) {
            console.warn('[live-tracking] poll failed', e);
        }
    }, [agentId, applyAgent]);

    useEffect(() => {
        if (!enabled || !agentId) return;

        fetchLocation();

        let channel = null;
        if (supabase) {
            channel = supabase
                .channel(`live_agent_${agentId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'delivery_agents',
                        filter: `id=eq.${agentId}`
                    },
                    (payload) => applyAgent(payload.new)
                )
                .subscribe((status) => {
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn('[live-tracking] realtime unavailable, using polling only');
                    }
                });
        }

        const pollId = setInterval(() => {
            const now = Date.now();
            if (now - lastPollRef.current >= POLL_MS) {
                lastPollRef.current = now;
                fetchLocation();
            }
        }, POLL_MS);

        return () => {
            clearInterval(pollId);
            if (channel && supabase) supabase.removeChannel(channel);
        };
    }, [agentId, enabled, fetchLocation, applyAgent]);

    return { refresh: fetchLocation };
}
