"""Interfície de jugador i implementacions bàsiques."""

import random

from carta import força, ORDRE_FORÇA
from normes import supera


class Jugador:
    def __init__(self, nom):
        self.nom = nom

    def cantar(self, info):
        """info: dict amb n_cartes, ma, trumf, cantades_fetes. Retorna un int."""
        raise NotImplementedError

    def jugar(self, info, llegals):
        """info: dict amb n_cartes, ma, trumf, taula. Retorna una Carta de `llegals`."""
        raise NotImplementedError


class JugadorAleatori(Jugador):
    def cantar(self, info):
        return random.randint(0, info["n_cartes"])

    def jugar(self, info, llegals):
        return random.choice(llegals)


class JugadorHuma(Jugador):
    def cantar(self, info):
        print(f"\n— {self.nom}, la teva mà: {info['ma']}")
        print(f"  Trumf: {info['trumf']}")
        if info["cantades_fetes"]:
            print(f"  Cantades fins ara: {info['cantades_fetes']}")
        while True:
            entrada = input(f"  Quantes mans cantes (0-{info['n_cartes']})? ")
            if entrada.isdigit() and 0 <= int(entrada) <= info["n_cartes"]:
                return int(entrada)
            print("  Valor no vàlid, torna-ho a provar.")

    def jugar(self, info, llegals):
        print(f"\n— {self.nom}, taula: {info['taula']}")
        print(f"  La teva mà: {info['ma']}")
        print("  Jugades possibles:")
        for i, c in enumerate(llegals):
            print(f"    {i}: {c}")
        while True:
            entrada = input("  Quina jugues (número)? ")
            if entrada.isdigit() and 0 <= int(entrada) < len(llegals):
                return llegals[int(entrada)]
            print("  Opció no vàlida, torna-ho a provar.")


# ─── Funcions auxiliars per a l'heurístic ────────────────────────────────────

def _més_forta(cartes):
    """Retorna la carta de força màxima d'una llista."""
    return max(cartes, key=força)

def _més_feble(cartes):
    """Retorna la carta de força mínima d'una llista."""
    return min(cartes, key=força)

def _millor_a_taula(taula, trumf):
    """Retorna la carta que guanya de moment a la taula (o None si és buida)."""
    millor = None
    for _, carta in taula:
        if supera(carta, millor, trumf):
            millor = carta
    return millor


def _guanyadores(llegals, millor_taula, trumf):
    """Subconjunt de `llegals` que guanyarien la mà en aquest moment."""
    return [c for c in llegals if supera(c, millor_taula, trumf)]

def _mínima_guanyadora(llegals, millor_taula, trumf):
    """La carta guanyadora de força mínima (guanyar just)."""
    guanyen = _guanyadores(llegals, millor_taula, trumf)
    return _més_feble(guanyen) if guanyen else None

def _estimo_mans(ma, trumf):
    """Estimació de mans que guanyarà un jugador basada en la seva mà inicial."""
    estimació = 0.0

    trumfs = [c for c in ma if c.pal == trumf]
    no_trumfs = [c for c in ma if c.pal != trumf]

    # Cada trumf per sobre de la meitat de la força val una mà potencial
    llindar_trumf = len(ORDRE_FORÇA) // 2
    for c in trumfs:
        if força(c) > llindar_trumf:
            estimació += 1.0
        else:
            estimació += 0.3  # Trumf feble: contribució parcial

    # Asos i tressos d'altres pals
    for c in no_trumfs:
        if c.valor == 1:
            estimació += 0.9
        elif c.valor == 3:
            estimació += 0.6
        elif c.valor == 12:
            estimació += 0.3

    return round(estimació)


class JugadorHeurístic(Jugador):
    """Agent basat en regles. Millor que l'aleatori però sense cerca ni aprenentatge."""

    def cantar(self, info):
        ma = info["ma"]
        trumf = info["trumf"]
        return max(0, min(_estimo_mans(ma, trumf), info["n_cartes"]))

    def jugar(self, info, llegals):
        taula = info["taula"]        # llista de (nom, carta)
        trumf = info["trumf"]
        cantada = info.get("cantada", 0)
        mans_guanyades = info.get("mans_guanyades", 0)
        mans_restants = info.get("mans_restants", 1)

        necessito = cantada - mans_guanyades   # mans que em falten per encertar
        # Si necessito < 0, ja he superat la cantada: vull perdre totes les que queden

        millor_taula = _millor_a_taula(taula, trumf)

        # ── Obro jo la mà (taula buida) ──────────────────────────────────────
        if not taula:
            if necessito > 0:
                return _més_forta(llegals)   # jugo per guanyar
            else:
                return _més_feble(llegals)   # jugo per perdre

        # ── No obro jo (hi ha cartes a la taula) ─────────────────────────────
        mínima_guany = _mínima_guanyadora(llegals, millor_taula, trumf)

        if necessito > 0:
            # Vull guanyar la mà
            if mínima_guany:
                return mínima_guany          # guanyo just, sense malgastar
            else:
                return _més_feble(llegals)   # no puc guanyar: cremq la més feble
        else:
            # No vull guanyar la mà
            if mínima_guany:
                return _més_feble(llegals)   # puc guanyar però no vull: cremo la més feble
            else:
                return _més_feble(llegals)   # no puc guanyar de totes formes: cremo la més feble
