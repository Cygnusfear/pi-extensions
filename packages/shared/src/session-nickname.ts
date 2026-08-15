// ── Name pools ───────────────────────────────────────────────────────────────

/**
 * Real astronomer names — kept for easter-egg single-name drops (~5%).
 * Deduped: removed Wendy Laurel Freedman (= Wendy Freedman), Jan Hendrik Oort
 * (= Jan Oort), Abraham Loeb (= Avi Loeb), Dame Jocelyn Bell (= Jocelyn Bell Burnell).
 */
const REAL_ASTRONOMERS: readonly string[] = [
	"Lisa Kaltenegger",
	"David Kipping",
	"Will Kinney",
	"Joshua Winn",
	"Rebecca Charbonneau",
	"Wendy Freedman",
	"Chiara Mingarelli",
	"Kathryn Johnston",
	"Malena Rice",
	"Viraj Pandya",
	"Gavin Schmidt",
	"Jackie Faherty",
	"Janna Levin",
	"Matt O'Dowd",
	"Néstor Espinoza",
	"Jason Steffen",
	"Sara Imari Walker",
	"Natalie Batalha",
	"Renée Hložek",
	"Renata Frelikh",
	"Tim Maudlin",
	"Lee Cronin",
	"Samuel Courville",
	"Galileo Galilei",
	"Johannes Kepler",
	"Tycho Brahe",
	"Nicolaus Copernicus",
	"Edwin Hubble",
	"Cecilia Payne",
	"Henrietta Leavitt",
	"Annie Jump Cannon",
	"Vera Rubin",
	"Carl Sagan",
	"Jocelyn Bell Burnell",
	"Subrahmanyan Chandrasekhar",
	"Arthur Eddington",
	"Harlow Shapley",
	"William Herschel",
	"Caroline Herschel",
	"Maria Mitchell",
	"George Ellery Hale",
	"Jan Oort",
	"Fritz Zwicky",
	"Lyman Spitzer",
	"Nancy Grace Roman",
	"Kip Thorne",
	"Andrea Ghez",
	"Reinhard Genzel",
	"Michel Mayor",
	"Didier Queloz",
	"Frank Drake",
	"Jill Tarter",
	"Adam Riess",
	"Saul Perlmutter",
	"Brian Schmidt",
	"Sandra Faber",
	"Debra Fischer",
	"Raghavan Narayan",
	"Priyamvada Natarajan",
	"Neta Bahcall",
	"Yakov Zel'dovich",
	"Stephen Hawking",
	"Roger Penrose",
	"Neil deGrasse Tyson",
	"Avi Loeb",
	"Sara Seager",
	"Dimitar Sasselov",
	"Heidi Hammel",
	"Fran Bagenal",
	"Carolyn Porco",
	"Alan Stern",
	"Mike Brown",
	"Jane Luu",
	"David Jewitt",
	"Lucy Shapiro",
	"Sean Carroll",
	"Eugene Parker",
	"Donald Lynden-Bell",
	"Maarten Schmidt",
	"Martin Rees",
	"Beatrice Tinsley",
	"George Gamow",
	"Fred Hoyle",
	"Margaret Burbidge",
	"Geoffrey Burbidge",
	"William Fowler",
	"Ralph Alpher",
	"Robert Herman",
	"Arno Penzias",
	"Robert Wilson",
	"John Mather",
	"George Smoot",
	"Charles Townes",
	"Riccardo Giacconi",
	"Eugene Shoemaker",
	"Carolyn Shoemaker",
	"Eleanor Helin",
	"David Levy",
	"Donald Brownlee",
	"Peter Jenniskens",
	"Jules Janssen",
	"Norman Lockyer",
	"Antonia Maury",
	"Williamina Fleming",
	"Dorrit Hoffleit",
	"Helen Sawyer Hogg",
	"Allan Sandage",
	"Allison Strom",
	"Amina Helmi",
	"Alycia Weinberger",
	"Aomawa Shields",
	"Megan Donahue",
	"Nadia Drake",
	"Beth Biller",
	"Emily Rice",
	"Michele Bannister",
	"Katherine Freese",
	"Duília de Mello",
	"Nergis Mavalvala",
	"Vicky Kalogera",
	"Feryal Özel",
	"Deborah Jin",
	"Paula Szkody",
	"Raisa D'Souza",
	"Alex Filippenko",
	"John Bahcall",
	"Lars Hernquist",
	"Volker Bromm",
	"Renu Malhotra",
	"Konstantin Batygin",
	"Alessandra Corsi",
	"Marcia Rieke",
	"George Rieke",
	"Harold Urey",
	"Gerard Kuiper",
	"Simon Newcomb",
	"Percival Lowell",
	"Henrik Svensmark",
	"Lucianne Walkowicz",
	"Katie Mack",
	"Lynne Hillenbrand",
	"Claire Max",
	"Aomawa Fields",
	"Dante Minniti",
	"Pedro Bernardinelli",
	"Gary Bernstein",
	"Jeremy Darling",
	"Robert Kirshner",
	"A. G. W. Cameron",
	"Bohdan Paczyński",
	"Joan Centrella",
	"Martha Haynes",
	"Riccardo Scarpa",
	"Vikram Ravi",
	"Shri Kulkarni",
	"Anna Frebel",
	"Alyssa Goodman",
	"David Spergel",
	"Marc Kamionkowski",
	"Eiichiro Komatsu",
	"Uroš Seljak",
	"Max Tegmark",
	"Nabila Aghanim",
	"Matias Zaldarriaga",
	"Gabriela González",
	"Jesse Thaler",
	"Cumrun Vafa",
	"Juan Maldacena",
	"Carlos Frenk",
	"Simon White",
	"Risa Wechsler",
	"Lars Bildsten",
	"Hakeem Oluseyi",
	"Jedidah Isler",
	"Vivienne Baldassare",
	"Monica Grady",
	"Peggy Whitson",
	"Mae Jemison",
	"Guillermo Haro",
	"Paris Pişmiş",
	"Yoji Kondo",
	"Masatoshi Koshiba",
	"Ray Jayawardhana",
	"Smadar Naoz",
	"Enrico Ramirez-Ruiz",
	"Aomawa Shore",
	"Mete Atatüre",
	"Mercedes López-Morales",
	"Lia Medeiros",
	"Monica Valluri",
	"Brenna Mockler",
	"Kirsten Banks",
	"Lucie Green",
	"Maggie Aderin-Pocock",
	"Emily Levesque",
	"Rohini Godbole",
];

