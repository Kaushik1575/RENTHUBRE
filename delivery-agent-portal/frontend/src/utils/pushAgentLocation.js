const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3006/api').replace(/\/$/, '');

let lastSentAt = 0;
const MIN_INTERVAL_MS = 3000;

/** Push GPS to backend (service role). Throttled to every 3s. */
export async function pushAgentLocation(agentId, latitude, longitude, extras = {}) {
    const now = Date.now();
    if (now - lastSentAt < MIN_INTERVAL_MS) return;
    lastSentAt = now;

    try {
        await fetch(`${API_BASE}/agent/update-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId,
                latitude,
                longitude,
                accuracy: extras.accuracy,
                speed: extras.speed
            })
        });
    } catch (e) {
        console.warn('[GPS] API push failed, will retry', e);
    }
}
