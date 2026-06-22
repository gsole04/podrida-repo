"""Motor de la Podrida: orquestra rondes, mans, cantades i puntuació."""

from baralla import construeix_baralla, barreja
from normes import jugades_legals, supera


def seqüencia_rondes(n_jugadors):
    """[1,2,...,7] + [8]*4N + [7,6,...,1] -> total 14 + 4N rondes."""
    pujada = list(range(1, 8))
    plat = [8] * (4 * n_jugadors)
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
            self._jugar_ronda(n_cartes, verbose)
            self._index_inicial = (self._index_inicial + 1) % self.n
        return self.puntuacions

    def _jugar_ronda(self, n_cartes, verbose):
        baralla = barreja(construeix_baralla(self.n))

        # Ordre de joc d'aquesta ronda: comença qui toca (rotació).
        ordre = self.jugadors[self._index_inicial:] + self.jugadors[:self._index_inicial]

        # Repartiment en blocs: qui comença rep el seu bloc EL DARRER, de manera
        # que si es reparteix tota la baralla (n_cartes == 8), la seva última
        # carta és exactament l'última carta de la baralla barrejada.
        ordre_repartiment = ordre[1:] + ordre[:1]
        mans = {}
        for i, j in enumerate(ordre_repartiment):
            mans[j.nom] = baralla[i * n_cartes: (i + 1) * n_cartes]

        carta_trumf = baralla[-1]
        trumf = carta_trumf.pal
        if verbose:
            if n_cartes == 8:
                print(f"Trumf: {trumf}  (carta pública a la mà de {ordre[0].nom}: {carta_trumf})")
            else:
                print(f"Trumf: {trumf}  (carta visible al munt: {carta_trumf})")

        # --- Fase de parlar ---
        cantades = {}
        for j in ordre:
            info = {
                "n_cartes": n_cartes,
                "ma": list(mans[j.nom]),
                "trumf": trumf,
                "cantades_fetes": dict(cantades),
            }
            cantades[j.nom] = j.cantar(info)
            if verbose:
                print(f"  {j.nom} canta {cantades[j.nom]}")

        # --- Fase de joc: n_cartes mans ---
        mans_guanyades = {j.nom: 0 for j in self.jugadors}
        ordre_actual = ordre
        for _ in range(n_cartes):
            taula = []
            pal_obert = None
            millor_carta = None
            millor_jugador = None

            for j in ordre_actual:
                llegals = jugades_legals(mans[j.nom], pal_obert, millor_carta, trumf)
                info = {
                    "n_cartes": n_cartes,
                    "ma": list(mans[j.nom]),
                    "trumf": trumf,
                    "taula": list(taula),
                }
                carta = j.jugar(info, llegals)
                if carta not in mans[j.nom]:
                    raise ValueError(f"{j.nom} ha jugat una carta que no té: {carta}")
                mans[j.nom].remove(carta)
                taula.append((j.nom, carta))

                if pal_obert is None:
                    pal_obert = carta.pal
                if supera(carta, millor_carta, trumf):
                    millor_carta = carta
                    millor_jugador = j

            mans_guanyades[millor_jugador.nom] += 1
            if verbose:
                print(f"  Mà: {taula} -> guanya {millor_jugador.nom}")

            idx = ordre_actual.index(millor_jugador)
            ordre_actual = ordre_actual[idx:] + ordre_actual[:idx]

        # --- Puntuació ---
        for j in self.jugadors:
            cantada = cantades[j.nom]
            fetes = mans_guanyades[j.nom]
            if cantada == fetes:
                punts = 10 + 3 * fetes
            else:
                punts = -3 * abs(cantada - fetes)
            self.puntuacions[j.nom] += punts
            if verbose:
                print(f"  {j.nom}: cantava {cantada}, ha fet {fetes} -> {punts:+d} (total {self.puntuacions[j.nom]})")
