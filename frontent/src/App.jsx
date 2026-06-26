import { useState, useEffect } from "react";

// ══ Constants ═══════════════════════════════════════════════════════════════
const PALS = ["Ors", "Copes", "Espases", "Bastos"];
const ORDRE_FORÇA = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2];
const NOM_VALOR = { 1:"A", 2:"2", 3:"3", 4:"4", 5:"5", 6:"6", 7:"7", 10:"10", 11:"11", 12:"12" };
const PAL_STYLE = {
  Ors:     { color: "#B8860B", glow: "#FFD700" },
  Copes:   { color: "#C62828", glow: "#FF6B6B" },
  Espases: { color: "#1565C0", glow: "#64B5F6" },
  Bastos:  { color: "#2E7D32", glow: "#81C784" },
};

function SuitIcon({ pal, size = 22 }) {
  const color = PAL_STYLE[pal]?.color || "#333";
  const s = size;
  if (pal === "Ors") return (
    <svg width={s} height={s} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="none" stroke={color} strokeWidth="2.5"/>
      <circle cx="10" cy="10" r="3.5" fill={color}/>
      <line x1="10" y1="2" x2="10" y2="18" stroke={color} strokeWidth="1.2" opacity="0.35"/>
      <line x1="2" y1="10" x2="18" y2="10" stroke={color} strokeWidth="1.2" opacity="0.35"/>
    </svg>
  );
  if (pal === "Copes") return (
    <svg width={s} height={s} viewBox="0 0 20 20">
      <path d="M3,3 L17,3 L15,11 Q10,16 5,11 Z" fill={color}/>
      <rect x="8.5" y="11" width="3" height="4" fill={color}/>
      <rect x="5" y="15" width="10" height="2.5" rx="1" fill={color}/>
    </svg>
  );
  if (pal === "Espases") return (
    <svg width={s} height={s} viewBox="0 0 20 20">
      <polygon points="10,1 11.8,14 10,17 8.2,14" fill={color}/>
      <rect x="3" y="11.5" width="14" height="2.5" rx="1" fill={color}/>
      <rect x="8.5" y="14" width="3" height="5" rx="1" fill={color}/>
    </svg>
  );
  if (pal === "Bastos") return (
    <svg width={s} height={s} viewBox="0 0 20 20">
      <rect x="9" y="4" width="2.5" height="13" rx="1.2" fill={color}/>
      <circle cx="10.25" cy="3.5" r="3.2" fill={color}/>
      <circle cx="10.25" cy="17" r="3.2" fill={color}/>
      <circle cx="4" cy="10" r="2.8" fill={color}/>
      <circle cx="16.5" cy="10" r="2.8" fill={color}/>
    </svg>
  );
  return null;
}
const PHASE = { BID:"bid", PLAY:"play", TRICK_END:"trick_end", ROUND_END:"round_end", GAME_END:"game_end" };

// ══ Game Logic ════════════════════════════════════════════════════════════
const forçaCarta = c => ORDRE_FORÇA.length - ORDRE_FORÇA.indexOf(c.valor);
const cardKey = c => `${c.pal}-${c.valor}`;
const cardsEq = (a, b) => a && b && a.pal === b.pal && a.valor === b.valor;
const removeCard = (hand, carta) => hand.filter(c => !cardsEq(c, carta));

const construeixBaralla = n => {
  const nTreure = (5 - n) * 2;
  const excl = nTreure > 0 ? new Set(ORDRE_FORÇA.slice(-nTreure)) : new Set();
  const vals = ORDRE_FORÇA.filter(v => !excl.has(v));
  return PALS.flatMap(pal => vals.map(valor => ({ pal, valor })));
};

const barreja = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const supera = (c, millor, trumf) => {
  if (!millor) return true;
  const [ct, mt] = [c.pal === trumf, millor.pal === trumf];
  if (ct && !mt) return true;
  if (mt && !ct) return false;
  if (c.pal !== millor.pal) return false;
  return forçaCarta(c) > forçaCarta(millor);
};

const jugadesLegals = (ma, palObert, millor, trumf) => {
  if (!palObert) return [...ma];
  const delPal = ma.filter(c => c.pal === palObert);
  if (delPal.length) {
    const sup = delPal.filter(c => supera(c, millor, trumf));
    return sup.length ? sup : delPal;
  }
  const tSup = ma.filter(c => c.pal === trumf && supera(c, millor, trumf));
  return tSup.length ? tSup : [...ma];
};

const seqRondes = n => [
  ...Array.from({length: 7}, (_, i) => i + 1),
  ...Array(n).fill(8),
  ...Array.from({length: 7}, (_, i) => 7 - i),
];

