import * as sprites from "./sprites.json";
import * as fx from "./fx";
import { Damage, GameObject } from "./game";
import { clamp, vectorFromAngle } from "./helpers";
import { Chariot, Corpse, Projectile, Skeleton, SkeletonLord } from "./objects";
import { CORPSE, LIVING, MOBILE } from "./tags";

export function Damage(object: GameObject, amount: number) {
  let damage: Damage = { amount };
  object.onDamage(damage);
  object.hp = clamp(object.hp - damage.amount, 0, object.maxHp);
  if (!object.hp) Die(object);
}

export function Die(object: GameObject) {
  game.despawn(object);

  if (object.tags & MOBILE) {
    let center = object.center();
    fx
      .bones()
      .extend(center)
      .burst(2 + Math.random() * 3)
      .remove();

    if (object.tags & LIVING && Math.random() > 0.75) {
      game.spawn(Corpse(center.x, center.y));
    }

    for (let ritual of game.rituals) {
      ritual.onDeath?.(object);
    }
  }
}

let castAnimationTimeout = 0;

export function Cast() {
  let { spell, player } = game;
  if (spell.currentCasts === 0) return;
  spell.currentCasts -= 1;

  player.sprite = sprites.norman_arms_up;
  clearTimeout(castAnimationTimeout);
  castAnimationTimeout = setTimeout(() => player.sprite = sprites.norman_arms_down, 500);
  let targetAngle = spell.targetAngle - (spell.shotsPerRound * spell.shotOffsetAngle / 2);

  for (let j = 0; j < spell.shotsPerRound; j++) {
    let projectile = Projectile();
    let angle = targetAngle + j * spell.shotOffsetAngle;
    let [vx, vy] = vectorFromAngle(angle);
    let { x, y } = game.getCastingPoint();
    projectile.sprite = sprites.p_green_skull;
    projectile.x = x - projectile.sprite[2] / 2;
    projectile.y = y - projectile.sprite[3] / 2;
    projectile.vx = vx * spell.targetPower;
    projectile.vy = vy * spell.targetPower;
    game.spawn(projectile);

    for (let ritual of game.rituals) {
      ritual.onCast?.(projectile);
    }
  }
}

export function Resurrect() {
  for (let ritual of game.rituals) {
    ritual.onResurrect?.();
  }

  for (let object of game.objects) {
    if (object.tags & CORPSE) {
      game.despawn(object);
      let unit = Skeleton(object.x, 0);
      fx.cloud(unit.bounds(), [
        [sprites.p_green_1, sprites.p_green_2, sprites.p_green_3],
        [sprites.p_green_2, sprites.p_green_3, sprites.p_green_4],
        [sprites.p_green_1, sprites.p_green_3, sprites.p_green_5],
      ]).burst(10).remove();
      game.spawn(unit);
    }
  }
}
