"""Construcció de la baralla de 8N cartes, segons el nombre de jugadors."""

import random

from carta import Carta, PALS, ORDRE_FORÇA


def construeix_baralla(n_jugadors):
    """Retorna les 8*n_jugadors cartes que s'usen aquesta partida.

    Es comença de les 40 cartes (4 pals x 10 valors) i, si n_jugadors < 5,
    es van traient pals... valors complets, començant pels més febles,
    de dos en dos, fins arribar a 8*n_jugadors cartes.
    """
    if not (3 <= n_jugadors <= 5):
        raise ValueError("La Podrida es juga amb 3, 4 o 5 jugadors")

    n_valors_a_treure = (5 - n_jugadors) * 2
    valors_exclosos = set(ORDRE_FORÇA[-n_valors_a_treure:]) if n_valors_a_treure else set()
    valors_usats = [v for v in ORDRE_FORÇA if v not in valors_exclosos]

    baralla = [Carta(pal, valor) for pal in PALS for valor in valors_usats]
    assert len(baralla) == 8 * n_jugadors
    return baralla


def barreja(baralla):
    """Retorna una còpia barrejada de la baralla (no modifica l'original)."""
    copia = list(baralla)
    random.shuffle(copia)
    return copia
