// NOVA OS — Music Player App (v2 — Synthesized Multi-Genre Engine)

import { processManager } from '../kernel/process-manager.js';

export function registerMusic() {
  processManager.register('music', {
    name: 'Music',
    icon: '\uD83C\uDFB5',
    iconClass: 'dock-icon-music',
    singleInstance: true,
    width: 820,
    height: 540,
    minWidth: 640,
    minHeight: 440,
    launch: (contentEl) => {
      initMusic(contentEl);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   NOTE FREQUENCY TABLE (for readability in melody definitions)
   ═══════════════════════════════════════════════════════════════════ */
const N = {
  C3:131, D3:147, Eb3:156, E3:165, F3:175, Fs3:185, G3:196, Gs3:208, Ab3:208, A3:220, Bb3:233, B3:247,
  C4:262, Cs4:277, Db4:277, D4:294, Ds4:311, Eb4:311, E4:330, F4:349, Fs4:370, Gb4:370, G4:392, Gs4:415, Ab4:415, A4:440, Bb4:466, B4:494,
  C5:523, Cs5:554, Db5:554, D5:587, Ds5:622, Eb5:622, E5:659, F5:698, Fs5:740, G5:784, Gs5:831, Ab5:831, A5:880, Bb5:932, B5:988,
  C6:1047, D6:1175, E6:1319, F6:1397, G6:1568,
  R: -1  // rest
};
const R = N.R;

/* ═══════════════════════════════════════════════════════════════════
   GENRE DEFINITIONS
   Each genre defines: bpm, chords, drum pattern, oscillator config,
   filter settings, and per-track melodies / chord progressions.
   ═══════════════════════════════════════════════════════════════════ */

const GENRES = {
  classical: {
    name: 'Classical',
    emoji: '\uD83C\uDFBB',
    color: '#4e342e',
    bpm: 100,
    swing: 0,
    oscTypes: ['sine', 'triangle'],
    detune: 2,
    filterFreq: 5000,
    filterQ: 0.5,
    reverbDecay: 3.0,
    reverbMix: 0.45,
    melodyVol: 0.11,
    chordVol: 0.04,
    bassVol: 0.06,
    drumVol: 0.0,
    drumPattern: { kick:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], hihat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], openhat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    tracks: [
      {
        title: 'F\u00FCr Elise',
        artist: 'Beethoven',
        bpm: 75,
        // The iconic opening motif — E5 D#5 E5 D#5 E5 B4 D5 C5 | A4 . C4 E4 A4 . E4 G#4 | B4 . E4 G#4 B4 . C5 . | E5 D#5 E5 D#5 E5 B4 D5 C5 | A4 . C4 E4 A4 . . .
        melody: [
          N.E5, N.Ds5, N.E5, N.Ds5, N.E5, N.B4, N.D5, N.C5,
          N.A4, R,     N.C4, N.E4,  N.A4, R,     N.E4, N.Gs4,
          N.B4, R,     N.E4, N.Gs4, N.B4, R,     N.C5, R,
          N.E5, N.Ds5, N.E5, N.Ds5, N.E5, N.B4,  N.D5, N.C5,
          N.A4, R,     N.C4, N.E4,  N.A4, R,     N.E4, N.Gs4,
          N.B4, R,     N.E4, N.C5,  N.B4, N.A4,  R,    R,
        ],
        chords: [
          [N.A3, N.C4, N.E4],      // Am
          [N.A3, N.C4, N.E4],      // Am
          [N.E3, N.Gs3, N.B3],     // E
          [N.A3, N.C4, N.E4],      // Am
          [N.A3, N.C4, N.E4],      // Am
          [N.E3, N.Gs3, N.B3],     // E
        ],
      },
      {
        title: 'Ode to Joy',
        artist: 'Beethoven',
        bpm: 108,
        // Symphony No.9 theme in D major
        melody: [
          N.Fs4, N.Fs4, N.G4,  N.A4,  N.A4,  N.G4,  N.Fs4, N.E4,
          N.D4,  N.D4,  N.E4,  N.Fs4, N.Fs4, R,     N.E4,  N.E4,
          N.Fs4, N.Fs4, N.G4,  N.A4,  N.A4,  N.G4,  N.Fs4, N.E4,
          N.D4,  N.D4,  N.E4,  N.Fs4, N.E4,  R,     N.D4,  N.D4,
          N.E4,  N.E4,  N.Fs4, N.D4,  N.E4,  N.Fs4, N.G4,  N.Fs4,
          N.D4,  N.E4,  N.Fs4, N.G4,  N.Fs4, N.E4,  N.D4,  N.E4,
        ],
        chords: [
          [N.D3, N.Fs3, N.A3],     // D
          [N.A3, N.Cs4, N.E4],     // A
          [N.B3, N.D4, N.Fs4],     // Bm
          [N.G3, N.B3, N.D4],      // G
          [N.D3, N.Fs3, N.A3],     // D
          [N.A3, N.Cs4, N.E4],     // A
        ],
      },
      {
        title: 'Canon in D',
        artist: 'Pachelbel',
        bpm: 72,
        // The famous descending melody over the Canon progression
        melody: [
          N.Fs5, R,     N.E5,  R,     N.D5,  R,     N.Cs5, R,
          N.B4,  R,     N.A4,  R,     N.B4,  R,     N.Cs5, R,
          N.D5,  R,     N.Cs5, R,     N.B4,  R,     N.A4,  R,
          N.G4,  R,     N.Fs4, R,     N.G4,  R,     N.A4,  R,
          N.Fs4, N.G4,  N.A4,  N.Fs4, N.G4,  N.A4,  N.A4,  N.B4,
          N.G4,  N.A4,  N.B4,  N.G4,  N.A4,  N.B4,  N.Cs5, N.D5,
          N.A4,  N.B4,  N.Cs5, N.D5,  N.E5,  N.Fs5, N.E5,  N.D5,
          N.Cs5, N.B4,  N.A4,  N.B4,  N.A4,  N.G4,  N.Fs4, N.E4,
        ],
        chords: [
          [N.D3, N.Fs3, N.A3],     // D
          [N.A3, N.Cs4, N.E4],     // A
          [N.B3, N.D4, N.Fs4],     // Bm
          [N.Fs3, N.A3, N.Cs4],    // F#m
          [N.G3, N.B3, N.D4],      // G
          [N.D3, N.Fs3, N.A3],     // D
          [N.G3, N.B3, N.D4],      // G
          [N.A3, N.Cs4, N.E4],     // A
        ],
      },
      {
        title: 'Gymnopedie No. 1',
        artist: 'Satie',
        bpm: 56,
        // Sparse, dreamy melody in D major
        melody: [
          N.Fs5, R, R, R,     N.D5, R, R, R,
          N.E5,  R, R, R,     N.Cs5, R, R, R,
          N.B4,  R, R, R,     N.D5,  R, R, R,
          N.A4,  R, R, R,     R,     R, R, R,
          N.Fs5, R, R, R,     N.D5,  R, R, R,
          N.E5,  R, R, R,     N.Cs5, R, R, R,
          N.D5,  R, R, R,     N.B4,  R, R, R,
          N.A4,  R, R, N.B4,  N.A4,  R, R, R,
        ],
        chords: [
          [N.G3, N.B3, N.D4, N.Fs4],   // Gmaj7
          [N.A3, N.D4, N.Fs4],          // D/A
          [N.G3, N.B3, N.D4, N.Fs4],   // Gmaj7
          [N.A3, N.D4, N.Fs4],          // D/A
          [N.E3, N.G3, N.B3, N.D4],    // Em7
          [N.Fs3, N.A3, N.D4],         // D/F#
          [N.E3, N.G3, N.B3, N.D4],    // Em7
          [N.A3, N.Cs4, N.E4],         // A
        ],
      },
      {
        title: 'Prelude in C',
        artist: 'Bach',
        bpm: 88,
        // Arpeggiated pattern — each bar outlines a chord
        melody: [
          N.C4, N.E4,  N.G4, N.C5,  N.E5, N.C5, N.G4, N.E4,   // C
          N.D4, N.F4,  N.A4, N.D5,  N.F5, N.D5, N.A4, N.F4,   // Dm
          N.B3, N.D4,  N.G4, N.B4,  N.D5, N.B4, N.G4, N.D4,   // G
          N.C4, N.E4,  N.G4, N.C5,  N.E5, N.C5, N.G4, N.E4,   // C
          N.A3, N.C4,  N.E4, N.A4,  N.C5, N.A4, N.E4, N.C4,   // Am
          N.D4, N.Fs4, N.A4, N.D5,  N.Fs5,N.D5, N.A4, N.Fs4,  // D
          N.G3, N.B3,  N.D4, N.G4,  N.B4, N.G4, N.D4, N.B3,   // G
          N.C4, N.E4,  N.G4, N.C5,  N.E5, N.C5, N.G4, N.E4,   // C
        ],
        chords: [
          [N.C3, N.E3, N.G3],       // C
          [N.D3, N.F3, N.A3],       // Dm
          [N.G3, N.B3, N.D4],       // G
          [N.C3, N.E3, N.G3],       // C
          [N.A3, N.C4, N.E4],       // Am
          [N.D3, N.Fs3, N.A3],      // D
          [N.G3, N.B3, N.D4],       // G
          [N.C3, N.E3, N.G3],       // C
        ],
      },
      {
        title: 'Greensleeves',
        artist: 'Traditional',
        bpm: 80,
        // Classic English folk melody in Am
        melody: [
          N.A4,  R,     N.C5,  N.D5,  N.E5,  R,     N.F5,  N.E5,
          N.D5,  R,     N.B4,  N.G4,  N.A4,  R,     N.B4,  N.C5,
          N.A4,  N.A4,  N.Gs4, N.A4,  N.B4,  R,     N.Gs4, N.E4,
          N.A4,  R,     N.C5,  N.D5,  N.E5,  R,     N.F5,  N.E5,
          N.D5,  R,     N.B4,  N.G4,  N.A4,  R,     N.B4,  N.C5,
          N.B4,  N.A4,  N.Gs4, R,     N.A4,  R,     R,     R,
        ],
        chords: [
          [N.A3, N.C4, N.E4],       // Am
          [N.G3, N.B3, N.D4],       // G
          [N.A3, N.C4, N.E4],       // Am
          [N.E3, N.Gs3, N.B3],      // E
          [N.A3, N.C4, N.E4],       // Am
          [N.E3, N.Gs3, N.B3],      // E
        ],
      },
    ],
  },

  jazz: {
    name: 'Jazz',
    emoji: '\uD83C\uDFB7',
    color: '#bf360c',
    bpm: 132,
    swing: 0.25,
    oscTypes: ['sine', 'triangle'],
    detune: 3,
    filterFreq: 3200,
    filterQ: 1,
    reverbDecay: 1.5,
    reverbMix: 0.22,
    melodyVol: 0.1,
    chordVol: 0.04,
    bassVol: 0.09,
    drumVol: 0.1,
    drumPattern: {
      kick:   [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
      snare:  [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
      hihat:  [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1],
      openhat:[0,0,0,0, 0,1,0,0, 0,0,0,0, 0,1,0,0],
    },
    tracks: [
      {
        title: 'Blue Note Alley',
        artist: 'Smooth Keys',
        // Bebop-influenced melody with chromatic passing tones over ii-V-I in C
        melody: [
          N.E5,  N.D5,  N.C5,  N.Bb4, N.A4,  N.G4,  N.A4,  N.B4,
          N.C5,  R,     N.E4,  N.G4,  N.Bb4, N.A4,  N.G4,  R,
          N.A4,  N.C5,  N.D5,  N.E5,  N.G5,  N.E5,  N.D5,  N.C5,
          N.A4,  R,     N.G4,  N.E4,  N.D4,  R,     N.C4,  R,
        ],
        chords: [
          [N.D4, N.F4, N.A4, N.C5],    // Dm7
          [N.G3, N.B3, N.D4, N.F4],    // G7
          [N.C4, N.E4, N.G4, N.B4],    // Cmaj7
          [N.A3, N.C4, N.E4, N.G4],    // Am7
        ],
      },
      {
        title: 'Midnight Blues',
        artist: 'Miles Out',
        bpm: 100,
        // 12-bar blues feel with blue notes
        melody: [
          N.C4,  N.Eb4, N.F4,  N.Fs4, N.G4,  R,     N.Eb4, N.C4,
          N.G4,  N.Bb4, N.G4,  N.F4,  N.Eb4, R,     N.C4,  R,
          N.F4,  N.Ab4, N.F4,  N.Eb4, N.C4,  N.Eb4, N.F4,  R,
          N.C4,  R,     N.Eb4, N.G4,  N.Bb4, N.G4,  N.F4,  N.Eb4,
        ],
        chords: [
          [N.C3, N.Eb3, N.G3, N.Bb3], // Cm7
          [N.F3, N.Ab3, N.C4, N.Eb4], // Fm7
          [N.G3, N.B3, N.D4, N.F4],   // G7
          [N.C3, N.Eb3, N.G3, N.Bb3], // Cm7
        ],
      },
      {
        title: 'Sax & The City',
        artist: 'Cool Cats',
        bpm: 138,
        // Uptempo swing melody
        melody: [
          N.G4,  N.A4,  N.B4,  N.D5,  N.E5,  R,     N.D5,  N.B4,
          N.A4,  N.G4,  R,     N.E4,  N.Fs4, N.G4,  N.A4,  R,
          N.B4,  N.D5,  N.Fs5, N.E5,  N.D5,  R,     N.B4,  N.A4,
          N.G4,  R,     N.A4,  N.B4,  N.G4,  R,     R,     R,
        ],
        chords: [
          [N.G3, N.B3, N.D4, N.Fs4], // Gmaj7
          [N.E3, N.G3, N.B3, N.D4],  // Em7
          [N.A3, N.Cs4, N.E4, N.G4], // A7
          [N.D3, N.Fs3, N.A3, N.C4], // D7
        ],
      },
      {
        title: 'Late Set',
        artist: 'Trio Session',
        bpm: 120,
        // Cool jazz ballad
        melody: [
          N.D5,  R,     N.C5,  R,     N.A4,  R,     N.G4,  R,
          N.F4,  R,     N.E4,  N.D4,  N.E4,  N.F4,  N.A4,  R,
          N.G4,  R,     N.A4,  N.C5,  N.D5,  R,     N.C5,  N.A4,
          N.G4,  N.F4,  N.E4,  R,     N.D4,  R,     R,     R,
        ],
        chords: [
          [N.D3, N.F3, N.A3, N.C4],  // Dm7
          [N.Bb3, N.D4, N.F4, N.A4], // Bbmaj7
          [N.E3, N.G3, N.Bb3, N.D4], // Em7b5
          [N.A3, N.Cs4, N.E4, N.G4], // A7
        ],
      },
    ],
  },

  lofi: {
    name: 'Lo-Fi Hip Hop',
    emoji: '\uD83C\uDF19',
    color: '#6b4c9a',
    bpm: 75,
    swing: 0.15,
    oscTypes: ['triangle', 'sine'],
    detune: 8,
    filterFreq: 800,
    filterQ: 2,
    reverbDecay: 2.5,
    reverbMix: 0.35,
    melodyVol: 0.12,
    chordVol: 0.06,
    bassVol: 0.1,
    drumVol: 0.13,
    drumPattern: {
      kick:   [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
      snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      hihat:  [1,0,1,1, 1,0,1,0, 1,0,1,1, 1,0,1,0],
      openhat:[0,0,0,0, 0,0,0,1, 0,0,0,0, 0,1,0,0],
    },
    tracks: [
      {
        title: 'Rainy Window',
        artist: 'Lo-Fi Beats',
        // Mellow piano-esque melody over jazz chords
        melody: [
          N.Eb5, R,     N.C5,  N.Bb4, R,     N.Ab4, N.G4,  R,
          N.Ab4, R,     N.Bb4, R,     N.C5,  R,     N.Eb5, R,
          N.D5,  R,     N.C5,  N.Bb4, R,     N.Ab4, R,     N.G4,
          N.Ab4, N.Bb4, N.Ab4, R,     N.G4,  R,     R,     R,
        ],
        chords: [
          [N.Ab3, N.C4, N.Eb4, N.G4],   // Abmaj7
          [N.Bb3, N.D4, N.F4, N.Ab4],   // Bbm7... wait
          [N.Eb3, N.G3, N.Bb3, N.D4],   // Ebmaj7
          [N.Ab3, N.C4, N.Eb4],         // Ab
        ],
      },
      {
        title: 'Late Night Study',
        artist: 'Chill Hop',
        // Sparse Rhodes arpeggios
        melody: [
          R,     N.E4,  N.G4,  R,     N.A4,  R,     N.B4,  R,
          N.C5,  R,     R,     N.B4,  N.A4,  R,     N.G4,  R,
          R,     N.F4,  N.A4,  R,     N.C5,  R,     N.B4,  R,
          N.A4,  R,     N.G4,  R,     N.E4,  R,     R,     R,
        ],
        chords: [
          [N.C4, N.E4, N.G4, N.B4],    // Cmaj7
          [N.A3, N.C4, N.E4, N.G4],    // Am7
          [N.F3, N.A3, N.C4, N.E4],    // Fmaj7
          [N.G3, N.B3, N.D4, N.F4],    // G7
        ],
      },
      {
        title: '3AM Coffee',
        artist: 'Mellow Vibes',
        // Jazzy lo-fi with 9th chords
        melody: [
          N.D5,  R,     N.E5,  R,     N.Fs5, R,     N.E5,  N.D5,
          N.B4,  R,     N.A4,  R,     N.Fs4, R,     R,     R,
          N.G4,  R,     N.A4,  N.B4,  N.D5,  R,     N.Cs5, R,
          N.B4,  R,     N.A4,  N.G4,  N.Fs4, R,     R,     R,
        ],
        chords: [
          [N.D3, N.Fs3, N.A3, N.Cs4], // Dmaj7
          [N.B3, N.D4, N.Fs4, N.A4],  // Bm7
          [N.G3, N.B3, N.D4, N.Fs4],  // Gmaj7
          [N.A3, N.Cs4, N.E4, N.G4],  // A7
        ],
      },
      {
        title: 'Vinyl Crackle',
        artist: 'Dusty Grooves',
        // Nostalgic melody, pentatonic feel
        melody: [
          N.C5,  R,     N.Eb5, R,     N.F5,  R,     N.G5,  R,
          N.Eb5, R,     N.C5,  R,     N.Bb4, R,     N.C5,  R,
          N.G4,  R,     N.Bb4, R,     N.C5,  N.Eb5, N.C5,  R,
          N.Bb4, R,     N.G4,  R,     N.F4,  R,     R,     R,
        ],
        chords: [
          [N.C4, N.Eb4, N.G4, N.Bb4], // Cm7
          [N.Ab3, N.C4, N.Eb4, N.G4], // Abmaj7
          [N.Bb3, N.D4, N.F4],        // Bb
          [N.G3, N.Bb3, N.D4],        // Gm
        ],
      },
    ],
  },

  synthwave: {
    name: 'Synthwave',
    emoji: '\uD83C\uDF06',
    color: '#e91e63',
    bpm: 110,
    swing: 0,
    oscTypes: ['sawtooth', 'square'],
    detune: 15,
    filterFreq: 2200,
    filterQ: 4,
    reverbDecay: 1.8,
    reverbMix: 0.25,
    melodyVol: 0.08,
    chordVol: 0.04,
    bassVol: 0.12,
    drumVol: 0.15,
    drumPattern: {
      kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hihat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      openhat:[0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
    },
    tracks: [
      {
        title: 'Midnight Drive',
        artist: 'Neon Runner',
        // Driving arpeggio sequence
        melody: [
          N.E4, N.A4,  N.B4,  N.E5,  N.B4,  N.A4,  N.E4,  N.B4,
          N.D4, N.Fs4, N.A4,  N.D5,  N.A4,  N.Fs4, N.D4,  N.A4,
          N.C4, N.E4,  N.G4,  N.C5,  N.G4,  N.E4,  N.C4,  N.G4,
          N.D4, N.G4,  N.A4,  N.D5,  N.A4,  N.G4,  N.D4,  N.A4,
        ],
        chords: [
          [N.A3, N.Cs4, N.E4],    // A
          [N.D3, N.Fs3, N.A3],    // D
          [N.C3, N.E3, N.G3],     // C
          [N.G3, N.B3, N.D4],     // G
        ],
      },
      {
        title: 'Chrome Horizon',
        artist: 'Retro Future',
        // Big sawtooth lead melody
        melody: [
          N.E5,  N.E5,  N.Fs5, N.G5,  N.Fs5, R,     N.E5,  N.D5,
          N.B4,  R,     N.D5,  R,     N.E5,  R,     R,     R,
          N.E5,  N.E5,  N.Fs5, N.G5,  N.A5,  R,     N.G5,  N.Fs5,
          N.E5,  R,     N.D5,  N.E5,  N.B4,  R,     R,     R,
        ],
        chords: [
          [N.E3, N.Gs3, N.B3],    // E
          [N.B3, N.Ds4, N.Fs4],   // B
          [N.Cs4, N.E4, N.Gs4],   // C#m
          [N.A3, N.Cs4, N.E4],    // A
        ],
      },
      {
        title: 'Laser Grid',
        artist: 'Voltage 84',
        bpm: 120,
        // Punchy sequence with octave jumps
        melody: [
          N.A4,  N.A5,  N.A4,  N.A5,  N.G4,  N.G5,  N.A4,  N.A5,
          N.F4,  N.F5,  N.G4,  N.G5,  N.A4,  N.A5,  N.G4,  N.F4,
          N.E4,  N.E5,  N.E4,  N.E5,  N.D4,  N.D5,  N.E4,  N.E5,
          N.F4,  N.G4,  N.A4,  N.G4,  N.F4,  N.E4,  N.D4,  N.E4,
        ],
        chords: [
          [N.A3, N.C4, N.E4],     // Am
          [N.F3, N.A3, N.C4],     // F
          [N.E3, N.Gs3, N.B3],    // E
          [N.A3, N.C4, N.E4],     // Am
        ],
      },
      {
        title: 'Neon Lights',
        artist: 'Synthwave FM',
        // Smooth retro lead
        melody: [
          N.C5,  R,     N.D5,  N.Eb5, N.G5,  R,     N.F5,  N.Eb5,
          N.D5,  R,     N.C5,  R,     N.Bb4, R,     N.C5,  R,
          N.Eb5, R,     N.F5,  N.G5,  N.Bb5, R,     N.G5,  N.F5,
          N.Eb5, R,     N.D5,  N.C5,  N.Bb4, R,     N.C5,  R,
        ],
        chords: [
          [N.C4, N.Eb4, N.G4],    // Cm
          [N.Bb3, N.D4, N.F4],    // Bb
          [N.Ab3, N.C4, N.Eb4],   // Ab
          [N.Bb3, N.D4, N.F4],    // Bb
        ],
      },
    ],
  },

  ambient: {
    name: 'Ambient',
    emoji: '\uD83C\uDF0C',
    color: '#00695c',
    bpm: 60,
    swing: 0,
    oscTypes: ['sine', 'triangle'],
    detune: 5,
    filterFreq: 1200,
    filterQ: 0.7,
    reverbDecay: 4.0,
    reverbMix: 0.55,
    melodyVol: 0.07,
    chordVol: 0.05,
    bassVol: 0.06,
    drumVol: 0.0,
    drumPattern: { kick:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], hihat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], openhat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    tracks: [
      {
        title: 'Floating',
        artist: 'Deep Space',
        // Very sparse, ethereal notes
        melody: [
          N.E5,  R, R, R, R, R, R, R,
          N.B4,  R, R, R, R, R, N.D5, R,
          R,     R, R, R, N.A4, R, R, R,
          R,     R, N.E5, R, R, R, R, R,
        ],
        chords: [
          [N.A3, N.E4, N.B4],       // Asus2
          [N.G3, N.D4, N.B4],       // Gsus2
          [N.F3, N.C4, N.A4],       // Fsus2
          [N.E3, N.B3, N.Gs4],      // E
        ],
      },
      {
        title: 'Clouds Below',
        artist: 'Ether',
        // Gentle cascading notes
        melody: [
          N.G5,  R, R, N.E5, R, R, N.D5, R,
          R,     R, N.C5, R, R, R, R, R,
          N.D5,  R, R, R, N.E5, R, R, N.G5,
          R,     R, R, R, R, R, R, R,
        ],
        chords: [
          [N.C4, N.G4, N.E5],       // C
          [N.A3, N.E4, N.C5],       // Am
          [N.F3, N.C4, N.A4],       // F
          [N.G3, N.D4, N.B4],       // G
        ],
      },
      {
        title: 'Still Water',
        artist: 'Horizon',
        // Minimal, meditative
        melody: [
          R,     R, R, R, N.A4, R, R, R,
          R,     R, R, R, R, R, R, R,
          N.E5,  R, R, R, R, R, N.D5, R,
          R,     R, R, R, R, R, R, R,
        ],
        chords: [
          [N.D3, N.A3, N.Fs4],      // D
          [N.A3, N.E4, N.Cs5],      // A
          [N.G3, N.D4, N.B4],       // G
          [N.D3, N.A3, N.Fs4],      // D
        ],
      },
      {
        title: 'Northern Lights',
        artist: 'Aurora',
        bpm: 50,
        // Shimmering high notes
        melody: [
          N.B5,  R, R, R, R, R, N.Gs5, R,
          R,     R, R, R, N.E5, R, R, R,
          R,     R, N.Fs5, R, R, R, R, R,
          N.Gs5, R, R, R, R, R, R, R,
        ],
        chords: [
          [N.E3, N.B3, N.Gs4],     // E
          [N.Cs4, N.E4, N.Gs4],    // C#m
          [N.A3, N.E4, N.Cs5],     // A
          [N.B3, N.Fs4, N.Ds4],    // B
        ],
      },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════════
   SYNTH ENGINE — multi-oscillator, reverb, filter, drums
   ═══════════════════════════════════════════════════════════════════ */

class SynthEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.reverbSend = null;
    this.filter = null;
    this.analyser = null;
    this.playing = false;
    this.schedulerTimer = null;
    this.currentGenre = null;
    this.currentTrack = null;
    this.currentGenreKey = null;
    this.step = 0;
    this.chordIdx = 0;
    this.melodyPos = 0;
    this.nextStepTime = 0;
    this._volume = 0.8;
    this._filterLFOTimer = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._volume * 0.25;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.dryGain = this.ctx.createGain();
    this.dryGain.connect(this.masterGain);

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.connect(this.masterGain);

    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0.3;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2000;
    this.filter.Q.value = 1;
    this.filter.connect(this.dryGain);

    this._buildReverb(2.0, 0.3);
  }

  _buildReverb(decay, mix) {
    // Disconnect old send
    try { this.reverbSend.disconnect(); } catch (_) { /* noop */ }
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = mix;

    const merger = this.ctx.createGain();
    merger.gain.value = 0.5;
    merger.connect(this.reverbGain);

    const delays = [0.03, 0.07, 0.11, 0.17, 0.23, 0.31];
    const gains  = [0.6,  0.5,  0.4,  0.3,  0.2,  0.15];

    delays.forEach((t, i) => {
      const d = this.ctx.createDelay(1);
      d.delayTime.value = t * (decay / 2);
      const g = this.ctx.createGain();
      g.gain.value = gains[i];
      this.reverbSend.connect(d);
      d.connect(g);
      g.connect(merger);
      const fb = this.ctx.createGain();
      fb.gain.value = 0.2;
      g.connect(fb);
      fb.connect(d);
    });

    // Reconnect filter to reverb send
    this.filter.connect(this.reverbSend);
  }

  setVolume(v) {
    this._volume = v / 100;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this._volume * 0.25, this.ctx.currentTime, 0.05);
    }
  }

  play(genreKey, trackIdx) {
    this.init();

    // Crossfade out old sound
    if (this.playing) {
      this._crossfadeOut();
    }

    const genre = GENRES[genreKey];
    const track = genre.tracks[trackIdx];
    this.currentGenre = genre;
    this.currentTrack = track;
    this.currentGenreKey = genreKey;
    this.step = 0;
    this.chordIdx = 0;
    this.melodyPos = 0;
    this.playing = true;

    const bpm = track.bpm || genre.bpm;
    this._currentBPM = bpm;

    // Configure filter
    this.filter.frequency.setTargetAtTime(genre.filterFreq, this.ctx.currentTime, 0.1);
    this.filter.Q.setTargetAtTime(genre.filterQ, this.ctx.currentTime, 0.1);

    // Rebuild reverb for genre
    this._buildReverb(genre.reverbDecay, genre.reverbMix);
    this.dryGain.gain.value = 1 - genre.reverbMix * 0.5;

    this._startFilterLFO(genre);

    this.nextStepTime = this.ctx.currentTime + 0.1;
    this._schedule();
  }

  _crossfadeOut() {
    if (this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(0, now, 0.15);
      setTimeout(() => {
        if (this.masterGain) {
          this.masterGain.gain.setTargetAtTime(this._volume * 0.25, this.ctx.currentTime, 0.08);
        }
      }, 400);
    }
    this._stopScheduler();
  }

  _startFilterLFO(genre) {
    if (this._filterLFOTimer) clearInterval(this._filterLFOTimer);
    let phase = 0;
    this._filterLFOTimer = setInterval(() => {
      if (!this.playing || !this.filter) return;
      phase += 0.05;
      const mod = Math.sin(phase) * genre.filterFreq * 0.3;
      this.filter.frequency.setTargetAtTime(
        Math.max(200, genre.filterFreq + mod),
        this.ctx.currentTime, 0.1
      );
    }, 100);
  }

  _schedule() {
    if (!this.playing) return;

    const genre = this.currentGenre;
    const track = this.currentTrack;
    const bpm = this._currentBPM;
    const secPerStep = (60 / bpm) / 4;
    const now = this.ctx.currentTime;

    while (this.nextStepTime < now + 0.1) {
      const t = this.nextStepTime;
      const s = this.step % 16;

      let swingOffset = 0;
      if (s % 2 === 1 && genre.swing > 0) {
        swingOffset = secPerStep * genre.swing;
      }
      const st = t + swingOffset;

      // ── Chords (every bar = 16 steps)
      if (s === 0) {
        const chords = track.chords;
        if (chords && chords.length > 0) {
          const chord = chords[this.chordIdx % chords.length];
          this._playChord(chord, st, secPerStep * 16, genre);
          this._playBass(chord[0] / 2, st, secPerStep * 8, genre);
          this.chordIdx++;
        }
      }

      // ── Melody (every other step = 8th notes)
      if (s % 2 === 0) {
        const melody = track.melody;
        if (melody && melody.length > 0) {
          const freq = melody[this.melodyPos % melody.length];
          if (freq > 0) {
            this._playMelody(freq, st, secPerStep * 2.5, genre);
          }
          this.melodyPos++;
        }
      }

      // ── Drums
      if (genre.drumVol > 0) {
        const dp = track.drumPattern || genre.drumPattern;
        if (dp.kick[s])    this._playKick(st, genre);
        if (dp.snare[s])   this._playSnare(st, genre);
        if (dp.hihat[s])   this._playHihat(st, false, genre);
        if (dp.openhat[s]) this._playHihat(st, true, genre);
      }

      this.step++;
      this.nextStepTime += secPerStep;
    }

    this.schedulerTimer = setTimeout(() => this._schedule(), 25);
  }

  _playChord(freqs, time, dur, genre) {
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = genre.oscTypes[i % genre.oscTypes.length];
      osc.frequency.value = freq;
      osc.detune.value = (i - 1) * genre.detune;

      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(genre.chordVol, time + 0.08);
      g.gain.setValueAtTime(genre.chordVol, time + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.95);

      osc.connect(g);
      g.connect(this.filter);
      osc.start(time);
      osc.stop(time + dur);
    });
  }

  _playBass(freq, time, dur, genre) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const sub = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = freq / 2;
    sg.gain.setValueAtTime(genre.bassVol * 0.3, time);
    sg.gain.exponentialRampToValueAtTime(0.001, time + dur);
    sub.connect(sg);
    sg.connect(this.filter);
    sub.start(time);
    sub.stop(time + dur);

    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(genre.bassVol, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9);

    osc.connect(g);
    g.connect(this.filter);
    osc.start(time);
    osc.stop(time + dur);
  }

  _playMelody(freq, time, dur, genre) {
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = genre.oscTypes[i % genre.oscTypes.length];
      osc.frequency.value = freq;
      osc.detune.value = (i === 0 ? -genre.detune : genre.detune);

      const vol = genre.melodyVol * (i === 0 ? 1 : 0.5);
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(vol, time + 0.02);
      g.gain.setValueAtTime(vol * 0.8, time + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(g);
      g.connect(this.filter);
      osc.start(time);
      osc.stop(time + dur + 0.01);
    }
  }

  _playKick(time, genre) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    g.gain.setValueAtTime(genre.drumVol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    osc.connect(g);
    g.connect(this.filter);
    osc.start(time);
    osc.stop(time + 0.35);

    const click = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    click.type = 'square';
    click.frequency.value = 800;
    cg.gain.setValueAtTime(genre.drumVol * 0.3, time);
    cg.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
    click.connect(cg);
    cg.connect(this.filter);
    click.start(time);
    click.stop(time + 0.02);
  }

  _playSnare(time, genre) {
    const bufSize = this.ctx.sampleRate * 0.15;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const ng = this.ctx.createGain();
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'highpass';
    nf.frequency.value = 1500;
    ng.gain.setValueAtTime(genre.drumVol * 0.7, time);
    ng.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(this.filter);
    noise.start(time);
    noise.stop(time + 0.2);

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 200;
    g.gain.setValueAtTime(genre.drumVol * 0.5, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(g);
    g.connect(this.filter);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  _playHihat(time, open, genre) {
    const bufSize = this.ctx.sampleRate * (open ? 0.2 : 0.05);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = open ? 8000 : 10000;
    f.Q.value = 1;

    const vol = genre.drumVol * (open ? 0.35 : 0.25);
    const decay = open ? 0.18 : 0.04;
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + decay);

    noise.connect(f);
    f.connect(g);
    g.connect(this.filter);
    noise.start(time);
    noise.stop(time + decay + 0.01);
  }

  pause() {
    this.playing = false;
    this._stopScheduler();
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  resume() {
    if (!this.ctx || !this.currentGenre) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.playing = true;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this._schedule();
  }

  stop() {
    this.playing = false;
    this._stopScheduler();
  }

  _stopScheduler() {
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this._filterLFOTimer) {
      clearInterval(this._filterLFOTimer);
      this._filterLFOTimer = null;
    }
  }

  getAnalyserData() {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  destroy() {
    this.stop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   UI
   ═══════════════════════════════════════════════════════════════════ */

function initMusic(container) {
  const engine = new SynthEngine();
  let currentTrackIdx = -1;
  let isPlaying = false;
  let vizRAF = null;

  const genreKeys = Object.keys(GENRES);

  container.innerHTML = `
    <style>
      .music-v2 {
        display: flex; flex-direction: column; height: 100%;
        background: rgba(18, 18, 22, 0.95); color: var(--text-primary, #fff);
        font-family: var(--font, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
        border-radius: 0 0 var(--radius-lg, 14px) var(--radius-lg, 14px);
        overflow: hidden; user-select: none;
      }
      .mv2-genres {
        display: flex; gap: 6px; padding: 10px 14px 6px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        overflow-x: auto; flex-shrink: 0;
      }
      .mv2-genre-btn {
        padding: 6px 14px; border-radius: 20px; border: none;
        background: rgba(255,255,255,0.06); color: var(--text-secondary, #aaa);
        font-size: 12px; cursor: pointer; white-space: nowrap;
        transition: all 0.2s; display: flex; align-items: center; gap: 5px;
      }
      .mv2-genre-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
      .mv2-genre-btn.active {
        background: var(--accent, #007aff); color: #fff; font-weight: 600;
      }
      .mv2-body { display: flex; flex: 1; min-height: 0; }
      .mv2-tracks {
        flex: 1; overflow-y: auto; padding: 8px 0;
      }
      .mv2-tracks::-webkit-scrollbar { width: 5px; }
      .mv2-tracks::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      .mv2-track {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 16px; cursor: pointer; transition: background 0.15s;
      }
      .mv2-track:hover { background: rgba(255,255,255,0.04); }
      .mv2-track.active { background: rgba(255,255,255,0.07); }
      .mv2-track.playing .mv2-track-num { color: var(--accent, #007aff); }
      .mv2-track-num {
        width: 20px; text-align: right; font-size: 12px;
        color: var(--text-tertiary, #666); font-variant-numeric: tabular-nums;
      }
      .mv2-track-art {
        width: 36px; height: 36px; border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
      }
      .mv2-track-info { flex: 1; min-width: 0; }
      .mv2-track-title {
        font-size: 13px; font-weight: 500;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .mv2-track-artist {
        font-size: 11px; color: var(--text-secondary, #aaa); margin-top: 1px;
      }
      .mv2-track-genre-label {
        font-size: 10px; color: var(--text-tertiary, #666);
        background: rgba(255,255,255,0.05); padding: 2px 8px;
        border-radius: 10px; flex-shrink: 0;
      }
      .mv2-viz-panel {
        width: 220px; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        border-left: 1px solid rgba(255,255,255,0.06);
        padding: 16px; flex-shrink: 0;
      }
      .mv2-viz-canvas {
        width: 190px; height: 140px; border-radius: 10px;
        background: rgba(0,0,0,0.3);
      }
      .mv2-viz-label {
        font-size: 10px; color: var(--text-tertiary, #666);
        margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;
      }
      .mv2-now-info { text-align: center; margin-bottom: 14px; }
      .mv2-now-emoji { font-size: 32px; margin-bottom: 6px; }
      .mv2-now-title {
        font-size: 13px; font-weight: 600;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 180px;
      }
      .mv2-now-artist {
        font-size: 11px; color: var(--text-secondary, #aaa); margin-top: 2px;
      }
      .mv2-player {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.06);
        background: rgba(0,0,0,0.2); flex-shrink: 0;
      }
      .mv2-ctrl-btn {
        background: none; border: none; color: var(--text-secondary, #aaa);
        font-size: 18px; cursor: pointer; padding: 4px 6px;
        border-radius: 6px; transition: all 0.15s;
        display: flex; align-items: center; justify-content: center;
      }
      .mv2-ctrl-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }
      .mv2-ctrl-btn.play {
        font-size: 22px; color: #fff;
        background: var(--accent, #007aff); width: 36px; height: 36px;
        border-radius: 50%;
      }
      .mv2-ctrl-btn.play:hover { filter: brightness(1.15); }
      .mv2-progress-wrap { flex: 1; display: flex; align-items: center; gap: 8px; }
      .mv2-time {
        font-size: 10px; color: var(--text-tertiary, #666);
        font-variant-numeric: tabular-nums; min-width: 30px;
      }
      .mv2-progress-bar {
        flex: 1; height: 4px; background: rgba(255,255,255,0.08);
        border-radius: 2px; cursor: pointer; position: relative;
      }
      .mv2-progress-fill {
        height: 100%; background: var(--accent, #007aff);
        border-radius: 2px; width: 0; transition: width 0.3s linear;
      }
      .mv2-volume { display: flex; align-items: center; gap: 6px; }
      .mv2-volume-icon { font-size: 13px; color: var(--text-secondary, #aaa); cursor: pointer; }
      .mv2-volume-slider {
        width: 70px; height: 4px; -webkit-appearance: none; appearance: none;
        background: rgba(255,255,255,0.1); border-radius: 2px; outline: none;
      }
      .mv2-volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none; width: 12px; height: 12px;
        background: #fff; border-radius: 50%; cursor: pointer;
      }
      .mv2-mode-btn {
        background: none; border: none;
        color: var(--text-tertiary, #666); font-size: 14px;
        cursor: pointer; padding: 4px; border-radius: 4px;
        transition: color 0.15s;
      }
      .mv2-mode-btn:hover { color: var(--text-secondary, #aaa); }
      .mv2-mode-btn.active { color: var(--accent, #007aff); }
    </style>

    <div class="music-v2">
      <div class="mv2-genres" id="mv2-genres"></div>
      <div class="mv2-body">
        <div class="mv2-tracks" id="mv2-tracks"></div>
        <div class="mv2-viz-panel">
          <div class="mv2-now-info">
            <div class="mv2-now-emoji" id="mv2-now-emoji">\uD83C\uDFB5</div>
            <div class="mv2-now-title" id="mv2-now-title">Not Playing</div>
            <div class="mv2-now-artist" id="mv2-now-artist">\u2014</div>
          </div>
          <canvas class="mv2-viz-canvas" id="mv2-viz" width="380" height="280"></canvas>
          <div class="mv2-viz-label">Visualizer</div>
        </div>
      </div>
      <div class="mv2-player">
        <button class="mv2-mode-btn" id="mv2-shuffle" title="Shuffle">\uD83D\uDD00</button>
        <button class="mv2-ctrl-btn" id="mv2-prev" title="Previous">\u23EE</button>
        <button class="mv2-ctrl-btn play" id="mv2-play" title="Play">\u25B6</button>
        <button class="mv2-ctrl-btn" id="mv2-next" title="Next">\u23ED</button>
        <button class="mv2-mode-btn" id="mv2-repeat" title="Repeat">\uD83D\uDD01</button>
        <div class="mv2-progress-wrap">
          <span class="mv2-time" id="mv2-time">0:00</span>
          <div class="mv2-progress-bar" id="mv2-pbar">
            <div class="mv2-progress-fill" id="mv2-pfill"></div>
          </div>
        </div>
        <div class="mv2-volume">
          <span class="mv2-volume-icon">\uD83D\uDD0A</span>
          <input type="range" class="mv2-volume-slider" id="mv2-vol" min="0" max="100" value="80">
        </div>
      </div>
    </div>
  `;

  const genresEl = container.querySelector('#mv2-genres');
  const tracksEl = container.querySelector('#mv2-tracks');
  const nowEmoji = container.querySelector('#mv2-now-emoji');
  const nowTitle = container.querySelector('#mv2-now-title');
  const nowArtist = container.querySelector('#mv2-now-artist');
  const vizCanvas = container.querySelector('#mv2-viz');
  const vizCtx = vizCanvas.getContext('2d');
  const playBtn = container.querySelector('#mv2-play');
  const prevBtn = container.querySelector('#mv2-prev');
  const nextBtn = container.querySelector('#mv2-next');
  const shuffleBtn = container.querySelector('#mv2-shuffle');
  const repeatBtn = container.querySelector('#mv2-repeat');
  const timeEl = container.querySelector('#mv2-time');
  const pFill = container.querySelector('#mv2-pfill');
  const volSlider = container.querySelector('#mv2-vol');

  let shuffle = false;
  let repeat = false;
  let elapsed = 0;
  let tickTimer = null;
  let activeFilter = null; // null = all genres

  // Build flat track list from genres
  let allTracks = [];
  function buildTrackList(filterGenre) {
    allTracks = [];
    const keys = filterGenre ? [filterGenre] : genreKeys;
    keys.forEach(gk => {
      const g = GENRES[gk];
      g.tracks.forEach((t, i) => {
        allTracks.push({ ...t, genreKey: gk, genreTrackIdx: i, genre: g });
      });
    });
    renderTracks();
  }

  function renderTracks() {
    tracksEl.innerHTML = '';
    allTracks.forEach((track, idx) => {
      const el = document.createElement('div');
      const isCurrent = idx === currentTrackIdx && isPlaying;
      el.className = 'mv2-track' + (isCurrent ? ' active playing' : '');
      el.innerHTML = `
        <div class="mv2-track-num">${idx + 1}</div>
        <div class="mv2-track-art" style="background:${track.genre.color}">${track.genre.emoji}</div>
        <div class="mv2-track-info">
          <div class="mv2-track-title">${track.title}</div>
          <div class="mv2-track-artist">${track.artist}</div>
        </div>
        <div class="mv2-track-genre-label">${track.genre.name}</div>
      `;
      el.addEventListener('dblclick', () => playTrack(idx));
      el.addEventListener('click', () => {
        tracksEl.querySelectorAll('.mv2-track').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
      });
      tracksEl.appendChild(el);
    });
  }

  // Genre filter buttons
  const allBtn = document.createElement('button');
  allBtn.className = 'mv2-genre-btn active';
  allBtn.textContent = 'All';
  allBtn.addEventListener('click', () => {
    genresEl.querySelectorAll('.mv2-genre-btn').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    activeFilter = null;
    buildTrackList(null);
  });
  genresEl.appendChild(allBtn);

  genreKeys.forEach(gk => {
    const g = GENRES[gk];
    const btn = document.createElement('button');
    btn.className = 'mv2-genre-btn';
    btn.innerHTML = `${g.emoji} ${g.name}`;
    btn.addEventListener('click', () => {
      genresEl.querySelectorAll('.mv2-genre-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = gk;
      buildTrackList(gk);
    });
    genresEl.appendChild(btn);
  });

  buildTrackList(null);

  // ── Playback ──

  function playTrack(idx) {
    currentTrackIdx = idx;
    const track = allTracks[idx];
    if (!track) return;

    nowEmoji.textContent = track.genre.emoji;
    nowTitle.textContent = track.title;
    nowArtist.textContent = track.artist + ' \u00B7 ' + track.genre.name;

    isPlaying = true;
    playBtn.textContent = '\u23F8';
    elapsed = 0;

    tracksEl.querySelectorAll('.mv2-track').forEach((t, i) => {
      t.classList.toggle('active', i === idx);
      t.classList.toggle('playing', i === idx);
    });

    engine.play(track.genreKey, track.genreTrackIdx);
    startTick();
    startViz();
  }

  function togglePlay() {
    if (!isPlaying && currentTrackIdx >= 0 && allTracks[currentTrackIdx]) {
      isPlaying = true;
      playBtn.textContent = '\u23F8';
      engine.resume();
      startTick();
      startViz();
    } else {
      isPlaying = false;
      playBtn.textContent = '\u25B6';
      engine.pause();
      stopTick();
      stopViz();
    }
  }

  function nextTrack() {
    if (allTracks.length === 0) return;
    let next;
    if (shuffle) {
      next = Math.floor(Math.random() * allTracks.length);
    } else {
      next = (currentTrackIdx + 1) % allTracks.length;
    }
    playTrack(next);
  }

  function prevTrack() {
    if (allTracks.length === 0) return;
    let prev = currentTrackIdx - 1;
    if (prev < 0) prev = allTracks.length - 1;
    playTrack(prev);
  }

  playBtn.addEventListener('click', () => {
    if (currentTrackIdx < 0 || !allTracks[currentTrackIdx]) playTrack(0);
    else togglePlay();
  });
  nextBtn.addEventListener('click', nextTrack);
  prevBtn.addEventListener('click', prevTrack);
  shuffleBtn.addEventListener('click', () => {
    shuffle = !shuffle;
    shuffleBtn.classList.toggle('active', shuffle);
  });
  repeatBtn.addEventListener('click', () => {
    repeat = !repeat;
    repeatBtn.classList.toggle('active', repeat);
  });
  volSlider.addEventListener('input', () => engine.setVolume(parseInt(volSlider.value)));

  // ── Progress timer ──

  function startTick() {
    stopTick();
    tickTimer = setInterval(() => {
      if (!isPlaying) return;
      elapsed++;
      const min = Math.floor(elapsed / 60);
      const sec = elapsed % 60;
      timeEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
      const pct = Math.min(100, (elapsed / 240) * 100);
      pFill.style.width = pct + '%';
      if (elapsed >= 240) {
        if (repeat) playTrack(currentTrackIdx);
        else nextTrack();
      }
    }, 1000);
  }

  function stopTick() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
  }

  // ── Visualizer ──

  function startViz() {
    stopViz();
    const draw = () => {
      vizRAF = requestAnimationFrame(draw);
      const data = engine.getAnalyserData();
      const w = vizCanvas.width;
      const h = vizCanvas.height;
      vizCtx.clearRect(0, 0, w, h);
      if (!data) return;

      const track = allTracks[currentTrackIdx];
      const color = track?.genre?.color || '#007aff';
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      const barCount = 32;
      const barW = (w / barCount) - 2;
      const step = Math.floor(data.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = data[i * step] / 255;
        const barH = val * h * 0.85;
        const grad = vizCtx.createLinearGradient(0, h, 0, h - barH);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0.2)`);
        vizCtx.fillStyle = grad;
        vizCtx.beginPath();
        const x = i * (barW + 2) + 1;
        const radius = Math.min(barW / 2, 3);
        vizCtx.moveTo(x, h);
        vizCtx.lineTo(x, h - barH + radius);
        vizCtx.quadraticCurveTo(x, h - barH, x + radius, h - barH);
        vizCtx.lineTo(x + barW - radius, h - barH);
        vizCtx.quadraticCurveTo(x + barW, h - barH, x + barW, h - barH + radius);
        vizCtx.lineTo(x + barW, h);
        vizCtx.fill();
      }
    };
    draw();
  }

  function stopViz() {
    if (vizRAF) { cancelAnimationFrame(vizRAF); vizRAF = null; }
    vizCtx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);
  }

  // ── Cleanup ──
  const observer = new MutationObserver(() => {
    if (!container.isConnected) {
      engine.destroy();
      stopTick();
      stopViz();
      observer.disconnect();
    }
  });
  observer.observe(container.parentElement || document.body, { childList: true, subtree: true });
}
