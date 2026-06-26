"""
Codificació de l'estat del joc com a vector numèric (observació per a la xarxa RL).

Disseny del vector — sempre des del punt de vista del jugador actual (POV):

  Bloc  Dims        Contingut
  ────  ────────    ─────────────────────────────────────────────────────────
  A      40         Mà pròpia: 1 si tinc la carta, 0 si no
  B      40         Cartes jugades en rondes anteriors (memòria)
  C      40         Cartes a la taula en la mà actual
  D       4         Pal obert (one-hot; tot 0 si soc el primer a jugar)
  E       4         Trumfo (one-hot)
  F       2         Progrés: [round_progress 0→1, n_cartes/8]
  G       3         Fase: [és_pujada, és_plat, és_baixada] (one-hot)
  H       3         Info pròpia: [cantada/nC, fetes/nC, restants/nC]
  I    7×(N-1)      Per cada oponent en ordre relatiu de joc:
                    [cantada/nC, fetes/nC, mida_mà/nC,
                     buit_Ors, buit_Copes, buit_Espases, buit_Bastos]
  J       N         Scores ponderats per progrés²:
                    [score_propi/NORM, (score_opo_k - score_propi)/NORM × progrés²]
  ────  ────────
  Total  N=3: 153   N=4: 161   N=5: 169

Notes de disseny:
  · Vector simètric: sempre representem des del POV, oponents en ordre relatiu.
    La mateixa xarxa serveix per a tots els jugadors (self-play).
  · Scores ponderats per progrés²: al principi valen gairebé 0, al final tenen
    pes total. NORM = 200 (aproximadament el rang esperat de puntuació).
  · Totes les entrades estan en rang [−1, 1] aproximadament, ready per a la xarxa.
"""

import numpy as np
from typing import Dict, List, Optional

from carta import PALS, ORDRE_FORÇA

# ── Indexació canònica de cartes ──────────────────────────────────────────────
# 40 posicions: pal_idx * 10 + valor_idx
_PAL_IDX   = {p: i for i, p in enumerate(PALS)}
_VALOR_IDX = {v: i for i, v in enumerate(ORDRE_FORÇA)}

def idx_carta(carta) -> int:
    return _PAL_IDX[carta.pal] * 10 + _VALOR_IDX[carta.valor]

# ── Normalització ─────────────────────────────────────────────────────────────
NORM_SCORE = 200.0   # divisor per a les puntuacions


def dimensio_vector(n_jugadors: int) -> int:
    """Nombre de dimensions del vector d'observació per a N jugadors."""
    return 40 + 40 + 40 + 4 + 4 + 2 + 3 + 3 + 7 * (n_jugadors - 1) + n_jugadors


def _fase(round_idx: int, total_rounds: int, n_cartes: int) -> np.ndarray:
    """One-hot de la fase (pujada/plat/baixada)."""
    f = np.zeros(3, dtype=np.float32)
    if n_cartes < 8:
        f[0 if round_idx < 7 else 2] = 1.0  # pujada o baixada
    else:
        f[1] = 1.0  # plat
    return f