// ══ AI Heuristic ══════════════════════════════════════════════════════════
const mésForta = cs => cs.reduce((a, b) => forçaCarta(a) >= forçaCarta(b) ? a : b);
const mésFeble = cs => cs.reduce((a, b) => forçaCarta(a) <= forçaCarta(b) ? a : b);

const millorATaula = (trick, trumf) => {
  let m = null;
  for (const { carta } of trick) if (supera(carta, m, trumf)) m = carta;
  return m;
};

const hCant = (ma, trumf, maxN) => {
  const llindar = ORDRE_FORÇA.length / 2;
  let e = 0;
  for (const c of ma) {
    if (c.pal === trumf) e += forçaCarta(c) > llindar ? 1 : 0.3;
    else if (c.valor === 1) e += 0.9;
    else if (c.valor === 3) e += 0.6;
    else if (c.valor === 12) e += 0.3;
  }
  return Math.min(Math.max(0, Math.round(e)), maxN);
};

const hJuga = (ma, trick, trumf, cantada, fetes, llegals) => {
  const necessito = cantada - fetes;
  const millor = millorATaula(trick, trumf);
  if (!trick.length) return necessito > 0 ? mésForta(llegals) : mésFeble(llegals);
  const guanyen = llegals.filter(c => supera(c, millor, trumf));
  const mínG = guanyen.length ? mésFeble(guanyen) : null;
  return necessito > 0 ? (mínG || mésFeble(llegals)) : mésFeble(llegals);
};

// ══ ISMCTS (JS) ════════════════════════════════════════════════════════════

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deepCopySim(s) {
  return {
    hands:       Object.fromEntries(Object.entries(s.hands).map(([k,v]) => [k, [...v]])),
    trump:       s.trump,
    bids:        { ...s.bids },
    taken:       { ...s.taken },
    trickLeader: s.trickLeader,
    taula:       [...s.taula],
    n:           s.n,
  };
}

function cartaHeuristicaSim(s, pi) {
  const { taula, trump, hands, bids, taken } = s;
  const ma = hands[pi];
  const cantada = bids[pi] ?? 0;
  const fetes   = taken[pi] ?? 0;
  const palObert = taula.length ? taula[0].carta.pal : null;
  const millor   = millorATaula(taula, trump);
  const llegals  = jugadesLegals(ma, palObert, millor, trump);
  const necessito = cantada - fetes;
  if (!taula.length) return necessito > 0 ? mésForta(llegals) : mésFeble(llegals);
  const guanyen = llegals.filter(c => supera(c, millor, trump));
  const minG = guanyen.length ? mésFeble(guanyen) : null;
  return necessito > 0 ? (minG || mésFeble(llegals)) : mésFeble(llegals);
}

function resolMaSim(s) {
  let millorC = null, winner = null;
  for (const { pi, carta } of s.taula) {
    if (supera(carta, millorC, s.trump)) { millorC = carta; winner = pi; }
  }
  s.taken[winner] = (s.taken[winner] || 0) + 1;
  s.trickLeader = winner;
  s.taula = [];
}

function simulaFinsFinalSim(simState, pov) {
  const s = deepCopySim(simState);
  while (true) {
    const ja = s.taula.length;
    if (ja === s.n) {
      resolMaSim(s);
      if (!Object.values(s.hands).some(h => h.length > 0)) break;
      continue;
    }
    const pi = (s.trickLeader + ja) % s.n;
    if (!s.hands[pi]?.length) break;
    const carta = cartaHeuristicaSim(s, pi);
    s.hands[pi] = s.hands[pi].filter(c => cardKey(c) !== cardKey(carta));
    s.taula.push({ pi, carta });
  }
  const cantada = s.bids[pov] ?? 0;
  const fetes   = s.taken[pov] ?? 0;
  return cantada === fetes ? 10 + 3 * fetes : -3 * Math.abs(cantada - fetes);
}

