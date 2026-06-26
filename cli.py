"""CLI per jugar a la Podrida: un humà contra jugadors aleatoris."""

import os
import random
from jugador import JugadorHuma, JugadorAleatori, JugadorHeurístic
from motor import Partida


# ─── Utilitats de pantalla ───────────────────────────────────────────────────

def netejar():
    os.system("cls" if os.name == "nt" else "clear")


def línia(car="─", n=52):
    print(car * n)


def capçalera(text):
    línia("═")
    print(f"  {text}")
    línia("═")


def pausa(missatge="  [Prem Enter per continuar...]"):
    input(missatge)


# ─── Partida amb CLI millorat ─────────────────────────────────────────────────

class PartidaCLI(Partida):
    """Subclasse de Partida que sobreescriu el bucle de joc per a CLI humà."""

    def _jugar_ronda(self, n_cartes, verbose):
        from baralla import construeix_baralla, barreja
        from normes import jugades_legals, supera

        netejar()
        baralla = barreja(construeix_baralla(self.n))
        ordre = self.jugadors[self._index_inicial:] + self.jugadors[:self._index_inicial]
        ordre_repartiment = ordre[1:] + ordre[:1]

        mans = {}
        for i, j in enumerate(ordre_repartiment):
            mans[j.nom] = baralla[i * n_cartes: (i + 1) * n_cartes]

        carta_trumf = baralla[-1]
        trumf = carta_trumf.pal

        # ── Capçalera de ronda ──
        n_total = len(self.rondes)
        n_actual = self._ronda_actual
        capçalera(f"RONDA {n_actual}/{n_total}  ·  {n_cartes} carta{'es' if n_cartes > 1 else ''} per cap")

        if n_cartes == 8:
            print(f"  Trumf: {trumf}  "
                  f"(carta pública a la mà de {ordre[0].nom}: {carta_trumf})")
        else:
            print(f"  Trumf: {trumf}  (carta visible al munt: {carta_trumf})")

        # ── Puntuacions actuals ──
        print()
        print("  Puntuacions:")
        for j in self.jugadors:
            marca = " ◄ tu" if isinstance(j, JugadorHuma) else ""
            print(f"    {j.nom:<12} {self.puntuacions[j.nom]:>5} pts{marca}")
        línia()

        # ── Fase de parlar ──
        print("\n  FASE DE PARLAR\n")
        cantades = {}
        for j in ordre:
            info = {
                "n_cartes": n_cartes,
                "ma": list(mans[j.nom]),
                "trumf": trumf,
                "cantades_fetes": dict(cantades),
            }
            cantades[j.nom] = j.cantar(info)
            if not isinstance(j, JugadorHuma):
                print(f"  {j.nom} canta {cantades[j.nom]}")

        línia()
        print("\n  Resum de cantades:")
        total = 0
        for j in ordre:
            total += cantades[j.nom]
            print(f"    {j.nom}: {cantades[j.nom]}")
        print(f"    {'─'*20}")
        print(f"    Total cantat: {total}  (hi ha {n_cartes} mans)")
        pausa()

        # ── Fase de joc ──
        mans_guanyades = {j.nom: 0 for j in self.jugadors}
        ordre_actual = ordre

        for num_ma in range(1, n_cartes + 1):
            netejar()
            capçalera(f"RONDA {n_actual}/{n_total}  ·  Mà {num_ma}/{n_cartes}  ·  Trumf: {trumf}")

            print("  Cantades / fetes:")
            for j in self.jugadors:
                print(f"    {j.nom:<12} canta {cantades[j.nom]}  ·  fetes {mans_guanyades[j.nom]}")
            línia()

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

                if isinstance(j, JugadorHuma):
                    # Mostrem la taula fins ara
                    if taula:
                        print("\n  A la taula:")
                        for nom, carta in taula:
                            guanya = "★" if carta == millor_carta else " "
                            print(f"    {guanya} {nom}: {carta}")
                    carta = j.jugar(info, llegals)
                else:
                    carta = j.jugar(info, llegals)
                    print(f"  {j.nom} juga: {carta}")

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

            # Resultat de la mà
            línia()
            print("\n  Resultat de la mà:")
            for nom, carta in taula:
                guanya = "  ★ GUANYA" if nom == millor_jugador.nom else ""
                print(f"    {nom}: {carta}{guanya}")
            pausa()

            idx = ordre_actual.index(millor_jugador)
            ordre_actual = ordre_actual[idx:] + ordre_actual[:idx]

        # ── Puntuació de la ronda ──
        netejar()
        capçalera(f"RONDA {n_actual}/{n_total}  ·  Resultat")
        print()
        for j in self.jugadors:
            cantada = cantades[j.nom]
            fetes = mans_guanyades[j.nom]
            if cantada == fetes:
                punts = 10 + 3 * fetes
                resultat = f"+{punts} ✓"
            else:
                punts = -3 * abs(cantada - fetes)
                resultat = f"{punts} ✗  (cantava {cantada}, ha fet {fetes})"
            self.puntuacions[j.nom] += punts
            print(f"  {j.nom:<12} {resultat:<30}  total: {self.puntuacions[j.nom]}")
        pausa()

    def jugar_partida(self):
        self._ronda_actual = 0
        for n_cartes in self.rondes:
            self._ronda_actual += 1
            self._jugar_ronda(n_cartes, verbose=True)
            self._index_inicial = (self._index_inicial + 1) % self.n

        # ── Resultat final ──
        netejar()
        capçalera("PARTIDA ACABADA  ·  Resultat final")
        print()
        classificació = sorted(self.puntuacions.items(), key=lambda x: -x[1])
        for posició, (nom, punts) in enumerate(classificació, 1):
            print(f"  {posició}. {nom:<12} {punts} pts")
        print()
        return self.puntuacions


