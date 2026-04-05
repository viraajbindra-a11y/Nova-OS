// NOVA OS — Screen Recorder
// Uses navigator.mediaDevices.getDisplayMedia + MediaRecorder to record
// the screen to WebM, then saves it into the virtual file system.

import { processManager } from '../kernel/process-manager.js';
import { fileSystem } from '../kernel/file-system.js';
import { notifications } from '../kernel/notifications.js';
import { sounds } from '../kernel/sound.js';

let state = {
  recorder: null,
  stream: null,
  chunks: [],
  startTime: 0,
  timerId: null,
};

export function registerScreenRecorder() {
  processManager.register('screen-recorder', {
    name: 'Screen Recorder',
    icon: '\u23FA\uFE0F',
    singleInstance: true,
    width: 420,
    height: 360,
    launch: (contentEl) => initUI(contentEl),
  });
}

function initUI(container) {
  render(container);
}

function render(container) {
  const isRecording = !!state.recorder;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:100%; font-family:var(--font); color:white; padding:20px; text-align:center; align-items:center; justify-content:center;">
      <div style="font-size:64px; margin-bottom:8px;">
        ${isRecording ? '<span style="color:#ff3b30;">\u25CF</span>' : '\u23FA\uFE0F'}
      </div>
      <div style="font-size:18px; font-weight:600;">
        ${isRecording ? 'Recording…' : 'Screen Recorder'}
      </div>
      <div id="sr-timer" style="font-size:32px; font-weight:300; font-variant-numeric:tabular-nums; margin:12px 0; min-height:42px; color:rgba(255,255,255,0.9);">
        ${isRecording ? formatTime(Date.now() - state.startTime) : '00:00'}
      </div>
      <div style="font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:20px; max-width:280px;">
        ${isRecording
          ? 'Click Stop to finish and save the recording to Documents/Recordings.'
          : 'Record your screen with optional microphone audio. Click Start to choose what to record.'}
      </div>
      <div style="display:flex; gap:10px;">
        ${isRecording
          ? `<button id="sr-stop" style="padding:11px 28px; background:#ff3b30; border:none; color:white; border-radius:10px; font-size:13px; font-weight:600; font-family:var(--font); cursor:pointer;">\u23F9 Stop & Save</button>`
          : `<button id="sr-start" style="padding:11px 28px; background:var(--accent); border:none; color:white; border-radius:10px; font-size:13px; font-weight:600; font-family:var(--font); cursor:pointer;">\u25CF Start Recording</button>`
        }
      </div>
      <div style="margin-top:24px; font-size:11px; color:rgba(255,255,255,0.35);">
        ${isRecording ? '' : 'Tip: You can also press Cmd+Shift+5 to start recording'}
      </div>
    </div>
  `;

  const startBtn = container.querySelector('#sr-start');
  const stopBtn = container.querySelector('#sr-stop');

  if (startBtn) startBtn.addEventListener('click', () => startRecording(container));
  if (stopBtn) stopBtn.addEventListener('click', () => stopRecording(container));
}

async function startRecording(container) {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false, // browser-level audio capture
    });

    state.stream = stream;
    state.chunks = [];
    state.startTime = Date.now();

    // Try codecs in order of preference
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) state.chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(state.chunks, { type: mimeType });
      const name = `Recording ${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.webm`;
      const path = `/Documents/Recordings/${name}`;

      // Ensure folder exists
      try { await fileSystem.createFolder('/Documents/Recordings'); } catch {}

      // Save as base64 data URL (fileSystem is IndexedDB-based, stores strings)
      const dataUrl = await blobToDataURL(blob);
      await fileSystem.writeFile(path, dataUrl);

      notifications.show({
        title: 'Recording Saved',
        body: name,
        icon: '\uD83C\uDFA5',
        duration: 5000,
      });
      sounds.success();

      state.recorder = null;
      state.stream = null;
      state.chunks = [];
      if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
      render(container);
    };

    // When user stops sharing from browser UI
    stream.getVideoTracks()[0].onended = () => {
      if (state.recorder) state.recorder.stop();
    };

    state.recorder = recorder;
    recorder.start(1000);
    sounds.click();

    // Tick timer
    state.timerId = setInterval(() => {
      const el = container.querySelector('#sr-timer');
      if (el) el.textContent = formatTime(Date.now() - state.startTime);
    }, 1000);

    render(container);
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      notifications.show({ title: 'Could not start recording', body: err.message, icon: '\u26A0\uFE0F' });
    }
    sounds.error();
  }
}

function stopRecording(container) {
  if (state.recorder) state.recorder.stop();
  if (state.stream) state.stream.getTracks().forEach(t => t.stop());
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
