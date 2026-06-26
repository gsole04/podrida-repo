"""
ISMCTS (Information Set Monte Carlo Tree Search) per a la Podrida.

Algorisme SO-ISMCTS (Single Observer):
  Per cada simulació:
    1. Determinitza: reparteix les cartes desconegudes aleatòriament respectant
       les mides de mà i els buits coneguts de cada jugador.
    2. Travessa l'arbre (UCB) fins a un node no expandit o fi de ronda.
    3. Simula la resta amb la heurística fins al final de la ronda.
    4. Retropropaga la puntuació obtinguda.
  Tria l'acció amb més visites al node arrel.
"""

import math
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

from carta import Carta, força
from normes import jugades_legals, supera
from jugador import Jugador

# ── Hiperparàmetres ───────────────────────────────────────────────────────────
N_SIMS = 400   # simulacions per decisió  (~50ms per torn en un portàtil modern)
C_UCB  = 0.7   # exploració vs explotació


# ── Node de l'arbre ───────────────────────────────────────────────────────────
class Node:
    __slots__ = ("vis", "avail", "val", "fills")

    def __init__(self):
        self.vis   = 0      # vegades visitat
        self.avail = 0      # vegades disponible (per al denominador UCB)
        self.val   = 0.0    # valor acumulat
        self.fills: Dict[Tuple, "Node"] = {}

    def ucb(self) -> float:
        if self.vis == 0:
            return float("inf")
        return self.val / self.vis + C_UCB * math.sqrt(math.log(self.avail) / self.vis)


def _k(c: Carta) -> Tuple:
    return (c.pal, c.valor)


# ── Estat per a simulació ─────────────────────────────────────────────────────
@dataclass
class EstatSim:
    """Estat complet (determinitzat) per simular la resta de la ronda."""
    mans:      Dict[str, List[Carta]]
    trumf:     str
    cantades:  Dict[str, int]
    fetes:     Dict[str, int]
    ordre:     List[str]        # ordre de torn actual (primer qui obre la mà)
    taula:     List[Tuple]      # [(nom, carta)] ja jugats en la mà actual

    def copia(self) -> "EstatSim":
        return EstatSim(
            mans     = {k: list(v) for k, v in self.mans.items()},
            trumf    = self.trumf,
            cantades = dict(self.cantades),
            fetes    = dict(self.fetes),
            ordre    = list(self.ordre),
            taula    = list(self.taula),
        )

    def punts_pov(self, nom: str) -> float:
        cantada = self.cantades[nom]
        fetes   = self.fetes.get(nom, 0)
        return (10 + 3 * fetes) if cantada == fetes else -3 * abs(cantada - fetes)

    def és_final(self) -> bool:
        return all(len(m) == 0 for m in self.mans.values()) and not self.taula


# ── Determinització ───────────────────────────────────────────────────────────
def _determinitza(info: dict, nom_pov: str) -> EstatSim:
    """Genera un estat consistent amb el que sap el jugador POV."""
    from baralla import construeix_baralla

    noms       = info["noms_jugadors"]
    n          = len(noms)
    ma_pov     = {_k(c) for c in info["ma"]}
    ja_jugades = {_k(c) for c in info["cartes_jugades"]}
    a_taula    = {_k(c) for _, c in info["taula"]}
    buits      = info["buits"]        # {nom: set de pals buits}
    mides      = info["mides_ma"]     # {nom: int}

    # Cartes visibles (conegudes per al POV)
    visibles = ma_pov | ja_jugades | a_taula

    # Baralla completa → desconegudes
    totes = {_k(c): c for c in construeix_baralla(n)}
    desconegudes = [c for k, c in totes.items() if k not in visibles]
    random.shuffle(desconegudes)

    # Repartim cartes als oponents respectant mides i buits
    mans_sim: Dict[str, List[Carta]] = {nom_pov: list(info["ma"])}
    pool = list(desconegudes)

    for nom in noms:
        if nom == nom_pov:
            continue
        mida    = mides.get(nom, 0)
        buits_n = buits.get(nom, set())

        valides   = [c for c in pool if c.pal not in buits_n]
        invalides = [c for c in pool if c.pal in buits_n]

        ma_n = valides[:mida]
        if len(ma_n) < mida:
            ma_n += invalides[:mida - len(ma_n)]

        mans_sim[nom] = ma_n
        ma_n_set = set(id(c) for c in ma_n)
        pool = [c for c in pool if id(c) not in ma_n_set]

    return EstatSim(
        mans     = mans_sim,
        trumf    = info["trumf"],
        cantades = info["cantades_tots"],
        fetes    = dict(info["mans_guanyades_tots"]),
        ordre    = list(info["ordre_actual"]),
        taula    = list(info["taula"]),
    )


