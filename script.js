// ── Settings ──────────────────────────────────
const canvas_w   = 640;
const canvas_h   = 480;
const fruit_size = 38;
const spawn_wait = 2500;   // wait longer before next fruit
const speed_min  = 1.2;    // fruits fall slower
const speed_max  = 2.5;
const max_lives  = 3;
const trail_len  = 18;

const fruit_list = [
  { emoji: "🍉", label: "watermelon" },
  { emoji: "🍊", label: "orange"     },
  { emoji: "🍎", label: "apple"      },
  { emoji: "🍋", label: "lemon"      },
  { emoji: "🍇", label: "grape"      },
  { emoji: "🍓", label: "strawberry" },
  { emoji: "🍑", label: "peach"      },
  { emoji: "💣", label: "bomb"       },
];


// ── Canvas + camera elements ───────────────────
const canvas   = document.getElementById("output-canvas");
const ctx      = canvas.getContext("2d");
const video_el = document.getElementById("input-video");


// ── Game data ───────────────────────────────────
let fruits, trail, popups, score, lives, game_over, last_drop;
let finger_x = null;
let finger_y = null;


// 1️⃣ Reset the game back to the start (simplest function — just sets values)
function new_game() {
  fruits    = [];
  trail     = [];
  popups    = [];
  score     = 0;
  lives     = max_lives;
  game_over = false;
  last_drop = performance.now();
}


// 2️⃣ Drop one fruit from the top at a random spot
function drop_fruit() {
  const pick = fruit_list[Math.floor(Math.random() * fruit_list.length)];  
  fruits.push({ //add a new fruit object into the fruits array
    x:      Math.random() * (canvas_w - fruit_size * 2) + fruit_size,
    y:      -fruit_size,
    speedX: (Math.random() - 0.5) * 2.5,
    speedY: speed_min + Math.random() * (speed_max - speed_min),
    emoji:  pick.emoji,
    label:  pick.label,
  });
}


// 3️⃣ Move every fruit down; remove the ones that fall off screen
function move_fruits() {
  fruits = fruits.filter(f => {
    f.x += f.speedX;
    f.y += f.speedY;
    if (f.y > canvas_h + fruit_size) {
      if (f.label !== "bomb") lives--;   // missed a fruit → lose a life
      return false;
    }
    return true;
  });
}


// 4️⃣ Check if the finger is touching any fruit or bomb
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
      return false;   // remove the sliced item
    }
    return true;
  });
}

// 5️⃣ Open the camera and track the index finger
function start_camera() {
  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
  });
  hands.setOptions({
    maxNumHands:            1,
    modelComplexity:        1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence:  0.5,
  });
  hands.onResults(results => {
    finger_x = null;
    finger_y = null;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const tip = results.multiHandLandmarks[0][8];   // index fingertip
      finger_x  = (1 - tip.x) * canvas_w;               // flip to match mirror
      finger_y  = tip.y * canvas_h;
    }
  });
  new Camera(video_el, {
    onFrame: async () => { await hands.send({ image: video_el }); },
    width: canvas_w, height: canvas_h,
  }).start();
}


// 6️⃣ Draw everything on the screen (the biggest function — draws each piece)
function draw(now) {
  // camera feed, mirrored
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video_el, -canvas_w, 0, canvas_w, canvas_h);
  ctx.restore();

  // fruits
  ctx.font = `${fruit_size * 1.5}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of fruits) {
    ctx.fillText(f.emoji, f.x, f.y);
  }

  // glowing trail behind the finger
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i];
    if (!a || !b) continue;
    const p = i / trail.length;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(0,255,220,${p})`;
    ctx.lineWidth = p * 10;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // "+1" popups that float upward
  popups = popups.filter(p => {
    const t = (now - p.born) / 500;
    if (t >= 1) return false;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.font = "bold 28px Segoe UI";
    ctx.fillStyle = "#00ffcc";
    ctx.fillText("+1", p.x, p.y - t * 70);
    ctx.restore();
    return true;
  });

  // glowing fingertip dot
  if (finger_x !== null) {
    const glow = ctx.createRadialGradient(finger_x, finger_y, 2, finger_x, finger_y, 26);
    glow.addColorStop(0, "rgba(0,255,200,1)");
    glow.addColorStop(1, "rgba(0,255,200,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(finger_x, finger_y, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(finger_x, finger_y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // score and lives
  document.getElementById("score-label").textContent = `Score: ${score}`;
  document.getElementById("lives-label").textContent =
    "❤️".repeat(lives) + "🖤".repeat(max_lives - lives);
}


// 7️⃣ The main game loop — ties everything above together
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

  draw(now);

  if (lives <= 0 || game_over) {
    show_game_over();
    return;   // stop the loop — game is over!
  }

  requestAnimationFrame(game_loop);
}


// 8️⃣ Show the Game Over screen
function show_game_over() {
  document.getElementById("final-score-text").textContent = `Final Score: ${score}`;
  document.getElementById("gameover-overlay").classList.remove("hidden");
}

// 9️⃣ Start and Restart — the hardest functions, since they kick off everything else
function start_game() {
  document.getElementById("start-overlay").classList.add("hidden");
  new_game();
  start_camera();
  requestAnimationFrame(game_loop);
}

function restart_game() {
  document.getElementById("gameover-overlay").classList.add("hidden");
  new_game();
  requestAnimationFrame(game_loop);
}