import { draw, start_camera } from './draw.js';

// ── Settings ──────────────────────────────────
const canvas_w   = 640;
const canvas_h   = 480;
const fruit_size = 38;
const spawn_wait = 2500;

const speed_min  = 1.2;
const speed_max  = 2.5;
const max_lives  = 3;
const trail_len  = 18;

const fruit_list = [
  { emoji: "🍉", label: "watermelon" },
  { emoji: "🍊", label: "orange" },
  { emoji: "🍎", label: "apple" },
  { emoji: "🍋", label: "lemon" },
  { emoji: "🍇", label: "grape" },
  { emoji: "🍓", label: "strawberry" },
  { emoji: "🍑", label: "peach" },
  { emoji: "💣", label: "bomb" },
];


// ── Canvas + elements ──────────────────────────────────
const canvas   = document.getElementById("output-canvas");
const ctx      = canvas.getContext("2d");
const video_el = document.getElementById("input-video");


// ── Game data ──────────────────────────────────
let fruits, trail, popups, score, lives, game_over, last_drop;
let finger_x = null;
let finger_y = null;


// 1️⃣ Reset game
function new_game() {
  fruits = [];
  trail = [];
  popups = [];

  score = 0;
  lives = max_lives;
  game_over = false;

  last_drop = performance.now();
}


// 2️⃣ Drop fruit
function drop_fruit() {
  const pick = fruit_list[Math.floor(Math.random() * fruit_list.length)];

  fruits.push({
    x: Math.random() * (canvas_w - fruit_size * 2) + fruit_size,
    y: -fruit_size,
    speedX: (Math.random() - 0.5) * 2.5,
    speedY: speed_min + Math.random() * (speed_max - speed_min),
    emoji: pick.emoji,
    label: pick.label,
  });
}


// 3️⃣ Move fruits
function move_fruits() {
  fruits = fruits.filter(f => {
    f.x += f.speedX;
    f.y += f.speedY;

    if (f.y > canvas_h + fruit_size) {
      if (f.label !== "bomb") lives--;
      return false;
    }

    return true;
  });
}


// 4️⃣ Slice check
function check_slices() {
  if (finger_x === null) return;

  fruits = fruits.filter(f => {
    const distance = Math.hypot(finger_x - f.x, finger_y - f.y);

    if (distance < fruit_size) {
      if (f.label === "bomb") {
        game_over = true;
      } else {
        score++;
        popups.push({ x: f.x, y: f.y, born: performance.now() });
      }
      return false;
    }

    return true;
  });
}


// 7️⃣ Game loop
function game_loop() {
  const now = performance.now();

  if (now - last_drop > spawn_wait) {
    drop_fruit();
    last_drop = now;
  }

  move_fruits();
  check_slices();

  trail.push(finger_x !== null ? { x: finger_x, y: finger_y } : null);
  if (trail.length > trail_len) trail.shift();

  const result = draw(now, {
    ctx, video_el, canvas_w, canvas_h, fruit_size, max_lives,
    fruits, trail, popups, score, lives, finger_x, finger_y
  });

  popups = result.updatedPopups;

  if (lives <= 0 || game_over) {
    show_game_over();
    return;
  }

  requestAnimationFrame(game_loop);
}


// 8️⃣ Game over
function show_game_over() {
  document.getElementById("final-score-text").textContent =
    `Final Score: ${score}`;

  document.getElementById("gameover-overlay").classList.remove("hidden");
}


// 9️⃣ Start game
function start_game() {
  document.getElementById("start-overlay").classList.add("hidden");

  new_game();

  start_camera(video_el, canvas_w, canvas_h, (x, y) => {
    finger_x = x;
    finger_y = y;
  });

  requestAnimationFrame(game_loop);
}


// restart
function restart_game() {
  document.getElementById("gameover-overlay").classList.add("hidden");

  new_game();

  requestAnimationFrame(game_loop);
}

window.start_game = start_game;
window.restart_game = restart_game;