function determinitzaSim(game, playerIdx) {
  const { players, hands, trump, cartesJugades = [], trick, bids, taken, buits = {}, startIdx, trickLeader } = game;
  const n = players.length;
  const myHand  = hands[playerIdx];
  const myKeys  = new Set(myHand.map(cardKey));
  const played  = new Set([
    ...(cartesJugades || []).map(cardKey),
    ...trick.map(t => cardKey(t.carta)),
  ]);
  const visible = new Set([...myKeys, ...played]);
  let pool = shuffleArr(construeixBaralla(n).filter(c => !visible.has(cardKey(c))));
  const simHands = { [playerIdx]: [...myHand] };
  players.forEach((_, i) => {
    if (i === playerIdx) return;
    const mida  = hands[i].length;
    const voids = new Set(buits[i] || []);
    const valid   = pool.filter(c => !voids.has(c.pal));
    const invalid = pool.filter(c =>  voids.has(c.pal));
    const ma = [...valid.slice(0, mida)];
    if (ma.length < mida) ma.push(...invalid.slice(0, mida - ma.length));
    simHands[i] = ma;
    const usedSet = new Set(ma.map(cardKey));
    pool = pool.filter(c => !usedSet.has(cardKey(c)));
  });
  return {
    hands: simHands, trump,
    bids: { ...bids }, taken: { ...taken },
    trickLeader: trickLeader ?? startIdx,
    taula: [...trick.map(t => ({ pi: t.pi, carta: t.carta }))],
    n,
  };
}