# ─── Entrada al programa ─────────────────────────────────────────────────────

def _demana_int(missatge, mínim, màxim):
    while True:
        entrada = input(missatge).strip()
        if entrada.isdigit() and mínim <= int(entrada) <= màxim:
            return int(entrada)
        print(f"  Ha de ser entre {mínim} i {màxim}.")


def _crea_oponent(tipus, índex):
    noms = {
        "1": ("Aleatori", JugadorAleatori),
        "2": ("Heurístic", JugadorHeurístic),
    }
    nom_base, Classe = noms[tipus]
    return Classe(f"{nom_base}-{índex}")


def main():
    netejar()
    capçalera("LA PODRIDA")
    print("""
  Benvingut/da!

  Regles bàsiques:
  · Cada ronda es reparteixen X cartes per cap.
  · Cada jugador canta quantes mans creu que guanyarà.
  · Cal seguir el pal obert i, si es pot, superar (Norma d'Or).
  · Encertar: +10 punts + 3 per mà feta.
  · Errar: -3 punts per cada mà de diferència.
""")
    línia()

    nom = input("  El teu nom: ").strip() or "Tu"

    n_jugadors = _demana_int("  Quants jugadors en total? (3-5): ", 3, 5)

    print("""
  Tipus d'oponents:
    1 · Aleatori   (juga a l'atzar, per aprendre les regles)
    2 · Heurístic  (segueix estratègies bàsiques, més difícil)
""")
    while True:
        tipus = input("  Quin tipus d'oponents vols? (1/2): ").strip()
        if tipus in ("1", "2"):
            break
        print("  Escull 1 o 2.")

    jugadors = [JugadorHuma(nom)]
    for i in range(1, n_jugadors):
        jugadors.append(_crea_oponent(tipus, i))

    random.shuffle(jugadors)
    línia()
    print(f"\n  Ordre de joc: {' → '.join(j.nom for j in jugadors)}")
    pausa("\n  [Prem Enter per començar!]")

    partida = PartidaCLI(jugadors)
    partida.jugar_partida()


if __name__ == "__main__":
    main()