/** First-name tokens extracted from REAL_ASTRONOMERS. */
export const FIRST_NAMES: readonly string[] = [
	"Adam",
	"Alan",
	"Alessandra",
	"Alex",
	"Allan",
	"Allison",
	"Alycia",
	"Alyssa",
	"Amina",
	"Andrea",
	"Anna",
	"Annie",
	"Antonia",
	"Aomawa",
	"Arno",
	"Arthur",
	"Avi",
	"Beatrice",
	"Beth",
	"Bohdan",
	"Brenna",
	"Brian",
	"Carl",
	"Carlos",
	"Caroline",
	"Carolyn",
	"Cecilia",
	"Charles",
	"Chiara",
	"Claire",
	"Cumrun",
	"Dante",
	"David",
	"Deborah",
	"Debra",
	"Didier",
	"Dimitar",
	"Donald",
	"Dorrit",
	"Duília",
	"Edwin",
	"Eiichiro",
	"Eleanor",
	"Emily",
	"Enrico",
	"Eugene",
	"Feryal",
	"Fran",
	"Frank",
	"Fred",
	"Fritz",
	"Gabriela",
	"Galileo",
	"Gary",
	"Gavin",
	"Geoffrey",
	"George",
	"Gerard",
	"Guillermo",
	"Hakeem",
	"Harlow",
	"Harold",
	"Heidi",
	"Helen",
	"Henrietta",
	"Henrik",
	"Jackie",
	"Jan",
	"Jane",
	"Janna",
	"Jason",
	"Jedidah",
	"Jeremy",
	"Jesse",
	"Jill",
	"Joan",
	"Jocelyn",
	"Johannes",
	"John",
	"Joshua",
	"Juan",
	"Jules",
	"Katherine",
	"Kathryn",
	"Katie",
	"Kip",
	"Kirsten",
	"Konstantin",
	"Lars",
	"Lee",
	"Lia",
	"Lisa",
	"Lucianne",
	"Lucie",
	"Lucy",
	"Lyman",
	"Lynne",
	"Maarten",
	"Mae",
	"Maggie",
	"Malena",
	"Marc",
	"Marcia",
	"Margaret",
	"Maria",
	"Martha",
	"Martin",
	"Masatoshi",
	"Matias",
	"Matt",
	"Max",
	"Megan",
	"Mercedes",
	"Mete",
	"Michel",
	"Michele",
	"Mike",
	"Monica",
	"Nabila",
	"Nadia",
	"Nancy",
	"Natalie",
	"Neil",
	"Nergis",
	"Neta",
	"Nicolaus",
	"Norman",
	"Néstor",
	"Paris",
	"Paula",
	"Pedro",
	"Peggy",
	"Percival",
	"Peter",
	"Priyamvada",
	"Raghavan",
	"Raisa",
	"Ralph",
	"Ray",
	"Rebecca",
	"Reinhard",
	"Renata",
	"Renu",
	"Renée",
	"Riccardo",
	"Risa",
	"Robert",
	"Roger",
	"Rohini",
	"Samuel",
	"Sandra",
	"Sara",
	"Saul",
	"Sean",
	"Shri",
	"Simon",
	"Smadar",
	"Stephen",
	"Subrahmanyan",
	"Tim",
	"Tycho",
	"Uroš",
	"Vera",
	"Vicky",
	"Vikram",
	"Viraj",
	"Vivienne",
	"Volker",
	"Wendy",
	"Will",
	"William",
	"Williamina",
	"Yakov",
	"Yoji",
];

