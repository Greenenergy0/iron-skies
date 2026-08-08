const KEY = "ironskies_leaderboard";
const MAX_ENTRIES = 10;
const MAX_ID_LENGTH = 10;

export interface LeaderboardEntry {
  id: string;
  score: number;
  date: string;
}

function load(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function save(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* localStorage unavailable — leaderboard just won't persist */
  }
}

export function getLeaderboard(): LeaderboardEntry[] {
  return load()
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
}

/** True if this score would land on the (possibly not-yet-full) top-10 board. */
export function qualifies(score: number): boolean {
  const board = getLeaderboard();
  if (board.length < MAX_ENTRIES) return score > 0;
  return score > board[board.length - 1].score;
}

/** Inserts the entry, re-sorts, trims to MAX_ENTRIES, and persists. Returns the updated board. */
export function submitScore(id: string, score: number): LeaderboardEntry[] {
  const cleanId = (id.trim() || "PILOT").slice(0, MAX_ID_LENGTH).toUpperCase();
  const board = load();
  board.push({ id: cleanId, score: Math.floor(score), date: new Date().toISOString().slice(0, 10) });
  const sorted = board.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  save(sorted);
  return sorted;
}
