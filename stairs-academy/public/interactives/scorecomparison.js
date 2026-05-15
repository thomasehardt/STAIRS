let BORTLE = 5,
  MOON_PHASE = 0.2,
  MOON_ALT = 10,
  CLOUD = 5,
  SEEING = 1.5,
  HUMIDITY = 50;
const FOV_MIN = 43,
  MIN_ALT = 30;

let PAIRS = [
  {
    a: {
      name: "Galaxy (bright core)",
      type: "Galaxy",
      mag: 8.0,
      size: [8, 4],
      alt: 65,
      color: [180, 180, 255],
    },
    b: {
      name: "Diffuse Nebula",
      type: "Emission Nebula",
      mag: 8.0,
      size: [120, 80],
      alt: 60,
      color: [255, 150, 100],
    },
  },
  {
    a: {
      name: "M57 Ring Nebula",
      type: "Planetary Nebula",
      mag: 8.8,
      size: [2.5, 2],
      alt: 70,
      color: [150, 220, 255],
    },
    b: {
      name: "NGC 7000 N. American",
      type: "Emission Nebula",
      mag: 9.0,
      size: [120, 90],
      alt: 50,
      color: [255, 180, 100],
    },
  },
  {
    a: {
      name: "M13 Globular Cluster",
      type: "Globular Cluster",
      mag: 5.8,
      size: [20, 20],
      alt: 60,
      color: [200, 200, 180],
    },
    b: {
      name: "M31 Andromeda Galaxy",
      type: "Galaxy",
      mag: 3.4,
      size: [180, 60],
      alt: 65,
      color: [200, 200, 255],
    },
  },
];
let pairIdx = 0;
let leftIsA = true;