/** Last-name tokens extracted from REAL_ASTRONOMERS. */
export const LAST_NAMES: readonly string[] = [
	"Aderin-Pocock",
	"Aghanim",
	"Alpher",
	"Atatüre",
	"Bagenal",
	"Bahcall",
	"Baldassare",
	"Banks",
	"Bannister",
	"Batalha",
	"Batygin",
	"Bernardinelli",
	"Bernstein",
	"Bildsten",
	"Biller",
	"Brahe",
	"Bromm",
	"Brown",
	"Brownlee",
	"Burbidge",
	"Burnell",
	"Cameron",
	"Cannon",
	"Carroll",
	"Centrella",
	"Chandrasekhar",
	"Charbonneau",
	"Copernicus",
	"Corsi",
	"Courville",
	"Cronin",
	"D'Souza",
	"Darling",
	"Donahue",
	"Drake",
	"Eddington",
	"Espinoza",
	"Faber",
	"Faherty",
	"Fields",
	"Filippenko",
	"Fischer",
	"Fleming",
	"Fowler",
	"Frebel",
	"Freedman",
	"Freese",
	"Frelikh",
	"Frenk",
	"Galilei",
	"Gamow",
	"Genzel",
	"Ghez",
	"Giacconi",
	"Godbole",
	"González",
	"Goodman",
	"Grady",
	"Green",
	"Hale",
	"Hammel",
	"Haro",
	"Hawking",
	"Haynes",
	"Helin",
	"Helmi",
	"Herman",
	"Hernquist",
	"Herschel",
	"Hillenbrand",
	"Hložek",
	"Hoffleit",
	"Hogg",
	"Hoyle",
	"Hubble",
	"Isler",
	"Janssen",
	"Jayawardhana",
	"Jemison",
	"Jenniskens",
	"Jewitt",
	"Jin",
	"Johnston",
	"Kalogera",
	"Kaltenegger",
	"Kamionkowski",
	"Kepler",
	"Kinney",
	"Kipping",
	"Kirshner",
	"Komatsu",
	"Kondo",
	"Koshiba",
	"Kuiper",
	"Kulkarni",
	"Leavitt",
	"Levesque",
	"Levin",
	"Levy",
	"Lockyer",
	"Loeb",
	"Lowell",
	"Luu",
	"Lynden-Bell",
	"López-Morales",
	"Mack",
	"Maldacena",
	"Malhotra",
	"Mather",
	"Maudlin",
	"Maury",
	"Mavalvala",
	"Max",
	"Mayor",
	"Medeiros",
	"Mello",
	"Mingarelli",
	"Minniti",
	"Mitchell",
	"Mockler",
	"Naoz",
	"Narayan",
	"Natarajan",
	"Newcomb",
	"O'Dowd",
	"Oluseyi",
	"Oort",
	"Paczyński",
	"Pandya",
	"Parker",
	"Payne",
	"Penrose",
	"Penzias",
	"Perlmutter",
	"Pişmiş",
	"Porco",
	"Queloz",
	"Ramirez-Ruiz",
	"Ravi",
	"Rees",
	"Rice",
	"Rieke",
	"Riess",
	"Roman",
	"Rubin",
	"Sagan",
	"Sandage",
	"Sasselov",
	"Scarpa",
	"Schmidt",
	"Seager",
	"Seljak",
	"Shapiro",
	"Shapley",
	"Shields",
	"Shoemaker",
	"Shore",
	"Smoot",
	"Spergel",
	"Spitzer",
	"Steffen",
	"Stern",
	"Strom",
	"Svensmark",
	"Szkody",
	"Tarter",
	"Tegmark",
	"Thaler",
	"Thorne",
	"Tinsley",
	"Townes",
	"Tyson",
	"Urey",
	"Vafa",
	"Valluri",
	"Walker",
	"Walkowicz",
	"Wechsler",
	"Weinberger",
	"White",
	"Whitson",
	"Wilson",
	"Winn",
	"Zaldarriaga",
	"Zel'dovich",
	"Zwicky",
	"Özel",
];

