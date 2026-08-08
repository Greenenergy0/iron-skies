const KEY = "ironskies_highscore";

export function getHighScore(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Persists the score if it beats the stored high score; returns true when a new record was set. */
export function reportScore(score: number): boolean {
  const current = getHighScore();
  if (score <= current) return false;
  try {
    localStorage.setItem(KEY, String(Math.floor(score)));
  } catch {
    /* localStorage unavailable (private mode, etc.) — high score just won't persist */
  }
  return true;
}