function calc(t) {
  let size = t.size[0],
    area = t.size[0] * t.size[1],
    mag = t.mag;

  let fov = 100 * exp(-pow(size / FOV_MIN - 0.5, 2) / 0.1);
  fov = constrain(fov, 0, 100);

  let sb = mag + (2.5 * log(area)) / log(10) + 0.26 + 8.89;
  let sbS = constrain(((24 - sb) / (24 - 18)) * 100, 0, 100);

  let altS = constrain(((t.alt - MIN_ALT) / (90 - MIN_ALT)) * 100, 0, 100);

  let oss = fov * 0.4 + sbS * 0.3 + altS * 0.3;

  let cMult = CLOUD > 90 ? 0 : CLOUD > 20 ? 1 - (CLOUD - 20) / 70 : 1;
  let hMult = HUMIDITY > 85 ? 0.85 : 1;
  let seeMult =
    SEEING >= 4 ? 0.7 : SEEING > 1 ? 1 - ((SEEING - 1) / 3) * 0.3 : 1;
  let mMult = 1 - (MOON_PHASE * 0.5 * max(0, MOON_ALT)) / 90;
  let zPen = t.alt > 85 ? 1 - ((t.alt - 85) / 5) * 0.5 : 1;
  let sqs = constrain(cMult * hMult * seeMult * mMult * zPen, 0, 1);

  let rel = oss * sqs;
  let bMap = {
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
  let bMult = bMap[BORTLE] || 0.55;
  let aqs = rel * bMult;

  return { fov, sbS, altS, oss, sqs, rel, aqs, bMult, sb };
}

function setup() {
  let canvas = createCanvas(900, 640);
  canvas.parent("canvas-container");

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
  document.getElementById("swapBtn").addEventListener("click", () => {
    pairIdx = (pairIdx + 1) % PAIRS.length;
  });
}

function drawTargetPanel(x, y, w, h, target, scores, side) {
  // Target card
  fill(20, 20, 30);
  noStroke();
  rect(x, y, w, h, 6);
  stroke(side === "left" ? color(100, 200, 255, 80) : color(255, 200, 100, 80));
  strokeWeight(1);
  noFill();
  rect(x, y, w, h, 6);

  // Target icon (visual representation)
  fill(0, 0, 0, 30);
  noStroke();
  let iconCx = x + w / 2,
    iconCy = y + 70;
  let s = target.size[0] / target.size[1];
  let iw = min(100, 100 / max(s, 1));
  let ih = min(100, 100 * max(s, 1));
  if (s > 1) {
    iw = 100;
    ih = 100 / s;
  } else {
    ih = 100;
    iw = 100 * s;
  }
  fill(target.color[0] * 0.15, target.color[1] * 0.15, target.color[2] * 0.15);
  noStroke();
  if (target.type === "Galaxy") ellipse(iconCx, iconCy, iw, ih);
  else if (target.type.includes("Nebula"))
    ellipse(iconCx, iconCy, iw * 1.2, ih * 1.2);
  else if (target.type.includes("Cluster")) circle(iconCx, iconCy, 40);
  else circle(iconCx, iconCy, 15);

  fill(
    target.color[0] * 0.5,
    target.color[1] * 0.5,
    target.color[2] * 0.5,
    120,
  );
  if (target.type === "Galaxy") ellipse(iconCx, iconCy, iw * 0.6, ih * 0.6);
  else if (target.type.includes("Nebula"))
    ellipse(iconCx, iconCy, iw * 0.8, ih * 0.8);
  else if (target.type.includes("Cluster")) {
    for (let i = 0; i < 15; i++)
      circle(iconCx + random(-15, 15), iconCy + random(-15, 15), random(2, 5));
  } else circle(iconCx, iconCy, 8);

  // Name and type
  fill(255);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(13);
  text(target.name, x + w / 2, y + 8);
  fill(140);
  textSize(9);
  text(target.type, x + w / 2, y + 26);

  // Properties
  fill(120);
  textSize(9);
  textAlign(LEFT, TOP);
  text(
    "Mag: " +
      target.mag +
      "  Size: " +
      target.size[0] +
      "'×" +
      target.size[1] +
      "'",
    x + 12,
    y + 48,
  );

  // OSS breakdown bars
  let bars = [
    { label: "FOV", val: scores.fov, col: [100, 180, 255] },
    { label: "SB", val: scores.sbS, col: [100, 255, 180] },
    { label: "Alt", val: scores.altS, col: [255, 200, 100] },
  ];

  let by = y + 155;
  let bwTotal = w - 24;
  for (let b of bars) {
    let bw = map(b.val, 0, 100, 0, bwTotal);
    fill(40, 40, 50);
    noStroke();
    rect(x + 12, by, bwTotal, 12, 2);
    fill(b.col[0], b.col[1], b.col[2], 200);
    rect(x + 12, by, bw, 12, 2);
    fill(200);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(8);
    text(b.label, x + 14, by + 2);
    textAlign(RIGHT, TOP);
    text(nf(b.val, 1, 0), x + w - 14, by + 2);
    by += 16;
  }

  // Summary scores
  by += 4;
  let summaryBars = [
    { label: "OSS", val: scores.oss, col: [255, 150, 100] },
    { label: "SQS×100", val: scores.sqs * 100, col: [150, 200, 255] },
    { label: "Relative", val: scores.rel, col: [200, 255, 100] },
    { label: "AQS (final)", val: scores.aqs, col: [255, 100, 255], bold: true },
  ];
  for (let b of summaryBars) {
    let bw = map(b.val, 0, 100, 0, bwTotal);
    fill(50, 50, 60);
    noStroke();
    rect(x + 12, by, bwTotal, 15, 2);
    fill(b.col[0], b.col[1], b.col[2], b.bold ? 255 : 160);
    rect(x + 12, by, bw, 15, 2);
    fill(255);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(b.bold ? 10 : 8);
    text(b.label, x + 14, by + (b.bold ? 2 : 3));
    textAlign(RIGHT, TOP);
    text(nf(b.val, 1, 1), x + w - 14, by + (b.bold ? 2 : 3));
    by += 20;
  }
}

function drawLegend(x, y) {
  fill(80);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(8);
  text(
    "Bortle: " +
      BORTLE +
      "  |  Moon: " +
      nf(MOON_PHASE * 100, 1, 0) +
      "% @ " +
      MOON_ALT +
      "°  |  Clouds: " +
      CLOUD +
      "%  |  Seeing: " +
      nf(SEEING, 1) +
      '"',
    x,
    y,
  );
}

function draw() {
  background(17);

  let pair = PAIRS[pairIdx];
  let tA = leftIsA ? pair.a : pair.b;
  let tB = leftIsA ? pair.b : pair.a;
  let sA = calc(tA),
    sB = calc(tB);

  let panelW = 390,
    panelH = 390,
    gap = 30,
    panelY = 55;
  let leftX = 40,
    rightX = leftX + panelW + gap;

  // Panel labels
  fill(200);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  text("Target A", leftX, 35);
  textAlign(RIGHT, TOP);
  text("Target B", rightX + panelW, 35);

  // Draw comparison panels
  drawTargetPanel(leftX, panelY, panelW, panelH, tA, sA, "left");
  drawTargetPanel(rightX, panelY, panelW, panelH, tB, sB, "right");

  // Comparison bar — AQS difference
  let diff = sA.aqs - sB.aqs;
  let diffBarY = 470,
    diffBarX = 60,
    diffBarW = 540,
    diffBarH = 22;
  fill(30, 30, 40);
  noStroke();
  rect(diffBarX, diffBarY, diffBarW, diffBarH, 4);

  let total = sA.aqs + sB.aqs;
  if (total > 0) {
    let aFrac = sA.aqs / total;
    fill(100, 200, 255, 200);
    rect(diffBarX, diffBarY, diffBarW * aFrac, diffBarH, 4);
    fill(255, 200, 100, 200);
    if (aFrac < 1)
      rect(
        diffBarX + diffBarW * aFrac,
        diffBarY,
        diffBarW * (1 - aFrac),
        diffBarH,
        4,
      );
    fill(255);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(11);
    text(
      leftIsA ? "Target A" : "Target B",
      diffBarX + (diffBarW * aFrac) / 2,
      diffBarY + 3,
    );
    textAlign(CENTER, TOP);
    text(
      leftIsA ? "Target B" : "Target A",
      diffBarX + diffBarW * aFrac + (diffBarW * (1 - aFrac)) / 2,
      diffBarY + 3,
    );
  }

  // Winner callout
  let winner = diff > 0 ? tA : tB;
  let loser = diff > 0 ? tB : tA;
  fill(200);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(12);
  text(
    "Winner: " +
      winner.name +
      "  (AQS: " +
      nf(max(sA.aqs, sB.aqs), 1, 1) +
      " vs " +
      nf(min(sA.aqs, sB.aqs), 1, 1) +
      ")",
    diffBarX,
    diffBarY + 30,
  );
  fill(140);
  textSize(10);

  // Explanation
  text(
    "Why? " +
      loser.name +
      " is too diffuse — its light spreads over a large area,",
    diffBarX,
    diffBarY + 48,
  );
  text(
    "so surface brightness is low even if total magnitude is bright.",
    diffBarX,
    diffBarY + 64,
  );
  text(
    "Under Bortle " +
      BORTLE +
      " (×" +
      nf(sA.bMult, 2) +
      "), light pollution buries the diffuse signal.",
    diffBarX,
    diffBarY + 80,
  );
  fill(100);
  textSize(9);
  text(
    "The Bortle multiplier applies to the final relative score, punishing already-low-SB targets more.",
    diffBarX,
    diffBarY + 100,
  );

  // Legend — conditions
  fill(80);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(9);
  text(
    "Conditions: Bortle " +
      BORTLE +
      "  |  Moon: " +
      nf(MOON_PHASE * 100, 1, 0) +
      "% @ " +
      MOON_ALT +
      "°  |  Clouds: " +
      CLOUD +
      "%  |  Seeing: " +
      nf(SEEING, 1) +
      '"',
    60,
    507,
  );
}
