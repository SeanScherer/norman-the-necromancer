import * as fx from "./fx";
import * as sprites from "./sprites.json";
import { Damage } from "./actions";
import { Bleeding, Damaging, DespawnTimer, Frozen, HitStreak, LightningStrike, Seeking } from "./behaviours";
import { tween } from "./engine";
import { Behaviour, GameObject, RARE, Ritual } from "./game";
import { DEG_180, DEG_360, distance, randomFloat, randomInt } from "./helpers";
import { SkeletonLord, Spell } from "./objects";
import { screenshake } from "./renderer";
import { CORPSE, LIVING, UNDEAD } from "./tags";
import { shop } from "./shop";

// Ritual tags
const NONE = 0;
const BOUNCING = 1 << 0;
const SPLITTING = 1 << 1;
const EXPLOSIVE = 1 << 2;
const HOMING = 1 << 3;
const WARDSTONES = 1 << 4;
const CASTING_RATE = 1 << 5;
const CURSE = 1 << 6;

export let Streak: Ritual = {
  tags: NONE,
  name: "Streak",
  description: "",
  onCast: spell => spell.addBehaviour(new HitStreak(spell)),
};

export let Bouncing: Ritual = {
  tags: BOUNCING,
  name: "Bouncing",
  description: "Spells bounce",
  onCast(spell) {
    spell.addBehaviour(new DespawnTimer(spell, 3000));
    spell.despawnOnBounce = false;
    spell.bounce = 0.5;
  },
};

class ProjectileExplode extends Behaviour {
  onBounce = this.explode;
  onCollision = this.explode;

  explode() {
    let spell = this.object;
    game.despawn(spell);

    for (let object of game.objects) {
      if (object.is(this.object.collisionMask)) {
        if (distance(spell, object) < 50) {
          Damage(object, 1, spell);
        }
      }
    }

    screenshake(50);
    fx.trail()
      .extend({
        ...spell.center(),
        velocity: [50, 100],
        angle: [0, DEG_360],
        duration: [200, 500],
      })
      .burst(200)
      .remove();
  }
}

export let Explosive: Ritual = {
  tags: EXPLOSIVE,
  exclusiveTags: BOUNCING,
  rarity: RARE,
  name: "Explosive",
  description: "Spells explode on impact",
  onCast(projectile) {
    projectile.addBehaviour(new ProjectileExplode(projectile));
  },
}

export let Splitshot: Ritual = {
  tags: SPLITTING,
  exclusiveTags: SPLITTING,
  rarity: RARE,
  name: "Splitshot",
  description: "Shoot 2 projectiles",
  onActive() {
    game.spell.shotsPerRound = 2;
  },
}

export let Homing: Ritual = {
  tags: HOMING,
  rarity: RARE,
  name: "Homing",
  description: "Spells seek living enemies",
  onCast(projectile) {
    projectile.addBehaviour(new Seeking(projectile));
  },
}

export let Weightless: Ritual = {
  tags: NONE,
  rarity: RARE,
  name: "Weightless",
  description: "Spells are not affected by gravity",
  onCast(spell) {
    spell.mass = 0;
    spell.friction = 0;
    spell.bounce = 1;
  },
}

export let Piercing: Ritual = {
  tags: NONE,
  rarity: RARE,
  name: "Piercing",
  // TODO: Too powerful, maybe percentage chance instead? Or maybe getting weaker?
  description: "Spells pass through enemies",
  onCast(spell) {
    spell.despawnOnCollision = false;
  },
}

class KnockbackSpell extends Behaviour {
  onCollision(target: GameObject): void {
    if (target.mass < 1000) {
      tween(target.x, target.x + 16, 200, x => target.x = x);
    }
    //target.addBehaviour(new Stunned(target));

    // Knock objects backwards
    //for (let object of game.objects) {
    //  if (this.object.collisionMask & object.tags) {
    //    let dist = distance(this.object, object);
    //    let scale = 1 - clamp(dist / 50, 0, 1);
    //    let [vx] = vectorFromAngle(angleBetweenPoints(this.object, object));
    //    object.vx = vx * 50 * scale;
    //    object.vy = 100 * scale;
    //  }
    //}
  }
}

export let Knockback: Ritual = {
  tags: NONE,
  name: "Knockback",
  description: "Spells knock enemies backwards",
  onCast(spell) {
    spell.addBehaviour(new KnockbackSpell(spell));
  },
};

export let Ceiling: Ritual = {
  tags: NONE,
  requiredTags: BOUNCING,
  name: "Ceiling",
  description: "Adds a ceiling",
  onActive() {
    game.stage.ceiling = 48;
  },
};

