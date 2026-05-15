let READ_NOISE = 3.0,
  BORTLE = 5,
  QE = 0.8;
const APERTURE_MM = 50,
  FOCAL_MM = 250,
  PIXEL_PITCH_UM = 2.9;
const BORTLE_SKY_MAG = {
  1: 22,
  2: 21.6,
  3: 21,
  4: 20.4,
  5: 19.8,
  6: 19.2,
  7: 18.6,
  8: 18,
  9: 17.4,
};

function calcSkyFlux() {
  let bSky = BORTLE_SKY_MAG[BORTLE] || 19.8;
  let pxScale = (206.265 * PIXEL_PITCH_UM) / FOCAL_MM;
  let apCm2 = PI * (APERTURE_MM / 20) ** 2;
  let mZp = 1e7;
  let skyFluxAs2 = mZp * 10 ** (0.4 * -bSky);
  return skyFluxAs2 * pxScale ** 2 * apCm2 * QE;
}

function setup() {
  let canvas = createCanvas(860, 620);
  canvas.parent("canvas-container");

  function s(id, vId, cb) {
    document.getElementById(id).addEventListener("input", (e) => {
      cb(e);
      document.getElementById(vId).innerText = e.target.value;
    });
  }
  s("rnSlider", "rnVal", (e) => {
    READ_NOISE = parseFloat(e.target.value);
  });
  s("bortleSlider", "bortleVal", (e) => {
    BORTLE = parseInt(e.target.value);
  });
  s("qeSlider", "qeVal", (e) => {
    QE = parseInt(e.target.value) / 100;
  });
}

