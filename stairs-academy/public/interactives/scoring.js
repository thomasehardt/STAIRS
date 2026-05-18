let step = -1;
let autoMode = false;
let autoTimer = 0;

let TARGETS = [
  {
    name: "M42 Orion Nebula",
    type: "Emission Nebula",
    mag: 4.0,
    size: [60, 40],
    alt: 55,
    color: [255, 150, 100],
  },
  {
    name: "M31 Andromeda",
    type: "Galaxy",
    mag: 3.4,
    size: [180, 60],
    alt: 65,
    color: [200, 200, 255],
  },
  {
    name: "M57 Ring Nebula",
    type: "Planetary Nebula",
    mag: 8.8,
    size: [2.5, 2],
    alt: 70,
    color: [150, 220, 255],
  },
  {
    name: "M13 Hercules Cluster",
    type: "Globular Cluster",
    mag: 5.8,
    size: [20, 20],
    alt: 60,
    color: [200, 200, 180],
  },
  {
    name: "NGC 7000 N. American",
    type: "Emission Nebula",
    mag: 9.0,
    size: [120, 90],
    alt: 50,
    color: [255, 180, 100],
  },
  {
    name: "NGC 7331 Deer Lick",
    type: "Galaxy",
    mag: 9.5,
    size: [10, 4],
    alt: 65,
    color: [180, 180, 240],
  },
];
let selectedIdx = 0;
let target;

let FOV_MIN = 43; // Seestar S50 smaller sensor dimension in arcmin
let MIN_ALT = 30;
let BORTLE = 5;
let MOON_PHASE = 0.3;
let MOON_ALT = 15;
let CLOUD = 10;
let SEEING = 1.5;
let HUMIDITY = 50;

let fovScore = 0,
  sbScore = 0,
  altScore = 0;
let oss = 0,
  sqs = 1,
  finalRel = 0,
  aqs = 0;
let bortleMult = 0;

function calcScores() {
  let size = target.size[0];
  let area = target.size[0] * target.size[1];
  let mag = target.mag;

  fovScore = 100 * exp(-pow(size / FOV_MIN - 0.5, 2) / 0.1);
  fovScore = constrain(fovScore, 0, 100);

  let sb = mag + (2.5 * log(area)) / log(10) + 0.26 + 8.89;
  sbScore = constrain(((24 - sb) / (24 - 18)) * 100, 0, 100);

  altScore = constrain(((target.alt - MIN_ALT) / (90 - MIN_ALT)) * 100, 0, 100);

  oss = fovScore * 0.4 + sbScore * 0.3 + altScore * 0.3;

  let cloudMult = CLOUD > 90 ? 0 : CLOUD > 20 ? 1 - (CLOUD - 20) / 70 : 1;
  let humidMult = HUMIDITY > 85 ? 0.85 : 1;
  let seeingMult =
    SEEING >= 4 ? 0.7 : SEEING > 1 ? 1 - ((SEEING - 1) / 3) * 0.3 : 1;
  let moonMult = 1 - (MOON_PHASE * 0.5 * max(0, MOON_ALT)) / 90;
  let zenithPen = target.alt > 85 ? 1 - ((target.alt - 85) / 5) * 0.5 : 1;
  let meridianPen = 1;

  sqs = cloudMult * humidMult * seeingMult * moonMult * zenithPen * meridianPen;
  sqs = constrain(sqs, 0, 1);

  finalRel = oss * sqs;

  const bortleMap = {
    1: 1,
    2: 0.95,
    3: 0.9,
    4: 0.75,
    5: 0.55,
    6: 0.35,
    7: 0.2,
    8: 0.1,
    9: 0.05,
  };
  bortleMult = bortleMap[BORTLE] || 0.55;
  aqs = finalRel * bortleMult;
}

function setup() {
  let canvas = createCanvas(860, 620);
  canvas.parent("canvas-container");
  selectTarget(0);

  document.getElementById("targetSelect").addEventListener("change", (e) => {
    selectTarget(e.target.selectedIndex);
  });

  document.getElementById("bortleSlider").addEventListener("input", (e) => {
    BORTLE = parseInt(e.target.value);
    document.getElementById("bortleVal").innerText = BORTLE;
  });
  document.getElementById("moonSlider").addEventListener("input", (e) => {
    MOON_PHASE = parseInt(e.target.value) / 100;
    document.getElementById("moonVal").innerText = e.target.value + "%";
  });
  document.getElementById("cloudSlider").addEventListener("input", (e) => {
    CLOUD = parseInt(e.target.value);
    document.getElementById("cloudVal").innerText = CLOUD + "%";
  });

  document.getElementById("stepBtn").addEventListener("click", () => {
    if (step >= 6) step = -1;
    step++;
    autoMode = false;
    document.getElementById("autoBtn").textContent = "▶ Auto";
    document.getElementById("autoBtn").classList.remove("active");
  });

  document.getElementById("autoBtn").addEventListener("click", () => {
    autoMode = !autoMode;
    document.getElementById("autoBtn").textContent = autoMode
      ? "⏸ Pause"
      : "▶ Auto";
    document.getElementById("autoBtn").classList.toggle("active", autoMode);
    if (autoMode) step = 0;
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    step = -1;
    autoMode = false;
    document.getElementById("autoBtn").textContent = "▶ Auto";
    document.getElementById("autoBtn").classList.remove("active");
  });
}

