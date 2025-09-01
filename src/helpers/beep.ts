// Simple, reliable beep for timer completion
let ctx: AudioContext | null = null;
let unlocked = false;
let htmlAudio: HTMLAudioElement | null = null;

export function unlockAudio(): void {
  if (unlocked) return;
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    ctx.resume();
    unlocked = true;
  } catch {}
}

export async function playBeep(): Promise<void> {
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, now);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    return;
  } catch {
    try {
      htmlAudio = htmlAudio || new window.Audio('/sounds/mixkit-achievement-bell-600.wav');
      htmlAudio.currentTime = 0;
      await htmlAudio.play();
    } catch {}
  }
}