function ismctsPlayJS(game, playerIdx, llegals, nSims = 200) {
  if (llegals.length === 1) return llegals[0];
  const scores = {}, counts = {};
  for (let s = 0; s < nSims; s++) {
    const sim = determinitzaSim(game, playerIdx);
    for (const carta of llegals) {
      const k = cardKey(carta);
      const trial = deepCopySim(sim);
      trial.hands[playerIdx] = trial.hands[playerIdx].filter(c => cardKey(c) !== k);
      trial.taula.push({ pi: playerIdx, carta });
      const punts = simulaFinsFinalSim(trial, playerIdx);
      scores[k] = (scores[k] || 0) + punts;
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  let best = llegals[0], bestAvg = -Infinity;
  for (const c of llegals) {
    const k = cardKey(c);
    const avg = (scores[k] || 0) / (counts[k] || 1);
    if (avg > bestAvg) { bestAvg = avg; best = c; }
  }
  return best;
}

function mcBidJS(game, playerIdx, nSims = 150) {
  const { rounds, roundIdx, hands, trump, players, bids: bidsSoFar, startIdx } = game;
  const n = players.length;
  const nC = rounds[roundIdx];
  const myHand = hands[playerIdx];
  const myKeys = new Set(myHand.map(cardKey));
  const simsPerBid = Math.max(8, Math.floor(nSims / (nC + 1)));
  let bestBid = 0, bestScore = -Infinity;
  for (let bid = 0; bid <= nC; bid++) {
    let total = 0;
    for (let s = 0; s < simsPerBid; s++) {
      const pool = shuffleArr(construeixBaralla(n).filter(c => !myKeys.has(cardKey(c))));
      const simHands = { [playerIdx]: [...myHand] };
      const simBids  = { ...bidsSoFar, [playerIdx]: bid };
      let ptr = 0;
      players.forEach((_, i) => {
        if (i === playerIdx) return;
        simHands[i] = pool.slice(ptr, ptr + nC); ptr += nC;
        if (!(i in simBids)) simBids[i] = Math.min(hCant(simHands[i], trump, nC), nC);
      });
      const sim = {
        hands: simHands, trump, bids: simBids,
        taken: Object.fromEntries(players.map((_, i) => [i, 0])),
        trickLeader: startIdx, taula: [], n,
      };
      total += simulaFinsFinalSim(sim, playerIdx);
    }
    const avg = total / simsPerBid;
    if (avg > bestScore) { bestScore = avg; bestBid = bid; }
  }
  return bestBid;
}

// ══ State Transitions ═════════════════════════════════════════════════════
function setupRound(state) {
  const { players, rounds, roundIdx, startIdx } = state;
  const n = players.length;
  const nC = rounds[roundIdx];
  const deck = barreja(construeixBaralla(n));
  const ordre = Array.from({length: n}, (_, i) => (startIdx + i) % n);
  const repOrdre = [...ordre.slice(1), ordre[0]];
  const hands = {};
  repOrdre.forEach((pi, i) => { hands[pi] = deck.slice(i * nC, (i + 1) * nC); });
  const trumpCard = deck[deck.length - 1];
  return {
    ...state,
    phase: PHASE.BID,
    hands,
    trump: trumpCard.pal,
    trumpCard,
    bids: {},
    taken: Object.fromEntries(players.map((_, i) => [i, 0])),
    trick: [],
    trickLeader: startIdx,
    curPlayer: startIdx,
    curBidder: startIdx,
    bidStep: 0,
    bidOrder: ordre,
    selected: null,
    trickWinner: null,
    roundScores: null,
    _nextPhase: null,
    buits: {},
    cartesJugades: [],
  };
}

function doBid(state, bid) {
  const { curBidder, bidStep, bidOrder, startIdx } = state;
  const newBids = { ...state.bids, [curBidder]: bid };
  const nextStep = bidStep + 1;
  if (nextStep >= bidOrder.length) {
    return { ...state, bids: newBids, phase: PHASE.PLAY, curPlayer: startIdx, bidStep: nextStep };
  }
  return { ...state, bids: newBids, curBidder: bidOrder[nextStep], bidStep: nextStep };
}

function doPlay(state, carta) {
  const { curPlayer, players, trump, trick, trickLeader, hands, bids, taken } = state;
  const n = players.length;
  const newHands = { ...hands, [curPlayer]: removeCard(hands[curPlayer], carta) };
  const newTrick = [...trick, { pi: curPlayer, carta }];

  // Tracking buits: si el jugador no segueix el pal obert, és buit en aquell pal
  let newBuits = state.buits || {};
  if (trick.length > 0 && carta.pal !== trick[0].carta.pal) {
    const palObert = trick[0].carta.pal;
    newBuits = { ...newBuits, [curPlayer]: [...(newBuits[curPlayer] || []), palObert] };
  }

  if (newTrick.length === n) {
    let millor = null, winner = null;
    for (const { pi, carta: c } of newTrick) {
      if (supera(c, millor, trump)) { millor = c; winner = pi; }
    }
    const newTaken = { ...taken, [winner]: taken[winner] + 1 };
    const cardsLeft = newHands[winner].length;

    if (cardsLeft === 0) {
      const roundScores = {};
      const newTotals = { ...state.scores };
      players.forEach((_, i) => {
        const cantada = bids[i], fetes = newTaken[i];
        const d = cantada === fetes ? 10 + 3 * fetes : -3 * Math.abs(cantada - fetes);
        roundScores[i] = d;
        newTotals[i] = (newTotals[i] || 0) + d;
      });
      const isLast = state.roundIdx === state.rounds.length - 1;
      return {
        ...state, hands: newHands, trick: newTrick, taken: newTaken,
        trickWinner: winner, phase: PHASE.TRICK_END,
        scores: newTotals, roundScores, buits: newBuits,
        cartesJugades: [...(state.cartesJugades || []), ...newTrick.map(t => t.carta)],
        _nextPhase: isLast ? PHASE.GAME_END : PHASE.ROUND_END,
        selected: null,
      };
    }
    return {
      ...state, hands: newHands, trick: newTrick, taken: newTaken,
      trickWinner: winner, phase: PHASE.TRICK_END, buits: newBuits,
      cartesJugades: [...(state.cartesJugades || []), ...newTrick.map(t => t.carta)],
      selected: null,
    };
  }

  const trickOrder = Array.from({length: n}, (_, i) => (trickLeader + i) % n);
  const nextPlayer = trickOrder[trickOrder.indexOf(curPlayer) + 1];
  return { ...state, hands: newHands, trick: newTrick, curPlayer: nextPlayer, selected: null, buits: newBuits };
}

function advanceTrick(state) {
  const { trickWinner, _nextPhase } = state;
  if (_nextPhase) return { ...state, trick: [], phase: _nextPhase };
  return { ...state, trick: [], phase: PHASE.PLAY, curPlayer: trickWinner, trickLeader: trickWinner, trickWinner: null };
}

// ══ Card Components ════════════════════════════════════════════════════════
function CardFront({ carta, selected, disabled, onClick, size = "md" }) {
  const s = PAL_STYLE[carta.pal];
  const [w, h, fv, fs] = size === "sm" ? [36, 52, 10, 15] : [52, 74, 14, 22];
  return (
    <div onClick={!disabled ? onClick : undefined} style={{
      width: w, height: h, borderRadius: 7,
      background: selected ? "#FFFDE7" : "white",
      border: `2px solid ${selected ? "#F9A825" : disabled ? "#ddd" : s.color}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      cursor: disabled ? "default" : "pointer",
      boxShadow: selected ? `0 6px 16px ${s.glow}88` : "1px 2px 6px rgba(0,0,0,0.3)",
      transform: selected ? "translateY(-10px)" : "none",
      transition: "all 0.15s ease",
      opacity: disabled ? 0.4 : 1,
      userSelect: "none", flexShrink: 0,
    }}>
      <span style={{ fontSize: fv, color: s.color, fontWeight: 800, lineHeight: 1, fontFamily: "Georgia,serif", marginBottom: 2 }}>
        {NOM_VALOR[carta.valor]}
      </span>
      <SuitIcon pal={carta.pal} size={fs + 4} />
    </div>
  );
}

function StackedHand({ count }) {
  const W = 28, H = 40, OFFSET = 5;
  const total = Math.min(count, 12);
  return (
    <div style={{ position: "relative", width: W + OFFSET * (total - 1), height: H, flexShrink: 0 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          position: "absolute", left: i * OFFSET, top: 0,
          width: W, height: H, borderRadius: 4,
          background: "repeating-linear-gradient(45deg,#1a237e,#1a237e 3px,#283593 3px,#283593 6px)",
          border: "1.5px solid #5c6bc0",
          boxShadow: "1px 1px 3px rgba(0,0,0,0.4)",
          zIndex: i,
        }} />
      ))}

    </div>
  );
}

function CardBack({ size = "md" }) {
  const [w, h] = size === "sm" ? [36, 52] : [52, 74];
  return (
    <div style={{
      width: w, height: h, borderRadius: 7,
      background: "repeating-linear-gradient(45deg,#1a237e,#1a237e 4px,#283593 4px,#283593 8px)",
      border: "2px solid #5c6bc0",
      boxShadow: "1px 2px 6px rgba(0,0,0,0.4)",
      flexShrink: 0,
    }} />
  );
}

// ══ Opponent Layout ════════════════════════════════════════════════════════
// Posició visual basada en passos en l'ordre de joc respecte al humà.
// steps=1 → juga just després del humà → DRETA (sentit horari)
// steps=2 → DALT, steps=3 → ESQUERRA, steps=4 → DALT-ESQUERRA (per n=5)
function playerPosition(playerIdx, humanIdx, n) {
  const steps = (playerIdx - humanIdx + n) % n;
  const pos = {
    3: {
      1: { top: 16, right: "18%", transform: "translateX(50%)" },
      2: { top: 16, left: "18%", transform: "translateX(-50%)" },
    },
    4: {
      1: { top: "36%", right: 8, transform: "translateY(-50%)" },
      2: { top: 10, left: "50%", transform: "translateX(-50%)" },
      3: { top: "36%", left: 8, transform: "translateY(-50%)" },
    },
    5: {
      1: { top: "36%", right: 8, transform: "translateY(-50%)" },
      2: { top: 10, right: "20%", transform: "translateX(50%)" },
      3: { top: 10, left: "20%", transform: "translateX(-50%)" },
      4: { top: "36%", left: 8, transform: "translateY(-50%)" },
    },
  };
  return (pos[n] || pos[4])[steps] || { top: 0, left: "50%" };
}

// ══ Setup Screen ═══════════════════════════════════════════════════════════
const BOT_TYPES = [
  { id: 'random',    label: 'Aleatori',   desc: 'Juga a l\'atzar' },
  { id: 'heuristic', label: 'Heurístic',  desc: 'Segueix regles bàsiques' },
  { id: 'ismcts',    label: 'ISMCTS',     desc: 'Cerca per simulació · fort' },
];

function SetupScreen({ onStart }) {
  const [n, setN] = useState(4);
  const [botType, setBotType] = useState('heuristic');
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 60%, #1a472a 0%, #0a1f10 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "rgba(0,0,0,0.72)", border: "1px solid #2a5a3a", borderRadius: 20, padding: "40px 48px", textAlign: "center", color: "white" }}>
        <div style={{ fontSize: 52, marginBottom: 6 }}>🃏</div>
        <h1 style={{ margin: "0 0 6px", fontSize: 36, letterSpacing: 3, color: "#c9a84c", fontFamily: "Georgia,serif" }}>LA PODRIDA</h1>
        <p style={{ color: "#666", fontSize: 12, marginBottom: 32 }}>Joc tradicional de basses</p>

        <p style={{ color: "#aaa", fontSize: 13, marginBottom: 10 }}>Jugadors totals</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
          {[3, 4, 5].map(v => (
            <button key={v} onClick={() => setN(v)} style={{
              width: 56, height: 56, borderRadius: 12,
              border: `2px solid ${n === v ? "#c9a84c" : "#333"}`,
              background: n === v ? "rgba(201,168,76,0.15)" : "transparent",
              color: n === v ? "#c9a84c" : "#555",
              fontSize: 24, cursor: "pointer", fontFamily: "Georgia,serif",
              transition: "all 0.15s",
            }}>{v}</button>
          ))}
        </div>

        <p style={{ color: "#aaa", fontSize: 13, marginBottom: 10 }}>Dificultat dels bots</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {BOT_TYPES.map(bt => (
            <button key={bt.id} onClick={() => setBotType(bt.id)} style={{
              padding: "10px 16px", borderRadius: 10,
              border: `1px solid ${botType === bt.id ? "#c9a84c" : "#333"}`,
              background: botType === bt.id ? "rgba(201,168,76,0.12)" : "transparent",
              color: "white", cursor: "pointer", textAlign: "left",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ color: botType === bt.id ? "#c9a84c" : "#ccc", fontWeight: "bold", fontSize: 14 }}>{bt.label}</span>
              <span style={{ color: "#555", fontSize: 12 }}>{bt.desc}</span>
            </button>
          ))}
        </div>

        <button onClick={() => onStart(n, botType)} style={{
          width: "100%", padding: "14px 0", borderRadius: 12,
          border: "1px solid #c9a84c", background: "rgba(201,168,76,0.1)",
          color: "#c9a84c", fontSize: 18, cursor: "pointer",
          fontFamily: "Georgia,serif", letterSpacing: 2,
          transition: "background 0.2s",
        }}>Jugar</button>
      </div>
    </div>
  );
}

// ══ Round End Overlay ══════════════════════════════════════════════════════
function RoundEndOverlay({ game, onNext }) {
  const { players, scores, bids, taken, roundIdx, phase, roundScores } = game;
  const sorted = players
    .map((p, i) => ({ ...p, i, score: scores[i], delta: roundScores?.[i] ?? 0, bid: bids[i], fetes: taken[i] }))
    .sort((a, b) => b.score - a.score);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#0a1f10", border: "1px solid #2a5a3a", borderRadius: 18, padding: "28px 36px", minWidth: 310, color: "white", textAlign: "center", fontFamily: "Georgia,serif" }}>
        <h2 style={{ margin: "0 0 4px", color: "#c9a84c", fontSize: 20 }}>
          {phase === PHASE.GAME_END ? "🏆 Partida Acabada" : `Ronda ${roundIdx + 1} · Resultat`}
        </h2>
        <div style={{ height: 1, background: "#1e4a28", margin: "14px 0" }} />
        {sorted.map(p => (
          <div key={p.i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #142810", gap: 12, fontFamily: "sans-serif", fontSize: 13 }}>
            <span style={{ color: p.isHuman ? "#c9a84c" : "#ccc", minWidth: 58, textAlign: "left", fontWeight: p.isHuman ? "bold" : "normal" }}>{p.name}</span>
            <span style={{ color: "#555", fontSize: 11 }}>canta {p.bid} · fa {p.fetes}</span>
            <span style={{ fontWeight: "bold", minWidth: 36, textAlign: "right", color: p.delta >= 0 ? "#4CAF50" : "#ef5350" }}>
              {p.delta >= 0 ? "+" : ""}{p.delta}
            </span>
            <span style={{ color: "#c9a84c", fontWeight: "bold", minWidth: 36, textAlign: "right" }}>{p.score}</span>
          </div>
        ))}
        <button onClick={onNext} style={{
          marginTop: 20, width: "100%", padding: "13px 0", borderRadius: 10,
          border: "1px solid #c9a84c", background: "rgba(201,168,76,0.08)",
          color: "#c9a84c", fontSize: 16, cursor: "pointer", fontFamily: "Georgia,serif",
        }}>
          {phase === PHASE.GAME_END ? "Nova partida" : "Següent ronda →"}
        </button>
      </div>
    </div>
  );
}

// ══ Game Screen ════════════════════════════════════════════════════════════
function GameScreen({ game, setGame, onRestart }) {
  const { players, scores, phase, trump, trumpCard, bids, taken, trick, rounds, roundIdx, hands, curBidder, curPlayer, selected, trickWinner, startIdx } = game;
  const n = players.length;
  const nC = rounds[roundIdx];
  const humanIdx = players.findIndex(p => p.isHuman);
  const humanHand = hands[humanIdx] || [];
  const ps = PAL_STYLE[trump] || {};

  const palObert = trick.length ? trick[0].carta.pal : null;
  const millorT = millorATaula(trick, trump);
  const llegals = phase === PHASE.PLAY && curPlayer === humanIdx
    ? jugadesLegals(humanHand, palObert, millorT, trump)
    : [];
  const legalKeys = new Set(llegals.map(cardKey));

  const handleCardClick = carta => {
    if (phase !== PHASE.PLAY || curPlayer !== humanIdx) return;
    if (!legalKeys.has(cardKey(carta))) return;
    if (cardsEq(selected, carta)) {
      setGame(g => doPlay({ ...g, selected: null }, carta));
    } else {
      setGame(g => ({ ...g, selected: carta }));
    }
  };

  const handleBid = bid => {
    if (phase !== PHASE.BID || curBidder !== humanIdx) return;
    setGame(g => doBid(g, bid));
  };

  const opponents = players.map((p, i) => ({ ...p, idx: i })).filter(p => !p.isHuman);

  const isHumanTurn = phase === PHASE.PLAY && curPlayer === humanIdx;
  const isHumanBidding = phase === PHASE.BID && curBidder === humanIdx;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 40%, #1a472a 0%, #0a1f10 100%)", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)" }}>
        <button onClick={onRestart} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#666", cursor: "pointer", fontSize: 12 }}>↩</button>
        <span style={{ color: "#666", fontSize: 12 }}>Ronda <b style={{ color: "#aaa" }}>{roundIdx + 1}</b>/{rounds.length}</span>
        <span style={{ color: "#555", fontSize: 12 }}>·</span>
        <span style={{ color: "#666", fontSize: 12 }}><b style={{ color: "#aaa" }}>{nC}</b> {nC > 1 ? "cartes" : "carta"}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "4px 12px", border: `1px solid ${ps.color || "#333"}40` }}>
          <span style={{ color: "#666", fontSize: 11 }}>Trumfo</span>
          <SuitIcon pal={trump} size={16} />
          <span style={{ color: ps.color, fontSize: 12 }}>{trump}</span>
          {trumpCard && <span style={{ color: "#555", fontSize: 11 }}>({NOM_VALOR[trumpCard.valor]})</span>}
        </div>
      </div>

      {/* Score bar */}
      <div style={{ display: "flex", gap: 5, padding: "6px 10px", background: "rgba(0,0,0,0.2)" }}>
        {players.map((p, i) => {
          const isCurPlay = phase === PHASE.PLAY && curPlayer === i;
          const isCurBid = phase === PHASE.BID && curBidder === i;
          const isWin = trickWinner === i;
          return (
            <div key={i} style={{
              flex: 1, borderRadius: 8, padding: "5px 6px", textAlign: "center",
              background: isWin ? "rgba(201,168,76,0.2)" : isCurPlay || isCurBid ? "rgba(76,175,80,0.15)" : "rgba(0,0,0,0.3)",
              border: `1px solid ${p.isHuman ? "#c9a84c44" : isCurPlay || isCurBid ? "#4CAF5044" : "transparent"}`,
              transition: "all 0.3s",
            }}>
              <div style={{ fontSize: 10, color: p.isHuman ? "#c9a84c" : "#888", fontWeight: p.isHuman ? "bold" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {i === startIdx && <span title="Comença la ronda" style={{ color: "#c9a84c", marginRight: 2 }}>★</span>}
                {p.name}
              </div>
              <div style={{ fontSize: 17, color: "white", fontWeight: "bold", fontFamily: "Georgia,serif" }}>{scores[i]}</div>
              {bids[i] !== undefined && (
                <div style={{ fontSize: 10, color: "#666" }}>{taken[i]}/{bids[i]}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ flex: 1, position: "relative", minHeight: 240 }}>
        {/* Opponents */}
        {opponents.map((op) => {
          const opHand = hands[op.idx] || [];
          const isCur = (phase === PHASE.BID && curBidder === op.idx) || (phase === PHASE.PLAY && curPlayer === op.idx);
          return (
            <div key={op.idx} style={{ position: "absolute", ...playerPosition(op.idx, humanIdx, n), display: "flex", flexDirection: "column", alignItems: "center", gap: 4, zIndex: 1 }}>
              <div style={{ color: isCur ? "#4CAF50" : "#555", fontSize: 10, textAlign: "center", whiteSpace: "nowrap" }}>
                {op.idx === startIdx && <span style={{ color: "#c9a84c", marginRight: 3 }}>★</span>}
                {op.name}
                {bids[op.idx] !== undefined && ` (${taken[op.idx]}/${bids[op.idx]})`}
                {phase === PHASE.BID && curBidder === op.idx && " 🤔"}
                {phase === PHASE.PLAY && curPlayer === op.idx && " ▶"}
              </div>
              <StackedHand count={opHand.length} />
            </div>
          );
        })}

        {/* Center trick */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "center", minWidth: 60, minHeight: 60 }}>
          {trick.map(({ pi, carta }, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ color: "#555", fontSize: 10, marginBottom: 2 }}>{players[pi].name}</div>
              <CardFront carta={carta} disabled />
            </div>
          ))}
          {trickWinner !== null && (
            <div style={{ width: "100%", textAlign: "center", color: "#c9a84c", fontSize: 12, fontWeight: "bold" }}>
              ★ {players[trickWinner].name} guanya!
            </div>
          )}
        </div>

        {/* Bidding AI waiting */}
        {phase === PHASE.BID && curBidder !== humanIdx && (
          <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "#444", fontSize: 12 }}>
            {players[curBidder].name} canta...
          </div>
        )}
      </div>

      {/* Human hand + bidding */}
      <div style={{ background: "rgba(0,0,0,0.35)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 10px 16px" }}>
        {/* Bid buttons */}
        {isHumanBidding && (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>
              Quantes mans cantes? <span style={{ color: "#555" }}>({nC} cartes)</span>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              {Array.from({length: nC + 1}, (_, i) => (
                <button key={i} onClick={() => handleBid(i)} style={{
                  width: 40, height: 40, borderRadius: 8,
                  border: "1px solid #c9a84c", background: "rgba(201,168,76,0.08)",
                  color: "#c9a84c", fontSize: 18, cursor: "pointer",
                  fontFamily: "Georgia,serif", fontWeight: "bold",
                }}>{i}</button>
              ))}
            </div>
          </div>
        )}

        {/* Play hint */}
        {isHumanTurn && (
          <div style={{ textAlign: "center", color: selected ? "#c9a84c" : "#555", fontSize: 12, marginBottom: 8 }}>
            {selected ? "Toca de nou per jugar" : "Selecciona una carta"}
          </div>
        )}

        {/* Cards */}
        <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
          {humanHand.map((carta, i) => {
            const isLegal = legalKeys.has(cardKey(carta));
            const isSel = cardsEq(selected, carta);
            return (
              <CardFront key={i} carta={carta} selected={isSel}
                disabled={!isHumanTurn || !isLegal}
                onClick={() => handleCardClick(carta)} />
            );
          })}
        </div>
      </div>

      {/* Overlays */}
      {(phase === PHASE.ROUND_END || phase === PHASE.GAME_END) && (
        <RoundEndOverlay game={game} onNext={() => {
          if (phase === PHASE.GAME_END) { onRestart(); return; }
          setGame(g => setupRound({
            ...g,
            roundIdx: g.roundIdx + 1,
            startIdx: (g.startIdx + 1) % g.players.length,
          }));
        }} />
      )}
    </div>
  );
}

// ══ Root ══════════════════════════════════════════════════════════════════
export default function App() {
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!game || busy) return;
    const { phase, curBidder, curPlayer, players } = game;

    if (phase === PHASE.BID && !players[curBidder].isHuman) {
      setBusy(true);
      const isISMCTS = players[curBidder].botType === 'ismcts';
      setTimeout(() => {
        setGame(g => {
          const bid = isISMCTS
            ? mcBidJS(g, g.curBidder, 120)
            : hCant(g.hands[g.curBidder], g.trump, g.rounds[g.roundIdx]);
          return doBid(g, bid);
        });
        setBusy(false);
      }, isISMCTS ? 600 : 380);
    }

    if (phase === PHASE.PLAY && !players[curPlayer].isHuman) {
      setBusy(true);
      const isISMCTS = players[curPlayer].botType === 'ismcts';
      setTimeout(() => {
        setGame(g => {
          const { curPlayer: pi, hands: h, trump: t, trick: tr, bids: b, taken: tk } = g;
          const palObert = tr.length ? tr[0].carta.pal : null;
          const millor = millorATaula(tr, t);
          const llegals = jugadesLegals(h[pi], palObert, millor, t);
          const carta = isISMCTS
            ? ismctsPlayJS(g, pi, llegals, 200)
            : hJuga(h[pi], tr, t, b[pi], tk[pi], llegals);
          return doPlay(g, carta);
        });
        setBusy(false);
      }, isISMCTS ? 700 : 560);
    }

    if (phase === PHASE.TRICK_END) {
      setBusy(true);
      setTimeout(() => {
        setGame(g => advanceTrick(g));
        setBusy(false);
      }, 1100);
    }
  }, [game?.phase, game?.curBidder, game?.curPlayer, game?.trickWinner, busy]);

  const handleStart = (n, botType) => {
    const players = [
      { name: "Tu", isHuman: true, botType: null },
      ...Array.from({length: n - 1}, (_, i) => ({ name: `Bot ${i + 1}`, isHuman: false, botType })),
    ];
    setGame(setupRound({
      players,
      scores: Object.fromEntries(players.map((_, i) => [i, 0])),
      rounds: seqRondes(n),
      roundIdx: 0,
      startIdx: Math.floor(Math.random() * n),
    }));
  };

  if (!game) return <SetupScreen onStart={handleStart} />;
  return <GameScreen game={game} setGame={setGame} onRestart={() => setGame(null)} />;
}
