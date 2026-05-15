let guiding = false;
let seeing = 1;
let raError = 0,
  decError = 0;
let corrRA = 0,
  corrDec = 0;
let guideTimer = 0,
  guideInterval = 30;
let raHist = [],
  decHist = [];
let totalCorrections = 0;
let pulseRA = 0,
  pulseDec = 0;
let bgStars = [];
let time = 0;

function setup() {
  let canvas = createCanvas(860, 620);
  canvas.parent("canvas-container");

  for (let i = 0; i < 25; i++) {
    bgStars.push({
      x: random(300),
      y: random(300),
      sz: random(0.5, 2.2),
      b: random(40, 160),
    });
  }

  document.getElementById("guideBtn").addEventListener("click", () => {
    guiding = !guiding;
    let btn = document.getElementById("guideBtn");
    btn.innerText = guiding ? "Disable Guiding" : "Enable Guiding";
    btn.classList.toggle("active");
    if (guiding) {
      guideTimer = 0;
      corrRA = 0;
      corrDec = 0;
    }
  });
  document.getElementById("seeingSlider").addEventListener("input", (e) => {
    seeing = parseFloat(e.target.value);
    document.getElementById("seeingVal").innerText = seeing.toFixed(1);
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    raHist = [];
    decHist = [];
    totalCorrections = 0;
    corrRA = 0;
    corrDec = 0;
    guideTimer = 0;
    pulseRA = 0;
    pulseDec = 0;
    if (!guiding) {
      raError = 0;
      decError = 0;
    }
  });
}

function drawErrorGraph(x, y, w, h, data, col, label) {
  fill(15, 15, 25);
  noStroke();
  rect(x, y, w, h);
  stroke(50);
  strokeWeight(0.5);
  noFill();
  rect(x, y, w, h);
  fill(160);
  noStroke();
  textSize(10);
  textAlign(LEFT, TOP);
  text(label, x + 4, y + 3);
  stroke(40);
  strokeWeight(0.5);
  line(x, y + h / 2, x + w, y + h / 2);
  if (data.length < 2) return;
  stroke(col);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let i = 0; i < data.length; i++) {
    let px = x + map(i, 0, data.length - 1, 2, w - 2);
    let py = y + h / 2 + data[i] * 1.8;
    vertex(px, constrain(py, y + 4, y + h - 4));
  }
  endShape();
  let cur = data[data.length - 1];
  fill(col);
  noStroke();
  textSize(9);
  textAlign(RIGHT, BOTTOM);
  text(cur.toFixed(1), x + w - 4, y + h - 4);
}

