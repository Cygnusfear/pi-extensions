const SESSION_NICKNAMES = [
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
  "Wendy Laurel Freedman",
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
  "Dame Jocelyn Bell",
  "Deborah Jin",
  "Paula Szkody",
  "Raisa D'Souza",
  "Alex Filippenko",
  "John Bahcall",
  "Lars Hernquist",
  "Volker Bromm",
  "Abraham Loeb",
  "Renu Malhotra",
  "Konstantin Batygin",
  "Alessandra Corsi",
  "Marcia Rieke",
  "George Rieke",
  "Harold Urey",
  "Gerard Kuiper",
  "Jan Hendrik Oort",
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
  "Rohini Godbole"
] as const;

export type SessionNickname = {
  nickname: string;
  index: number;
};

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function getSessionNickname(sessionId?: string | null): SessionNickname | null {
  const trimmed = sessionId?.trim();
  if (!trimmed) return null;
  const index = fnv1a32(trimmed) % SESSION_NICKNAMES.length;
  return {
    nickname: SESSION_NICKNAMES[index],
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
  return SESSION_NICKNAMES;
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

/** Get the stable nickname for this process. Falls back to sessionId if mesh isn't running. */
export function getStableNickname(sessionIdFallback?: string | null): string | null {
  const stableId = (globalThis as any)[STABLE_ID_KEY] as string | undefined;
  return getSessionNicknameText(stableId ?? sessionIdFallback);
}
