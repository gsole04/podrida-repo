import { useState, useEffect } from "react";

// â•â• Constants â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const PALS = ["Ors", "Copes", "Espases", "Bastos"];
const ORDRE_FORCA = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2];
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

// â•â• Tutorial Data â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

// â•â• Game Logic â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const forcaCarta = c => ORDRE_FORCA.length - ORDRE_FORCA.indexOf(c.valor);
const cardKey = c => `${c.pal}-${c.valor}`;
const cardsEq = (a, b) => a && b && a.pal === b.pal && a.valor === b.valor;
const removeCard = (hand, carta) => hand.filter(c => !cardsEq(c, carta));

const construeixBaralla = n => {
  const nTreure = (5 - n) * 2;
  const excl = nTreure > 0 ? new Set(ORDRE_FORCA.slice(-nTreure)) : new Set();
  const vals = ORDRE_FORCA.filter(v => !excl.has(v));
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
  return forcaCarta(c) > forcaCarta(millor);
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

// â•â• AI Heuristic â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const mesForta = cs => cs.reduce((a, b) => forcaCarta(a) >= forcaCarta(b) ? a : b);
const mesFeble = cs => cs.reduce((a, b) => forcaCarta(a) <= forcaCarta(b) ? a : b);

const millorATaula = (trick, trumf) => {
  let m = null;
  for (const { carta } of trick) if (supera(carta, m, trumf)) m = carta;
  return m;
};

const hCant = (ma, trumf, maxN) => {
  const llindar = ORDRE_FORCA.length / 2;
  let e = 0;
  for (const c of ma) {
    if (c.pal === trumf) e += forcaCarta(c) > llindar ? 1 : 0.3;
    else if (c.valor === 1) e += 0.9;
    else if (c.valor === 3) e += 0.6;
    else if (c.valor === 12) e += 0.3;
  }
  return Math.min(Math.max(0, Math.round(e)), maxN);
};

const hJuga = (ma, trick, trumf, cantada, fetes, llegals) => {
  const necessito = cantada - fetes;
  const millor = millorATaula(trick, trumf);
  if (!trick.length) return necessito > 0 ? mesForta(llegals) : mesFeble(llegals);
  const guanyen = llegals.filter(c => supera(c, millor, trumf));
  const mÃ­nG = guanyen.length ? mesFeble(guanyen) : null;
  return necessito > 0 ? (mÃ­nG || mesFeble(llegals)) : mesFeble(llegals);
};

// â•â• ISMCTS (JS) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
  if (!taula.length) return necessito > 0 ? mÃ©sForta(llegals) : mÃ©sFeble(llegals);
  const guanyen = llegals.filter(c => supera(c, millor, trump));
  const minG = guanyen.length ? mÃ©sFeble(guanyen) : null;
  return necessito > 0 ? (minG || mÃ©sFeble(llegals)) : mÃ©sFeble(llegals);
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


// â•â• InferÃ¨ncia RL (MLP en JavaScript pur) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Els pesos es carreguen des de pesos_rl.json exportat amb agents/exporta_pesos.py

function matVecMul(W, b, x) {
  // W: [out, in], b: [out], x: [in] â†’ [out]
  return W.map((row, i) => row.reduce((s, w, j) => s + w * x[j], 0) + b[i]);
}

function rlInfereix(obs, pesos, mask) {
  // Forward pass: 161 â†’ 256 â†’ 256 â†’ 128 â†’ 40 (Tanh entre capes)
  let h = matVecMul(pesos.l1_w, pesos.l1_b, obs).map(Math.tanh);
  h     = matVecMul(pesos.l2_w, pesos.l2_b, h).map(Math.tanh);
  h     = matVecMul(pesos.l3_w, pesos.l3_b, h).map(Math.tanh);
  const logits = matVecMul(pesos.out_w, pesos.out_b, h);
  // Apliquem la mÃ scara i triem el millor
  let best = -1, bestVal = -Infinity;
  logits.forEach((v, i) => {
    if (mask[i] && v > bestVal) { bestVal = v; best = i; }
  });
  return best;
}

// Estat global dels pesos RL (null fins que l'usuari els carrega)
let RL_PESOS = null;


// ObservaciÃ³ simplificada per al bot RL al React
// (equivalent a agents/observacio.py perÃ² en JS)
const ORDRE_FORCA_RL = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2];
const PALS_RL = ["Ors", "Copes", "Espases", "Bastos"];

function forcaIdx(carta) {
  return PALS_RL.indexOf(carta.pal) * 10 + ORDRE_FORCA_RL.indexOf(carta.valor);
}

function construeixObsRL(state, pi) {
  const { hands, trump, trick, bids, taken, rounds, roundIdx, scores,
          trickLeader, players, cartesJugades = [], buits = {} } = stat
