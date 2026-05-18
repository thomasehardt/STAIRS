let latSlider;
let stars = [];
let camNoise = [];
let time = 0;

function setup() {
  let canvas = createCanvas(900, 640);
  canvas.parent("canvas-container");
  latSlider = document.getElementById("latSlider");

  for (let i = 0; i < 160; i++) {
    stars.push({
      panel: i < 80 ? 0 : 1,
      orbitR: random(30, 180),
      theta: random(TWO_PI),
      speed: random(0.004, 0.012),
      size: random(1, 3),
      bright: random(120, 255),
    });
  }

  for (let i = 0; i < 200; i++) {
    camNoise.push({
      x: random(100),
      y: random(100),
      s: random(1.5, 3),
      b: random(40, 80),
    });
  }
}

function drawCameraGalaxy(cx, cy, rotation, borderColor, label, sublabel) {
  let s = 50;

  noStroke();
  fill(0, 0, 0, 220);
  rect(cx - s, cy - s, s * 2, s * 2);

  stroke(borderColor);
  strokeWeight(2);
  noFill();
  rect(cx - s, cy - s, s * 2, s * 2);

  push();
  translate(cx, cy);
  rotate(rotation);

  noStroke();
  for (let n of camNoise) {
    fill(255, n.b);
    ellipse(-s + n.x, -s + n.y, n.s, n.s);
  }

  noStroke();
  fill(100, 150, 255, 50);
  ellipse(0, 0, 70, 20);
  fill(100, 150, 255, 30);
  ellipse(0, 0, 90, 25);
  fill(255, 150, 200, 40);
  ellipse(0, 0, 80, 16);
  fill(255, 255, 255, 90);
  ellipse(0, 0, 18, 18);
  fill(255, 255, 255, 180);
  ellipse(0, 0, 7, 7);
  pop();

  fill(255, 200);
  noStroke();
  textSize(12);
  textAlign(CENTER);
  text(label, cx, cy - s - 10);
  fill(200, 200, 200, 150);
  textSize(13);
  text(sublabel, cx, cy + s + 25);
}

function drawDashedLine(x1, y1, x2, y2, c) {
  stroke(c);
  strokeWeight(2);
  let d = dist(x1, y1, x2, y2);
  let dashes = max(1, d / 15);
  for (let i = 0; i < dashes; i++) {
    if (i % 2 === 0) {
      line(
        lerp(x1, x2, i / dashes),
        lerp(y1, y2, i / dashes),
        lerp(x1, x2, (i + 1) / dashes),
        lerp(y1, y2, (i + 1) / dashes),
      );
    }
  }
}

function starPos(poleX, poleY, r, angle, skyAngle) {
  let perp = skyAngle + PI / 2;
  let flatten = max(0.15, cos(skyAngle) * 0.6 + 0.4);
  let rx = r * cos(angle);
  let ry = r * sin(angle) * flatten;
  return {
    x: poleX + rx * cos(perp) - ry * sin(perp),
    y: poleY + rx * sin(perp) + ry * cos(perp),
  };
}

