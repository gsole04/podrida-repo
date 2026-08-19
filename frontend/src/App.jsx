import { useState, useEffect, useRef } from "react";
import { Analytics } from "@vercel/analytics/react";
import { crearSala, unirSala, unirSalaPublica, escoltaSala, actualitzaSlot, iniciaPartida, publicaEstat, enviaAccio, netejaAccio, abandonaSala } from "./multiplayer";

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

// ══ Tutorial Data ════════════════════════════════════════════════════════════
const T_ROUNDS = [3, 2, 1];
// Players en tutorial: 0=Bot1, 1=Tu(human), 2=Bot2
const T_HANDS_DATA = [
  { trump:'Bastos', trumpCard:{pal:'Bastos',valor:3}, startIdx:0,
    bids:{0:1,1:1,2:2},
    hands:{
      0:[{pal:'Copes',valor:3},{pal:'Bastos',valor:10},{pal:'Espases',valor:7}],
      1:[{pal:'Copes',valor:1},{pal:'Copes',valor:7},{pal:'Espases',valor:10}],
      2:[{pal:'Ors',valor:3},{pal:'Bastos',valor:12},{pal:'Ors',valor:11}],
    }
  },
  { trump:'Copes', trumpCard:{pal:'Copes',valor:5}, startIdx:0,
    bids:{0:1,1:1,2:0},
    hands:{
      0:[{pal:'Espases',valor:1},{pal:'Copes',valor:7}],
      1:[{pal:'Espases',valor:12},{pal:'Copes',valor:3}],
      2:[{pal:'Espases',valor:3},{pal:'Ors',valor:11}],
    }
  },
  { trump:'Ors', trumpCard:{pal:'Ors',valor:7}, startIdx:2,
    bids:{0:0,1:1,2:0},
    hands:{
      0:[{pal:'Copes',valor:7}],
      1:[{pal:'Ors',valor:1}],
      2:[{pal:'Bastos',valor:3}],
    }
  },
];
// Bot plays predefinides: key="round-trickDone-playerIdx"
const T_BOT_PLAYS = {
  '0-0-0':{pal:'Copes',valor:3},   '0-0-2':{pal:'Bastos',valor:12},
  '0-1-2':{pal:'Ors',valor:11},    '0-1-0':{pal:'Bastos',valor:10},
  '0-2-0':{pal:'Espases',valor:7}, '0-2-2':{pal:'Ors',valor:3},
  '1-0-0':{pal:'Espases',valor:1}, '1-0-2':{pal:'Espases',valor:3},
  '1-1-0':{pal:'Copes',valor:7},   '1-1-2':{pal:'Ors',valor:11},
  '2-0-2':{pal:'Bastos',valor:3},  '2-0-0':{pal:'Copes',valor:7},
};
const T_STEPS = [
  {text:"Benvingut al tutorial! A continuació aprendrem a jugar a la Podrida. Toca la pantalla per a continuar."},
  {text:"La base de la Podrida és guanyar mans i, sobretot, encertar quantes en guanyaràs. Força relativa: A · 3 · 12 · 11 · 10 · 7 · 6 · 5 · 4 · 2", showOrder:true},
  {text:"Fem una partida curta d'exemple. Barregem les cartes i repartim una ronda de 3. (En aquest tutorial podràs veure les cartes dels altres jugadors per entendre-ho millor.)"},
  {text:"L'última carta de la baralla marca el trunfo: en aquest cas el 3 de Bastos. Això vol dir que les cartes de Bastos guanyen qualsevol altre pal!"},
  {title:"Fase de Cantar", text:"Cada jugador diu quantes mans creu que farà en aquesta ronda."},
  {text:"Tens l'As de Copes (la carta més forta del seu pal). Pots intentar guanyar una mà. Canta 1.", forceBid:1},
  {title:"Fase de Jugar", text:"Cada jugador intenta guanyar exactament el número de mans que ha cantat."},
  {text:"Han obert amb Copes. Recorda: cal seguir el pal obert i, si pots, superar. Podries seguir amb l'As o el 7, però només l'As supera el 3 — estàs obligat a jugar l'As!", forceCard:{pal:'Copes',valor:1}},
  {text:"El Bot2 no ha pogut seguir perquè no tenia Copes però ha guanyat la mà jugant el trumfo. El trumfo guanya qualsevol carta d'un altre pal, fins i tot l'As!"},
  {text:"No tens Ors ni trumfo. No pots seguir ni superar. Per tant, pots tirar qualsevol carta. Descarta el 7 de Copes.", forceCard:{pal:'Copes',valor:7}},
  {text:"El Bot1 no tenia Ors però tenia trumfo."},
  {text:"Només et queda el 10 d'Espases. Juga'l i guanyaràs la mà!", forceCard:{pal:'Espases',valor:10}},
  {text:"El Bot2 no tenia Espases ni trumfo. Per tant, pot tirar el que vulgui."},
  {title:"Fase de Recompte", text:"Ronda 1: Tu 1 mà ✓ (+13 pts) · Bot1 1 mà ✓ (+13 pts) · Bot2 1 de 2 ✗ (-3 pts)."},
  {text:"Nou trumfo: Copes."},
  {text:"Tens el 12 d'Espases i el 3 de Copes (trumfo). Hauries de fer 1 mà. Canta 1.", forceBid:1},
  {text:"Potser voldries jugar el trumfo... però primer has de seguir el pal! El 12 no supera l'As, però l'has de jugar igualment.", forceCard:{pal:'Espases',valor:12}},
  {text:"Seguir el pal és obligatori fins i tot si no pots superar i tens trumfo a la mà."},
  {text:"Només et queda el 3 de Copes (trumfo). Juga'l i guanya la mà!", forceCard:{pal:'Copes',valor:3}},
  {text:"El 3 de Copes supera el 7 de Copes. Recorda l'ordre: A · 3 · 12 · 11..."},
  {text:"Ronda 2: Tu 1 mà ✓ (+13 pts) · Bot1 1 mà ✓ (+13 pts) · Bot2 0 mans ✓ (+10 pts)."},
  {text:"Última ronda! 1 carta per cap. Trumfo: Ors."},
  {text:"Quina sort! Tens l'As d'Ors, el trumfo més fort! És segur que guanyaràs la mà. Canta 1.", forceBid:1},
  {text:"Som-hi!", forceCard:{pal:'Ors',valor:1}},
  {text:"Tutorial completat! Ara ja coneixes les regles bàsiques de la Podrida: seguir el pal, superar si pots, i el trumfo ho guanya tot. Bona sort!"},
];
const T_TRIGGERS = [
  {w:'start'},{w:'start'},{w:'start'},
  {w:'roundStart',r:0},
  {w:'afterBid',r:0},
  {w:'humanBid',r:0},
  {w:'playStart',r:0},
  {w:'humanPlay',r:0,t:0},{w:'trickEnd',r:0,t:0},
  {w:'humanPlay',r:0,t:1},{w:'trickEnd',r:0,t:1},
  {w:'humanPlay',r:0,t:2},{w:'trickEnd',r:0,t:2},
  {w:'roundEnd',r:0},
  {w:'roundStart',r:1},{w:'humanBid',r:1},
  {w:'humanPlay',r:1,t:0},{w:'trickEnd',r:1,t:0},
  {w:'humanPlay',r:1,t:1},{w:'trickEnd',r:1,t:1},
  {w:'roundEnd',r:1},
  {w:'roundStart',r:2},{w:'humanBid',r:2},
  {w:'humanPlay',r:2,t:0},
  {w:'gameEnd'},
];

function checkTutTrig(game, humanIdx) {
  if (!game.isTutorial || game.tutPaused) return false;
  const tr = T_TRIGGERS[game.tutStep]; if (!tr) return false;
  const { phase, roundIdx, taken, curBidder, curPlayer, bids, trick } = game;
  const done = Object.values(taken).reduce((a,b)=>a+b,0);
  const ti   = phase === PHASE.TRICK_END ? done-1 : done;
  switch(tr.w) {
    case 'start':      return roundIdx===0 && phase===PHASE.BID && Object.keys(bids).length===0;
    case 'roundStart': return roundIdx===tr.r && phase===PHASE.BID && Object.keys(bids).length===0;
    case 'humanBid':   return roundIdx===tr.r && phase===PHASE.BID && curBidder===humanIdx;
    case 'afterBid':   return roundIdx===tr.r && phase===PHASE.BID && curBidder===humanIdx;
    case 'playStart':  return roundIdx===tr.r && phase===PHASE.PLAY && done===0 && trick.length===0;
    case 'humanPlay':  return roundIdx===tr.r && phase===PHASE.PLAY && curPlayer===humanIdx && ti===tr.t;
    case 'trickEnd':   return roundIdx===tr.r && phase===PHASE.TRICK_END && ti===tr.t;
    case 'roundEnd':   return roundIdx===tr.r && (phase===PHASE.ROUND_END||phase===PHASE.GAME_END);
    case 'gameEnd':    return phase===PHASE.GAME_END;
    default: return false;
  }
}