/** Cosmic / astronomy middle-name pool (80 entries). */
export const COSMIC_MIDDLES: readonly string[] = [
	// Planets & moons
	"Mars", "Venus", "Jupiter", "Saturn", "Pluto", "Titan", "Europa", "Phobos", "Io", "Ceres",
	"Luna", "Mercury", "Neptune", "Uranus",
	// Stellar
	"Nova", "Supernova", "Pulsar", "Quasar", "Magnetar", "Blazar", "Neutron", "Redshift", "Star",
	// Deep sky
	"Nebula", "Galaxy", "Cluster", "Halo", "Orion", "Andromeda", "Sagittarius",
	// Spacetime
	"Blackhole", "Wormhole", "Singularity", "Horizon", "Lightcone", "Geodesic",
	// Particles
	"Photon", "Neutrino", "Graviton", "Tachyon", "Boson", "Muon",
	// Events
	"Eclipse", "Transit", "Conjunction", "Syzygy", "Occultation", "Perihelion",
	// Structures
	"Cosmos", "Void", "Accretion", "Ecliptic", "Parallax", "Parsec", "Cepheid", "Corona", "Heliopause",
	// Cultural
	"Zodiac", "Azimuth", "Zenith",
	// Playful
	"Ufo", "Alien", "Martian", "Probe", "Rocket", "Satellite", "Telescope", "Spacecraft", "Rover", "Lander",
	"Voyager", "Pioneer", "Apollo", "Sputnik", "Cosmonaut", "Stargate", "Flyby", "Meteor", "Comet", "Asteroid",
];

// ── Types ────────────────────────────────────────────────────────────────────

export type SessionNickname = {
	nickname: string;
	index: number;
};

