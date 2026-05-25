import { pushAgentLocation } from './pushAgentLocation';

let watchId = null;
let onPositionCallback = null;

export function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function isGeolocationSupported() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

/** Check permission without prompting (where supported). */
export async function getLocationPermissionState() {
  if (!isGeolocationSupported()) return 'unsupported';
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state; // 'granted' | 'prompt' | 'denied'
    }
  } catch {
    /* Safari may throw — fall through */
  }
  return 'prompt';
}

function geolocationErrorMessage(error) {
  switch (error?.code) {
    case 1:
      return 'Location blocked. Open phone Settings → Browser → Location → Allow, then tap Enable GPS again.';
    case 2:
      return 'Location unavailable. Turn on GPS / Location Services on your phone.';
    case 3:
      return 'Location timed out. Move near a window or outdoors and try again.';
    default:
      return error?.message || 'Could not get your location.';
  }
}

/**
 * Call from a button tap (required on iPhone/Android).
 * Triggers the system "Allow location?" dialog.
 */
export function requestAgentLocationPermission() {
  return new Promise((resolve) => {
    if (!isGeolocationSupported()) {
      resolve({ ok: false, message: 'This browser does not support GPS.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => resolve({ ok: true }),
      (err) => resolve({ ok: false, message: geolocationErrorMessage(err) }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

/**
 * Continuous GPS updates for live customer tracking.
 */
export function startAgentLocationTracking(agentId, onError) {
  if (!agentId || !isGeolocationSupported()) return null;

  stopAgentLocationTracking();

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy, speed } = position.coords;
      onPositionCallback?.(position);
      await pushAgentLocation(agentId, latitude, longitude, {
        accuracy,
        speed: speed != null ? speed * 3.6 : undefined
      });
    },
    (error) => {
      console.error('GPS watch error:', error);
      onError?.(geolocationErrorMessage(error));
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 }
  );

  return watchId;
}

export function stopAgentLocationTracking() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

export function setOnPositionCallback(fn) {
  onPositionCallback = fn;
}