function draw() {
  background(17);
  time++;

  let lat = latSlider.value;
  let skyAngle = radians(lat);

  let leftX = 250;
  let rightX = 650;
  let groundY = 340;

  let axisLen = 180;
  let pole1X = leftX + cos(-skyAngle) * axisLen;
  let pole1Y = groundY + 20 + sin(-skyAngle) * axisLen;
  let pole2X = rightX + cos(-skyAngle) * axisLen;
  let pole2Y = groundY + 20 + sin(-skyAngle) * axisLen;

  let mid1X = leftX + cos(-skyAngle) * (axisLen * 0.55);
  let mid1Y = groundY + 20 + sin(-skyAngle) * (axisLen * 0.55);
  let mid2X = rightX + cos(-skyAngle) * (axisLen * 0.55);
  let mid2Y = groundY + 20 + sin(-skyAngle) * (axisLen * 0.55);

  // --- Ground ---
  stroke(80);
  strokeWeight(3);
  line(leftX - 180, groundY, leftX + 180, groundY);
  line(rightX - 180, groundY, rightX + 180, groundY);

  fill(255);
  noStroke();
  textSize(24);
  textAlign(CENTER);
  text("Alt-Az Mount", leftX, 50);
  text("Equatorial Mount", rightX, 50);

  // --- Sky Axis (dashed) ---
  drawDashedLine(leftX, groundY + 20, pole1X, pole1Y, color(255, 255, 255, 80));
  drawDashedLine(
    rightX,
    groundY + 20,
    pole2X,
    pole2Y,
    color(255, 255, 255, 80),
  );

  noStroke();
  fill(180);
  textSize(13);
  text(
    "Celestial Pole",
    leftX + cos(-skyAngle) * (axisLen + 30) - 40,
    groundY + 20 + sin(-skyAngle) * (axisLen + 30) + 5,
  );
  text(
    "Celestial Pole",
    rightX + cos(-skyAngle) * (axisLen + 30) - 40,
    groundY + 20 + sin(-skyAngle) * (axisLen + 30) + 5,
  );

  // --- Star fields ---
  noStroke();
  for (let s of stars) {
    let px = s.panel === 0 ? mid1X : mid2X;
    let py = s.panel === 0 ? mid1Y : mid2Y;
    let pos = starPos(px, py, s.orbitR, s.theta + time * s.speed, skyAngle);
    fill(s.bright, 160);
    ellipse(pos.x, pos.y, s.size, s.size);
  }

  // --- Tracking star ---
  let trackR = 60;
  let trackAngle = time * 0.008;
  let track1 = starPos(mid1X, mid1Y, trackR, trackAngle, skyAngle);
  let track2 = starPos(mid2X, mid2Y, trackR, trackAngle, skyAngle);

  for (let t of [track1, track2]) {
    noStroke();
    for (let r = 6; r >= 0; r--) {
      fill(255, 220, 120, 40 - r * 5);
      ellipse(t.x, t.y, 12 + r * 5, 12 + r * 5);
    }
    fill(255, 255, 200);
    ellipse(t.x, t.y, 7, 7);

    fill(255, 220, 100, 200);
    textSize(11);
    textAlign(CENTER);
    text("Target Star", t.x, t.y - 18);
  }

  // --- Orion constellation hint ---
  let conStars = [
    [0, 0],
    [30, -20],
    [60, 0],
    [90, 5],
    [95, -15],
    [120, -5],
    [130, -25],
  ];
  for (let px of [leftX, rightX]) {
    let cx = px + cos(-skyAngle) * (axisLen * 0.3);
    let cy = groundY + 20 + sin(-skyAngle) * (axisLen * 0.3);
    let rot = -skyAngle;
    for (let i = 0; i < conStars.length; i++) {
      let [dx, dy] = conStars[i];
      let rx = dx * cos(rot) - dy * sin(rot);
      let ry = dx * sin(rot) + dy * cos(rot);
      let sx = cx + rx - 55;
      let sy = cy + ry - 10;
      fill(200, 220, 255, 120);
      noStroke();
      ellipse(sx, sy, 3, 3);
      if (i > 0) {
        let [pdx, pdy] = conStars[i - 1];
        let prx = pdx * cos(rot) - pdy * sin(rot);
        let pry = pdx * sin(rot) + pdy * cos(rot);
        stroke(200, 220, 255, 40);
        strokeWeight(0.5);
        line(cx + prx - 55, cy + pry - 10, sx, sy);
      }
    }
  }
  noStroke();

  // --- Rotation direction arrows ---
  let arrowR = 90;
  for (let px of [leftX, rightX]) {
    let cx = px;
    let cy = groundY + 5;
    let a = time * 0.006;
    noFill();
    stroke(255, 255, 255, 50);
    strokeWeight(1.5);
    let arcR = 40;
    arc(
      cx - arcR,
      cy - arcR,
      arcR * 2,
      arcR * 2,
      -PI * 0.3,
      a * 0.5 + PI * 0.6,
    );
    // Arrowhead
    let tipAngle = a * 0.5 + PI * 0.6;
    let tipX = cx + arcR * cos(tipAngle);
    let tipY = cy - arcR * sin(tipAngle);
    fill(255, 255, 255, 60);
    noStroke();
    triangle(
      tipX,
      tipY,
      tipX + 6 * cos(tipAngle + PI * 0.8),
      tipY - 6 * sin(tipAngle + PI * 0.8),
      tipX + 6 * cos(tipAngle - PI * 0.8),
      tipY - 6 * sin(tipAngle - PI * 0.8),
    );
  }

  // --- Alt-Az Mount ---
  stroke(255, 100, 100);
  strokeWeight(4);
  line(leftX, groundY, leftX, groundY - 100);
  line(leftX - 30, groundY - 100, leftX + 30, groundY - 100);

  let altAzAngle = atan2(track1.y - (groundY - 100), track1.x - leftX);
  push();
  translate(leftX, groundY - 100);
  rotate(altAzAngle);
  noStroke();
  fill(100, 150, 255, 200);
  rect(-50, -15, 100, 30);
  pop();

  // --- Equatorial Mount ---
  stroke(100, 255, 100);
  strokeWeight(4);
  line(rightX, groundY, rightX, groundY - 40);
  let raEndX = rightX + cos(-skyAngle) * 80;
  let raEndY = groundY - 40 + sin(-skyAngle) * 80;
  line(rightX, groundY - 40, raEndX, raEndY);

  let decAngle = -skyAngle - HALF_PI;
  let decLen = 30;
  line(
    raEndX - cos(decAngle) * decLen,
    raEndY - sin(decAngle) * decLen,
    raEndX + cos(decAngle) * decLen,
    raEndY + sin(decAngle) * decLen,
  );

  let eqAngle = atan2(
    track2.y - (raEndY + sin(decAngle) * decLen),
    track2.x - (raEndX + cos(decAngle) * decLen),
  );
  push();
  translate(raEndX + cos(decAngle) * decLen, raEndY + sin(decAngle) * decLen);
  rotate(eqAngle);
  noStroke();
  fill(100, 150, 255, 200);
  rect(-50, -15, 100, 30);
  pop();

  // --- Annotated rotation paths ---
  noFill();
  for (let r of [40, 80, 120]) {
    stroke(255, 255, 255, 15);
    strokeWeight(1);
    for (let a = 0; a < TWO_PI; a += 0.05) {
      let p1 = starPos(mid1X, mid1Y, r, a, skyAngle);
      let p2 = starPos(mid2X, mid2Y, r, a, skyAngle);
      point(p1.x, p1.y);
      point(p2.x, p2.y);
    }
  }

  // --- Info text ---
  fill(255, 100, 100, 200);
  textSize(15);
  text("Mount axes don't align with sky axis", leftX, groundY + 55);

  fill(100, 255, 100, 200);
  text("RA axis stays parallel to sky axis", rightX, groundY + 55);

  // --- Camera views ---
  let camY = 480;
  drawCameraGalaxy(
    leftX,
    camY,
    time * 0.002,
    color(255, 100, 100, 180),
    "Sensor View",
    "Field rotation!",
  );
  drawCameraGalaxy(
    rightX,
    camY,
    0,
    color(100, 255, 100, 180),
    "Sensor View",
    "No field rotation",
  );

  fill(255, 255, 0);
  textSize(20);
  noStroke();
  text("Latitude: " + lat + "°", width / 2, height - 30);
}