/** Persistent mesh identity stored in session files via appendEntry. */
export type MeshIdentity = {
	id: string;
	nickname: string;
	claimedAt: number;
	host: string;
	/** Explicit zmx session coordinate inherited from ZMX_SESSION, when present. */
	zmxSession?: string;
};

// ── Display color ────────────────────────────────────────────────────────────

/**
 * The color used to render a nickname WHEREVER it appears in the UI — the
 * powerline status footer, the teams widget, or anywhere else a durable mesh
 * identity is surfaced. Shared source of truth so the hooman's eye reads the
 * same amber for the same face across every surface — pinned identity, pinned
 * color.
 *
 * The pi Theme semantic API (`ThemeColor` in @earendil-works/pi-coding-agent)
 * exposes a fixed enum of tokens (`accent`/`warning`/…), none of which map to
 * this hue; and adding a new semantic token there would leak a display concern
 * into the core theme. So the color lives here in the nickname module — the
 * module that already owns "what nicknames ARE" — and renderers wrap the
 * nickname in a truecolor ANSI escape via `colorizeNickname` below.
 */
export const NICKNAME_DISPLAY_COLOR = "#ff9d00";

// Truecolor ANSI foreground escape, computed once from NICKNAME_DISPLAY_COLOR so
// a hex change stays a single-source edit.
const NICKNAME_ANSI_FG = ((): string => {
	const hex = NICKNAME_DISPLAY_COLOR.slice(1);
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	return `\x1b[38;2;${r};${g};${b}m`;
})();
const ANSI_RESET = "\x1b[0m";

/**
 * Wrap `text` in the shared nickname color as a truecolor ANSI escape.
 * Renderers that surface a durable-peer nickname (teams widget, etc.) call
 * this instead of a semantic theme token, so every surface renders identity
 * in the same amber the powerline footer does.
 */
export function colorizeNickname(text: string): string {
	return `${NICKNAME_ANSI_FG}${text}${ANSI_RESET}`;
}

// ── Hash function ────────────────────────────────────────────────────────────

