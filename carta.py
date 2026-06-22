"""Representació de cartes de la baralla espanyola usada a la Podrida."""

PALS = ["Ors", "Copes", "Espases", "Bastos"]

# Ordre de força a la Podrida, de més forta a més feble.
# (No s'usen els valors 8 i 9, com és habitual en aquests jocs.)
ORDRE_FORÇA = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2]

NOMS_VALOR = {
    1: "As", 2: "2", 3: "3", 4: "4", 5: "5",
    6: "6", 7: "7", 10: "Sota", 11: "Cavall", 12: "Rei",
}


class Carta:
    __slots__ = ("pal", "valor")

    def __init__(self, pal, valor):
        if pal not in PALS:
            raise ValueError(f"Pal desconegut: {pal}")
        if valor not in ORDRE_FORÇA:
            raise ValueError(f"Valor desconegut: {valor}")
        self.pal = pal
        self.valor = valor

    def __repr__(self):
        return f"{NOMS_VALOR[self.valor]} de {self.pal}"

    def __eq__(self, other):
        return isinstance(other, Carta) and self.pal == other.pal and self.valor == other.valor

    def __hash__(self):
        return hash((self.pal, self.valor))


def força(carta):
    """Com més alt el resultat, més forta és la carta dins el seu pal."""
    return len(ORDRE_FORÇA) - ORDRE_FORÇA.index(carta.valor)
