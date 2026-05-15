let showBias = false,
  showDark = false,
  showFlat = false;
let cleanBuffer, vignetteBuffer, ampGlowBuffer, noiseBuffer;
let hotPixels = [],
  noiseDots = [];
let nebPatches = [],
  stars = [];
let time = 0;

function preRenderNoise(g) {
  g.loadPixels();
  let d = g.pixels;
  for (let i = 0; i < 500 * 500; i++) {
    let v = randomGaussian(0, 10);
    let idx = i * 4;
    d[idx] = 128 + v;
    d[idx + 1] = 128 + v;
    d[idx + 2] = 128 + v;
    d[idx + 3] = 255;
  }
  for (let i = 0; i < 500 * 4; i += 4) {
    d[i] = 0;
    d[i + 1] = 0;
    d[i + 2] = 0;
    d[i + 3] = 0;
  }
  for (let i = 0; i < 500; i++) {
    for (let j = 0; j < 4; j++) d[(i * 500 + 499) * 4 + j] = 0;
  }
  g.updatePixels();
}

function setup() {
  let canvas = createCanvas(860, 620);
  canvas.parent("canvas-container");
  pixelDensity(1);

  cleanBuffer = createGraphics(500, 500);
  vignetteBuffer = createGraphics(500, 500);
  ampGlowBuffer = createGraphics(500, 500);
  noiseBuffer = createImage(500, 500);

  // Clean signal
  let g = cleanBuffer;
  g.background(0, 0, 8);
  for (let i = 0; i < 70; i++) {
    stars.push({
      x: random(500),
      y: random(500),
      sz: random(0.4, 2.8),
      b: random(80, 255),
    });
  }
  for (let s of stars) {
    g.noStroke();
    g.fill(s.b * 0.9, s.b * 0.85, s.b);
    g.ellipse(s.x, s.y, s.sz, s.sz);
  }
  noiseDetail(3, 0.5);
  for (let i = 0; i < 250; i++) {
    let a = random(TWO_PI),
      r = pow(random(), 0.5) * 120;
    nebPatches.push({
      x: 250 + cos(a) * r,
      y: 250 + sin(a) * r * 0.55,
      sz: random(6, 28),
      hue: random(),
      warp: random(TWO_PI),
    });
  }
  for (let p of nebPatches) {
    let n = noise(p.x * 0.02, p.y * 0.02);
    let a = constrain(n * 0.8, 0.05, 0.7);
    let r = lerp(160, 100, p.hue) + n * 60;
    let gr = lerp(60, 50, p.hue) + n * 35;
    let b = lerp(100, 190, p.hue) + n * 45;
    g.fill(r, gr, b, a * 255);
    g.noStroke();
    g.ellipse(p.x, p.y, p.sz * (0.5 + n * 0.5), p.sz * 0.35);
  }
  g.fill(255, 230, 240, 80);
  g.ellipse(250, 250, 10, 7);

  // Vignetting
  let vg = vignetteBuffer;
  vg.noStroke();
  let steps = 200;
  for (let i = 0; i < steps; i++) {
    let t = i / steps;
    let a = pow(t, 2.5) * 100;
    vg.fill(0, 0, 0, a);
    let m = t * 250;
    vg.rect(m, m, 500 - m * 2, 500 - m * 2);
  }

  // Amp glow — layered ellipses from bottom-right
  let ag = ampGlowBuffer;
  ag.noStroke();
  for (let i = 10; i >= 0; i--) {
    let h = i / 10;
    let a = pow(1 - h, 3) * 70;
    ag.fill(180, 80, 140, a);
    ag.ellipse(500, 500, 500 * h, 500 * h);
  }
  for (let i = 6; i >= 0; i--) {
    let h = i / 6;
    let a = pow(1 - h, 2) * 40;
    ag.fill(255, 180, 100, a);
    ag.ellipse(500, 500, 300 * h, 300 * h);
  }

  // Read noise buffer
  preRenderNoise(noiseBuffer);

  // Hot pixels
  for (let i = 0; i < 80; i++) {
    hotPixels.push({
      x: random(500),
      y: random(500),
      b: random(150, 255),
      r: random(0.7, 1.3),
    });
  }

  // Noise dots (subsampled for speed)
  for (let i = 0; i < 4000; i++) {
    noiseDots.push({
      x: random(500),
      y: random(500),
      v: randomGaussian(0, 1),
    });
  }

  // Controls
  function toggle(id, ref) {
    document.getElementById(id).addEventListener("click", () => {
      ref.value = !ref.value;
      document.getElementById(id).classList.toggle("active");
    });
  }
  let biasState = { value: false },
    darkState = { value: false },
    flatState = { value: false };
  toggle("biasBtn", biasState);
  toggle("darkBtn", darkState);
  toggle("flatBtn", flatState);
  Object.defineProperty(biasState, "value", {
    get: () => showBias,
    set: (v) => (showBias = v),
  });
  Object.defineProperty(darkState, "value", {
    get: () => showDark,
    set: (v) => (showDark = v),
  });
  Object.defineProperty(flatState, "value", {
    get: () => showFlat,
    set: (v) => (showFlat = v),
  });

  document.getElementById("allBtn").addEventListener("click", () => {
    showBias = showDark = showFlat = true;
    document
      .querySelectorAll(".controls button")
      .forEach((b) =>
        b.classList.toggle("active", b.id !== "allBtn" && b.id !== "resetBtn"),
      );
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    showBias = showDark = showFlat = false;
    document
      .querySelectorAll(".controls button")
      .forEach((b) => b.classList.remove("active"));
  });

  document.getElementById("biasBtn").classList.remove("active");
  document.getElementById("darkBtn").classList.remove("active");
  document.getElementById("flatBtn").classList.remove("active");
}

