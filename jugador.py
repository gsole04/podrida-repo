"""Interfície de jugador i implementacions bàsiques."""

import random


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
