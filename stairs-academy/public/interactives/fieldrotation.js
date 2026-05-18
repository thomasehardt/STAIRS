let nightTime = 0.5;
let isPlaying = true;
let speed = 3;
let skyStars = [],
  sensorStars = [];
let trackedAlt = 0,
  trackedAz = 0,
  rotationAngle = 0;

function setup() {
  let canvas = createCanvas(900, 640);
  canvas.parent("canvas-container");

  for (let i = 0; i < 100; i++) {
    let a = random(TWO_PI),
      d = pow(random(), 1.5);
    let alt = (1 - d) * 85;
    let az = degrees(a);
    skyStars.push({ alt, az, mag: random(0.5, 5), size: random(1, 3.5) });
  }

  for (let i = 0; i < 35; i++) {
    sensorStars.push({
      x: (random() - 0.5) * 5,
      y: (random() - 0.5) * 5,
      mag: random(0.5, 5),
      size: random(0.8, 2.5),
    });
  }

  document.getElementById("playBtn").addEventListener("click", () => {
    isPlaying = !isPlaying;
    document.getElementById("playBtn").textContent = isPlaying
      ? "⏸ Pause"
      : "▶ Play";
    document.getElementById("playBtn").classList.toggle("active", isPlaying);
  });

  document.getElementById("speedSlider").addEventListener("input", (e) => {
    speed = parseInt(e.target.value);
    document.getElementById("speedVal").innerText = speed + "×";
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    nightTime = 0.5;
  });
}

function computePosition(t) {
  let az = 80 + t * 200;
  let alt = 75 * sin(t * PI);
  if (alt < 0) alt = 0;
  return { alt, az };
}

function project(alt, az, cx, cy, r) {
  let rad = (1 - alt / 90) * r;
  let a = radians(az);
  return { x: cx + rad * sin(a), y: cy - rad * cos(a) };
}

function drawSkyView() {
  let cx = 230,
    cy = 250,
    r = 225;
  push();
  translate(cx, cy);

  fill(5, 5, 15);
  noStroke();
  circle(0, 0, r * 2);

  for (let a = 0; a <= 90; a += 30) {
    let ro = (1 - a / 90) * r;
    noFill();
    stroke(a === 0 ? 60 : 30);
    strokeWeight(a === 0 ? 1.5 : 0.5);
    circle(0, 0, ro * 2);
    if (a > 0) {
      fill(60);
      noStroke();
      textSize(12);
      textAlign(LEFT, CENTER);
      text(a + "°", ro + 5, 0);
    }
  }

  for (let i = 0; i < 8; i++) {
    let a = radians(i * 45);
    stroke(30);
    strokeWeight(0.5);
    line(0, 0, cos(a) * r, sin(a) * r);
  }

  let dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  for (let i = 0; i < 8; i++) {
    let a = radians(i * 45);
    fill(80);
    noStroke();
    textSize(14);
    textAlign(CENTER, CENTER);
    text(dirs[i], cos(a) * (r + 22), sin(a) * (r + 22));
  }

  fill(120);
  noStroke();
  textSize(12);
  textAlign(CENTER, TOP);
  text("ZENITH", 0, -r - 25);

  for (let s of skyStars) {
    let p = project(s.alt, s.az, 0, 0, r);
    let b = map(s.mag, 0.5, 5, 220, 80);
    let sz = map(s.mag, 0.5, 5, 2.5, 1);
    if (s.alt > 2) {
      fill(b * 0.9, b * 0.85, b, 180);
      noStroke();
      circle(p.x, p.y, sz);
    }
  }

  // Target star trajectory
  let trailRes = 100;
  noFill();
  stroke(255, 200, 80, 80);
  strokeWeight(1.5);
  beginShape();
  for (let i = 0; i <= trailRes; i++) {
    let t = i / trailRes;
    let pos = computePosition(t);
    let p = project(pos.alt, pos.az, 0, 0, r);
    if (pos.alt > 2) vertex(p.x, p.y);
  }
  endShape();

  // Current target position
  let pos = computePosition(nightTime);
  trackedAlt = pos.alt;
  trackedAz = pos.az;
  let tp = project(pos.alt, pos.az, 0, 0, r);

  if (pos.alt > 2) {
    stroke(255, 200, 80, 60);
    strokeWeight(12);
    noFill();
    circle(tp.x, tp.y, 14);
    stroke(255, 220, 100);
    strokeWeight(2.5);
    noFill();
    circle(tp.x, tp.y, 7);
    stroke(255, 255, 200);
    strokeWeight(1);
    line(tp.x - 5, tp.y, tp.x + 5, tp.y);
    line(tp.x, tp.y - 5, tp.x, tp.y + 5);
  }

  // Telescope indicator on outer ring
  let tazR = r + 6;
  fill(255, 200, 80);
  noStroke();
  textSize(9);
  textAlign(CENTER, BOTTOM);
  text(
    "▼",
    -tazR * sin(radians(180 - trackedAz)),
    -tazR * cos(radians(180 - trackedAz)),
  );

  pop();

  // Info below sky view
  fill(180);
  noStroke();
  textSize(11);
  textAlign(LEFT, TOP);
  let infoX = 20,
    infoY = 498;
  let azLabel = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  let azIdx = floor(((trackedAz + 22.5) % 360) / 45);
  text(
    "Alt: " +
      nf(trackedAlt, 1, 1) +
      "°   Az: " +
      nf(trackedAz, 1, 1) +
      "° (" +
      azLabel[azIdx] +
      ")",
    infoX,
    infoY,
  );
}

