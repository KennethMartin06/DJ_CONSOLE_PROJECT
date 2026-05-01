# DJ Console

An AI-powered, browser-based visual DJ console — Pioneer-inspired layout with modern AI mixing features.

## Status

**Phase A** — Foundation. Two decks + mixer with sample-accurate transport built on the Web Audio API. Load any local audio file, play / pause / seek, mix between decks with a constant-power crossfader.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Web Audio API** (AudioBufferSourceNode, GainNode chain)
- Audio engine in `src/lib/audio-engine` — framework-agnostic, ready to be extracted later

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, click **START AUDIO ENGINE** (browsers require a user gesture to create an `AudioContext`), then load a track per deck.

## Architecture

```
src/
├── app/                       Next.js App Router shell
├── components/
│   ├── console/Console.tsx    Top-level layout
│   ├── deck/DeckPanel.tsx     Per-deck UI
│   └── mixer/MixerPanel.tsx   Crossfader + master
├── hooks/
│   ├── useAudioEngine.ts      Lazy AudioContext start
│   └── useDeck.ts             React subscription to a Deck
└── lib/audio-engine/
    ├── engine.ts              AudioEngine singleton
    ├── deck.ts                Deck class (load/play/pause/seek/volume)
    ├── mixer.ts               2-channel mixer + crossfader
    └── types.ts               DeckSnapshot / MixerSnapshot
```

The audio graph is:

```
Deck A ─► GainNode (deck out) ─► GainNode (channel A) ─┐
                                                       ├─► Master Gain ─► destination
Deck B ─► GainNode (deck out) ─► GainNode (channel B) ─┘
```

Crossfader uses constant-power curves so total perceived loudness stays flat across the throw.

## Roadmap

| Phase | Focus |
|---|---|
| A | Foundation, dual decks, mixer, transport |
| B | 3-band EQ per channel, filter, FX rack |
| C | Track library (drag-drop, IndexedDB, search) |
| D | WebGL waveform + jog wheel + spectrum |
| E | Beat sync, loops, hot cues, slip mode |
| F | AI: BPM, key, energy, genre detection (ONNX Runtime Web) |
| G | Smart Mix, stem-aware deck, transition coach |
| H | Polish, perf, deploy |
