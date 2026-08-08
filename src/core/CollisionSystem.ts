import type { Player } from "../entities/Player";
import type { Enemy } from "../entities/Enemy";
import type { Bullet } from "../entities/Bullet";
import type { Powerup } from "../entities/Powerup";

export interface CollisionCallbacks {
  onEnemyHit: (enemy: Enemy, bullet: Bullet) => void;
  onEnemyKilled: (enemy: Enemy) => void;
  onPlayerHit: (source: "bullet" | "enemy") => void;
}

/** Simple circle-radius collision checks; called once per frame from Game. */
export function resolveCollisions(
  player: Player,
  enemies: Enemy[],
  enemyBullets: Bullet[],
  callbacks: CollisionCallbacks,
): void {
  for (let bi = player.bullets.length - 1; bi >= 0; bi--) {
    const bullet = player.bullets[bi];
    for (let ei = 0; ei < enemies.length; ei++) {
      const enemy = enemies[ei];
      if (!enemy.alive) continue;
      const dist = bullet.mesh.position.distanceTo(enemy.group.position);
      if (dist < bullet.radius + enemy.radius) {
        callbacks.onEnemyHit(enemy, bullet);
        const killed = enemy.takeDamage(bullet.damage);
        if (killed) callbacks.onEnemyKilled(enemy);
        player.removeBulletAt(bi);
        break;
      }
    }
  }

  if (player.alive && !player.invulnerable) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const bullet = enemyBullets[i];
      const dist = bullet.mesh.position.distanceTo(player.group.position);
      if (dist < bullet.radius + player.radius) {
        callbacks.onPlayerHit("bullet");
        break;
      }
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = enemy.group.position.distanceTo(player.group.position);
      if (dist < enemy.radius + player.radius) {
        callbacks.onPlayerHit("enemy");
        break;
      }
    }
  }
}

export function resolvePowerupPickups(player: Player, powerups: Powerup[], onPickup: (powerup: Powerup) => void): void {
  if (!player.alive) return;
  for (const powerup of powerups) {
    if (!powerup.alive) continue;
    const dist = powerup.group.position.distanceTo(player.group.position);
    if (dist < powerup.radius + player.radius) {
      powerup.alive = false;
      onPickup(powerup);
    }
  }
}