class RainSpell extends Behaviour {
  split = false;
  onFrame(): void {
    if (!this.split && this.object.vy < 0) {
      this.split = true;
      let p0 = this.object;
      let p1 = Spell();
      let p2 = Spell();
      p1.x = p2.x = p0.x;
      p1.y = p2.y = p0.y;
      p1.vx = p2.vx = p0.vx;
      p1.vy = p2.vy = p0.vy;
      p1.vx -= 20;
      p2.vx += 20;
      p1.groupId = p2.groupId = p0.groupId;
      game.onCast(p1, true);
      game.onCast(p2, true);
      game.spawn(p1);
      game.spawn(p2);
    }
  }
}

export let Rain: Ritual = {
  tags: SPLITTING,
  exclusiveTags: SPLITTING,
  rarity: RARE,
  name: "Rain",
  description: "Spells split when they start to drop",
  recursive: false,
  onCast(spell) {
    spell.addBehaviour(new RainSpell(spell));
  },
};

export let Drunkard: Ritual = {
  tags: NONE,
  name: "Drunkard",
  description: "Do 2x damage, but your aim is wobbly",
  onCast(spell) {
    spell.vx += randomInt(100) - 50;
    spell.vy += randomInt(100) - 50;
    spell.getBehaviour(Damaging)!.amount *= 2;
  },
};

export let Seance: Ritual = {
  tags: NONE,
  name: "Seance",
  description: "Your spells pass through the undead",
  onCast(spell) {
    spell.collisionMask = LIVING;
  }
};

export let Broken: Ritual = {
  tags: NONE,
  rarity: RARE,
  name: "Broken",
  description: "Deal 3x damage, but max hp is reduced to 1",
  onActive() {
    game.player.hp = game.player.maxHp = 1;
  },
  onCast(spell) {
    spell.getBehaviour(Damaging)!.amount *= 3;
  }
};

export let Triggerfinger: Ritual = {
  tags: CASTING_RATE,
  name: "Triggerfinger",
  description: "Casts recharge 2x faster",
  onActive() {
    game.spell.castRechargeRate /= 2;
  }
};

export let Bleed: Ritual = {
  tags: CURSE,
  name: "Bleed",
  description: "Inflicts bleed on targets",
  onCast(spell: GameObject) {
    spell.sprite = sprites.p_red_skull;
    spell.emitter!.extend({
      variants: [
        [sprites.p_red_3, sprites.p_red_2, sprites.p_red_1],
        [sprites.p_red_4, sprites.p_red_3, sprites.p_red_2],
        [sprites.p_red_3, sprites.p_red_2, sprites.p_red_1],
      ],
      frequency: 5,
      angle: [DEG_180, 0],
      mass: [20, 50],
    });
    let inflict = spell.addBehaviour();
    inflict.onCollision = target => {
      target.addBehaviour(new Bleeding(target));
    };
  }
};

export let BigFred: Ritual = {
  tags: NONE,
  name: "Big Fred",
  description: "Summon Norman's Neighbour each resurrection",
  onResurrect() {
    game.spawn(SkeletonLord(), game.player.x, game.player.y);
  },
};

export let Extraction: Ritual = {
  tags: NONE,
  rarity: RARE,
  name: "Extraction",
  description: "Corpses become souls at the end of each level",
  onLevelEnd() {
    let corpses = game.objects.filter(object => object.is(CORPSE));

    for (let corpse of corpses) {
      let emitter = fx.bones().extend({
        ...corpse.center(),
        variants: [[sprites.p_green_skull]],
        duration: [100, 1000],
      });
      emitter.burst(5);
      emitter.remove();
      game.despawn(corpse);
      game.addSouls(5);
    }
  },
};

export let Benefactor: Ritual = {
  tags: NONE,
  rarity: RARE,
  name: "Benefactor",
  description: "Necronomicon upgrades are 50% cheaper",
  onShopEnter() {
    for (let item of shop.items) {
      item.cost = item.cost / 2 | 0;
    }
  },
};

export let Zap: Ritual = {
  tags: NONE,
  rarity: RARE,
  name: "Zap",
  description: "Lightning strikes after hits",
  onCast(spell) {
    spell.addBehaviour(new LightningStrike(spell));
  },
};

export let Freeze: Ritual = {
  tags: NONE,
  rarity: RARE,
  name: "Freeze",
  description: "Small chance to freeze enemies",
  onCast(spell) {
    if (randomFloat() <= 0.1) {
      spell.emitter!.variants = [[sprites.p_ice_1, sprites.p_ice_2, sprites.p_ice_3]];
      spell.sprite = sprites.p_skull;
      spell.removeBehaviour(spell.getBehaviour(Damaging)!);
      // Frozen has to be added before other behaviours, so that it can prevent
      // them from updating
      spell.addBehaviour().onCollision = target =>
        target.addBehaviour(new Frozen(target), 0);
    }
  },
};