function selectTarget(idx) {
  selectedIdx = idx;
  target = TARGETS[idx];
  calcScores();
}

function keyPressed() {
  if (key === "ArrowRight") selectTarget((selectedIdx + 1) % TARGETS.length);
  if (key === "ArrowLeft")
    selectTarget((selectedIdx + TARGETS.length - 1) % TARGETS.length);
}

function draw() {
  background(17);

  if (autoMode) {
    autoTimer += deltaTime / 1000;
    if (autoTimer > 2) {
      autoTimer = 0;
      if (step < 6) step++;
    }
  }

  calcScores();

  // Pipeline cards
  let steps = [
    {
      label: "FOV Fit",
      score: fovScore,
      detail: "40% weight",
      formula: "100 × exp(−((S/FOVₘᵢₙ−0.5)²)/0.1)",
      col: [100, 180, 255],
    },
    {
      label: "Surface Bright.",
      score: sbScore,
      detail: "30% weight",
      formula: "(24−SB)/(24−18)×100",
      col: [100, 255, 180],
    },
    {
      label: "Altitude Score",
      score: altScore,
      detail: "30% weight",
      formula: "(pkAlt−30)/(90−30)×100",
      col: [255, 200, 100],
    },
    {
      label: "OSS",
      score: oss,
      detail: "Weighted sum",
      formula: "FOV×0.4+SB×0.3+ALT×0.3",
      col: [255, 150, 100],
    },
    {
      label: "SQS",
      score: sqs * 100,
      detail: "Sky Quality",
      formula: "cloud×humid×seeing×moon×zenith",
      col: [150, 200, 255],
    },
    {
      label: "Relative Score",
      score: finalRel,
      detail: "OSS × SQS",
      formula: "OSS × SQS",
      col: [200, 255, 100],
    },
    {
      label: "AQS",
      score: aqs,
      detail: "× Bortle",
      formula: "Relative × BortleMult",
      col: [255, 100, 255],
    },
  ];

  // Draw pipeline flow
  let startX = 20,
    cardW = 105,
    cardH = 75,
    gap = 10;
  let rowY = 200;

  for (let i = 0; i < steps.length; i++) {
    let x = startX + i * (cardW + gap);
    let s = steps[i];
    let isActive = step >= i;
    let isCurrent = step === i;
    let alpha = isActive ? 255 : 40;
    let col = s.col;

    fill(20, 20, 30, alpha);
    noStroke();
    rect(x, rowY, cardW, cardH, 5);
    stroke(
      isCurrent ? color(col[0], col[1], col[2], 255) : color(60, 60, 80, alpha),
    );
    strokeWeight(isCurrent ? 2 : 1);
    noFill();
    rect(x, rowY, cardW, cardH, 5);

    fill(col[0], col[1], col[2], alpha);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(13);
    text(s.label, x + cardW / 2, rowY + 5);
    textSize(20);
    textStyle(BOLD);
    text(
      (i < 4 ? nf(s.score, 1, 0) : nf(s.score, 1, 1)) + (i === 4 ? "%" : ""),
      x + cardW / 2,
      rowY + 24,
    );
    textStyle(NORMAL);
    textSize(11);
    fill(150, 150, 170, alpha);
    text(s.detail, x + cardW / 2, rowY + 48);

    // Arrow between cards
    if (i < steps.length - 1) {
      let ax = x + cardW + 2;
      fill(80, 80, 100, alpha);
      noStroke();
      textSize(15);
      text("→", ax, rowY + cardH / 2 - 8);
    }
  }

  // Formula popup for current step
  if (step >= 0 && step < steps.length) {
    let s = steps[step];
    let fx = 20,
      fy = rowY + cardH + 25,
      fw = 820,
      fh = 65;
    fill(30, 30, 45, 240);
    stroke(60, 60, 90);
    strokeWeight(1);
    rect(fx, fy, fw, fh, 5);
    fill(s.col[0], s.col[1], s.col[2], 255);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(16);
    textStyle(BOLD);
    text(
      s.label +
        " = " +
        s.formula +
        " → " +
        (step < 4 ? nf(s.score, 1, 0) : nf(s.score, 1, 1)),
      fx + 15,
      fy + 10,
    );
    textStyle(NORMAL);
    textSize(14);
    fill(200);
    let desc = "";
    if (step === 0)
      desc =
        "Gaussian centered at FOV_min. Targets near " +
        FOV_MIN +
        "' get max score. Too small or too large → penalized.";
    if (step === 1)
      desc =
        "Surface brightness combines magnitude and angular area. Diffuse objects have lower SB.";
    if (step === 2)
      desc =
        "Score based on peak altitude above " +
        MIN_ALT +
        "°. Higher is better — less atmosphere.";
    if (step === 3)
      desc = "OSS = FOV×0.4 + SB×0.3 + ALT×0.3. FOV weight is highest (40%).";
    if (step === 4)
      desc =
        "SQS combines weather (cloud, humidity, seeing), moon, zenith/meridian penalties into 0–1 mult.";
    if (step === 5)
      desc =
        "Final Relative Score = OSS × SQS. Current value: " +
        nf(finalRel, 1, 1) +
        " / 100.";
    if (step === 6)
      desc =
        "AQS = Relative × BortleMult(" +
        nf(bortleMult, 2) +
        "). Bortle " +
        BORTLE +
        " pollution cuts score by " +
        nf((1 - bortleMult) * 100, 1, 0) +
        "%.";
    fill(160);
    noStroke();
    textSize(13);
    text(desc, fx + 15, fy + 35);
  }

  // Target info — top left
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(20);
  text(target.name, 20, 20);
  fill(140);
  textSize(14);
  text(
    target.type +
      "  |  Mag: " +
      target.mag +
      "  |  Size: " +
      target.size[0] +
      "'×" +
      target.size[1] +
      "'  |  Peak Alt: " +
      target.alt +
      "°",
    20,
    45,
  );

  // Arrow keys hint
  fill(80);
  textAlign(LEFT, TOP);
  textSize(12);
  text("← → to change target", 20, 70);

  // Right panel — score gauge
  let gx = 640,
    gy = 25,
    gw = 200,
    gh = 170;
  fill(25, 25, 35);
  noStroke();
  rect(gx, gy, gw, gh, 6);
  stroke(50);
  strokeWeight(1);
  noFill();
  rect(gx, gy, gw, gh, 6);

  fill(200);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(16);
  text("Final Scores", gx + gw / 2, gy + 10);

  let bars = [
    { label: "OSS", val: oss, col: [255, 150, 100] },
    { label: "SQS×100", val: sqs * 100, col: [150, 200, 255] },
    { label: "Relative", val: finalRel, col: [200, 255, 100] },
    { label: "AQS", val: aqs, col: [255, 100, 255], active: true },
  ];

  let barY = gy + 35;
  for (let b of bars) {
    let bw = map(b.val, 0, 100, 0, gw - 30);
    fill(40, 40, 50);
    noStroke();
    rect(gx + 15, barY, gw - 30, 18, 2);
    fill(b.col[0], b.col[1], b.col[2], b.active ? 255 : 150);
    rect(gx + 15, barY, bw, 18, 2);
    fill(200);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(12);
    text(b.label, gx + 18, barY + 3);
    textAlign(RIGHT, TOP);
    text(nf(b.val, 1, 1), gx + gw - 18, barY + 3);
    barY += 24;
  }

  // Bortle indicator
  barY += 5;
  fill(100);
  textAlign(CENTER, TOP);
  textSize(12);
  text(
    "Bortle " + BORTLE + "  (mult: ×" + nf(bortleMult, 2) + ")",
    gx + gw / 2,
    barY,
  );

  // Conditions panel — bottom
  let cx = 20,
    cy = 310,
    cw = 580,
    ch = 65;
  fill(25, 25, 35);
  noStroke();
  rect(cx, cy, cw, ch, 5);
  fill(150);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(13);
  text(
    "Conditions:  Bortle " +
      BORTLE +
      "  |  Moon phase: " +
      nf(MOON_PHASE * 100, 1, 0) +
      "%  |  Moon alt: " +
      MOON_ALT +
      "°  |  Clouds: " +
      CLOUD +
      "%  |  Seeing: " +
      nf(SEEING, 1) +
      '"  |  Humidity: ' +
      HUMIDITY +
      "%",
    cx + 10,
    cy + 8,
  );
  fill(80);
  textSize(12);
  text(
    "These affect SQS (Sky Quality Score), reducing the raw OSS down to the final relative score.",
    cx + 10,
    cy + 26,
  );
  fill(120);
  textSize(11);
  text(
    "Tip: Click the controls above the canvas to adjust conditions and see how scores change.",
    cx + 10,
    cy + 45,
  );
}

function mousePressed() {
  if (
    mouseX > 20 &&
    mouseX < 20 + 105 * 7 + 10 * 6 &&
    mouseY > 200 &&
    mouseY < 275
  ) {
    let idx = floor((mouseX - 20) / (105 + 10));
    if (idx >= 0 && idx < 7) {
      step = idx;
      autoMode = false;
    }
  }
}
