import { audio } from "../core/AudioEngine";
import { getLeaderboard, qualifies, submitScore, type LeaderboardEntry } from "../utils/Leaderboard";

export interface GameOverHandlers {
  onRestart: () => void;
  onMainMenu: () => void;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export class GameOverScreen {
  private root: HTMLDivElement;

  constructor(
    container: HTMLElement,
    score: number,
    highScore: number,
    isNewHigh: boolean,
    handlers: GameOverHandlers,
    victory = false,
  ) {
    this.root = document.createElement("div");
    this.root.className = "menu-screen";
    const title = victory ? "MISSION COMPLETE" : "GAME OVER";
    const titleColor = victory ? "#2ecc40" : "#ff5a3c";
    const canEnter = qualifies(score);

    this.root.innerHTML = `
      <div class="menu-title" style="color:${titleColor};font-size:${victory ? 24 : 34}px;">${title}</div>
      ${isNewHigh ? '<div class="menu-subtitle" style="color:#ffd23f;">NEW HIGH SCORE!</div>' : ""}
      <div class="menu-score">${Math.floor(score).toString().padStart(7, "0")}</div>
      <div class="menu-subtitle">HIGH SCORE ${Math.floor(highScore).toString().padStart(7, "0")}</div>
      ${
        canEnter
          ? `<div class="lb-entry">
               <div class="lb-entry-label">랭킹 등록 가능! ID 입력</div>
               <div class="lb-entry-row">
                 <input type="text" id="lb-id-input" maxlength="10" placeholder="PILOT" autocomplete="off" />
                 <button type="button" class="menu-btn lb-submit-btn" id="lb-submit-btn">등록</button>
               </div>
             </div>`
          : ""
      }
      <div class="lb-board" id="lb-board"></div>
      <button type="button" class="menu-btn" data-action="restart">RESTART</button>
      <button type="button" class="menu-btn" data-action="menu">MAIN MENU</button>
    `;
    container.appendChild(this.root);

    this.renderBoard(null);

    if (canEnter) {
      const input = this.root.querySelector<HTMLInputElement>("#lb-id-input")!;
      const submitBtn = this.root.querySelector<HTMLButtonElement>("#lb-submit-btn")!;
      const entryBox = this.root.querySelector<HTMLElement>(".lb-entry")!;

      const submit = (): void => {
        audio.playUiClick();
        const board = submitScore(input.value, score);
        const roundedScore = Math.floor(score);
        const newEntry = board.find((e) => e.score === roundedScore) ?? null;
        entryBox.remove();
        this.renderBoard(newEntry, board);
      };

      submitBtn.addEventListener("click", submit);
      input.addEventListener("keydown", (e) => {
        if (e.code === "Enter") submit();
      });
      window.setTimeout(() => input.focus(), 50);
    }

    this.bind("restart", () => handlers.onRestart());
    this.bind("menu", () => handlers.onMainMenu());
  }

  private renderBoard(highlight: LeaderboardEntry | null, boardOverride?: LeaderboardEntry[]): void {
    const board = boardOverride ?? getLeaderboard();
    const el = this.root.querySelector("#lb-board")!;
    if (board.length === 0) {
      el.innerHTML = '<div class="lb-title">TOP PILOTS</div><div class="lb-empty">아직 기록이 없습니다</div>';
      return;
    }
    el.innerHTML = `
      <div class="lb-title">TOP PILOTS</div>
      <div class="lb-rows">
        ${board
          .map((entry, i) => {
            const isNew = highlight !== null && entry === highlight;
            return `<div class="lb-row${isNew ? " lb-row-new" : ""}">
              <span class="lb-rank">${i + 1}</span>
              <span class="lb-id">${escapeHtml(entry.id)}</span>
              <span class="lb-score">${entry.score.toString().padStart(7, "0")}</span>
            </div>`;
          })
          .join("")}
      </div>
    `;
  }

  private bind(action: string, fn: () => void): void {
    this.root.querySelector(`[data-action="${action}"]`)!.addEventListener("click", () => {
      audio.playUiClick();
      fn();
    });
  }

  dispose(): void {
    this.root.remove();
  }
}
