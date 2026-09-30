# Ear & Music Training App

A browser-based ear-training, singing and transcription trainer built around **movable-do relative pitch**. The goal: go from complete beginner to confidently transcribing melodies and chords in a range of styles and keys, and get the music in your head into a DAW (FL Studio or otherwise) with less friction – about 15 minutes a day.

Everything runs client-side (Web Audio synthesis, microphone pitch detection, optional Web MIDI). Progress is stored in the browser and can be exported/imported.

## Modules

| Module | What it trains | Levels |
| --- | --- | --- |
| 🎯 Functional degrees | Benbassat / Functional-Ear-Trainer style: cadence → note → name the degree → hear it resolve to *do*. Major, do-based minor, chromatics, multi-octave, multi-note sequences, "hold the key" | 15 |
| ↔️ Intervals | Ascending, descending, harmonic and compound intervals, any timbre | 10 |
| 🎹 Chord quality | Triads, sus, sevenths, colour chords, extended chords; inversions, arpeggiated & open voicings | 11 |
| 🏛️ Chord function | Roman numerals in a key: diatonic triads/sevenths, minor, borrowed chords, secondary dominants | 10 |
| 🎤 Singing | Real-time pitch feedback: match pitch, do–so–do & other warm-ups, scales, "sing the degree" after a cadence, sing intervals, echo melodies | 12 |
| 🎼 Melody transcription | Cadence then a phrase; enter degrees or piano keys. Grows to chromatic passing tones, accompaniment, no cadence, and **absolute mode** (no key given – find the notes on the piano) | 11 |
| 📝 Chord transcription | Whole progressions as Roman numerals, including sevenths, borrowed/secondary chords, inversions, and chords under a melody | 10 |

Each module has an explanation of what it tests and how to approach it, tests (levels with a pass mark that unlock the next level) and a **practice mode** with full configuration.

## Spaced repetition

Every degree, interval, chord quality, chord function and sung degree is an item with its own history. Misses are re-queued within the current run, weighted heavily in future selection, and become due immediately; correct streaks push items out for days (SM-2-flavoured scheduling). Confusion pairs (e.g. *la* answered as *so*) are tracked and shown on the Progress page.

## Daily session

The Daily session page builds a ~15-minute plan (configurable) from your current level in each module: functional degrees every day, a review block when enough items are due, two rotating recognition modules, one singing exercise and transcription. Blocks run back to back.

## Running

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (theory, SRS, pitch detection, generators)
npm run build      # production build in dist/
```

Deploy to GitHub Pages: the included workflow (`.github/workflows/deploy.yml`) builds with `VITE_BASE=/<repo-name>/` and publishes `dist/` on every push to `main` (enable Pages → "GitHub Actions" in the repository settings).

## Input options

- Degree / interval / chord buttons (number keys 1–9, 0, -, = pick them in order)
- On-screen piano with *do* marked (keyboard: A W S E D F T G Y H U J K …)
- MIDI keyboard (Chrome/Edge, enable in Settings)
- Microphone for the singing module (works best with headphones)

## Tech

Vite + React + TypeScript, zustand (persisted to localStorage), Web Audio (all sounds synthesised, several timbres), McLeod pitch method for voice detection, Web MIDI, vitest.

Project layout:

```
src/theory       notes/solfège, intervals, chords & functions, cadences, melody & progression generators
src/audio        synth engine, pitch detector, microphone, MIDI
src/srs          spaced-repetition scheduler
src/exercises    question generators + answer checking
src/curriculum   modules, levels, explanations
src/singing      singing exercise configs
src/components   runners, piano, pads, pitch meter
src/pages        dashboard, module, level, practice, daily, progress, settings, guide
src/store        persisted state and daily planner
```