function setupTutRound(state, rIdx) {
  const td  = T_HANDS_DATA[rIdx];
  const n   = 3;
  const ord = Array.from({length:n}, (_, i) => (td.startIdx + i) % n);
  return {
    ...state,
    phase: PHASE.BID, roundIdx: rIdx, startIdx: td.startIdx,
    hands: Object.fromEntries(Object.entries(td.hands).map(([k,v])=>[Number(k),[...v]])),
    trump: td.trump, trumpCard: td.trumpCard,
    bids: {}, taken: {0:0,1:0,2:0}, trick: [],
    trickLeader: td.startIdx, curPlayer: td.startIdx,
    curBidder: td.startIdx, bidStep: 0, bidOrder: ord,
    selected: null, trickWinner: null, roundScores: null,
    _nextPhase: null, buits: {}, cartesJugades: [],
    tutPaused: true,
  };
}

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


// ══ Inferència RL (MLP en JavaScript pur) ════════════════════════════════════
// Els pesos es carreguen des de pesos_rl.json exportat amb agents/exporta_pesos.py

function matVecMul(W, b, x) {
  // W: [out, in], b: [out], x: [in] → [out]
  return W.map((row, i) => row.reduce((s, w, j) => s + w * x[j], 0) + b[i]);
}

function rlInfereix(obs, pesos, mask) {
  // Forward pass: 161 → 256 → 256 → 128 → 40 (Tanh entre capes)
  let h = matVecMul(pesos.l1_w, pesos.l1_b, obs).map(Math.tanh);
  h     = matVecMul(pesos.l2_w, pesos.l2_b, h).map(Math.tanh);
  h     = matVecMul(pesos.l3_w, pesos.l3_b, h).map(Math.tanh);
  const logits = matVecMul(pesos.out_w, pesos.out_b, h);
  // Apliquem la màscara i triem el millor
  let best = -1, bestVal = -Infinity;
  logits.forEach((v, i) => {
    if (mask[i] && v > bestVal) { bestVal = v; best = i; }
  });
  return best;
}

// Estat global dels pesos RL (null fins que l'usuari els carrega)
let RL_PESOS = null;


// Observació simplificada per al bot RL al React
// (equivalent a agents/observacio.py però en JS)
const ORDRE_FORÇA_RL = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2];
const PALS_RL = ["Ors", "Copes", "Espases", "Bastos"];

function forçaIdx(carta) {
  return PALS_RL.indexOf(carta.pal) * 10 + ORDRE_FORÇA_RL.indexOf(carta.valor);
}

function construeixObsRL(state, pi) {
  const { hands, trump, trick, bids, taken, rounds, roundIdx, scores,
          trickLeader, players, cartesJugades = [], buits = {} } = state;
  const n = players.length;
  const nC = rounds[roundIdx];
  const nR = rounds.length;
  const prog = roundIdx / Math.max(nR - 1, 1);
  const nCf  = nC || 1;
  const obs  = new Float32Array(40 + 40 + 40 + 4 + 4 + 2 + 3 + 3 + 7*(n-1) + n).fill(0);
  let off = 0;

  // A: mà pròpia
  (hands[pi] || []).forEach(c => { obs[off + forçaIdx(c)] = 1; }); off += 40;
  // B: cartes jugades
  (cartesJugades || []).forEach(c => { obs[off + forçaIdx(c)] = 1; }); off += 40;
  // C: taula actual
  trick.forEach(({ carta }) => { obs[off + forçaIdx(carta)] = 1; }); off += 40;
  // D: pal obert
  if (trick.length) obs[off + PALS_RL.indexOf(trick[0].carta.pal)] = 1; off += 4;
  // E: trumfo
  obs[off + PALS_RL.indexOf(trump)] = 1; off += 4;
  // F: progrés
  obs[off] = prog; obs[off+1] = nC / 8; off += 2;
  // G: fase
  obs[off + (nC < 8 ? (roundIdx < 7 ? 0 : 2) : 1)] = 1; off += 3;
  // H: info pròpia
  obs[off]   = (bids[pi] ?? 0) / nCf;
  obs[off+1] = (taken[pi] ?? 0) / nCf;
  obs[off+2] = Math.max(0, nC - trick.length) / nCf; off += 3;
  // I: oponents en ordre relatiu
  const ordreAct = Array.from({length: n}, (_, k) => (trickLeader + k) % n);
  const piPos    = ordreAct.indexOf(pi);
  for (let k = 1; k < n; k++) {
    const op  = ordreAct[(piPos + k) % n];
    const bop = buits[op] || {};
    obs[off]   = (bids[op] ?? 0) / nCf;
    obs[off+1] = (taken[op] ?? 0) / nCf;
    obs[off+2] = ((hands[op] || []).length) / nCf;
    PALS_RL.forEach((p, i) => { obs[off + 3 + i] = bop[p] ? 1 : 0; });
    off += 7;
  }
  // J: scores ponderats
  const pes  = prog * prog;
  const sc   = scores || {};
  obs[off++] = (sc[pi] ?? 0) / 200 * pes;
  for (let k = 1; k < n; k++) {
    const op = ordreAct[(piPos + k) % n];
    obs[off++] = ((sc[op] ?? 0) - (sc[pi] ?? 0)) / 200 * pes;
  }
  return Array.from(obs);
}