function drawSensorView() {
  let cx = 690,
    cy = 210,
    sz = 180;

  push();
  translate(cx, cy);

  fill(15, 15, 25);
  noStroke();
  rect(-sz, -sz, sz * 2, sz * 2);
  stroke(60);
  strokeWeight(1);
  noFill();
  rect(-sz, -sz, sz * 2, sz * 2);

  // Outer bezel ring
  noFill();
  stroke(40);
  strokeWeight(2);
  rect(-sz - 3, -sz - 3, sz * 2 + 6, sz * 2 + 6, 3);

  // Pulsing reticle
  stroke(60, 90, 60, 80);
  strokeWeight(0.5);
  line(-sz, 0, sz, 0);
  line(0, -sz, 0, sz);

  // Rotate the star field
  push();
  rotate(radians(rotationAngle));

  for (let s of sensorStars) {
    let px = s.x * (sz / 2.5);
    let py = s.y * (sz / 2.5);
    if (abs(px) > sz || abs(py) > sz) continue;
    let b = map(s.mag, 0.5, 5, 230, 100);
    fill(b * 0.9, b * 0.85, b, 200);
    noStroke();
    circle(px, py, s.size);
  }

  pop();

  // Crosshair (fixed — sensor orientation)
  stroke(100, 200, 100, 120);
  strokeWeight(1);
  line(-sz, 0, sz, 0);
  line(0, -sz, 0, sz);

  // Corner markings
  fill(60);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text("N", -sz + 5, -sz + 5);
  text("S", -sz + 5, sz - 15);
  textAlign(RIGHT, TOP);
  text("E", sz - 5, -sz + 5);
  text("W", sz - 5, sz - 15);

  // Rotation arc indicator
  let arcR = sz - 20;
  noFill();
  stroke(255, 200, 80, 100);
  strokeWeight(2);
  if (abs(rotationAngle) > 0.5) {
    arc(0, 0, arcR * 2, arcR * 2, -radians(rotationAngle), 0, OPEN);
  }

  // Arrow showing rotation direction
  if (abs(rotationAngle) > 1) {
    let arrowR = sz - 20;
    let sign = rotationAngle > 0 ? 1 : -1;
    let aA = -radians(rotationAngle * 0.3);
    fill(255, 200, 80, 150);
    noStroke();
    textSize(16);
    textAlign(CENTER, CENTER);
    text(
      sign > 0 ? "↻" : "↺",
      arrowR * 0.7 * cos(aA - PI / 2),
      arrowR * 0.7 * sin(aA - PI / 2),
    );
  }

  pop();

  // Rotation value below sensor
  fill(180);
  noStroke();
  textSize(14);
  textAlign(CENTER, TOP);
  text("Field rotation: " + nf(rotationAngle, 1, 1) + "°", cx, cy + sz + 18);
}

