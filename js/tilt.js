// DeviceOrientation plumbing. The maths lives in engine.js (orientationVector,
// feedTilt); this file only asks permission, listens, and hands samples over.
//
// iOS 13+ requires DeviceOrientationEvent.requestPermission() from a user
// gesture (a tap) on a secure origin. Everything else just listens.
import { orientationVector, createTiltState, feedTilt } from './engine.js';

export function tiltSupported() {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}
export function needsPermission() {
  return tiltSupported() && typeof DeviceOrientationEvent.requestPermission === 'function';
}

// Resolves 'granted' | 'denied' | 'unsupported'. Call from a click handler.
export async function requestTilt() {
  if (!tiltSupported()) return 'unsupported';
  if (!needsPermission()) return 'granted';
  try {
    const r = await DeviceOrientationEvent.requestPermission();
    return r === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

// Starts listening. onGesture('got'|'pass'), onVector({zUp,xUp}) for the UI's
// rotation logic. Returns a stop() function. If no event arrives within
// `probeMs`, onSilent() fires once so the UI can offer tap mode.
export function listenTilt({ onGesture, onVector, onSilent, probeMs = 2500 }) {
  let state = createTiltState();
  let heard = false;
  const handler = (e) => {
    if (typeof e.beta !== 'number' || typeof e.gamma !== 'number') return;
    heard = true;
    const v = orientationVector(e.beta, e.gamma);
    if (onVector) onVector(v);
    const r = feedTilt(state, v.zUp);
    state = r.state;
    if (r.gesture && onGesture) onGesture(r.gesture);
  };
  window.addEventListener('deviceorientation', handler, true);
  const probe = setTimeout(() => { if (!heard && onSilent) onSilent(); }, probeMs);
  return () => { clearTimeout(probe); window.removeEventListener('deviceorientation', handler, true); };
}