def construeix_vector(info: dict, nom_pov: str) -> np.ndarray:
    """
    Construeix el vector d'observació des del punt de vista de `nom_pov`.

    `info` és el diccionari que passa el motor a `jugar()`, enriquit amb
    els camps addicionals: cantades_tots, mans_guanyades_tots, cartes_jugades,
    mides_ma, ordre_actual, noms_jugadors, buits, round_idx, total_rounds, scores.
    """
    n_cartes      = info["n_cartes"]
    trumf         = info["trumf"]
    taula         = info["taula"]         # [(nom, carta), ...]
    round_idx     = info["round_idx"]
    total_rounds  = info["total_rounds"]
    noms          = info["noms_jugadors"] # ordre de joc de la ronda
    ordre_actual  = info["ordre_actual"]  # ordre de joc en la mà actual
    cantades_tots = info["cantades_tots"]
    fetes_tots    = info["mans_guanyades_tots"]
    buits         = info["buits"]         # {nom: set de pals}
    scores        = info["scores"]        # {nom: int}

    n = len(noms)
    progress = round_idx / max(total_rounds - 1, 1)  # 0.0 → 1.0

    # ── Bloc A: mà pròpia ─────────────────────────────────────────────────
    bloc_A = np.zeros(40, dtype=np.float32)
    for c in info["ma"]:
        bloc_A[idx_carta(c)] = 1.0

    # ── Bloc B: cartes jugades en rondes anteriors ────────────────────────
    bloc_B = np.zeros(40, dtype=np.float32)
    for c in info.get("cartes_jugades", []):
        bloc_B[idx_carta(c)] = 1.0

    # ── Bloc C: cartes a la taula actual ─────────────────────────────────
    bloc_C = np.zeros(40, dtype=np.float32)
    for _, c in taula:
        bloc_C[idx_carta(c)] = 1.0

    # ── Bloc D: pal obert ─────────────────────────────────────────────────
    bloc_D = np.zeros(4, dtype=np.float32)
    if taula:
        bloc_D[_PAL_IDX[taula[0][1].pal]] = 1.0

    # ── Bloc E: trumfo ────────────────────────────────────────────────────
    bloc_E = np.zeros(4, dtype=np.float32)
    bloc_E[_PAL_IDX[trumf]] = 1.0

    # ── Bloc F: progrés i mida de la ronda ───────────────────────────────
    bloc_F = np.array([progress, n_cartes / 8.0], dtype=np.float32)

    # ── Bloc G: fase ─────────────────────────────────────────────────────
    bloc_G = _fase(round_idx, total_rounds, n_cartes)

    # ── Bloc H: info pròpia ───────────────────────────────────────────────
    cantada_pov = cantades_tots.get(nom_pov, 0)
    fetes_pov   = fetes_tots.get(nom_pov, 0)
    restants    = info.get("mans_restants", 0)
    nC_f        = float(n_cartes) if n_cartes > 0 else 1.0
    bloc_H = np.array([
        cantada_pov / nC_f,
        fetes_pov   / nC_f,
        restants    / nC_f,
    ], dtype=np.float32)

    # ── Bloc I: info oponents (en ordre relatiu de joc) ───────────────────
    # Oponents = jugadors que no son el POV, en ordre de torn relatiu
    idx_pov = ordre_actual.index(nom_pov) if nom_pov in ordre_actual else 0
    oponents_ordenats = [
        ordre_actual[(idx_pov + k) % n]
        for k in range(1, n)
    ]

    bloc_I_parts = []
    for nom_op in oponents_ordenats:
        cantada_op = cantades_tots.get(nom_op, 0)
        fetes_op   = fetes_tots.get(nom_op, 0)
        mida_op    = info.get("mides_ma", {}).get(nom_op, 0)
        buits_op   = buits.get(nom_op, set())
        buit_vec   = np.array([1.0 if p in buits_op else 0.0 for p in PALS], dtype=np.float32)
        bloc_I_parts.append(np.array([
            cantada_op / nC_f,
            fetes_op   / nC_f,
            mida_op    / nC_f,
        ], dtype=np.float32))
        bloc_I_parts.append(buit_vec)

    bloc_I = np.concatenate(bloc_I_parts) if bloc_I_parts else np.zeros(7 * (n - 1), dtype=np.float32)

    # ── Bloc J: scores ponderats per progrés² ────────────────────────────
    # Score propi normalitzat; scores relatius dels oponents, tot × progrés²
    pes = progress ** 2
    score_pov = scores.get(nom_pov, 0) / NORM_SCORE
    bloc_J_parts = [score_pov * pes]
    for nom_op in oponents_ordenats:
        diff = (scores.get(nom_op, 0) - scores.get(nom_pov, 0)) / NORM_SCORE
        bloc_J_parts.append(diff * pes)
    bloc_J = np.array(bloc_J_parts, dtype=np.float32)

    # ── Concatenació final ────────────────────────────────────────────────
    return np.concatenate([
        bloc_A, bloc_B, bloc_C,
        bloc_D, bloc_E,
        bloc_F, bloc_G, bloc_H,
        bloc_I, bloc_J,
    ])
