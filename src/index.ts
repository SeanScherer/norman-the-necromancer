import * as sprites from "./sprites.json";
import { init, updateParticles, updateTweens } from "./engine";
import { Game, INTRO, PLAYING, SHOPPING, WIN } from "./game";
import { render, screenToSceneCoords } from "./renderer";
import { Cast, Resurrect } from "./actions";
import { angleBetweenPoints } from "./helpers";
import { Player } from "./objects";
import { isComplete, isLevelFinished, updateLevel } from "./levels";
import { Avarice, Bleed, Electrodynamics, Giants, Hardened, Hunter, Impatience, Rain, Salvage, Seer, Streak, Tearstone } from "./rituals";
import { buy, enterShop, selectShopIndex, shop } from "./shop";
import { dust } from "./fx";
import { BPM, play } from "./sounds";
import { March } from "./behaviours";

let player = Player();
player.sprite = sprites.skull;
let game = new Game(player);
let paused = false;

const ARROW_UP = 38;
const ARROW_DOWN = 40;
const SPACE = 3222;
const ENTER = 13;
const KEY_P = 80;

const INTRO_DIALOGUE = [
  "A village for the Little Lich to feast upon.",
  " It would suck up the essence of the souls here",
  "     And Rise in power - to raise the @ dead @ !",
  "  As long as it didn't let the villagers get too close..",
];

const OUTRO_DIALOGUE = [

// Stage end:
  "",
  " The village had been decimated. ",
  " The villagers souls absorbed one by one by the Little Lich.",
  " Now onwards for greater power and infamy!",
  " - Town Unlocked - ",
  " - Nasty Necromancer Unlocked - ",
  "",
  " 'To be continued ...' ",
  " *Thats all for now* ",
  " *Thanks for testing, ..  !*",
  " *.. hope you had fun getting this far :).* ",
// End end:
//  "It was over.",
//  "The Little Lich had plucked countless souls from their bodies .",
//  "Now onwards for greater power and infamy!",
];

onpointerup = () => {
  if (game.state === INTRO) {
    play();
    game.state = PLAYING;
    game.player.sprite = sprites.norman_arms_down;
  }

  Cast();
}

onpointermove = ({ clientX, clientY }) => {
  let p1 = player.center();
  let p2 = screenToSceneCoords(clientX, clientY);
  game.spell.targetAngle = angleBetweenPoints(p1, p2);
}

onkeydown = ({ which: key }) => {
  if (game.state === PLAYING) {
    if (key === SPACE) Resurrect();
    if (key === KEY_P) paused = !paused;
  } else if (game.state === SHOPPING) {
    if (key === ARROW_UP) selectShopIndex(-1);
    if (key === ARROW_DOWN) selectShopIndex(+1);
    if (key === ENTER) buy();
  }
}

let normanIsBouncing = false;

function update(dt: number) {
  updateDialogue(dt);
  render(dt);
  if (paused) return;

  if (game.state === PLAYING) {
    updateLevel(dt);
  }

  if (game.state !== INTRO) {
    game.update(dt);
  }

  updateTweens(dt);
  updateParticles(dt);


  if (game.state === PLAYING && isLevelFinished()) {
    if (isComplete()) {
      onWin();
    } else {
      game.onLevelEnd();
      enterShop();
    }
  }

  if (game.level === 2 && !normanIsBouncing) {
    game.player.addBehaviour(new March(game.player, 0));
    game.player.updateClock = 100;
    game.player.updateSpeed = 60_000 / BPM * 2;
    normanIsBouncing = true;
  }
}

function onWin() {
  game.state = WIN;
  game.dialogue = OUTRO_DIALOGUE;
}

let dialogueTimer = 0;

function updateDialogue(dt: number) {
  if ((dialogueTimer += dt) > 4000) {
    game.dialogue.shift()
    dialogueTimer = 0;

    // If the player watched the whole dialogue, remind them to click to start
    if (game.state === INTRO && game.dialogue.length === 0) {
      game.dialogue.push("                (Click to begin)");
    }
  }
}

game.addRitual(Tearstone);

shop.rituals = [
  Rain,
  Hunter,
  Seer,
  Impatience,
  Bleed,
  Salvage,
  Electrodynamics,
  Giants,
  Avarice,
  Streak,
  Hardened
];

game.dialogue = INTRO_DIALOGUE;

init(game.stage.width, game.stage.height, update);
dust().burst(200);