function draw() {
  if (isPlaying) {
    let dt = 0.004 * speed;
    nightTime += dt;
    if (nightTime > 1) nightTime = 0;
  }

  // Field rotation: peaks at horizon, zero at meridian
  rotationAngle = -28 * sin((nightTime - 0.5) * TWO_PI * 0.85);

  background(17);

  // Title areas
  fill(200);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  text("Sky View (polar projection)", 20, 3);
  textAlign(RIGHT, TOP);
  text("Sensor View (field rotation)", 880, 3);
  textAlign(LEFT, TOP);
  fill(80);
  textSize(12);
  text("30° min altitude ring", 270, 8);

  // Sky view boundary
  noFill();
  stroke(50);
  strokeWeight(1);
  rect(18, 18, 464, 490);

  drawSkyView();

  // Sensor view boundary
  noFill();
  stroke(50);
  strokeWeight(1);
  rect(556, 18, 330, 430);

  drawSensorView();

  // Info panel at bottom
  let iy = 530;
  fill(200);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  text("Night progress: " + nf(nightTime * 100, 1, 0) + "%", 20, iy);
  iy += 22;
  text(
    "Altitude: " +
      nf(trackedAlt, 1, 1) +
      "°   Azimuth: " +
      nf(trackedAz, 1, 1) +
      "°",
    20,
    iy,
  );
  iy += 22;
  text(
    "Field rotation: " +
      nf(rotationAngle, 1, 1) +
      "°  " +
      (abs(rotationAngle) > 5
        ? "(strong — near horizon)"
        : "(weak — near meridian)"),
    20,
    iy,
  );
  iy += 22;
  fill(100);
  textSize(13);
  text(
    "← As the telescope tracks the target star, the sensor field rotates because the Alt-Az mount does not compensate for Earth’s axial rotation.",
    20,
    iy,
  );
  iy += 18;
  text(
    "The rotation is zero at the meridian and strongest near the horizon.",
    20,
    iy,
  );
  iy += 30;

  // Key value cards in right panel
  let rx = 560,
    ry = 460;
  fill(30, 30, 40);
  noStroke();
  rect(rx, ry, 95, 55, 4);
  fill(120);
  textSize(12);
  textAlign(CENTER, TOP);
  text("ALTITUDE", rx + 47.5, ry + 5);
  fill(255);
  textSize(22);
  textAlign(CENTER, TOP);
  text(nf(trackedAlt, 1, 0) + "°", rx + 47.5, ry + 22);

  fill(30, 30, 40);
  noStroke();
  rect(rx + 105, ry, 95, 55, 4);
  fill(120);
  textSize(12);
  textAlign(CENTER, TOP);
  text("ROTATION", rx + 152.5, ry + 5);
  fill(255, 200, 80);
  textSize(22);
  textAlign(CENTER, TOP);
  text(nf(rotationAngle, 1, 0) + "°", rx + 152.5, ry + 22);

  fill(30, 30, 40);
  noStroke();
  rect(rx + 210, ry, 95, 55, 4);
  fill(120);
  textSize(12);
  textAlign(CENTER, TOP);
  text("NIGHT", rx + 257.5, ry + 5);
  fill(255);
  textSize(22);
  textAlign(CENTER, TOP);
  text(nf(nightTime * 100, 1, 0) + "%", rx + 257.5, ry + 22);

  // Time bar
  let barX = 20,
    barY = 610,
    barW = 600,
    barH = 8;
  fill(40);
  noStroke();
  rect(barX, barY, barW, barH, 4);
  fill(255, 200, 80);
  rect(barX, barY, barW * nightTime, barH, 4);

  fill(80);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text("Evening", barX, barY + 12);
  textAlign(CENTER, TOP);
  let meridianX = barX + barW * 0.5;
  fill(100, 200, 100, 120);
  stroke(100, 200, 100, 60);
  strokeWeight(0.5);
  line(meridianX, barY - 2, meridianX, barY + barH + 2);
  fill(120);
  noStroke();
  text("Meridian", meridianX, barY + 12);
  textAlign(RIGHT, TOP);
  text("Morning", barX + barW, barY + 12);
}