function drawReadNoise() {
  strokeWeight(1);
  noStroke();
  for (let s of noiseDots) {
    let a = constrain(abs(s.v) * 25, 0, 55);
    if (s.v > 0) fill(255, 255, 255, a);
    else fill(0, 0, 0, a);
    rect(20 + s.x, 20 + s.y, 1, 1);
  }
}

function drawHotPixels() {
  noStroke();
  for (let p of hotPixels) {
    let flicker = 0.7 + random() * 0.6;
    fill(p.b * flicker * p.r, p.b * flicker * 0.3, p.b * flicker * 0.2, 200);
    rect(20 + p.x, 20 + p.y, random(1, 2.5), random(1, 2.5));
  }
}

function drawCalibPreview(x, y, s, label, type) {
  fill(25, 25, 35, 200);
  noStroke();
  rect(x, y, s, s, 4);
  stroke(80);
  strokeWeight(1);
  noFill();
  rect(x, y, s, s, 4);
  fill(200);
  noStroke();
  textSize(9);
  textAlign(LEFT, TOP);
  text(label, x + 4, y + 3);

  let preview = null;
  if (type === "bias") preview = noiseBuffer;
  else if (type === "dark") preview = ampGlowBuffer;
  else if (type === "flat") vignetteBuffer;

  if (type === "bias") {
    image(noiseBuffer, x + 4, y + 16, s - 8, s - 8);
  } else if (type === "dark") {
    let pg = createGraphics(s - 8, s - 8);
    pg.background(0);
    for (let i = 6; i >= 0; i--) {
      let h = i / 6;
      pg.noStroke();
      pg.fill(180 * (1 - h), 80 * (1 - h), 140 * (1 - h), pow(1 - h, 2) * 80);
      pg.ellipse(s - 8, s - 8, (s - 8) * h, (s - 8) * h);
    }
    image(pg, x + 4, y + 16);
    pg.remove();
  } else if (type === "flat") {
    let pg = createGraphics(s - 8, s - 8);
    pg.noStroke();
    let st = 30;
    for (let i = 0; i < st; i++) {
      let t = i / st;
      pg.fill(
        255 * (1 - t * 0.5),
        255 * (1 - t * 0.5),
        255 * (1 - t * 0.5),
        pow(t, 2) * 100,
      );
      let m = (t * (s - 8)) / 2;
      pg.rect(m, m, s - 8 - m * 2, s - 8 - m * 2);
    }
    image(pg, x + 4, y + 16);
    pg.remove();
  }
}

function draw() {
  time++;
  background(17);

  // Main image
  image(cleanBuffer, 20, 20);
  if (!showFlat) image(vignetteBuffer, 20, 20);
  if (!showDark) {
    image(ampGlowBuffer, 20, 20);
    drawHotPixels();
  }
  if (!showBias) drawReadNoise();

  // Border around image
  noFill();
  stroke(60);
  strokeWeight(1);
  rect(20, 20, 500, 500);

  // Labels on image
  let calOn = (showBias ? 1 : 0) + (showDark ? 1 : 0) + (showFlat ? 1 : 0);
  fill(calOn === 3 ? color(100, 255, 100) : color(255, 200, 100));
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  let label =
    calOn === 0
      ? "Raw (uncalibrated)"
      : calOn === 3
        ? "Calibrated"
        : "Partially calibrated";
  text(label, 28, 28);

  // Right panel
  let rx = 540,
    ry = 20;
  fill(255);
  noStroke();
  textSize(18);
  textAlign(LEFT);
  text("Calibration Frames", rx, ry);
  ry += 30;

  fill(140);
  textSize(11);
  text("Each frame captures a specific", rx, ry);
  ry += 16;
  text("artifact. Toggle to apply.", rx, ry);
  ry += 28;

  // Status
  fill(200);
  textSize(13);
  text("Status", rx, ry);
  ry += 5;
  let statusStr = showBias ? "Bias \u2713  " : "Bias \u2717  ";
  statusStr += showDark ? "Dark \u2713  " : "Dark \u2717  ";
  statusStr += showFlat ? "Flat \u2713" : "Flat \u2717";
  fill(calOn === 3 ? color(100, 255, 100) : 200);
  textSize(15);
  text(statusStr, rx, ry + 20);
  ry += 45;

  // Calibration preview panels
  drawCalibPreview(rx, ry, 55, "Master Bias", "bias");
  ry += 60;
  drawCalibPreview(rx, ry, 55, "Master Dark", "dark");
  ry += 60;
  drawCalibPreview(rx, ry, 55, "Master Flat", "flat");
  ry += 72;

  // Descriptions
  fill(160);
  textSize(11);
  text("Bias: zero-length exposure,", rx, ry);
  ry += 16;
  text("captures read noise pattern.", rx, ry);
  ry += 20;

  text("Dark: lens-cap exposure at", rx, ry);
  ry += 16;
  text("same duration & temp, captures", rx, ry);
  ry += 16;
  text("amp glow + hot pixels.", rx, ry);
  ry += 20;

  text("Flat: evenly-lit panel, captures", rx, ry);
  ry += 16;
  text("vignetting + dust shadows.", rx, ry);
  ry += 20;

  // Bottom info
  ry += 8;
  fill(100);
  textSize(10);
  text("Tip: apply Bias first, then", rx, ry);
  ry += 15;
  text("Dark, then Flat for best", rx, ry);
  ry += 15;
  text("results.", rx, ry);
}
