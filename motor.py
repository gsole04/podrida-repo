"""Motor de la Podrida: orquestra rondes, mans, cantades i puntuació."""

from baralla import construeix_baralla, barreja
from normes import jugades_legals, supera


def seqüencia_rondes(n_jugadors):
    """[1,2,...,7] + [8]*N + [7,6,...,1] -> total 14 + N rondes."""
    pujada = list(range(1, 8))
    plat = [8] * n_jugadors
    baixada = list(range(7, 0, -1))
    return pujada + plat + baixada


class Partida:
    def __init__(self, jugadors):
        n = len(jugadors)
        if not (3 <= n <= 5):
            raise ValueError("La Podrida es juga amb 3, 4 o 5 jugadors")
        self.jugadors = jugadors
        self.n = n
        self.puntuacions = {j.nom: 0 for j in jugadors}
        self.rondes = seqüencia_rondes(n)
        self._index_inicial = 0

    def jugar_partida(self, verbose=True):
        for num_ronda, n_cartes in enumerate(self.rondes, start=1):
            if verbose:
                print(f"\n===== Ronda {num_ronda}/{len(self.rondes)} ({n_cartes} carta/es) =====")
            self._jugar_ronda(n_cartes, num_ronda - 1, verbose)
            self._index_inicial = (self._index_inicial + 1) % self.n
        return self.puntuacions

    def _jugar_ronda(self, n_cartes, round_idx, verbose):
        baralla = barreja(construeix_baralla(self.n))
        ordre = self.jugadors[self._index_inicial:] + self.jugadors[:self._index_inicial]
        ordre_repartiment = ordre[1:] + ordre[:1]
        mans = {}
        for i, j in enumerate(ordre_repartiment):
            mans[j.nom] = baralla[i * n_cartes: (i + 1) * n_cartes]

        carta_trumf = baralla[-1]
        trumf = carta_trumf.pal
        if verbose:
            if n_cartes == 8:
                print(f"Trumfo: {trumf}  (carta pública de {ordre[0].nom}: {carta_trumf})")
            else:
                print(f"Trumfo: {trumf}  (carta visible: {carta_trumf})")

        # --- Fase de parlar ---
        cantades = {}
        noms_ordre = [j.nom for j in ordre]
        for j in ordre:
            info = {
                "n_cartes":       n_cartes,
                "ma":             list(mans[j.nom]),
                "trumf":          trumf,
                "cantades_fetes": dict(cantades),
                "noms_jugadors":  noms_ordre,
            }
            cantades[j.nom] = j.cantar(info)
            if verbose:
                print(f"  {j.nom} canta {cantades[j.nom]}")

        # --- Estat de ronda compartit entre mans ---
        mans_guanyades = {j.nom: 0 for j in self.jugadors}
        cartes_jugades = []          # totes les cartes jugades en rondes anteriors
        buits = {j.nom: set() for j in self.jugadors}  # {nom: {pals buits coneguts}}
        noms_ordre = [j.nom for j in ordre]

        ordre_actual = ordre
        for num_ma in range(n_cartes):
            taula = []
            pal_obert = None
            millor_carta = None
            millor_jugador = None

            for j in ordre_actual:
                llegals = jugades_legals(mans[j.nom], pal_obert, millor_carta, trumf)
                info = {
                    # Camps bàsics (compatibles amb HeuristicPlayer)
                    "n_cartes":        n_cartes,
                    "ma":              list(mans[j.nom]),
                    "trumf":           trumf,
                    "taula":           list(taula),
                    "cantada":         cantades[j.nom],
                    "mans_guanyades":  mans_guanyades[j.nom],
                    "mans_restants":   n_cartes - num_ma,
                    # Camps addicionals per a agents avançats (ISMCTS, RL)
                    "cantades_tots":        dict(cantades),
                    "mans_guanyades_tots":  dict(mans_guanyades),
                    "cartes_jugades":       list(cartes_jugades),
                    "mides_ma":             {j2.nom: len(mans[j2.nom]) for j2 in self.jugadors},
                    "ordre_actual":         [j2.nom for j2 in ordre_actual],
                    "noms_jugadors":        noms_ordre,
                    "buits":                {nom: set(s) for nom, s in buits.items()},
                    "round_idx":            round_idx,
                    "total_rounds":         len(self.rondes),
                    "scores":               dict(self.puntuacions),
                }
                carta = j.jugar(info, llegals)
                if carta not in mans[j.nom]:
                    raise ValueError(f"{j.nom} ha jugat una carta que no té: {carta}")
                mans[j.nom].remove(carta)
                taula.append((j.nom, carta))

                # Actualitzar buits: si no segueix el pal obert, és buit en aquell pal
                if pal_obert and carta.pal != pal_obert:
                    buits[j.nom].add(pal_obert)

                if pal_obert is None:
                    pal_obert = carta.pal
                if supera(carta, millor_carta, trumf):
                    millor_carta = carta
                    millor_jugador = j

            mans_guanyades[millor_jugador.nom] += 1
            cartes_jugades.extend(c for _, c in taula)

            if verbose:
                print(f"  Mà: {taula} -> guanya {millor_jugador.nom}")

            idx = ordre_actual.index(millor_jugador)
            ordre_actual = ordre_actual[idx:] + ordre_actual[:idx]

        # --- Puntuació ---
        for j in self.jugadors:
            cantada = cantades[j.nom]
            fetes = mans_guanyades[j.nom]
            punts = (10 + 3 * fetes) if cantada == fetes else -3 * abs(cantada - fetes)
            self.puntuacions[j.nom] += punts
            if verbose:
                print(f"  {j.nom}: cantava {cantada}, ha fet {fetes} -> {punts:+d} (total {self.puntuacions[j.nom]})")
