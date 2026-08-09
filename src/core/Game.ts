import * as THREE from "three";
import { SceneManager } from "./SceneManager";
import { InputManager } from "./InputManager";
import { ParticleSystem } from "./ParticleSystem";
import { resolveCollisions, resolvePowerupPickups } from "./CollisionSystem";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { FighterEnemy } from "../entities/FighterEnemy";
import { BomberEnemy } from "../entities/BomberEnemy";
import { TurretEnemy } from "../entities/TurretEnemy";
import { ShipEnemy } from "../entities/ShipEnemy";
import { Boss } from "../entities/Boss";
import { EnemyBulletManager } from "../entities/EnemyBullet";
import { Powerup, type PowerupKind } from "../entities/Powerup";
import { Terrain } from "../entities/Terrain";
import { HUD } from "../ui/HUD";
import { MainMenu, type PlaneLoadout } from "../ui/MainMenu";
import { PauseMenu } from "../ui/PauseMenu";
import { GameOverScreen } from "../ui/GameOverScreen";
import { TouchControls } from "../ui/TouchControls";
import { audio } from "./AudioEngine";
import { SpawnDirector } from "../systems/SpawnDirector";
import { STAGES, type EnemyKind } from "../systems/StageData";
import { randRange } from "../utils/MathUtils";
import { getHighScore, reportScore } from "../utils/HighScore";

export type GameState = "boot" | "menu" | "playing" | "paused" | "gameover";

const SCROLL_SPEED = 6.5;
const CAMERA_HEIGHT = 24;
const CAMERA_LOOKAHEAD = 3;
const RESPAWN_DELAY = 1.2;
const ENEMY_DESPAWN_BEHIND = 12;
const POWERUP_DESPAWN_BEHIND = 10;
const START_LIVES = 3;
const MAX_LIVES = 6;
const BOSS_STANDOFF = 14;
const BOSS_BANNER_TIME = 2.4;
const COMBO_WINDOW = 2.4;
const SHIELD_DURATION = 7;

/** Weighted medal drop table rolled on every enemy kill. */
const DROP_TABLE: { kind: PowerupKind; weight: number }[] = [
  { kind: "vulcan", weight: 15 },
  { kind: "laser", weight: 11 },
  { kind: "missile", weight: 11 },
  { kind: "score", weight: 9 },
  { kind: "shield", weight: 4 },
  { kind: "bomb", weight: 3 },
  { kind: "option", weight: 3 },
  { kind: "life", weight: 1.5 },
];
const DROP_CHANCE = 0.55;

/** Enemy move/bullet-speed multiplier per stage — stage 1 starts noticeably gentler and climbs through stage 10. */
const STAGE_SPEED_SCALE = [0.92, 1.1, 1.21, 1.34, 1.45, 1.54, 1.63, 1.71, 1.79, 1.88];

interface DisposableMenu {
  dispose(): void;
}

export class Game {
  readonly sceneManager: SceneManager;
  readonly input: InputManager;
  readonly player: Player;

  private state: GameState = "boot";
  private lastTime = 0;
  private rafHandle = 0;
  private orientationBlocked = false;

  private scrollZ = 0;
  private terrain: Terrain;

  private particles: ParticleSystem;
  private enemies: Enemy[] = [];
  private enemyBullets: EnemyBulletManager;
  private powerups: Powerup[] = [];
  private hud: HUD;
  private menuLayer: HTMLElement;
  private touchLayer: HTMLElement;
  private touchControls: TouchControls;
  private activeMenu: DisposableMenu | null = null;
  private spawnDirector: SpawnDirector;
  private boss: Boss | null = null;
  private bossBannerTimer = 0;
  private highScore = 0;
  private stageIndex = 0;

  private respawnTimer = 0;
  private combo = 0;
  private comboTimer = 0;
  private shakeMagnitude = 0;
  score = 0;
  lives = START_LIVES;

