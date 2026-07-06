let targetSize = 25; // arcmin
let sensorFov = 43; // arcmin (shorter dimension)

function fovScore(s, F) {
  const mu = 0.35 * F;
  const sigma = 0.2 * F;
  let score = Math.exp(-Math.pow(s - mu, 2) / (2 * sigma * sigma)) * 100;

  if (s > F) score = Math.min(score, 20);
  if (s < 0.05 * F) score = Math.min(score, 30);

  return score;
}

function setup() {
  let canvas = createCanvas(800, 480);
  canvas.parent("canvas-container");

  document.getElementById("sizeSlider").addEventListener("input", (e) => {
    targetSize = parseFloat(e.target.value);
    document.getElementById("sizeVal").innerText = targetSize.toFixed(0) + "'";
  });

  document.getElementById("fovSlider").addEventListener("input", (e) => {
    sensorFov = parseFloat(e.target.value);
    document.getElementById("fovVal").innerText = sensorFov.toFixed(0) + "'";
  });
}

function draw() {
  background(10);

  drawFramePanel(30, 50, 330, 380);
  drawCurvePanel(420, 50, 350, 380);

  const score = fovScore(targetSize, sensorFov);
  noStroke();
  fill(255);
  textAlign(CENTER, TOP);
  textSize(20);
  text("FOV Fit Score: " + score.toFixed(0) + " / 100", width / 2, 14);
}

function drawFramePanel(x, y, w, h) {
  stroke(60);
  fill(18);
  rect(x, y, w, h, 8);

  noStroke();
  fill(180);
  textAlign(CENTER, TOP);
  textSize(14);
  text("Target vs. Sensor Frame", x + w / 2, y + 10);

  const scale = 2.6; // px per arcmin
  const frameW = sensorFov * scale;
  const frameH = frameW * 0.56; // roughly matches a typical sensor aspect ratio

  const cx = x + w / 2;
  const cy = y + h / 2 + 10;

  noFill();
  stroke(120, 160, 255);
  strokeWeight(2);
  rect(cx - frameW / 2, cy - frameH / 2, frameW, frameH);

  const targetD = targetSize * scale;

  noStroke();
  fill(255, 210, 90, 200);
  ellipse(cx, cy, targetD, targetD);

  fill(150);
  textAlign(CENTER, TOP);
  textSize(13);
  let note;
  if (targetSize > sensorFov) note = "Too big — clips the sensor";
  else if (targetSize < 0.05 * sensorFov)
    note = "Too small — only a few pixels";
  else note = "Fits within the frame";
  text(note, cx, y + h - 26);
}

function drawCurvePanel(x, y, w, h) {
  stroke(60);
  fill(18);
  rect(x, y, w, h, 8);

  noStroke();
  fill(180);
  textAlign(CENTER, TOP);
  textSize(14);
  text("FOV Fit Score Curve", x + w / 2, y + 10);

  const plotX = x + 40;
  const plotY = y + 40;
  const plotW = w - 70;
  const plotH = h - 90;
  const maxSize = Math.max(sensorFov * 1.6, 150);

  stroke(70);
  line(plotX, plotY, plotX, plotY + plotH);
  line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

  noFill();
  stroke(120, 160, 255);
  strokeWeight(2);
  beginShape();
  for (let s = 0; s <= maxSize; s += 1) {
    const sc = fovScore(s, sensorFov);
    const px = plotX + (s / maxSize) * plotW;
    const py = plotY + plotH - (sc / 100) * plotH;
    vertex(px, py);
  }
  endShape();

  // Marker for current target size
  const curScore = fovScore(targetSize, sensorFov);
  const mx = plotX + (targetSize / maxSize) * plotW;
  const my = plotY + plotH - (curScore / 100) * plotH;

  noStroke();
  fill(255, 210, 90);
  ellipse(mx, my, 10, 10);
  stroke(255, 210, 90, 120);
  line(mx, my, mx, plotY + plotH);

  noStroke();
  fill(150);
  textAlign(CENTER, TOP);
  textSize(12);
  text("target size (arcmin) →", plotX + plotW / 2, plotY + plotH + 8);

  push();
  translate(plotX - 26, plotY + plotH / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text("score", 0, 0);
  pop();
}
