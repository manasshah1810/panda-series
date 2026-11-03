import gsap from 'gsap';
/** Amplitude-driven mouth flap. source: AnalyserNode | () => 0..1 | undefined (rhythmic fake). Returns stop(). */
export function startTalk(face, source) {
  const chan = face.channels; let raf = 0, stopped = false, t = 0, buf = null;
  const amp = () => {
    if (source && source.getByteTimeDomainData) { buf = buf || new Uint8Array(source.fftSize); source.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2; return Math.min(1, Math.sqrt(s / buf.length) / 40); }
    if (typeof source === 'function') return source();
    t += 1 / 60; return Math.max(0, Math.sin(t * 14) * 0.5 + Math.sin(t * 5.3) * 0.4 + 0.1);
  };
  const loop = () => { if (stopped) return; chan.talk += (amp() * 0.8 - chan.talk) * 0.45; face.apply(); raf = requestAnimationFrame(loop); };
  loop();
  return () => { stopped = true; cancelAnimationFrame(raf); gsap.to(chan, { talk: 0, duration: 0.15, onUpdate: face.apply }); };
}