// ══ State Transitions ═════════════════════════════════════════════════════
function setupRound(state) {
  if (state.isTutorial) return setupTutRound(state, state.roundIdx);
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
    rules: state.rules || {},
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
function CardFront({ carta, selected, disabled, onClick, size = "md", highlight = false, leading = false }) {
  const s = PAL_STYLE[carta.pal];
  const [w, h, fv, fs] = size === "sm" ? [36, 52, 10, 15] : [52, 74, 14, 22];
  return (
    <div onClick={!disabled ? onClick : undefined} style={{
      width: w, height: h, borderRadius: 7,
      background: selected ? "#FFFDE7" : "white",
      border: `2px solid ${highlight ? "#FFD700" : selected ? "#F9A825" : disabled ? "#ddd" : s.color}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      cursor: disabled ? "default" : "pointer",
      boxShadow: highlight ? "0 0 14px #FFD700cc" : selected ? `0 6px 16px ${s.glow}88` : "1px 2px 6px rgba(0,0,0,0.3)",
      transform: selected ? "translateY(-10px)" : leading ? "scale(1.08)" : "none",
      transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
      opacity: disabled ? 0.4 : 1,
      animation: highlight ? "tutForcedPulse 1.1s ease-in-out infinite" : "none",
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
  { id: 'random',    label: 'Aleatori',  diff: 'Fàcil',   desc: "Juga a l'atzar" },
  { id: 'heuristic', label: 'Heurístic', diff: 'Mitjà',   desc: 'Segueix regles bàsiques' },
  { id: 'ismcts',    label: 'ISMCTS',    diff: 'Difícil', desc: 'Cerca per simulació' },
];

// ── Tutorial UI ─────────────────────────────────────────────────────────────
function CardOrderDisplay() {
  return (
    <div style={{ display:'flex', gap:3, justifyContent:'center', flexWrap:'wrap', marginBottom:12 }}>
      {ORDRE_FORÇA.map(v => (
        <CardFront key={v} carta={{pal:'Ors',valor:v}} disabled size="sm" />
      ))}
    </div>
  );
}

function TutorialOverlay({ step, onTap }) {
  if (!step) return null;
  return (
    <div onClick={onTap} style={{
      position:'fixed', inset:0, zIndex:60,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:'0 16px', cursor:'pointer',
    }}>
      <div style={{
        maxWidth:400, width:'90%',
        background:'rgba(5,12,5,0.97)',
        borderRadius:18, border:'1px solid #c9a84c88',
        padding:'18px 22px',
        boxShadow:'0 8px 32px rgba(0,0,0,0.7)',
      }}>
        {step.showOrder && <CardOrderDisplay />}
        {step.title && (
          <p style={{
            color:'#FFD700', fontSize:19, fontWeight:800, margin:'0 0 8px',
            fontFamily:'Georgia,serif', letterSpacing:1,
            textShadow:'0 0 12px #FFD70055',
          }}>{step.title}</p>
        )}
        <p style={{ color:'#f0f0f0', fontSize:14, lineHeight:1.7, margin:0 }}>
          {step.text}
        </p>
        <div style={{ color:'#c9a84c', fontSize:11, textAlign:'right', marginTop:10, opacity:0.8 }}>
          Toca per continuar →
        </div>
      </div>
    </div>
  );
}

function Toggle({ value, onChange, label, desc }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      borderRadius: 10, cursor: "pointer",
      border: `1px solid ${value ? "#c9a84c" : "#2a2a2a"}`,
      background: value ? "rgba(201,168,76,0.08)" : "transparent",
      transition: "all 0.15s",
    }}>
      <div style={{
        width: 34, height: 20, borderRadius: 10, position: "relative",
        background: value ? "#c9a84c" : "#333", transition: "background 0.2s", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 2, left: value ? 16 : 2,
          width: 16, height: 16, borderRadius: 8,
          background: "white", transition: "left 0.2s",
        }} />
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ color: value ? "#c9a84c" : "#888", fontSize: 13, fontWeight: "bold" }}>{label}</div>
        <div style={{ color: "#555", fontSize: 11 }}>{desc}</div>
      </div>
    </div>
  );
}

function MenuScreen({ onPlay, onTutorial, onMultiplayer }) {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 60%, #1a472a 0%, #0a1f10 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0" }}>
      <div style={{ background: "rgba(0,0,0,0.72)", border: "1px solid #2a5a3a", borderRadius: 20, padding: "36px 40px", textAlign: "center", color: "white", width: "min(360px, 90vw)" }}>
        <div style={{ fontSize: 56, marginBottom: 4 }}>🃏</div>
        <h1 style={{ margin: "0 0 4px", fontSize: 34, letterSpacing: 3, color: "#c9a84c", fontFamily: "Georgia,serif" }}>LA PODRIDA</h1>
        <p style={{ color: "#555", fontSize: 12, marginBottom: 36 }}>Joc tradicional de cartes</p>

        <button onClick={onPlay} style={{
          width: "100%", padding: "16px 0", borderRadius: 12,
          border: "1px solid #c9a84c", background: "rgba(201,168,76,0.1)",
          color: "#c9a84c", fontSize: 19, cursor: "pointer",
          fontFamily: "Georgia,serif", letterSpacing: 2,
        }}>▶ Juga</button>

        <button onClick={onMultiplayer} style={{
          width: "100%", padding: "14px 0", borderRadius: 12, marginTop: 12,
          border: "1px solid #2a5a8a", background: "rgba(76,131,175,0.08)",
          color: "#5a9ac9", fontSize: 16, cursor: "pointer",
          fontFamily: "Georgia,serif", letterSpacing: 1,
        }}>🌐 Multijugador</button>

        <button onClick={onTutorial} style={{
          width: "100%", padding: "14px 0", borderRadius: 12, marginTop: 12,
          border: "1px solid #2a5a3a", background: "transparent",
          color: "#4a9a5a", fontSize: 16, cursor: "pointer",
          fontFamily: "Georgia,serif", letterSpacing: 1,
        }}>📖 Aprèn a jugar</button>
      </div>
    </div>
  );
}

function SetupScreen({ onStart, onBack }) {
  const [n, setN] = useState(4);
  const [botType, setBotType] = useState('heuristic');
  const [prohibitQuadrar, setProhibitQuadrar] = useState(false);
  const [rondesIndia, setRondesIndia] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 60%, #1a472a 0%, #0a1f10 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0" }}>
      <div style={{ background: "rgba(0,0,0,0.72)", border: "1px solid #2a5a3a", borderRadius: 20, padding: "32px 40px", textAlign: "center", color: "white", width: "min(360px, 90vw)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <button onClick={onBack} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#666", cursor: "pointer", fontSize: 12 }}>← Enrere</button>
          <span style={{ flex: 1, color: "#aaa", fontSize: 14, fontFamily: "Georgia,serif", letterSpacing: 1 }}>Configura la partida</span>
        </div>

        <p style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>Jugadors totals</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
          {[3, 4, 5].map(v => (
            <button key={v} onClick={() => setN(v)} style={{
              width: 52, height: 52, borderRadius: 12,
              border: `2px solid ${n === v ? "#c9a84c" : "#333"}`,
              background: n === v ? "rgba(201,168,76,0.15)" : "transparent",
              color: n === v ? "#c9a84c" : "#555",
              fontSize: 22, cursor: "pointer", fontFamily: "Georgia,serif",
            }}>{v}</button>
          ))}
        </div>

        <p style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>Dificultat dels bots</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 22 }}>
          {BOT_TYPES.map(bt => (
            <button key={bt.id} onClick={() => setBotType(bt.id)} style={{
              padding: "9px 14px", borderRadius: 10,
              border: `1px solid ${botType === bt.id ? "#c9a84c" : "#2a2a2a"}`,
              background: botType === bt.id ? "rgba(201,168,76,0.12)" : "transparent",
              color: "white", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: botType === bt.id ? "#c9a84c" : "#ccc", fontWeight: "bold", fontSize: 14 }}>{bt.label}</span>
                <span style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 10, whiteSpace: "nowrap",
                  background: bt.diff === 'Fàcil' ? "rgba(76,175,80,0.2)" : bt.diff === 'Mitjà' ? "rgba(255,152,0,0.2)" : "rgba(239,83,80,0.2)",
                  color: bt.diff === 'Fàcil' ? "#81C784" : bt.diff === 'Mitjà' ? "#FFB74D" : "#EF9A9A",
                }}>{bt.diff}</span>
              </div>
              <span style={{ color: "#555", fontSize: 11, textAlign: "right" }}>{bt.desc}</span>
            </button>
          ))}
        </div>

        <p style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>Regles especials</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
          <Toggle
            value={prohibitQuadrar} onChange={setProhibitQuadrar}
            label="Prohibit quadrar"
            desc="L'últim en parlar no pot igualar el total de mans"
          />
          <Toggle
            value={rondesIndia} onChange={setRondesIndia}
            label="Última ronda índia"
            desc="En l'última ronda veus les cartes dels altres però no la teva"
          />
        </div>

        <button onClick={() => onStart(n, botType, { prohibitQuadrar, rondesIndia })} style={{
          width: "100%", padding: "13px 0", borderRadius: 12,
          border: "1px solid #c9a84c", background: "rgba(201,168,76,0.1)",
          color: "#c9a84c", fontSize: 17, cursor: "pointer",
          fontFamily: "Georgia,serif", letterSpacing: 2,
        }}>Jugar</button>
      </div>
    </div>
  );
}

// ══ Multijugador: menú, crear, unir-se, sala d'espera ══════════════════════
function ShellCard({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 60%, #1a472a 0%, #0a1f10 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0" }}>
      <div style={{ background: "rgba(0,0,0,0.72)", border: "1px solid #2a5a3a", borderRadius: 20, padding: "32px 40px", textAlign: "center", color: "white", width: "min(360px, 90vw)" }}>
        {children}
      </div>
    </div>
  );
}

function BackHeader({ onBack, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
      <button onClick={onBack} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#666", cursor: "pointer", fontSize: 12 }}>← Enrere</button>
      <span style={{ flex: 1, color: "#aaa", fontSize: 14, fontFamily: "Georgia,serif", letterSpacing: 1 }}>{title}</span>
    </div>
  );
}

const segBtnStyle = (active) => ({
  flex: 1, padding: "10px 0", borderRadius: 10,
  border: `1px solid ${active ? "#c9a84c" : "#2a2a2a"}`,
  background: active ? "rgba(201,168,76,0.12)" : "transparent",
  color: active ? "#c9a84c" : "#666", fontSize: 13, cursor: "pointer", fontFamily: "Georgia,serif",
});

const textInputStyle = {
  width: "100%", boxSizing: "border-box", textAlign: "center",
  padding: "12px 0", borderRadius: 10, border: "1px solid #333", background: "#111",
  color: "white", fontSize: 16, marginBottom: 16,
};

function MultiplayerMenuScreen({ onCreate, onJoin, onBack }) {
  return (
    <ShellCard>
      <BackHeader onBack={onBack} title="Multijugador" />
      <button onClick={onCreate} style={{
        width: "100%", padding: "14px 0", borderRadius: 12,
        border: "1px solid #c9a84c", background: "rgba(201,168,76,0.1)",
        color: "#c9a84c", fontSize: 16, cursor: "pointer", fontFamily: "Georgia,serif",
      }}>Crear una sala</button>
      <button onClick={onJoin} style={{
        width: "100%", padding: "14px 0", borderRadius: 12, marginTop: 12,
        border: "1px solid #2a5a8a", background: "rgba(76,131,175,0.08)",
        color: "#5a9ac9", fontSize: 16, cursor: "pointer", fontFamily: "Georgia,serif",
      }}>Unir-me a una sala</button>
    </ShellCard>
  );
}

function CreateRoomScreen({ onCreate, onBack, busy, error }) {
  const [nom, setNom] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [prohibitQuadrar, setProhibitQuadrar] = useState(false);
  const [rondesIndia, setRondesIndia] = useState(false);
  return (
    <ShellCard>
      <BackHeader onBack={onBack} title="Crear sala" />
      <p style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>El teu nom</p>
      <input value={nom} onChange={e => setNom(e.target.value.slice(0, 16))} placeholder="Nom" style={textInputStyle} />

      <p style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>Visibilitat</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setIsPublic(false)} style={segBtnStyle(!isPublic)}>🔒 Privada</button>
        <button onClick={() => setIsPublic(true)} style={segBtnStyle(isPublic)}>🌐 Pública</button>
      </div>

      <p style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>Regles especials</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 22 }}>
        <Toggle value={prohibitQuadrar} onChange={setProhibitQuadrar} label="Prohibit quadrar" desc="L'últim en parlar no pot igualar el total de mans" />
        <Toggle value={rondesIndia} onChange={setRondesIndia} label="Última ronda índia" desc="En l'última ronda veus les cartes dels altres però no la teva" />
      </div>

      {error && <p style={{ color: "#ef5350", fontSize: 12, marginBottom: 12 }}>{error}</p>}
      <button disabled={busy || !nom.trim()} onClick={() => onCreate(nom.trim(), isPublic, { prohibitQuadrar, rondesIndia })} style={{
        width: "100%", padding: "13px 0", borderRadius: 12,
        border: "1px solid #c9a84c", background: "rgba(201,168,76,0.1)",
        color: "#c9a84c", fontSize: 16, cursor: "pointer", fontFamily: "Georgia,serif",
        opacity: busy || !nom.trim() ? 0.5 : 1,
      }}>{busy ? "Creant…" : "Crear sala"}</button>
    </ShellCard>
  );
}

function JoinRoomScreen({ onJoinCode, onJoinPublic, onBack, busy, error }) {
  const [mode, setMode] = useState('code'); // 'code' | 'public'
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const canSubmit = nom.trim() && (mode === 'public' || code.length === 4);
  return (
    <ShellCard>
      <BackHeader onBack={onBack} title="Unir-me a una sala" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setMode('code')} style={segBtnStyle(mode === 'code')}>🔒 Amb codi</button>
        <button onClick={() => setMode('public')} style={segBtnStyle(mode === 'public')}>🌐 Partida ràpida</button>
      </div>
      {mode === 'code' && (
        <>
          <p style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>Codi de sala</p>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="ABCD" style={{
              width: "100%", boxSizing: "border-box", textAlign: "center", letterSpacing: 6,
              padding: "12px 0", borderRadius: 10, border: "1px solid #333", background: "#111",
              color: "#c9a84c", fontSize: 22, fontFamily: "Georgia,serif", marginBottom: 16,
            }} />
        </>
      )}
      <p style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>El teu nom</p>
      <input value={nom} onChange={e => setNom(e.target.value.slice(0, 16))} placeholder="Nom" style={textInputStyle} />
      {error && <p style={{ color: "#ef5350", fontSize: 12, marginBottom: 12 }}>{error}</p>}
      <button disabled={busy || !canSubmit} onClick={() => mode === 'code' ? onJoinCode(code, nom.trim()) : onJoinPublic(nom.trim())} style={{
        width: "100%", padding: "13px 0", borderRadius: 12,
        border: "1px solid #c9a84c", background: "rgba(201,168,76,0.1)",
        color: "#c9a84c", fontSize: 16, cursor: "pointer", fontFamily: "Georgia,serif",
        opacity: busy || !canSubmit ? 0.5 : 1,
      }}>{busy ? "Connectant…" : mode === 'code' ? "Unir-me" : "Buscar partida"}</button>
    </ShellCard>
  );
}

function SlotOption({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 10px", borderRadius: 8,
      border: `1px solid ${active ? "#c9a84c" : "#2a2a2a"}`,
      background: active ? "rgba(201,168,76,0.15)" : "#161616",
      color: active ? "#c9a84c" : "#999", fontSize: 12, cursor: "pointer",
    }}>{label}</button>
  );
}

// Mateixa icona que l'estat de la fila, amb un text petit a sota per aclarir-la.
function IconOption({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      padding: "8px 16px", borderRadius: 10,
      border: `1px solid ${active ? "#c9a84c" : "#2a2a2a"}`,
      background: active ? "rgba(201,168,76,0.15)" : "#161616", cursor: "pointer",
    }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 10, color: active ? "#c9a84c" : "#888" }}>{label}</span>
    </button>
  );
}

const SLOT_ICON = { human: "👤", open: "👤", bot: "🤖", closed: "🔒" };

function SlotRow({ i, slot, mySlot, isHost, expanded, pickingBot, onToggle, onPickType, onPickDiff }) {
  const s = slot || { type: 'open' };
  const isMe = i === mySlot;
  // La icona només indica el tipus. El detall (nom/dificultat/res) va a part.
  const icon = SLOT_ICON[s.type] || "👤";
  const detail = s.type === 'human' ? s.name
    : s.type === 'bot' ? (BOT_TYPES.find(b => b.id === s.botType)?.diff || 'Mitjà')
    : s.type === 'closed' ? 'Tancat'
    : 'Esperant jugador…';
  const editable = isHost && s.type !== 'human';
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "9px 14px", borderRadius: 10,
        border: `1px solid ${s.type === 'human' ? "#c9a84c44" : "#2a2a2a"}`,
        background: s.type === 'human' ? "rgba(201,168,76,0.08)" : "transparent",
        opacity: s.type === 'open' || s.type === 'closed' ? 0.65 : 1,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: 17 }}>{icon}</span>
          <span style={{ color: s.type === 'closed' ? "#666" : "white", fontSize: 14 }}>
            {detail}{isMe ? " · Tu" : ""}
          </span>
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {editable && (
            <button onClick={() => onToggle(i)} style={{
              padding: "5px 10px", borderRadius: 8, border: "1px solid #333",
              background: expanded ? "rgba(201,168,76,0.12)" : "transparent",
              color: expanded ? "#c9a84c" : "#888", fontSize: 12, cursor: "pointer",
            }}>{expanded ? "Fet" : "Canvia"}</button>
          )}
          {s.type === 'human' && <span style={{ color: "#4CAF50", fontSize: 11 }}>●</span>}
        </div>
      </div>

      {expanded && !pickingBot && (
        <div style={{ display: "flex", gap: 8, padding: "8px 4px 2px" }}>
          <IconOption icon="👤" label="Humà" active={s.type === 'open'} onClick={() => onPickType(i, 'open')} />
          <IconOption icon="🤖" label="Bot" active={s.type === 'bot'} onClick={() => onPickType(i, 'bot')} />
          <IconOption icon="🔒" label="Tancat" active={s.type === 'closed'} onClick={() => onPickType(i, 'closed')} />
        </div>
      )}
      {expanded && pickingBot && (
        <div style={{ display: "flex", gap: 6, padding: "8px 4px 2px", alignItems: "center" }}>
          <button onClick={() => onPickType(i, null)} style={{
            padding: "6px 8px", borderRadius: 8, border: "1px solid #2a2a2a",
            background: "#161616", color: "#666", fontSize: 12, cursor: "pointer",
          }}>←</button>
          {BOT_TYPES.map(bt => (
            <SlotOption key={bt.id} label={bt.diff} active={s.type === 'bot' && s.botType === bt.id}
              onClick={() => onPickDiff(i, bt.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function LobbyScreen({ code, room, isHost, mySlot, onSetSlot, onStart, onBack, busy }) {
  const [expandedSlot, setExpandedSlot] = useState(null);
  const [pickingBot, setPickingBot] = useState(false);
  const slots = Array.from({ length: 5 }, (_, i) => room?.slots?.[i] || { type: 'open' });
  const activeCount = slots.filter(s => s.type !== 'closed').length;
  const canStart = activeCount >= 3;

  const onToggle = (i) => {
    setExpandedSlot(cur => cur === i ? null : i);
    setPickingBot(false);
  };
  // type === 'bot' obre el submenú de dificultat en lloc de tancar; type === null torna al menú principal.
  const onPickType = (i, type) => {
    if (type === 'bot') { setPickingBot(true); return; }
    if (type === null) { setPickingBot(false); return; }
    onSetSlot(i, { type });
    setExpandedSlot(null); setPickingBot(false);
  };
  const onPickDiff = (i, botType) => {
    onSetSlot(i, { type: 'bot', botType });
    setExpandedSlot(null); setPickingBot(false);
  };

  return (
    <ShellCard>
      <BackHeader onBack={onBack} title="Sala d'espera" />
      <p style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>Codi de la sala</p>
      <div style={{ fontSize: 34, letterSpacing: 8, color: "#c9a84c", fontFamily: "Georgia,serif", marginBottom: 6 }}>{code}</div>
      {room?.public && <p style={{ color: "#5a9ac9", fontSize: 11, marginBottom: 14 }}>🌐 Sala pública</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
        {slots.map((s, i) => (
          <SlotRow key={i} i={i} slot={s} mySlot={mySlot} isHost={isHost}
            expanded={expandedSlot === i} pickingBot={expandedSlot === i && pickingBot}
            onToggle={onToggle} onPickType={onPickType} onPickDiff={onPickDiff} />
        ))}
      </div>

      {isHost ? (
        <>
          {!canStart && <p style={{ color: "#EF9A9A", fontSize: 12, marginBottom: 8 }}>Calen almenys 3 jugadors actius (obre un seient o posa-hi un bot)</p>}
          <button disabled={busy || !canStart} onClick={onStart} style={{
            width: "100%", padding: "13px 0", borderRadius: 12,
            border: "1px solid #c9a84c", background: "rgba(201,168,76,0.1)",
            color: "#c9a84c", fontSize: 16, cursor: "pointer", fontFamily: "Georgia,serif",
            opacity: busy || !canStart ? 0.5 : 1,
          }}>{busy ? "Iniciant…" : "Comença la partida"}</button>
        </>
      ) : (
        <p style={{ color: "#666", fontSize: 13 }}>Esperant que l'amfitrió comenci…</p>
      )}
    </ShellCard>
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
function GameScreen({ game, setGame, onRestart, mySeat, onBid, onPlay, onNextRound, online }) {
  const { players, scores, phase, trump, trumpCard, bids, taken, trick, rounds, roundIdx, hands, curBidder, curPlayer, selected, trickWinner, startIdx, rules = {} } = game;
  const isRondaIndia = rules.rondesIndia && roundIdx === rounds.length - 1;
  const n = players.length;
  const nC = rounds[roundIdx];
  // Offline: el jugador humà (n'hi ha un). Online: el seient que controla aquest client.
  const humanIdx = mySeat ?? players.findIndex(p => p.isHuman);
  const humanHand = hands[humanIdx] || [];
  const ps = PAL_STYLE[trump] || {};

  const palObert = trick.length ? trick[0].carta.pal : null;
  const millorT = millorATaula(trick, trump);
  const liderActual = millorT ? trick.find(t => t.carta.pal === millorT.pal && t.carta.valor === millorT.valor)?.pi : null;
  const currentLeaderPi = trickWinner !== null ? trickWinner : liderActual;
  const llegals = phase === PHASE.PLAY && curPlayer === humanIdx
    ? jugadesLegals(humanHand, palObert, millorT, trump)
    : [];
  const legalKeys = new Set(llegals.map(cardKey));

  // Tutorial
  const tutStep    = game.tutStep ?? 0;
  const tutPaused  = game.isTutorial && game.tutPaused;
  const tutStepObj = game.isTutorial ? T_STEPS[tutStep] : null;
  // In the tutorial, keep the table empty (no cards dealt yet) until the
  // "Fem una partida curta d'exemple..." step, so the intro text isn't
  // competing with a full hand of cards on screen.
  const cardsDealt = !game.isTutorial || tutStep >= 2;
  const tutHighlightTrump = game.isTutorial && tutStep === 3;
  const tutHighlightBids  = game.isTutorial && tutStep === 4;

  const handleTutTap = () => {
    const tr = T_TRIGGERS[tutStep];
    if (tr?.w === 'gameEnd') { onRestart(); return; }
    const isAction = tr?.w === 'humanBid' || tr?.w === 'humanPlay';
    setGame(g => {
      if (isAction) return {...g, tutPaused: false};
      const next = g.tutStep + 1;
      if (next >= T_STEPS.length) { return {...g, tutPaused: false}; }
      if (tr?.w === 'roundEnd') {
        const nextR = g.roundIdx + 1;
        if (nextR >= T_ROUNDS.length) return {...g, tutStep: next, tutPaused: false};
        return setupTutRound({...g, tutStep: next}, nextR);
      }
      // If the step we land on already matches its own pause condition (e.g. the bot
      // that needed to act already did, back when an earlier step was dismissed),
      // pause right away instead of waiting for a bot move that isn't coming.
      const hIdx = g.players.findIndex(p => p.isHuman);
      const willPause = checkTutTrig({...g, tutStep: next, tutPaused: false}, hIdx);
      return {...g, tutStep: next, tutPaused: willPause};
    });
  };

  // Animació ronda índia
  const [indiaAnim, setIndiaAnim] = useState({ vis: false, op: 0 });
  useEffect(() => {
    if (isRondaIndia) {
      setIndiaAnim({ vis: true, op: 0 });
      const t1 = setTimeout(() => setIndiaAnim({ vis: true, op: 1 }), 50);
      const t2 = setTimeout(() => setIndiaAnim({ vis: true, op: 0 }), 2200);
      const t3 = setTimeout(() => setIndiaAnim({ vis: false, op: 0 }), 2700);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [roundIdx]);

  const handleCardClick = carta => {
    if (phase !== PHASE.PLAY || curPlayer !== humanIdx) return;
    if (game.isTutorial && !game.tutPaused) {
      const fc = T_STEPS[game.tutStep]?.forceCard;
      if (fc && (carta.pal !== fc.pal || carta.valor !== fc.valor)) return;
      if (cardsEq(selected, carta)) {
        setGame(g => {
          const newG = doPlay({...g, selected: null}, carta);
          const next = g.tutStep + 1;
          return {...newG, tutStep: next, tutPaused: false};
        });
      } else {
        setGame(g => ({...g, selected: carta}));
      }
      return;
    }
    if (!legalKeys.has(cardKey(carta))) return;
    if (cardsEq(selected, carta)) {
      if (onPlay) { onPlay(carta); setGame(g => ({ ...g, selected: null })); }
      else setGame(g => doPlay({ ...g, selected: null }, carta));
    } else {
      setGame(g => ({ ...g, selected: carta }));
    }
  };

  const handleBid = bid => {
    if (phase !== PHASE.BID || curBidder !== humanIdx) return;
    if (game.isTutorial) {
      const fc = T_STEPS[game.tutStep]?.forceBid;
      if (fc !== undefined && bid !== fc) return;
      setGame(g => {
        const newG = doBid(g, bid);
        const next = g.tutStep + 1;
        return {...newG, tutStep: next, tutPaused: false};
      });
      return;
    }
    if (onBid) onBid(bid);
    else setGame(g => doBid(g, bid));
  };

  // "Oponents" = tots els seients excepte el meu (no els "no humans": en línia
  // hi pot haver diversos jugadors humans, i cadascun veu els altres de cara avall).
  const opponents = players.map((p, i) => ({ ...p, idx: i })).filter(p => p.idx !== humanIdx);

  const isHumanTurn = phase === PHASE.PLAY && curPlayer === humanIdx;
  const isHumanBidding = phase === PHASE.BID && curBidder === humanIdx;

  // Comptador de torn (només en línia): purament visual, cadascú el calcula en local
  // a partir de quan ha vist canviar el torn; qui de veritat el fa complir és l'amfitrió.
  const actingIdx = phase === PHASE.BID ? curBidder : phase === PHASE.PLAY ? curPlayer : null;
  const showTimer = online && actingIdx !== null && players[actingIdx]?.isHuman;
  const [secondsLeft, setSecondsLeft] = useState(30);
  useEffect(() => {
    if (!showTimer) return;
    setSecondsLeft(30);
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [showTimer, phase, curBidder, curPlayer]);
  const urgent = showTimer && secondsLeft <= 10;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 40%, #1a472a 0%, #0a1f10 100%)", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
      {game.isTutorial && (
        <style>{`
          @keyframes tutForcedPulse {
            0%, 100% { box-shadow: 0 0 8px #FFD70066; }
            50%      { box-shadow: 0 0 18px #FFD700dd; }
          }
        `}</style>
      )}
      {urgent && (
        <style>{`
          @keyframes turnPulse {
            0%, 100% { box-shadow: 0 0 6px #ff525266; transform: scale(1); }
            50%      { box-shadow: 0 0 16px #ff5252cc; transform: scale(1.03); }
          }
        `}</style>
      )}
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)" }}>
        <button onClick={onRestart} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#666", cursor: "pointer", fontSize: 12 }}>↩</button>
        <span style={{ color: "#666", fontSize: 12 }}>Ronda <b style={{ color: "#aaa" }}>{roundIdx + 1}</b>/{rounds.length}</span>
        <span style={{ color: "#555", fontSize: 12 }}>·</span>
        <span style={{ color: "#666", fontSize: 12 }}><b style={{ color: "#aaa" }}>{nC}</b> {nC > 1 ? "cartes" : "carta"}</span>
        {cardsDealt && (
          <div style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "4px 12px",
            border: `1px solid ${tutHighlightTrump ? "#FFD700" : (ps.color || "#333") + "40"}`,
            boxShadow: tutHighlightTrump ? "0 0 14px #FFD700aa" : "none",
            animation: tutHighlightTrump ? "tutForcedPulse 1.1s ease-in-out infinite" : "none",
          }}>
            <span style={{ color: "#666", fontSize: 11 }}>Trumfo</span>
            <SuitIcon pal={trump} size={16} />
            <span style={{ color: ps.color, fontSize: 12 }}>{trump}</span>
            {trumpCard && <span style={{ color: "#555", fontSize: 11 }}>({NOM_VALOR[trumpCard.valor]})</span>}
          </div>
        )}
      </div>

      {showTimer && (
        <div style={{
          textAlign: "center", padding: urgent ? "7px 0" : "3px 0",
          fontSize: urgent ? 15 : 11, fontWeight: urgent ? "bold" : "normal",
          color: urgent ? "#ff5252" : "#666",
          background: urgent ? "rgba(255,82,82,0.14)" : "transparent",
          borderRadius: urgent ? 8 : 0, margin: urgent ? "0 10px" : 0,
          animation: urgent ? "turnPulse 1s ease-in-out infinite" : "none",
          transition: "font-size 0.2s, color 0.2s",
        }}>
          ⏱ {actingIdx === humanIdx ? "Et queden" : `${players[actingIdx]?.name}:`} {secondsLeft}s
        </div>
      )}

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
              <div style={{
                color: isCur ? "#4CAF50" : "#555", fontSize: 10, textAlign: "center", whiteSpace: "nowrap",
                padding: (tutHighlightBids && bids[op.idx] !== undefined) ? "2px 8px" : 0,
                borderRadius: 8,
                border: (tutHighlightBids && bids[op.idx] !== undefined) ? "1px solid #FFD700" : "none",
                animation: (tutHighlightBids && bids[op.idx] !== undefined) ? "tutForcedPulse 1.1s ease-in-out infinite" : "none",
              }}>
                {op.idx === startIdx && <span style={{ color: "#c9a84c", marginRight: 3 }}>★</span>}
                {op.name}
                {bids[op.idx] !== undefined && ` (${taken[op.idx]}/${bids[op.idx]})`}
                {phase === PHASE.BID && curBidder === op.idx && " 🤔"}
                {phase === PHASE.PLAY && curPlayer === op.idx && " ▶"}
              </div>
              {!cardsDealt ? null : isRondaIndia || game.isTutorial
                ? <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center", maxWidth: 160 }}>
                    {opHand.map((c, ci) => <CardFront key={ci} carta={c} disabled size="sm" />)}
                  </div>
                : <StackedHand count={opHand.length} />
              }
            </div>
          );
        })}

        {/* Center trick */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "center", minWidth: 60, minHeight: 60 }}>
          {trick.map(({ pi, carta }, i) => {
            const isLeading = currentLeaderPi === pi;
            return (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ color: "#555", fontSize: 10, marginBottom: 2 }}>
                  {players[pi].name}
                </div>
                <CardFront carta={carta} disabled leading={isLeading} />
              </div>
            );
          })}
          {trickWinner !== null && (
            <div style={{ width: "100%", textAlign: "center", color: "#c9a84c", fontSize: 12, fontWeight: "bold" }}>
              {players[trickWinner].isHuman ? "★ Tu guanyes!" : `★ ${players[trickWinner].name} guanya!`}
            </div>
          )}
        </div>

        {/* Bidding AI waiting */}
        {cardsDealt && phase === PHASE.BID && curBidder !== humanIdx && (
          <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "#444", fontSize: 12 }}>
            {players[curBidder].name} canta...
          </div>
        )}
      </div>

      {/* Human hand + bidding */}
      <div style={{ background: "rgba(0,0,0,0.35)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 10px 16px" }}>
        {/* Bid buttons */}
        {isHumanBidding && (() => {
          const bidOrder = Array.from({length: n}, (_, i) => (startIdx + i) % n);
          const isLastBidder = bidOrder[bidOrder.length - 1] === humanIdx;
          const sumJaCantat = Object.values(bids).reduce((a, b) => a + b, 0);
          const prohibit = rules.prohibitQuadrar && isLastBidder ? (nC - sumJaCantat) : -1;
          const tutForceBid = game.isTutorial && !game.tutPaused ? T_STEPS[tutStep]?.forceBid : undefined;
          return (
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>
                Quantes mans cantes? <span style={{ color: "#555" }}>({nC} cartes)</span>
                {prohibit >= 0 && prohibit <= nC && (
                  <span style={{ color: "#ef5350", marginLeft: 6 }}>· Prohibit quadrar</span>
                )}
                {tutForceBid !== undefined && (
                  <span style={{ color: "#c9a84c", marginLeft: 6 }}>↑ Canta {tutForceBid}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                {Array.from({length: nC + 1}, (_, i) => {
                  const forbidden = i === prohibit;
                  const tutBlocked = tutForceBid !== undefined && i !== tutForceBid;
                  const isForced = tutForceBid !== undefined && i === tutForceBid;
                  return (
                    <button key={i} onClick={() => !forbidden && !tutBlocked && handleBid(i)} style={{
                      width: 40, height: 40, borderRadius: 8,
                      border: `1px solid ${forbidden||tutBlocked ? "#333" : isForced ? "#FFD700" : "#c9a84c"}`,
                      background: isForced ? "rgba(255,215,0,0.15)" : forbidden||tutBlocked ? "rgba(40,40,40,0.1)" : "rgba(201,168,76,0.08)",
                      color: forbidden||tutBlocked ? "#444" : isForced ? "#FFD700" : "#c9a84c",
                      fontSize: 18, cursor: forbidden||tutBlocked ? "not-allowed" : "pointer",
                      fontFamily: "Georgia,serif", fontWeight: "bold",
                      textDecoration: forbidden ? "line-through" : "none",
                      boxShadow: isForced ? "0 0 8px #FFD70066" : "none",
                      transform: isForced ? "scale(1.15)" : "none",
                    }}>{i}</button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Play hint */}
        {isHumanTurn && (
          <div style={{ textAlign: "center", color: selected ? "#c9a84c" : "#555", fontSize: 12, marginBottom: 8 }}>
            {selected ? "Toca de nou per jugar" : "Selecciona una carta"}
          </div>
        )}

        {/* Cards */}
        <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
          {cardsDealt && humanHand.map((carta, i) => {
            const isLegal = legalKeys.has(cardKey(carta));
            const isSel = cardsEq(selected, carta);
            const tutFC = game.isTutorial && !game.tutPaused ? T_STEPS[tutStep]?.forceCard : undefined;
            const isForced = tutFC && carta.pal===tutFC.pal && carta.valor===tutFC.valor;
            if (isRondaIndia) {
              return (
                <div key={i} onClick={() => isHumanTurn && handleCardClick(carta)}
                  style={{ position: "relative", cursor: isHumanTurn ? "pointer" : "default" }}>
                  <CardBack />
                  {isHumanTurn && isLegal && (
                    <div style={{
                      position: "absolute", inset: 0, borderRadius: 7,
                      border: `2px solid ${isSel ? "#F9A825" : "#c9a84c"}`,
                      boxShadow: `0 0 10px ${isSel ? "#F9A825" : "#c9a84c"}66`,
                      pointerEvents: "none",
                    }} />
                  )}
                </div>
              );
            }
            const effectiveDisabled = !isHumanTurn || !isLegal;
            return (
              <div key={i} style={{position:'relative'}}>
                <CardFront carta={carta} selected={isSel}
                  disabled={effectiveDisabled}
                  highlight={isForced && isHumanTurn}
                  onClick={() => !effectiveDisabled && handleCardClick(carta)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Tutorial overlay */}
      {tutPaused && tutStepObj && (
        <TutorialOverlay step={tutStepObj} onTap={handleTutTap} />
      )}

      {/* Animació ronda índia */}
      {indiaAnim.vis && (
        <div style={{
          position: "fixed", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", zIndex: 40,
          pointerEvents: "none",
          opacity: indiaAnim.op, transition: "opacity 0.4s ease",
        }}>
          <div style={{
            background: "rgba(0,0,0,0.75)", borderRadius: 24,
            padding: "24px 36px", textAlign: "center",
            border: "1px solid #c9a84c44",
            transform: `scale(${indiaAnim.op === 1 ? 1 : 0.8})`,
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}>
            <div style={{ fontSize: 56, lineHeight: 1.2 }}>🪶</div>
            <div style={{ color: "#c9a84c", fontSize: 16, fontFamily: "Georgia,serif", marginTop: 8, letterSpacing: 1 }}>Ronda Índia</div>
            <div style={{ color: "#666", fontSize: 11, marginTop: 4 }}>Veus les cartes dels altres però no les teves</div>
          </div>
        </div>
      )}

      {/* Overlays */}
      {(phase === PHASE.ROUND_END || phase === PHASE.GAME_END) && !game.isTutorial && (
        <RoundEndOverlay game={game} onNext={() => {
          if (phase === PHASE.GAME_END) { onRestart(); return; }
          if (onNextRound) { onNextRound(); return; }
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
  const [view, setView] = useState('menu'); // 'menu' | 'configure' | 'mp-menu' | 'mp-create' | 'mp-join' | 'mp-lobby'

  // ── Multijugador ──────────────────────────────────────────────────────
  const [online, setOnline] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [mySlot, setMySlot] = useState(null);   // seient (0-4) assignat en unir-se, per a la sala d'espera
  const [mySeat, setMySeat] = useState(null);   // índex final al `game.players` un cop comença la partida
  const [room, setRoom] = useState(null);       // últim snapshot de la sala (seients, started...)
  const [mpBusy, setMpBusy] = useState(false);
  const [mpError, setMpError] = useState(null);

  const resetAll = () => {
    if (roomCode) abandonaSala(roomCode, isHost, mySlot);
    setGame(null); setView('menu');
    setOnline(false); setIsHost(false); setRoomCode(null);
    setMyUid(null); setMySlot(null); setMySeat(null); setRoom(null); setMpError(null);
  };

  const handleCreateRoom = async (nom, isPublic, rules) => {
    setMpBusy(true); setMpError(null);
    try {
      const { code, mySlot: slot, uid } = await crearSala({ nom, public: isPublic, rules });
      setRoomCode(code); setMyUid(uid); setMySlot(slot); setMySeat(0); setIsHost(true); setOnline(true);
      setView('mp-lobby');
    } catch (e) { setMpError(e.message || "No s'ha pogut crear la sala"); }
    setMpBusy(false);
  };

  const handleJoinRoom = async (code, nom) => {
    setMpBusy(true); setMpError(null);
    try {
      const { mySlot: slot, uid } = await unirSala(code, nom);
      setRoomCode(code); setMyUid(uid); setMySlot(slot); setIsHost(false); setOnline(true);
      setView('mp-lobby');
    } catch (e) { setMpError(e.message || "No s'ha pogut unir a la sala"); }
    setMpBusy(false);
  };

  const handleJoinPublic = async (nom) => {
    setMpBusy(true); setMpError(null);
    try {
      const { code, mySlot: slot, uid } = await unirSalaPublica(nom);
      setRoomCode(code); setMyUid(uid); setMySlot(slot); setIsHost(false); setOnline(true);
      setView('mp-lobby');
    } catch (e) { setMpError(e.message || "No s'ha pogut trobar una sala"); }
    setMpBusy(false);
  };

  // Nomes l'amfitrió pot editar seients que encara no té ningú a dins (validat també a Firebase).
  const handleSetSlot = (i, slotObj) => {
    if ((room?.slots?.[i] || { type: 'open' }).type === 'human') return;
    actualitzaSlot(roomCode, i, slotObj);
  };

  const handleStartOnline = () => {
    if (!room) return;
    const slots = room.slots || {};
    const active = [];
    for (let i = 0; i < 5; i++) {
      const s = slots[i] || { type: 'open' };
      if (s.type !== 'closed') active.push(s);
    }
    if (active.length < 3) return;
    const seatAssignment = {};
    const players = active.map((s, idx) => {
      if (s.type === 'human') { seatAssignment[s.uid] = idx; return { name: s.name, isHuman: true, botType: null }; }
      return { name: `Bot ${idx + 1}`, isHuman: false, botType: s.botType || 'heuristic' };
    });
    const initial = setupRound({
      players,
      scores: Object.fromEntries(players.map((_, i) => [i, 0])),
      rounds: seqRondes(players.length),
      roundIdx: 0,
      startIdx: Math.floor(Math.random() * players.length),
      rules: room.rules || {},
    });
    setGame(initial);
    setMySeat(0); // l'amfitrió (seient 0) sempre queda primer un cop compactats els seients
    iniciaPartida(roomCode, initial, seatAssignment);
  };

  // Escolta contínua de la sala: mostra qui s'ha unit a la sala d'espera,
  // rep l'estat quan l'amfitrió engega la partida (convidats), i aplica
  // les jugades pendents dels convidats (només l'amfitrió).
  useEffect(() => {
    if (!roomCode) return;
    const unsub = escoltaSala(roomCode, (data) => {
      if (!data) return;
      setRoom(data);
      if (!isHost && data.started && data.state) {
        const seat = data.seatAssignment?.[myUid];
        if (seat != null) setMySeat(seat);
        // Firebase no desa objectes/arrays buits: si eren {} o [] en escriure'ls,
        // aquí arriben com a undefined. Els reomplim amb el buit esperat.
        const st = data.state;
        setGame({
          ...st,
          bids: st.bids || {},
          taken: st.taken || {},
          trick: st.trick || [],
          buits: st.buits || {},
          cartesJugades: st.cartesJugades || [],
        });
      }
      if (isHost && data.pendingAction) {
        setGame(g => {
          if (!g) return g;
          const a = data.pendingAction;
          if (a.type === 'bid' && g.phase === PHASE.BID && g.curBidder === a.seat) return doBid(g, a.bid);
          if (a.type === 'play' && g.phase === PHASE.PLAY && g.curPlayer === a.seat) return doPlay(g, a.carta);
          if (a.type === 'nextRound' && g.phase === PHASE.ROUND_END) {
            return setupRound({ ...g, roundIdx: g.roundIdx + 1, startIdx: (g.startIdx + 1) % g.players.length });
          }
          return g;
        });
        netejaAccio(roomCode);
      }
    });
    return unsub;
  }, [roomCode, isHost, myUid]);

  // Només l'amfitrió publica l'estat a Firebase (font de veritat única).
  useEffect(() => {
    if (!online || !isHost || !roomCode || !game) return;
    publicaEstat(roomCode, game);
  }, [game, online, isHost, roomCode]);

  // ── Temporitzador de torn (només en línia) ──────────────────────────────
  // Si un jugador humà no reacciona en 30s (es penja, es desconnecta, o
  // simplement no decideix), l'amfitrió juga per ell A L'ATZAR (no amb la IA
  // heurística) perquè mai surti a compte deixar que "algú més llest" tiri per tu.
  const TURN_TIMEOUT_MS = 30000;
  const turnDeadlineRef = useRef(null);

  useEffect(() => {
    if (!online || !isHost || !game) { turnDeadlineRef.current = null; return; }
    const { phase, curBidder, curPlayer, players } = game;
    const esperantHuma =
      (phase === PHASE.BID && players[curBidder]?.isHuman) ||
      (phase === PHASE.PLAY && players[curPlayer]?.isHuman);
    turnDeadlineRef.current = esperantHuma ? Date.now() + TURN_TIMEOUT_MS : null;
  }, [online, isHost, game?.phase, game?.curBidder, game?.curPlayer]);

  useEffect(() => {
    if (!online || !isHost) return;
    const id = setInterval(() => {
      if (!turnDeadlineRef.current || Date.now() < turnDeadlineRef.current) return;
      turnDeadlineRef.current = null;
      setGame(g => {
        if (!g) return g;
        const { phase, curBidder, curPlayer, players } = g;
        if (phase === PHASE.BID && players[curBidder]?.isHuman) {
          const { rounds, roundIdx, bids: curBids, rules: r = {} } = g;
          const nC = rounds[roundIdx];
          const bidOrder = Array.from({ length: g.players.length }, (_, i) => (g.startIdx + i) % g.players.length);
          const isLast = bidOrder[bidOrder.length - 1] === g.curBidder;
          const sumJa = Object.values(curBids).reduce((a, b) => a + b, 0);
          const prohibit = r.prohibitQuadrar && isLast ? (nC - sumJa) : -1;
          let bid = Math.floor(Math.random() * (nC + 1));
          if (bid === prohibit) bid = prohibit > 0 ? prohibit - 1 : prohibit + 1;
          bid = Math.max(0, Math.min(bid, nC));
          return doBid(g, bid);
        }
        if (phase === PHASE.PLAY && players[curPlayer]?.isHuman) {
          const { curPlayer: pi, hands: h, trump: t, trick: tr } = g;
          const palObert = tr.length ? tr[0].carta.pal : null;
          const millor = millorATaula(tr, t);
          const llegals = jugadesLegals(h[pi], palObert, millor, t);
          const carta = llegals[Math.floor(Math.random() * llegals.length)];
          return doPlay(g, carta);
        }
        return g;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [online, isHost]);

  useEffect(() => {
    if (!game || busy) return;
    if (online && !isHost) return; // els convidats no executen el motor, només en reben l'estat
    const { phase, curBidder, curPlayer, players } = game;

    // Tutorial: detect pause triggers
    // (skip humanBid/humanPlay here: those are already paused atomically the moment
    // a bot's move hands the turn to the human — re-checking the same condition here,
    // right after the user's own tap dismisses the bubble, would instantly re-pause
    // and the forced bid/card would never become tappable.
    // skip trickEnd too: that one is handled by the PHASE.TRICK_END block below, which
    // adds a short delay so the resolved trick is visible before the tooltip covers it —
    // catching it here first would pause instantly and skip that delay.)
    if (game.isTutorial && !game.tutPaused) {
      const tr = T_TRIGGERS[game.tutStep];
      const isHumanActionTrigger = tr?.w === 'humanBid' || tr?.w === 'humanPlay' || tr?.w === 'trickEnd';
      if (!isHumanActionTrigger) {
        const hIdx = players.findIndex(p => p.isHuman);
        if (checkTutTrig(game, hIdx)) {
          setGame(g => ({...g, tutPaused: true}));
          return;
        }
      }
    }
    if (game.isTutorial && game.tutPaused) return;

    if (phase === PHASE.BID && !players[curBidder].isHuman) {
      setBusy(true);
      const isISMCTS = players[curBidder].botType === 'ismcts';
      setTimeout(() => {
        setGame(g => {
          if (!g) return g;
          if (g.isTutorial) {
            const bid = T_HANDS_DATA[g.roundIdx]?.bids?.[g.curBidder] ?? 0;
            const newG = doBid(g, bid);
            const hIdx = g.players.findIndex(p => p.isHuman);
            if (checkTutTrig({...newG, tutPaused:false}, hIdx)) return {...newG, tutPaused:true};
            return newG;
          }
          const { rounds, roundIdx, bids: curBids, rules: r = {} } = g;
          const nC = rounds[roundIdx];
          const bidOrder = Array.from({length: g.players.length}, (_, i) => (g.startIdx + i) % g.players.length);
          const isLast = bidOrder[bidOrder.length - 1] === g.curBidder;
          const sumJa = Object.values(curBids).reduce((a, b) => a + b, 0);
          const prohibit = r.prohibitQuadrar && isLast ? (nC - sumJa) : -1;
          let bid = isISMCTS
            ? mcBidJS(g, g.curBidder, 120)
            : hCant(g.hands[g.curBidder], g.trump, nC);
          if (bid === prohibit) bid = prohibit > 0 ? prohibit - 1 : prohibit + 1;
          bid = Math.max(0, Math.min(bid, nC));
          return doBid(g, bid);
        });
        setBusy(false);
      }, game.isTutorial ? 1400 : isISMCTS ? 600 : 380);
    }

    if (phase === PHASE.PLAY && !players[curPlayer].isHuman) {
      setBusy(true);
      const isISMCTS = players[curPlayer].botType === 'ismcts';
      setTimeout(() => {
        setGame(g => {
          if (!g) return g;
          const { curPlayer: pi, hands: h, trump: t, trick: tr, bids: b, taken: tk } = g;
          if (g.isTutorial) {
            const done = Object.values(tk).reduce((a,b)=>a+b,0);
            const key  = `${g.roundIdx}-${done}-${pi}`;
            const pd   = T_BOT_PLAYS[key];
            if (!pd) return g;
            const carta = h[pi].find(c => c.pal===pd.pal && c.valor===pd.valor);
            if (!carta) return g;
            const newG = doPlay(g, carta);
            const hIdx = g.players.findIndex(p => p.isHuman);
            if (checkTutTrig({...newG, tutPaused:false}, hIdx)) {
              // Don't cover the table with the tooltip the instant the bot's card lands —
              // give the player a beat to actually see what was just played.
              setTimeout(() => setGame(g2 => (g2 ? {...g2, tutPaused:true} : g2)), 1100);
              return newG;
            }
            return newG;
          }
          const palObert = tr.length ? tr[0].carta.pal : null;
          const millor = millorATaula(tr, t);
          const llegals = jugadesLegals(h[pi], palObert, millor, t);
          const carta = isISMCTS
            ? ismctsPlayJS(g, pi, llegals, 200)
            : hJuga(h[pi], tr, t, b[pi], tk[pi], llegals);
          return doPlay(g, carta);
        });
        setBusy(false);
      }, game.isTutorial ? 1400 : isISMCTS ? 700 : 560);
    }

    if (phase === PHASE.TRICK_END) {
      if (game.isTutorial) {
        const hIdx = players.findIndex(p => p.isHuman);
        if (checkTutTrig(game, hIdx)) {
          setBusy(true);
          setTimeout(() => {
            setGame(g => (g ? {...g, tutPaused: true} : g));
            setBusy(false);
          }, 1100);
          return;
        }
      }
      setBusy(true);
      setTimeout(() => {
        setGame(g => {
          if (!g) return g;
          const newG = advanceTrick(g);
          if (g.isTutorial) {
            const hIdx = g.players.findIndex(p => p.isHuman);
            if (checkTutTrig({...newG, tutPaused:false}, hIdx)) return {...newG, tutPaused:true};
          }
          return newG;
        });
        setBusy(false);
      }, game.isTutorial ? 700 : 2400);
    }
  }, [game?.phase, game?.curBidder, game?.curPlayer, game?.trickWinner, game?.tutPaused, game?.tutStep, busy]);

  const handleStart = (n, botType, rules = {}) => {
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
      rules,
    }));
  };

  const handleTutorialStart = () => {
    const players = [
      { name: "Bot1", isHuman: false, botType: null },
      { name: "Tu",   isHuman: true,  botType: null },
      { name: "Bot2", isHuman: false, botType: null },
    ];
    setGame(setupTutRound({
      players, scores:{0:0,1:0,2:0},
      rounds: T_ROUNDS, isTutorial: true,
      tutStep: 0, tutPaused: true, rules: {},
    }, 0));
  };

  let screen;
  if (!game) {
    if (view === 'menu') screen = <MenuScreen onPlay={() => setView('configure')} onTutorial={handleTutorialStart} onMultiplayer={() => setView('mp-menu')} />;
    else if (view === 'mp-menu') screen = <MultiplayerMenuScreen onCreate={() => setView('mp-create')} onJoin={() => setView('mp-join')} onBack={() => setView('menu')} />;
    else if (view === 'mp-create') screen = <CreateRoomScreen onCreate={handleCreateRoom} onBack={() => setView('mp-menu')} busy={mpBusy} error={mpError} />;
    else if (view === 'mp-join') screen = <JoinRoomScreen onJoinCode={handleJoinRoom} onJoinPublic={handleJoinPublic} onBack={() => setView('mp-menu')} busy={mpBusy} error={mpError} />;
    else if (view === 'mp-lobby') screen = <LobbyScreen code={roomCode} room={room} isHost={isHost} mySlot={mySlot} onSetSlot={handleSetSlot} onStart={handleStartOnline} onBack={resetAll} busy={mpBusy} />;
    else screen = <SetupScreen onStart={handleStart} onBack={() => setView('menu')} />;
  } else {
    const onlineHandlers = online ? {
      mySeat,
      online: true,
      onBid: (bid) => isHost
        ? setGame(g => doBid(g, bid))
        : enviaAccio(roomCode, { type: 'bid', seat: mySeat, bid }),
      onPlay: (carta) => isHost
        ? setGame(g => doPlay(g, carta))
        : enviaAccio(roomCode, { type: 'play', seat: mySeat, carta }),
      onNextRound: () => isHost
        ? setGame(g => setupRound({ ...g, roundIdx: g.roundIdx + 1, startIdx: (g.startIdx + 1) % g.players.length }))
        : enviaAccio(roomCode, { type: 'nextRound', seat: mySeat }),
    } : {};
    screen = <GameScreen game={game} setGame={setGame} onRestart={resetAll} {...onlineHandlers} />;
  }

  return <>{screen}<Analytics /></>;
}