  constructor(frame: HTMLElement, canvasHost: HTMLElement, touchSurface: HTMLElement, hudLayer: HTMLElement, menuLayer: HTMLElement) {
    this.sceneManager = new SceneManager(frame, canvasHost);
    this.input = new InputManager(touchSurface);
    this.menuLayer = menuLayer;
    this.touchLayer = touchSurface;

    this.terrain = new Terrain(this.sceneManager.scene, STAGES[0].seaColor);
    this.sceneManager.scene.fog = new THREE.Fog(STAGES[0].fogColor, 26, 70);
    this.sceneManager.scene.background = new THREE.Color(STAGES[0].fogColor);

    this.player = new Player(this.sceneManager.scene);
    this.particles = new ParticleSystem(this.sceneManager.scene);
    this.enemyBullets = new EnemyBulletManager(this.sceneManager.scene);
    this.hud = new HUD(hudLayer);
    this.touchControls = new TouchControls(touchSurface, () => this.input.pressBomb());
    this.spawnDirector = new SpawnDirector(STAGES[0]);
    this.highScore = getHighScore();
    audio.setTrack("menu");

    // Pause itself is handled once via InputManager's pauseFlag -> inputState.pausePressed
    // in update() below; a duplicate direct listener here would double-toggle it (pause then
    // immediately un-pause within the same frame), which is why P looked like it "didn't work".
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyR" && this.state === "gameover") this.restart();
    });

    this.setupOrientationGuard();
    this.showMainMenu();
    this.rafHandle = requestAnimationFrame(this.loop);
  }

  /**
   * The game is portrait-only. Rather than squashing the 3D scene into a
   * landscape frame (which reads as the whole screen "switching"), freeze
   * the loop and let the CSS rotate-overlay cover the screen until the
   * player rotates back.
   */
  private setupOrientationGuard(): void {
    const query = window.matchMedia("(orientation: landscape) and (pointer: coarse)");
    this.orientationBlocked = query.matches;
    query.addEventListener("change", (e) => {
      this.orientationBlocked = e.matches;
    });
  }

  setState(state: GameState): void {
    this.state = state;
    this.input.setEnabled(state === "playing");
    this.touchLayer.style.pointerEvents = state === "playing" ? "auto" : "none";
    this.touchControls.setVisible(state === "playing");
  }

  private clearMenu(): void {
    this.activeMenu?.dispose();
    this.activeMenu = null;
    this.menuLayer.innerHTML = "";
  }

  private showMainMenu(): void {
    this.clearMenu();
    this.hud.setVisible(false);
    this.hud.setBoss(null, 0);
    audio.setTrack("menu");
    const menu = new MainMenu(
      this.menuLayer,
      this.highScore,
      (loadout) => this.player.configure(loadout),
      (loadout) => this.beginRun(loadout),
    );
    this.activeMenu = menu;
    this.setState("menu");
  }

  private beginRun(loadout: PlaneLoadout): void {
    this.clearMenu();
    this.player.configure(loadout);
    this.resetRunState();
    this.hud.setVisible(true);
    audio.setTrack("stage");
    this.setState("playing");
  }

  togglePause(): void {
    if (this.state === "playing") {
      this.setState("paused");
      this.activeMenu = new PauseMenu(this.menuLayer, {
        onResume: () => this.resumeFromPause(),
        onRestart: () => this.restart(),
        onMainMenu: () => this.showMainMenu(),
      });
      audio.playUiClick();
    } else if (this.state === "paused") {
      this.resumeFromPause();
    }
  }

  private resumeFromPause(): void {
    this.clearMenu();
    audio.playUiClick();
    this.setState("playing");
  }

  private resetRunState(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.combo = 0;
    this.comboTimer = 0;
    for (const enemy of this.enemies) this.sceneManager.scene.remove(enemy.group);
    this.enemies = [];
    for (const powerup of this.powerups) this.sceneManager.scene.remove(powerup.group);
    this.powerups = [];
    this.enemyBullets.clear();
    this.boss = null;
    this.bossBannerTimer = 0;
    this.player.weapon.type = "vulcan";
    this.player.weapon.level = 1;
    this.player.resetLoadoutState();
    this.player.respawn(this.scrollZ);
    this.loadStage(0);
  }

  private loadStage(index: number): void {
    this.stageIndex = index;
    const stage = STAGES[index];
    this.terrain.setSeaColor(stage.seaColor);
    this.sceneManager.scene.fog = new THREE.Fog(stage.fogColor, 26, 70);
    this.sceneManager.scene.background = new THREE.Color(stage.fogColor);
    this.spawnDirector.reset(stage);
    this.bossBannerTimer = BOSS_BANNER_TIME;
    this.menuLayer.innerHTML = `
      <div class="hud-message" style="background:transparent;">
        <div class="hud-message-title" style="font-size:18px;">${stage.name}</div>
      </div>`;
  }

  restart(): void {
    this.clearMenu();
    audio.setTrack("stage");
    this.resetRunState();
    this.hud.setVisible(true);
    this.setState("playing");
  }

  private loop = (time: number): void => {
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 1 / 30) : 0;
    this.lastTime = time;
    if (!this.orientationBlocked) {
      this.update(dt);
      this.sceneManager.render();
    }
    this.rafHandle = requestAnimationFrame(this.loop);
  };

  /** Exposed for manual/deterministic stepping (debug tooling, tests). */
  step(dt: number): void {
    this.update(dt);
  }

  private update(dt: number): void {
    const inputState = this.input.poll();
    if (inputState.pausePressed) this.togglePause();

    if (this.state === "menu" || this.state === "gameover") {
      this.scrollZ -= SCROLL_SPEED * 0.35 * dt;
      this.terrain.update(dt, this.scrollZ);
      this.updateCamera(dt);
      return;
    }

    if (this.state !== "playing") return;

    this.touchControls.updateJoystick(inputState);
    if (inputState.bombPressed) this.tryUseBomb();

    this.scrollZ -= (this.boss ? 0 : SCROLL_SPEED) * dt;

    this.player.update(dt, inputState, this.scrollZ, this.enemies);
    this.enemyBullets.update(dt);
    this.particles.update(dt);
    this.updateEnemies(dt);
    this.updatePowerups(dt);
    if (!this.boss) this.updateSpawning(dt);
    this.updateRespawn(dt);
    this.updateBossEncounter(dt);
    this.updateCombo(dt);

    resolveCollisions(this.player, this.enemies, this.enemyBullets.bullets, {
      onEnemyHit: () => {
        audio.playHit();
      },
      onEnemyKilled: (enemy) => {
        this.onEnemyKilled(enemy);
      },
      onPlayerHit: () => {
        this.killPlayer();
      },
    });

    resolvePowerupPickups(this.player, this.powerups, (powerup) => {
      this.applyPowerup(powerup.kind);
      this.sceneManager.scene.remove(powerup.group);
    });
    this.powerups = this.powerups.filter((p) => p.alive);

    this.terrain.update(dt, this.scrollZ);
    this.updateCamera(dt);

    this.hud.update({
      score: this.score,
      lives: this.lives,
      weaponType: this.player.weapon.type,
      weaponLevel: this.player.weapon.level,
      bombs: this.player.bombs,
      combo: this.combo,
    });
    this.hud.setBoss(this.boss ? this.boss.name : null, this.boss ? this.boss.hp / this.boss.maxHp : 0);
  }

  private updateCamera(dt: number): void {
    const focusZ = this.scrollZ - CAMERA_LOOKAHEAD;
    this.sceneManager.camera.position.set(0, CAMERA_HEIGHT, focusZ);
    this.sceneManager.camera.lookAt(0, 0, focusZ);
    this.sceneManager.followSun(0, this.scrollZ);

    if (this.shakeMagnitude > 0.001) {
      this.sceneManager.camera.position.x += randRange(-1, 1) * this.shakeMagnitude;
      this.sceneManager.camera.position.y += randRange(-1, 1) * this.shakeMagnitude * 0.6;
      this.shakeMagnitude *= Math.pow(0.02, dt);
    } else {
      this.shakeMagnitude = 0;
    }
  }

  private triggerShake(magnitude: number): void {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
  }

  private updateCombo(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    const isBoss = enemy instanceof Boss;
    this.particles.burst(enemy.group.position, 0xff8a3c, isBoss ? 40 : 18, isBoss ? 8 : 5.5);
    audio.playExplosion(isBoss);

    this.combo += 1;
    this.comboTimer = COMBO_WINDOW;
    const multiplier = 1 + Math.min(this.combo - 1, 20) * 0.05;
    this.score += Math.floor(enemy.scoreValue * multiplier);

    this.maybeDropPowerup(enemy.group.position);
    if (isBoss) {
      this.triggerShake(0.3);
      this.onBossDefeated();
    }
  }

  private tryUseBomb(): void {
    if (!this.player.alive || !this.player.consumeBomb()) return;
    audio.playExplosion(true);
    this.hud.flash("rgba(180,225,255,0.85)", 0.5);
    this.triggerShake(0.28);
    this.particles.burst(this.player.group.position, 0xbfe6ff, 30, 7);
    this.player.applyShield(1.4);
    this.enemyBullets.clear();

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.alive) continue;
      const isBoss = enemy instanceof Boss;
      const damage = isBoss ? 12 : enemy.hp;
      this.particles.burst(enemy.group.position, 0xffe38a, isBoss ? 10 : 12, isBoss ? 4 : 4.5);
      const killed = enemy.takeDamage(damage);
      if (killed) this.onEnemyKilled(enemy);
    }
  }

  private updateBossEncounter(dt: number): void {
    if (this.bossBannerTimer > 0) {
      this.bossBannerTimer -= dt;
      if (this.bossBannerTimer <= 0) this.menuLayer.innerHTML = "";
    }

    if (this.boss) {
      if (this.boss.consumePhaseChange()) {
        this.particles.burst(this.boss.group.position, 0xff5a3c, 24, 6.5);
        this.triggerShake(0.18);
      }
      return;
    }

    if (this.spawnDirector.finished && this.enemies.length === 0) {
      this.spawnBoss();
    }
  }

  private spawnBoss(): void {
    const bossZ = this.scrollZ - BOSS_STANDOFF;
    const bossConfig = STAGES[this.stageIndex].boss;
    const boss = new Boss(this.sceneManager.scene, this.enemyBullets, 0, bossZ, bossConfig);
    this.enemies.push(boss);
    this.boss = boss;
    this.bossBannerTimer = BOSS_BANNER_TIME;
    audio.playBossAlarm();
    audio.setTrack("boss");
    this.menuLayer.innerHTML = `
      <div class="hud-message" style="background:transparent;">
        <div class="hud-message-title" style="font-size:20px;">WARNING</div>
        <div class="hud-message-sub">${bossConfig.name} APPROACHING</div>
      </div>`;
  }

  private onBossDefeated(): void {
    this.boss = null;
    audio.playVictory();

    const wasFinalStage = this.stageIndex >= STAGES.length - 1;
    if (wasFinalStage) {
      this.showVictory();
      return;
    }

    audio.setTrack("stage");
    this.loadStage(this.stageIndex + 1);
  }

  private showVictory(): void {
    this.setState("gameover");
    const isNewHigh = reportScore(this.score);
    this.highScore = getHighScore();
    this.hud.setVisible(false);
    this.clearMenu();
    this.activeMenu = new GameOverScreen(
      this.menuLayer,
      this.score,
      this.highScore,
      isNewHigh,
      { onRestart: () => this.restart(), onMainMenu: () => this.showMainMenu() },
      true,
    );
  }

  private updateEnemies(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.alive) {
        enemy.update(dt, this.player.group.position);
      }
      const behind = enemy.group.position.z - this.scrollZ > ENEMY_DESPAWN_BEHIND;
      if (!enemy.alive || behind) {
        this.sceneManager.scene.remove(enemy.group);
        this.enemies.splice(i, 1);
      }
    }
  }

  private updatePowerups(dt: number): void {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i];
      powerup.update(dt);
      const behind = powerup.group.position.z - this.scrollZ > POWERUP_DESPAWN_BEHIND;
      if (behind && powerup.alive) {
        powerup.alive = false;
        this.sceneManager.scene.remove(powerup.group);
      }
    }
  }

  private maybeDropPowerup(position: THREE.Vector3): void {
    if (Math.random() > DROP_CHANCE) return;
    const totalWeight = DROP_TABLE.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    let kind: PowerupKind = "score";
    for (const entry of DROP_TABLE) {
      if (roll < entry.weight) {
        kind = entry.kind;
        break;
      }
      roll -= entry.weight;
    }
    this.powerups.push(new Powerup(this.sceneManager.scene, kind, position.x, position.z));
  }

  private applyPowerup(kind: PowerupKind): void {
    audio.playPowerup();
    switch (kind) {
      case "score":
        this.score += 500;
        break;
      case "life":
        this.lives = Math.min(MAX_LIVES, this.lives + 1);
        break;
      case "shield":
        this.player.applyShield(SHIELD_DURATION);
        break;
      case "bomb":
        this.player.addBomb();
        break;
      case "option":
        this.player.addOption();
        break;
      default:
        this.player.weapon.pickupMedal(kind);
    }
  }

  private updateSpawning(dt: number): void {
    this.spawnDirector.update(dt, this.scrollZ, (kind, x, z) => this.spawnEnemy(kind, x, z));
  }

  private spawnEnemy(kind: EnemyKind, x: number, z: number): void {
    const scene = this.sceneManager.scene;
    const speedScale = STAGE_SPEED_SCALE[this.stageIndex] ?? 1;
    switch (kind) {
      case "fighter":
        this.enemies.push(new FighterEnemy(scene, this.enemyBullets, x, z, speedScale));
        break;
      case "bomber":
        this.enemies.push(new BomberEnemy(scene, this.enemyBullets, x, z, speedScale));
        break;
      case "turret":
        this.enemies.push(new TurretEnemy(scene, this.enemyBullets, x, z, speedScale));
        break;
      case "ship":
        this.enemies.push(new ShipEnemy(scene, this.enemyBullets, x, z, speedScale));
        break;
    }
  }

  private killPlayer(): void {
    if (!this.player.alive) return;
    this.particles.burst(this.player.group.position, 0xfff2d0, 22, 6);
    audio.playExplosion(true);
    this.hud.flash("rgba(255,60,50,0.55)", 0.45);
    this.triggerShake(0.35);
    this.combo = 0;
    this.comboTimer = 0;
    this.player.hit();
    this.lives -= 1;
    if (this.lives <= 0) {
      this.showGameOver();
    } else {
      this.respawnTimer = RESPAWN_DELAY;
    }
  }

  private showGameOver(): void {
    this.setState("gameover");
    const isNewHigh = reportScore(this.score);
    this.highScore = getHighScore();
    this.hud.setVisible(false);
    this.clearMenu();
    this.activeMenu = new GameOverScreen(this.menuLayer, this.score, this.highScore, isNewHigh, {
      onRestart: () => this.restart(),
      onMainMenu: () => this.showMainMenu(),
    });
  }

  private updateRespawn(dt: number): void {
    if (!this.player.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.player.respawn(this.scrollZ);
      }
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.rafHandle);
    this.input.dispose();
    this.player.dispose();
    this.hud.dispose();
    this.touchControls.dispose();
    this.terrain.dispose();
    this.sceneManager.dispose();
  }
}
