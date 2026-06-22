"""Tests unitaris per al motor de la Podrida (unittest estàndard)."""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import unittest

from carta import Carta, força
from baralla import construeix_baralla
from normes import supera, jugades_legals
from motor import seqüencia_rondes, Partida
from jugador import JugadorAleatori


class TestCarta(unittest.TestCase):
    def test_repr(self):
        self.assertEqual(repr(Carta("Ors", 1)), "As de Ors")
        self.assertEqual(repr(Carta("Espases", 12)), "Rei de Espases")

    def test_força_ordre(self):
        valors = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2]
        forces = [força(Carta("Ors", v)) for v in valors]
        self.assertEqual(forces, sorted(forces, reverse=True))

    def test_carta_invalida(self):
        with self.assertRaises(ValueError): Carta("Ors", 8)
        with self.assertRaises(ValueError): Carta("Jokers", 1)

    def test_igualtat_i_hash(self):
        c1, c2 = Carta("Copes", 3), Carta("Copes", 3)
        self.assertEqual(c1, c2)
        self.assertEqual(hash(c1), hash(c2))
        self.assertNotEqual(c1, Carta("Ors", 3))


class TestBaralla(unittest.TestCase):
    def test_mida_baralla(self):
        self.assertEqual(len(construeix_baralla(5)), 40)
        self.assertEqual(len(construeix_baralla(4)), 32)
        self.assertEqual(len(construeix_baralla(3)), 24)

    def test_no_duplicats(self):
        for n in (3, 4, 5):
            b = construeix_baralla(n)
            self.assertEqual(len(b), len(set(b)))

    def test_valors_exclosos_n4(self):
        valors = {c.valor for c in construeix_baralla(4)}
        self.assertNotIn(2, valors)
        self.assertNotIn(4, valors)

    def test_valors_exclosos_n3(self):
        valors = {c.valor for c in construeix_baralla(3)}
        for v in (2, 4, 5, 6): self.assertNotIn(v, valors)

    def test_n_invalid(self):
        with self.assertRaises(ValueError): construeix_baralla(2)
        with self.assertRaises(ValueError): construeix_baralla(6)


class TestSupera(unittest.TestCase):
    def test_trumf_supera_qualsevol_pal(self):
        self.assertTrue(supera(Carta("Ors", 2), Carta("Copes", 1), "Ors"))

    def test_trumf_no_superat_per_altre_pal(self):
        self.assertFalse(supera(Carta("Copes", 1), Carta("Ors", 2), "Ors"))

    def test_mateix_pal_força_major(self):
        self.assertTrue(supera(Carta("Copes", 1), Carta("Copes", 12), "Ors"))

    def test_mateix_pal_força_menor(self):
        self.assertFalse(supera(Carta("Copes", 10), Carta("Copes", 3), "Ors"))

    def test_pals_diferents_no_trumf(self):
        self.assertFalse(supera(Carta("Espases", 1), Carta("Copes", 2), "Ors"))

    def test_dos_trumfs(self):
        self.assertTrue(supera(Carta("Ors", 1), Carta("Ors", 3), "Ors"))
        self.assertFalse(supera(Carta("Ors", 3), Carta("Ors", 1), "Ors"))

    def test_sense_millor_actual(self):
        self.assertTrue(supera(Carta("Copes", 2), None, "Ors"))


class TestJugadesLegals(unittest.TestCase):
    def test_obre_la_ma_tot_es_legal(self):
        ma = [Carta("Ors", 1), Carta("Copes", 3)]
        self.assertEqual(set(jugades_legals(ma, None, None, "Espases")), set(ma))

    def test_cal_seguir_pal(self):
        ma = [Carta("Ors", 1), Carta("Copes", 3), Carta("Copes", 12)]
        llegals = jugades_legals(ma, "Copes", Carta("Copes", 7), "Espases")
        self.assertTrue(all(c.pal == "Copes" for c in llegals))

    def test_obligat_a_superar_dins_del_pal(self):
        ma = [Carta("Copes", 2), Carta("Copes", 1)]
        llegals = jugades_legals(ma, "Copes", Carta("Copes", 7), "Espases")
        self.assertEqual(llegals, [Carta("Copes", 1)])

    def test_seguir_sense_poder_superar(self):
        ma = [Carta("Copes", 2), Carta("Ors", 1)]
        llegals = jugades_legals(ma, "Copes", Carta("Copes", 1), "Espases")
        self.assertEqual(llegals, [Carta("Copes", 2)])

    def test_sense_pal_cal_trumf_que_superi(self):
        ma = [Carta("Espases", 1), Carta("Ors", 2)]
        llegals = jugades_legals(ma, "Copes", Carta("Espases", 7), "Espases")
        self.assertEqual(llegals, [Carta("Espases", 1)])

    def test_sense_pal_ni_trumf_qualsevol(self):
        ma = [Carta("Espases", 2), Carta("Ors", 3)]
        llegals = jugades_legals(ma, "Copes", Carta("Copes", 1), "Bastos")
        self.assertEqual(set(llegals), set(ma))

    def test_trumf_superior_al_trumf_jugat(self):
        ma = [Carta("Espases", 2), Carta("Espases", 1), Carta("Ors", 3)]
        llegals = jugades_legals(ma, "Copes", Carta("Espases", 7), "Espases")
        self.assertEqual(llegals, [Carta("Espases", 1)])


class TestSeqüenciaRondes(unittest.TestCase):
    def test_longitud_total(self):
        for n in (3, 4, 5):
            self.assertEqual(len(seqüencia_rondes(n)), 14 + 4 * n)

    def test_estructura(self):
        s = seqüencia_rondes(3)
        self.assertEqual(s[:7], list(range(1, 8)))
        self.assertEqual(s[7:19], [8] * 12)
        self.assertEqual(s[-7:], list(range(7, 0, -1)))

    def test_maxim_es_8(self):
        for n in (3, 4, 5):
            self.assertEqual(max(seqüencia_rondes(n)), 8)


class TestPartidaAleatori(unittest.TestCase):
    def _partida(self, n, seed=42):
        random.seed(seed)
        return Partida([JugadorAleatori(f"J{i}") for i in range(n)])

    def test_partida_completa_3j(self):
        p = self._partida(3)
        punts = p.jugar_partida(verbose=False)
        self.assertEqual(set(punts.keys()), {"J0", "J1", "J2"})

    def test_partida_completa_4j(self):
        p = self._partida(4)
        punts = p.jugar_partida(verbose=False)
        self.assertEqual(set(punts.keys()), {"J0", "J1", "J2", "J3"})

    def test_partida_completa_5j(self):
        p = self._partida(5)
        punts = p.jugar_partida(verbose=False)
        self.assertEqual(set(punts.keys()), {"J0", "J1", "J2", "J3", "J4"})

    def test_puntuacio_es_entera(self):
        p = self._partida(4, seed=7)
        punts = p.jugar_partida(verbose=False)
        self.assertTrue(all(isinstance(v, int) for v in punts.values()))


if __name__ == "__main__":
    unittest.main(verbosity=2)