# ── Pas heurístic per a la simulació ─────────────────────────────────────────
def _carta_heuristica(estat: EstatSim, nom: str) -> Carta:
    """Tria una carta seguint la heurística: guanya just si cal, descarta la pitjor si no."""
    taula   = estat.taula
    trumf   = estat.trumf
    ma      = estat.mans[nom]
    cantada = estat.cantades[nom]
    fetes   = estat.fetes.get(nom, 0)

    pal_obert = taula[0][1].pal if taula else None
    millor    = None
    for _, c in taula:
        if supera(c, millor, trumf):
            millor = c

    llegals   = jugades_legals(ma, pal_obert, millor, trumf)
    necessito = cantada - fetes

    if not taula:
        return max(llegals, key=força) if necessito > 0 else min(llegals, key=força)

    guanyen = [c for c in llegals if supera(c, millor, trumf)]
    mín_g   = min(guanyen, key=força) if guanyen else None

    return (mín_g or min(llegals, key=força)) if necessito > 0 else min(llegals, key=força)


def _resol_mà(estat: EstatSim):
    """Tanca la mà actual, actualitza fetes i reordena l'ordre per a la propera."""
    millor_c  = None
    guanyador = None
    for nom, c in estat.taula:
        if supera(c, millor_c, estat.trumf):
            millor_c  = c
            guanyador = nom

    estat.fetes[guanyador] = estat.fetes.get(guanyador, 0) + 1
    idx = estat.ordre.index(guanyador)
    estat.ordre = estat.ordre[idx:] + estat.ordre[:idx]
    estat.taula = []


def _simula_fins_final(estat: EstatSim, nom_pov: str) -> float:
    """Simulació heurística fins al final de la ronda; retorna punts del POV."""
    estat = estat.copia()
    n     = len(estat.ordre)

    while True:
        ja = len(estat.taula)

        if ja == n:
            _resol_mà(estat)
            continue

        nom = estat.ordre[ja]
        if not estat.mans.get(nom):
            break

        carta = _carta_heuristica(estat, nom)
        estat.mans[nom].remove(carta)
        estat.taula.append((nom, carta))

    return estat.punts_pov(nom_pov)


# ── Cerca ISMCTS ──────────────────────────────────────────────────────────────
def _avança_fins_torn_pov(estat: EstatSim, nom_pov: str, n: int) -> bool:
    """Simula amb heurística fins que sigui el torn del POV. Retorna False si acaba la ronda."""
    while True:
        ja = len(estat.taula)
        if ja == n:
            _resol_mà(estat)
            if not any(estat.mans.values()):
                return False
            continue
        nom_cur = estat.ordre[ja]
        if nom_cur == nom_pov:
            return True
        if not estat.mans.get(nom_cur):
            return False
        carta = _carta_heuristica(estat, nom_cur)
        estat.mans[nom_cur].remove(carta)
        estat.taula.append((nom_cur, carta))


def ismcts(info: dict, nom_pov: str, llegals: List[Carta], n_sims: int = N_SIMS) -> Carta:
    """Retorna la millor carta per al POV segons SO-ISMCTS."""
    root = Node()
    n    = len(info["noms_jugadors"])

    for _ in range(n_sims):
        estat = _determinitza(info, nom_pov)
        node  = root
        path: List[Tuple[Node, Tuple]] = []

        # ── Fase d'arbre ─────────────────────────────────────────────────────
        is_first = True
        while True:
            # Avança fins al torn del POV (simulant els altres amb heurística)
            if not is_first:
                alive = _avança_fins_torn_pov(estat, nom_pov, n)
                if not alive or not estat.mans.get(nom_pov):
                    break
            is_first = False

            # Moviments legals del POV
            pal_ob = estat.taula[0][1].pal if estat.taula else None
            mt     = None
            for _, c in estat.taula:
                if supera(c, mt, estat.trumf): mt = c
            my_leg = jugades_legals(estat.mans[nom_pov], pal_ob, mt, estat.trumf)

            # A l'arrel, limitem als moviments realment legals en el joc real
            if node is root:
                legal_keys = [_k(c) for c in llegals]
            else:
                legal_keys = [_k(c) for c in my_leg]

            # Actualitzar disponibilitat
            for k in legal_keys:
                if k not in node.fills:
                    node.fills[k] = Node()
                node.fills[k].avail += 1

            # Selecció: prioritzem nodes no visitats
            no_visitats = [k for k in legal_keys if node.fills[k].vis == 0]
            best_k      = random.choice(no_visitats) if no_visitats else max(legal_keys, key=lambda k: node.fills[k].ucb())

            path.append((node, best_k))
            node = node.fills[best_k]

            # Juguem la carta seleccionada
            carta_sel = next((c for c in my_leg if _k(c) == best_k), my_leg[0])
            estat.mans[nom_pov].remove(carta_sel)
            estat.taula.append((nom_pov, carta_sel))

            # Si hem expandit un node nou, passem a simulació
            if no_visitats:
                break

        # ── Simulació heurística fins al final ───────────────────────────────
        punts = _simula_fins_final(estat, nom_pov)

        # ── Retropropagació ───────────────────────────────────────────────────
        for n_node, k in path:
            n_node.fills[k].vis += 1
            n_node.fills[k].val += punts

    # Tria la carta més visitada (criteri robust)
    if not root.fills:
        return random.choice(llegals)
    best_k = max(root.fills, key=lambda k: root.fills[k].vis)
    return next((c for c in llegals if _k(c) == best_k), llegals[0])


