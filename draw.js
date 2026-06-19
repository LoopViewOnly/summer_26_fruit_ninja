// draw.js

// FIX: ensure MediaPipe globals exist
const Hands = window.Hands;
const Camera = window.Camera;


// 5️⃣ Open the camera and track the index finger
export function start_camera(video_el, canvas_w, canvas_h, onFingerUpdate) {

  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });

  hands.onResults(results => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const tip = results.multiHandLandmarks[0][8];

      const fx = (1 - tip.x) * canvas_w;
      const fy = tip.y * canvas_h;

      onFingerUpdate(fx, fy);
    } else {
      onFingerUpdate(null, null);
    }
  });

  new Camera(video_el, {
    onFrame: async () => {
      await hands.send({ image: video_el });
    },
    width: canvas_w,
    height: canvas_h,
  }).start();
}


// 6️⃣ Draw everything on the screen
export function draw(now, state) {

  const {
    ctx, video_el, canvas_w, canvas_h, fruit_size, max_lives,
    fruits, trail, popups, score, lives, finger_x, finger_y
  } = state;

  // camera background
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

  // trail
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

  // popups
  const updatedPopups = popups.filter(p => {
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

  // finger glow
  if (finger_x !== null) {
    const glow = ctx.createRadialGradient(
      finger_x, finger_y, 2,
      finger_x, finger_y, 26
    );

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

  // UI
  document.getElementById("score-label").textContent = `Score: ${score}`;
  document.getElementById("lives-label").textContent =
    "❤️".repeat(lives) + "🖤".repeat(max_lives - lives);

  return { updatedPopups };
}