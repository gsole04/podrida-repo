import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, set, get, update, onValue, off } from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { firebaseConfig } from "./firebase";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ── Autenticació anònima (un uid estable per sessió de navegador) ──────────
let authReady = null;
export function ensureAuth() {
  if (!authReady) {
    authReady = new Promise((resolve) => {
      onAuthStateChanged(auth, (u) => { if (u) resolve(u.uid); });
      signInAnonymously(auth).catch((e) => console.error("Auth error:", e));
    });
  }
  return authReady;
}

// ── Codi de sala (4 caràcters, sense 0/O/1/I per evitar confusions) ────────
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generaCodi() {
  let s = "";
  for (let i = 0; i < 4; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

// Firebase no accepta valors "undefined" (llança error). Un JSON round-trip
// els elimina de manera segura sense haver de netejar el `game` a mà.
const netejaJSON = (obj) => JSON.parse(JSON.stringify(obj));

export async function crearSala({ n, botType, rules, nom }) {
  const uid = await ensureAuth();
  let code = generaCodi();
  for (let intent = 0; intent < 5; intent++) {
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) break;
    code = generaCodi();
  }
  await set(ref(db, `rooms/${code}`), {
    hostUid: uid, n, botType, rules: rules || {},
    seats: { 0: { name: nom, uid } },
    started: false,
    createdAt: Date.now(),
  });
  return { code, mySeat: 0, uid };
}

export async function unirSala(code, nom) {
  const uid = await ensureAuth();
  const snap = await get(ref(db, `rooms/${code}`));
  if (!snap.exists()) throw new Error("Sala no trobada");
  const room = snap.val();
  if (room.started) throw new Error("La partida ja ha començat");
  const seats = room.seats || {};
  let seat = -1;
  for (let i = 0; i < room.n; i++) if (!seats[i]) { seat = i; break; }
  if (seat === -1) throw new Error("La sala és plena");
  await set(ref(db, `rooms/${code}/seats/${seat}`), { name: nom, uid });
  return { code, mySeat: seat, uid, n: room.n };
}

// Escolta contínua de tota la sala: seients, si ha començat, i l'estat de joc.
export function escoltaSala(code, cb) {
  const roomRef = ref(db, `rooms/${code}`);
  const listener = onValue(roomRef, (snap) => cb(snap.val()));
  return () => off(roomRef, "value", listener);
}

// Només l'amfitrió: engega la partida amb l'estat inicial ja calculat.
export function iniciaPartida(code, gameState) {
  return update(ref(db, `rooms/${code}`), {
    started: true,
    state: netejaJSON(gameState),
    pendingAction: null,
  });
}

// Només l'amfitrió: publica l'estat després de cada canvi.
export function publicaEstat(code, gameState) {
  return set(ref(db, `rooms/${code}/state`), netejaJSON(gameState));
}

// Qualsevol jugador: envia la seva jugada perquè l'amfitrió l'apliqui.
export function enviaAccio(code, accio) {
  return set(ref(db, `rooms/${code}/pendingAction`), accio);
}

// Només l'amfitrió: neteja l'acció un cop aplicada.
export function netejaAccio(code) {
  return set(ref(db, `rooms/${code}/pendingAction`), null);
}
