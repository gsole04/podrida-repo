import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, set, get, update, remove, onValue, off } from "firebase/database";
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

// Una sala sempre té 5 seients (índexs 0-4). El seient 0 és sempre l'amfitrió.
// Cada seient és { type: 'human', name, uid } | { type: 'bot', botType } | { type: 'closed' } | { type: 'open' }.
export async function crearSala({ nom, public: isPublic, rules }) {
  const uid = await ensureAuth();
  let code = generaCodi();
  for (let intent = 0; intent < 5; intent++) {
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) break;
    code = generaCodi();
  }
  const slots = { 0: { type: "human", name: nom, uid } };
  for (let i = 1; i < 5; i++) slots[i] = { type: "open" };
  await set(ref(db, `rooms/${code}`), {
    hostUid: uid,
    public: !!isPublic,
    rules: rules || {},
    slots,
    started: false,
    createdAt: Date.now(),
  });
  if (isPublic) await set(ref(db, `publicRooms/${code}`), true);
  return { code, mySlot: 0, uid };
}

export async function unirSala(code, nom) {
  const uid = await ensureAuth();
  const snap = await get(ref(db, `rooms/${code}`));
  if (!snap.exists()) throw new Error("Sala no trobada");
  const room = snap.val();
  if (room.started) throw new Error("La partida ja ha començat");
  const slots = room.slots || {};
  let seat = -1;
  for (let i = 0; i < 5; i++) if ((slots[i] || { type: "open" }).type === "open") { seat = i; break; }
  if (seat === -1) throw new Error("La sala és plena");
  await set(ref(db, `rooms/${code}/slots/${seat}`), { type: "human", name: nom, uid });
  return { code, mySlot: seat, uid };
}

// Unir-se a la primera sala pública amb un seient obert (sense codi).
export async function unirSalaPublica(nom) {
  await ensureAuth();
  const snap = await get(ref(db, "publicRooms"));
  const codes = snap.exists() ? Object.keys(snap.val()) : [];
  for (const code of codes) {
    try { return await unirSala(code, nom); } catch (e) { /* prova la següent sala */ }
  }
  throw new Error("No hi ha sales públiques obertes ara mateix");
}

// Escolta contínua de tota la sala: seients, si ha començat, l'estat de joc i les accions pendents.
export function escoltaSala(code, cb) {
  const roomRef = ref(db, `rooms/${code}`);
  const listener = onValue(roomRef, (snap) => cb(snap.val()));
  return () => off(roomRef, "value", listener);
}

// Només l'amfitrió, a la sala d'espera: obre/tanca un seient o hi posa un bot.
export function actualitzaSlot(code, i, slot) {
  return set(ref(db, `rooms/${code}/slots/${i}`), slot);
}

// Només l'amfitrió: engega la partida amb l'estat inicial i el mapa de seients finals.
export async function iniciaPartida(code, gameState, seatAssignment) {
  await update(ref(db, `rooms/${code}`), {
    started: true,
    state: netejaJSON(gameState),
    seatAssignment: seatAssignment || {},
    pendingAction: null,
  });
  await remove(ref(db, `publicRooms/${code}`)).catch(() => {});
}

// Només l'amfitrió: publica l'estat després de cada canvi.
export function publicaEstat(code, gameState) {
  return set(ref(db, `rooms/${code}/state`), netejaJSON(gameState));
}

// Neteja explícita en tornar enrere o acabar: l'amfitrió esborra la sala sencera;
// un convidat només allibera el seu seient.
export function abandonaSala(code, isHost, mySlot) {
  if (!code) return;
  if (isHost) {
    remove(ref(db, `rooms/${code}`)).catch(() => {});
    remove(ref(db, `publicRooms/${code}`)).catch(() => {});
  } else if (mySlot != null) {
    set(ref(db, `rooms/${code}/slots/${mySlot}`), { type: "open" }).catch(() => {});
  }
}

// Qualsevol jugador: envia la seva jugada perquè l'amfitrió l'apliqui.
export function enviaAccio(code, accio) {
  return set(ref(db, `rooms/${code}/pendingAction`), accio);
}

// Només l'amfitrió: neteja l'acció un cop aplicada.
export function netejaAccio(code) {
  return set(ref(db, `rooms/${code}/pendingAction`), null);
}