function draw() {
  background(17);

  let skyFlux = calcSkyFlux();
  let optSub = skyFlux > 0 ? (10 * READ_NOISE ** 2) / skyFlux : 300;
  let practicalSub = constrain(optSub, 10, 20);
  let maxT = 60;
  let maxN = max(skyFlux * maxT, READ_NOISE * 5, 1);

  // Main plot
  let px = 60,
    py = 120,
    pw = 520,
    ph = 340;
  fill(15, 15, 25);
  noStroke();
  rect(px, py, pw, ph);
  stroke(50);
  strokeWeight(0.5);
  noFill();
  rect(px, py, pw, ph);

  fill(120);
  noStroke();
  textSize(9);
  textAlign(CENTER, BOTTOM);
  text("Sub-exposure time (s)", px + pw / 2, py + ph + 18);
  textAlign(LEFT, TOP);
  text("Noise (e\u207b\u00b9)", px - 5, py + 5);

  // Grid lines
  for (let t = 0; t <= maxT; t += 10) {
    stroke(30);
    strokeWeight(0.5);
    line(px + map(t, 0, maxT, 0, pw), py, px + map(t, 0, maxT, 0, pw), py + ph);
    fill(60);
    noStroke();
    textSize(7);
    textAlign(CENTER, TOP);
    text(t, px + map(t, 0, maxT, 0, pw), py + ph + 2);
  }

  // Curves
  let res = 200;
  noFill();

  // Sky noise
  stroke(100, 180, 255, 150);
  strokeWeight(1.5);
  beginShape();
  for (let i = 0; i <= res; i++) {
    let t = (i / res) * maxT;
    let n = sqrt(skyFlux * t);
    vertex(px + map(t, 0, maxT, 0, pw), py + ph - map(n, 0, maxN, 0, ph - 20));
  }
  endShape();

  // Total noise
  stroke(255, 200, 100, 150);
  strokeWeight(1.5);
  beginShape();
  for (let i = 0; i <= res; i++) {
    let t = (i / res) * maxT;
    let n = sqrt(READ_NOISE ** 2 + skyFlux * t);
    vertex(px + map(t, 0, maxT, 0, pw), py + ph - map(n, 0, maxN, 0, ph - 20));
  }
  endShape();

  // Swamp ratio
  stroke(100, 255, 100, 120);
  strokeWeight(1);
  beginShape();
  for (let i = 0; i <= res; i++) {
    let t = (i / res) * maxT;
    let r = t > 0 ? sqrt(skyFlux * t) / READ_NOISE : 0;
    vertex(px + map(t, 0, maxT, 0, pw), py + ph - map(r, 0, 15, 0, ph - 20));
  }
  endShape();

  // Read noise (constant line)
  stroke(255, 80, 80, 150);
  strokeWeight(1.5);
  let rnY = py + ph - map(READ_NOISE, 0, maxN, 0, ph - 20);
  drawingContext.setLineDash([5, 5]);
  line(px, rnY, px + pw, rnY);
  drawingContext.setLineDash([]);
  fill(255, 80, 80);
  noStroke();
  textSize(8);
  textAlign(LEFT, BOTTOM);
  text(
    "Read noise: " + nf(READ_NOISE, 1, 1) + " e\u207b\u00b9",
    px + pw - 90,
    rnY - 2,
  );

  // Optimal sub marker
  if (optSub <= maxT) {
    let ox = px + map(optSub, 0, maxT, 0, pw);
    stroke(100, 255, 100);
    strokeWeight(2);
    line(ox, py + 5, ox, py + ph - 5);
    fill(100, 255, 100);
    noStroke();
    textSize(9);
    textAlign(CENTER, BOTTOM);
    text("Optimal: " + nf(optSub, 1, 0) + "s", ox, py + ph + 14);
  }

  // Practical sub marker
  let pracX = px + map(practicalSub, 0, maxT, 0, pw);
  stroke(255, 200, 100);
  strokeWeight(2);
  line(pracX, py + 5, pracX, py + ph - 5);
  fill(255, 200, 100);
  noStroke();
  textSize(9);
  textAlign(CENTER, BOTTOM);
  text("Practical: " + nf(practicalSub, 1, 0) + "s", pracX, py + ph + 14);

  // Legend
  let ly = py + 8;
  for (let l of [
    { label: "Sky noise", col: [100, 180, 255] },
    { label: "Total noise", col: [255, 200, 100] },
    {
      label:
        "Swamp ratio (×" +
        nf(sqrt(skyFlux * practicalSub) / READ_NOISE, 1, 1) +
        ")",
      col: [100, 255, 100],
    },
    { label: "Read noise floor", col: [255, 80, 80] },
  ]) {
    fill(l.col[0], l.col[1], l.col[2], 200);
    noStroke();
    textSize(8);
    textAlign(LEFT, TOP);
    text("\u25A0 " + l.label, px + 8, ly);
    ly += 14;
  }

  // Right info panel
  let rx = 610,
    ry = 30;
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  text("Sensors & Conditions", rx, ry);
  ry += 26;
  fill(140);
  textSize(11);
  text(
    "Telescope: " + APERTURE_MM + "mm f/" + nf(FOCAL_MM / APERTURE_MM, 1),
    rx,
    ry,
  );
  ry += 16;
  text("Pixel pitch: " + PIXEL_PITCH_UM + "\u00b5m", rx, ry);
  ry += 16;
  text("QE: " + nf(QE * 100, 1, 0) + "%", rx, ry);
  ry += 16;
  text("Bortle: " + BORTLE, rx, ry);
  ry += 22;

  fill(200);
  textSize(12);
  text("Results", rx, ry);
  ry += 18;
  fill(255);
  textSize(14);
  text("Sky flux: " + nf(skyFlux, 1, 2) + " e\u207b\u00b9/px/s", rx, ry);
  ry += 20;
  text("Optimal sub: " + nf(optSub, 1, 0) + "s", rx, ry);
  ry += 20;
  text("Practical: " + nf(practicalSub, 1, 0) + "s", rx, ry);
  ry += 20;

  let actualRatio = sqrt(skyFlux * practicalSub) / READ_NOISE;
  text("Swamp ratio: " + nf(actualRatio, 1, 1) + "\u00d7", rx, ry);
  ry += 24;

  fill(140);
  textSize(10);
  text("Rule: swamp read noise by", rx, ry);
  ry += 14;
  text("10\u00d7 for optimal SNR.", rx, ry);
  ry += 14;
  text("Alt-Az clamped to 10\u201320s.", rx, ry);
  ry += 14;
  text("EQ mounts: 30\u2013300s.", rx, ry);
  ry += 14;

  // Formula
  ry = 320;
  fill(25, 25, 35);
  noStroke();
  rect(rx, ry, 230, 90, 5);
  fill(160);
  textSize(10);
  textAlign(LEFT, TOP);
  text(
    "t\u2092\u2091\u2096 = 10 \u00d7 R\u00b2 / S\u209b\u2096\u2097",
    rx + 10,
    ry + 8,
  );
  fill(100);
  textSize(8);
  text("R = read noise (" + READ_NOISE + " e\u207b\u00b9)", rx + 10, ry + 26);
  text(
    "S\u209b\u2096\u2097 = sky flux (" +
      nf(skyFlux, 1, 2) +
      " e\u207b\u00b9/px/s)",
    rx + 10,
    ry + 40,
  );
  text(
    "= " + nf(optSub, 1, 0) + "s (" + (actualRatio >= 10 ? "OK" : "low") + ")",
    rx + 10,
    ry + 54,
  );

  // Swamp threshold indicator
  ry = 430;
  fill(30, 30, 40);
  noStroke();
  rect(rx, ry, 230, 40, 4);
  fill(actualRatio >= 10 ? color(100, 255, 100) : color(255, 200, 100));
  textSize(12);
  textAlign(CENTER, TOP);
  text(
    actualRatio >= 10
      ? "\u2713 Swamped (\u226510\u00d7)"
      : "\u26A0 Below 10\u00d7 target",
    rx + 115,
    ry + 10,
  );
  fill(100);
  textSize(9);
  let ratioText =
    actualRatio < 5
      ? "Read noise dominates. Increase sub or go to darker site."
      : actualRatio < 10
        ? "Getting close. " +
          nf(((10 - actualRatio) * READ_NOISE ** 2) / skyFlux, 1, 0) +
          "s more needed."
        : "Read noise is swamped. Good!";
  text(ratioText, rx + 115, ry + 26);
}