# ── Classe jugador ─────────────────────────────────────────────────────────────
class JugadorISMCTS(Jugador):
    """Agent ISMCTS: sense entrenament, busca per simulació d'estats possibles."""

    def __init__(self, nom, n_sims=N_SIMS):
        super().__init__(nom)
        self.n_sims = n_sims

    def cantar(self, info):
        """Cantada per MC: tria el valor que maximitza la puntuació esperada per simulació."""
        return cantar_mc(info, self.nom, n_sims=self.n_sims // 2)

    def jugar(self, info, llegals):
        if len(llegals) == 1:
            return llegals[0]   # no cal buscar si no hi ha alternativa
        return ismcts(info, self.nom, llegals, self.n_sims)


# ── Cantada per Monte Carlo ────────────────────────────────────────────────────
def _simula_ronda_des_de_zero(
    nom_pov: str,
    ma_pov: List[Carta],
    trumf: str,
    cantada_pov: int,
    n_cartes: int,
    noms: List[str],
    cantades_fetes: Dict[str, int],
) -> float:
    """Simula una ronda completa des de l'inici i retorna els punts del POV."""
    from baralla import construeix_baralla
    from jugador import _estimo_mans

    n = len(noms)
    totes = {_k(c): c for c in construeix_baralla(n)}
    pov_keys = {_k(c) for c in ma_pov}

    # Cartes disponibles per repartir als oponents
    pool = [c for k, c in totes.items() if k not in pov_keys]
    random.shuffle(pool)

    mans: Dict[str, List[Carta]] = {nom_pov: list(ma_pov)}
    for nom in noms:
        if nom == nom_pov:
            continue
        mans[nom] = pool[:n_cartes]
        pool = pool[n_cartes:]

    # Cantades: les ja fetes + la nostra + heurística per als que falten
    cantades: Dict[str, int] = dict(cantades_fetes)
    cantades[nom_pov] = cantada_pov
    for nom in noms:
        if nom not in cantades:
            cantades[nom] = min(_estimo_mans(mans[nom], trumf), n_cartes)

    estat = EstatSim(
        mans=mans,
        trumf=trumf,
        cantades=cantades,
        fetes={nom: 0 for nom in noms},
        ordre=list(noms),
        taula=[],
    )
    return _simula_fins_final(estat, nom_pov)


def cantar_mc(info: dict, nom_pov: str, n_sims: int = 200) -> int:
    """Tria la cantada que maximitza la puntuació esperada per simulació MC.

    Per cada valor possible (0..n_cartes) simula la ronda N vegades i
    tria el que dona millor puntuació mitjana. Incorpora:
      - Les cartes a la mà (via simulació)
      - La mida de la ronda (n_cartes)
      - El que han cantat els altres (cantades_fetes)
    """
    n_cartes       = info["n_cartes"]
    ma             = info["ma"]
    trumf          = info["trumf"]
    cantades_fetes = info.get("cantades_fetes", {})
    noms           = info.get("noms_jugadors", [nom_pov])

    n_per_bid = max(8, n_sims // (n_cartes + 1))

    millor_cantada = 0
    millor_score   = float("-inf")

    for cantada in range(n_cartes + 1):
        total = sum(
            _simula_ronda_des_de_zero(
                nom_pov, ma, trumf, cantada, n_cartes, noms, cantades_fetes
            )
            for _ in range(n_per_bid)
        )
        avg = total / n_per_bid
        if avg > millor_score:
            millor_score   = avg
            millor_cantada = cantada

    return millor_cantada
