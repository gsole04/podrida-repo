# La Podrida 🃏

Motor de joc i jugadors per a **La Podrida**, joc tradicional català de basses.

## Estructura

```
podrida-repo/
├── carta.py      # Cartes i força relativa (As > 3 > Rei > ...)
├── baralla.py    # Construcció del mazo de 8N cartes
├── normes.py     # Norma d'Or: jugades legals i resolució de mans
├── jugador.py    # Interfície Player + JugadorHumà + JugadorAleatori
├── motor.py      # Motor del joc: rondes, cantades, puntuació
├── cli.py        # Joc interactiu per consola (humà vs bots)
└── tests/
    └── test_motor.py
```

## Com jugar

```bash
python cli.py
```

## Tests

```bash
python tests/test_motor.py
```

## Regles implementades

- **Baralla**: espanyola de 8N cartes (N = 3-5 jugadors)
- **Rondes**: seqüència 1→7, 4N rondes de 8, 7→1 (total 14+4N rondes)
- **Trumf**: última carta de la baralla barrejada; visible al munt (<8 cartes) o pública a la mà de qui comença (ronda de 8)
- **Norma d'Or**: seguir > superar; si no es pot seguir, cal trumf; si no, qualsevol
- **Puntuació**: encertar → +10 +3·mans; errar → -3·|diferència|

## Roadmap

- [ ] Agent heurístic
- [ ] ISMCTS (Information Set Monte Carlo Tree Search)
- [ ] Agent RL per self-play