function fnv1a32(input: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

// ── Triple-name derivation ───────────────────────────────────────────────────

/**
 * Deterministic triple-name from an id string.
 * Three independent FNV-1a hashes (salted per axis) pick first, cosmic, last.
 * ~5% chance of a single-astronomer easter-egg drop.
 */
export function deriveTripleName(id: string): string {
	// Easter-egg: ~5% chance to drop a single real-astronomer name
	if (fnv1a32(id + "egg") % 20 === 0) {
		return REAL_ASTRONOMERS[fnv1a32(id) % REAL_ASTRONOMERS.length];
	}

	const firstIdx = fnv1a32(id) % FIRST_NAMES.length;
	const cosmicIdx = fnv1a32(id + "cosmic") % COSMIC_MIDDLES.length;
	const lastIdx = fnv1a32(id + "last") % LAST_NAMES.length;
	return `${FIRST_NAMES[firstIdx]} ${COSMIC_MIDDLES[cosmicIdx]} ${LAST_NAMES[lastIdx]}`;
}

/**
 * Deterministic shuffle of an array using FNV-1a seeded by salt.
 * Returns a new array — does not mutate the original.
 */
function seededShuffle<T>(arr: readonly T[], salt: string): T[] {
	const out = [...arr];
	for (let i = out.length - 1; i > 0; i--) {
		const j = fnv1a32(salt + String(i)) % (i + 1);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * Claim a nickname that doesn't collide with live peers.
 * Iterates: cosmic first, then last, then first. Fallback: append `#id.slice(0,4)`.
 */
export interface NicknameOccupancy {
	has(nickname: string): boolean;
}

export function claimNickname(id: string, livePeerNicknames: NicknameOccupancy): string {
	const preferred = deriveTripleName(id);
	if (!livePeerNicknames.has(preferred)) return preferred;

	// Base indices for the preferred triple
	const firstIdx = fnv1a32(id) % FIRST_NAMES.length;
	const lastIdx = fnv1a32(id + "last") % LAST_NAMES.length;
	const firstName = FIRST_NAMES[firstIdx];
	const lastName = LAST_NAMES[lastIdx];

	// Pass 1: iterate cosmic middles (cheapest axis to mutate)
	const cosmicShuffled = seededShuffle(COSMIC_MIDDLES, id);
	for (const cosmic of cosmicShuffled) {
		const candidate = `${firstName} ${cosmic} ${lastName}`;
		if (!livePeerNicknames.has(candidate)) return candidate;
	}

	// Pass 2: iterate last names × cosmic middles
	const lastShuffled = seededShuffle(LAST_NAMES, id);
	for (const last of lastShuffled) {
		for (const cosmic of COSMIC_MIDDLES) {
			const candidate = `${firstName} ${cosmic} ${last}`;
			if (!livePeerNicknames.has(candidate)) return candidate;
		}
	}

	// Pass 3: iterate first names × cosmic × last (full namespace)
	const firstShuffled = seededShuffle(FIRST_NAMES, id);
	for (const first of firstShuffled) {
		for (const cosmic of COSMIC_MIDDLES) {
			for (const last of lastShuffled) {
				const candidate = `${first} ${cosmic} ${last}`;
				if (!livePeerNicknames.has(candidate)) return candidate;
			}
		}
	}

	// Namespace exhausted (2.6M+ names taken!) — fallback with id suffix
	return `${preferred} #${id.slice(0, 4)}`;
}

// ── Legacy getSessionNickname (unchanged surface area) ───────────────────────

export function getSessionNickname(sessionId?: string | null): SessionNickname | null {
	const trimmed = sessionId?.trim();
	if (!trimmed) return null;
	const index = fnv1a32(trimmed) % REAL_ASTRONOMERS.length;
	return {
		nickname: REAL_ASTRONOMERS[index],
		index,
	};
}

export function getSessionNicknameText(sessionId?: string | null): string | null {
	return getSessionNickname(sessionId)?.nickname ?? null;
}

export function getSessionNicknameDisplay(
	sessionId?: string | null,
	opts?: { disambiguator?: string | null },
): string | null {
	const nickname = getSessionNicknameText(sessionId);
	if (!nickname) return null;
	const suffix = opts?.disambiguator?.trim();
	return suffix ? `${nickname} · ${suffix}` : nickname;
}

export function getAllSessionNicknames(): readonly string[] {
	return REAL_ASTRONOMERS;
}

// ── Stable process identity ─────────────────────────────────────────────────
// Set once by pi-mesh when the sidecar reports its Zenoh peer ID.
// Read by powerline and mesh to derive a consistent nickname for this TUI.
// Uses globalThis because pi bundles extensions separately — module-level
// variables are isolated per bundle.

const STABLE_ID_KEY = "__piMeshStableId";

/** Set the stable process identity (call once from pi-mesh on sidecar ready). */
export function setStableId(id: string): void {
	const g = globalThis as any;
	if (g[STABLE_ID_KEY] === id) return;
	g[STABLE_ID_KEY] = id;
	const listeners = g.__piMeshStableIdListeners as Set<() => void> | undefined;
	if (listeners) for (const fn of listeners) { try { fn(); } catch {} }
}

/** Subscribe to stable ID changes. Returns unsubscribe function. */
export function onStableIdChange(listener: () => void): () => void {
	const g = globalThis as any;
	if (!g.__piMeshStableIdListeners) g.__piMeshStableIdListeners = new Set();
	g.__piMeshStableIdListeners.add(listener);
	return () => g.__piMeshStableIdListeners?.delete(listener);
}

/** Get the stable nickname for this process. Uses triple-name derivation for consistent style. */
export function getStableNickname(sessionIdFallback?: string | null): string | null {
	const stableId = (globalThis as any)[STABLE_ID_KEY] as string | undefined;
	const id = stableId ?? sessionIdFallback?.trim();
	if (!id) return null;
	return deriveTripleName(id);
}