function draw() {
  time++;
  let peRA = sin(time * 0.025) * 18 + sin(time * 0.007) * 10;
  let peDec = sin(time * 0.005) * 5 + sin(time * 0.012) * 3;
  let jRA = randomGaussian(0, 1.5) * seeing;
  let jDec = randomGaussian(0, 1.5) * seeing;

  if (!guiding) {
    raError = peRA + jRA;
    decError = peDec + jDec;
    corrRA = 0;
    corrDec = 0;
  } else {
    guideTimer++;
    if (guideTimer >= guideInterval) {
      guideTimer = 0;
      let curRA = peRA + corrRA + jRA;
      let curDec = peDec + corrDec + jDec;
      corrRA -= curRA * 0.85;
      corrDec -= curDec * 0.85;
      totalCorrections++;
      pulseRA = 1;
      pulseDec = 1;
    }
    raError = constrain(peRA + corrRA + jRA, -50, 50);
    decError = constrain(peDec + corrDec + jDec, -50, 50);
  }

  if (pulseRA > 0) pulseRA -= 0.035;
  if (pulseDec > 0) pulseDec -= 0.035;

  raHist.push(raError);
  decHist.push(decError);
  if (raHist.length > 200) raHist.shift();
  if (decHist.length > 200) decHist.shift();

  background(17);

  // --- Guide camera view ---
  fill(0, 0, 5);
  noStroke();
  rect(20, 20, 300, 300);
  stroke(35);
  strokeWeight(0.5);
  line(170, 20, 170, 320);
  line(20, 170, 320, 170);
  stroke(60, 140, 200, 60);
  strokeWeight(1);
  line(170, 20, 170, 320);
  line(20, 170, 320, 170);
  noFill();
  stroke(60, 140, 200, 40);
  ellipse(170, 170, 14, 14);

  for (let s of bgStars) {
    fill(s.b * 0.6, s.b * 0.55, s.b * 0.5, s.b);
    noStroke();
    ellipse(20 + s.x, 20 + s.y, s.sz, s.sz);
  }

  let sx = 170 + raError,
    sy = 170 + decError;
  noStroke();
  for (let r = 5; r >= 0; r--) {
    fill(255, 220, 150, 25 - r * 3);
    ellipse(sx, sy, 14 + r * 5, 14 + r * 5);
  }
  fill(255, 255, 200);
  ellipse(sx, sy, 6, 6);
  stroke(100, 255, 100, 120);
  strokeWeight(1);
  noFill();
  rect(sx - 8, sy - 8, 16, 16);

  // Correction arrow (toward center)
  if (guiding) {
    let dx = 170 - sx,
      dy = 170 - sy;
    let d = dist(sx, sy, 170, 170);
    if (d > 3) {
      stroke(100, 255, 100, 140);
      strokeWeight(2);
      line(sx, sy, sx + dx * 0.6, sy + dy * 0.6);
      let a = atan2(dy, dx);
      push();
      translate(sx + dx * 0.6, sy + dy * 0.6);
      rotate(a);
      fill(100, 255, 100, 140);
      noStroke();
      triangle(6, 0, -4, -3, -4, 3);
      pop();
    }
  }

  // Pulse indicators
  if (pulseRA > 0) {
    let a = constrain(pulseRA * 255, 0, 255);
    fill(100, 200, 255, a);
    noStroke();
    textSize(11);
    textAlign(LEFT, TOP);
    text("\u2190 RA corr  ", 24, 24);
  }
  if (pulseDec > 0) {
    let a = constrain(pulseDec * 255, 0, 255);
    fill(100, 255, 100, a);
    noStroke();
    textSize(11);
    if (corrDec > 0) text("Dec corr \u2191", 220, 24);
    else text("Dec corr \u2193", 220, 24);
  }

  fill(180);
  noStroke();
  textSize(10);
  textAlign(LEFT, TOP);
  text("RA: " + raError.toFixed(1) + " px", 22, 326);
  text("Dec: " + decError.toFixed(1) + " px", 122, 326);

  // --- Error graphs ---
  drawErrorGraph(20, 360, 300, 100, raHist, color(100, 200, 255), "RA Error");
  drawErrorGraph(20, 480, 300, 100, decHist, color(100, 255, 100), "Dec Error");

  // --- Right panel ---
  let rx = 345,
    ry = 25;

  textAlign(LEFT);
  fill(255);
  noStroke();
  textSize(18);
  text("Autoguiding", rx, ry);
  ry += 30;

  let btn = document.getElementById("guideBtn");
  fill(guiding ? color(100, 255, 100) : 180);
  textSize(20);
  text(guiding ? "GUIDING ACTIVE" : "GUIDING OFF", rx, ry + 18);
  ry += 40;

  fill(180);
  textSize(13);
  text("Guide star position", rx, ry);
  ry += 4;
  fill(255);
  textSize(15);
  text(
    "(" + raError.toFixed(1) + ", " + decError.toFixed(1) + ") px",
    rx,
    ry + 18,
  );
  ry += 35;

  let rms = sqrt(raHist.reduce((s, v) => s + v * v, 0) / max(raHist.length, 1));
  fill(180);
  textSize(13);
  text("RMS error", rx, ry);
  ry += 4;
  let rmsCol =
    rms < 4
      ? color(100, 255, 100)
      : rms < 8
        ? color(255, 200, 50)
        : color(255, 80, 80);
  fill(rmsCol);
  textSize(22);
  text(rms.toFixed(1) + " px", rx, ry + 20);
  ry += 40;

  fill(180);
  textSize(13);
  text("Corrections sent", rx, ry);
  ry += 4;
  fill(255);
  textSize(22);
  text(totalCorrections, rx, ry + 20);
  ry += 40;

  fill(180);
  textSize(13);
  text("Correction rate", rx, ry);
  ry += 4;
  fill(200);
  textSize(15);
  let rate = guideInterval === 0 ? 0 : round((60 / guideInterval) * 10) / 10;
  text(rate + "/sec", rx, ry + 18);
  ry += 35;

  fill(100);
  textSize(10);
  if (guiding) {
    fill(100, 200, 255, constrain(pulseRA * 255, 0, 255));
    text(
      "Last RA corr: " + (corrRA > 0 ? "+" : "") + corrRA.toFixed(1),
      rx,
      ry,
    );
    ry += 16;
    fill(100, 255, 100, constrain(pulseDec * 255, 0, 255));
    text(
      "Last Dec corr: " + (corrDec > 0 ? "+" : "") + corrDec.toFixed(1),
      rx,
      ry,
    );
    ry += 30;
  }

  fill(120);
  textSize(10);
  if (!guiding) {
    text("Without guiding, the star", rx, ry);
    ry += 15;
    text("drifts due to periodic error", rx, ry);
    ry += 15;
    text("(gear imperfections) and", rx, ry);
    ry += 15;
    text("atmospheric seeing jitter.", rx, ry);
    ry += 18;
    fill(100);
    textSize(9);
    text("Seeing = " + seeing.toFixed(1) + '"', rx, ry);
  } else {
    text("Guide exposures every", rx, ry);
    ry += 15;
    text((guideInterval / 60).toFixed(2) + "s measure centroid", rx, ry);
    ry += 15;
    text("offset. Corrections are sent", rx, ry);
    ry += 15;
    text("to the mount to keep the", rx, ry);
    ry += 15;
    text("star centered. Residual", rx, ry);
    ry += 15;
    text("error is mostly seeing.", rx, ry);
  }
}
