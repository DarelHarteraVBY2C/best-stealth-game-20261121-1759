// Silent Shadow — boot and the one loop.
// Input is read every frame, the game advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints
// what is there. The game moves between six screens: title, play,
// paused, caught, floor clear and win. ?shot=cover|patrol|alarm|win
// stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createGame, EVENT_GEM, EVENT_CAUGHT, EVENT_CLEAR } from './game.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_MUTE } from './input.js';
import { createSound } from './sound.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame();
const renderer = createRenderer(canvas);
const sound = createSound();

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game.state, scene.screen, game.state.time);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(window);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let lastStepSound = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    game.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Reach the green exit unseen.');
  }

  function nextLevel() {
    if (game.state.levelIndex + 1 >= 3) {
      screen = SCREEN_WIN;
      sound.win();
      announce('Ghost of the museum. All three floors cleared.');
      return;
    }
    game.loadLevel(game.state.levelIndex + 1);
    screen = SCREEN_PLAY;
    announce(`Level ${game.state.levelIndex + 1}. Reach the exit unseen.`);
  }

  function retryLevel() {
    game.loadLevel(game.state.levelIndex);
    screen = SCREEN_PLAY;
    announce('Try the floor again.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) sound.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_CAUGHT) {
      if (actions & (ACTION_CONFIRM | ACTION_RESTART)) retryLevel();
    } else if (screen === SCREEN_CLEAR) {
      if (actions & ACTION_CONFIRM) nextLevel();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        sound.alarmOff();
        announce('Paused.');
      } else if (actions & ACTION_RESTART) {
        retryLevel();
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step() {
    const events = game.step(STEP, input.direction(), input.isSneaking());
    const player = game.state.player;
    if (player.moving && game.state.time - lastStepSound > 0.28) {
      lastStepSound = game.state.time;
      sound.footstep();
    }
    if (events & EVENT_GEM) sound.gem();
    if (events & EVENT_CAUGHT) {
      screen = SCREEN_CAUGHT;
      sound.caught();
      sound.alarmOff();
      announce('Caught. Press R to try the floor again.');
      return;
    }
    if (events & EVENT_CLEAR) {
      screen = SCREEN_CLEAR;
      sound.levelClear();
      sound.alarmOff();
      announce(`${game.state.levelName} clear. Press Space for the next floor.`);
      return;
    }
    const hot = game.state.guards.some((g) => g.mode === 1 || g.suspicion > 50);
    if (hot) {
      sound.alarmOn();
      sound.alarmLevel(game.state.alarm);
    } else {
      sound.alarmOff();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(game.state, screen, game.state.time);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      sound.alarmOff();
      announce('Paused.');
    }
  });

  canvas.addEventListener('click', () => {
    sound.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN) startGame();
  });

  announce('Silent Shadow. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
