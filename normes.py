"""Lògica de la Norma d'Or: seguir > superar, i resolució de qui guanya una mà."""

from carta import força


def supera(candidata, millor_actual, trumf):
    """Retorna True si `candidata` superaria `millor_actual` en aquest moment."""
    if millor_actual is None:
        return True

    candidata_es_trumf = candidata.pal == trumf
    millor_es_trumf = millor_actual.pal == trumf

    if candidata_es_trumf and not millor_es_trumf:
        return True
    if millor_es_trumf and not candidata_es_trumf:
        return False
    if candidata.pal != millor_actual.pal:
        # Cap de les dues és trumf i són de pals diferents: mai supera.
        return False
    return força(candidata) > força(millor_actual)


def jugades_legals(ma, pal_obert, millor_actual, trumf):
    """Calcula quines cartes de `ma` es poden jugar, segons la Norma d'Or.

    - pal_obert: pal amb què es va obrir la mà (None si ets tu qui obre).
    - millor_actual: la carta que guanya de moment (None si ets tu qui obre).
    """
    if pal_obert is None:
        return list(ma)

    del_pal = [c for c in ma if c.pal == pal_obert]
    if del_pal:
        que_superen = [c for c in del_pal if supera(c, millor_actual, trumf)]
        return que_superen if que_superen else del_pal

    # No es pot seguir: cal superar amb trumf si és possible.
    trumfs_que_superen = [c for c in ma if c.pal == trumf and supera(c, millor_actual, trumf)]
    if trumfs_que_superen:
        return trumfs_que_superen

    # No es pot ni seguir ni superar: qualsevol carta és vàlida.
    return list(ma)
