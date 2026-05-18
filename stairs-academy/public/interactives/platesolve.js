let stars = [];
let solvePhase = "idle";
let detectIdx = 0;
let matchTimer = 0;
let solveTime = 0;

const CAT_SIZE = 130;

function generateField() {
  stars = [];
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: random(30, 550),
      y: random(30, 550),
      mag: random(0.5, 9),
      size: map(random(0.5, 9), 0.5, 9, 4, 0.8),
      r: randomGaussian(255, 25),
      g: randomGaussian(240, 25),
      b: randomGaussian(210, 30),
    });
  }
  stars.sort((a, b) => a.mag - b.mag);
}

function setup() {
  let canvas = createCanvas(860, 600);
  canvas.parent("canvas-container");
  generateField();

  document.getElementById("solveBtn").addEventListener("click", startSolve);
  document.getElementById("resetBtn").addEventListener("click", () => {
    generateField();
    solvePhase = "idle";
    detectIdx = 0;
    matchTimer = 0;
    solveTime = 0;
    document.getElementById("solveBtn").disabled = false;
  });
}

function startSolve() {
  if (solvePhase !== "idle") return;
  solvePhase = "detecting";
  detectIdx = 0;
  document.getElementById("solveBtn").disabled = true;
}

function catScale() {
  return (CAT_SIZE - 30) / 520;
}

function draw() {
  background(17);
  let ox = 15,
    oy = 15,
    s = 555;

  fill(0, 0, 5);
  noStroke();
  rect(ox, oy, s, s);
  stroke(40);
  strokeWeight(0.5);
  noFill();
  rect(ox, oy, s, s);

  for (let i = 0; i < stars.length; i++) {
    let st = stars[i];
    let px = ox + st.x,
      py = oy + st.y;
    fill(st.r, st.g, st.b);
    noStroke();
    ellipse(px, py, st.size, st.size);

    let detected = solvePhase !== "idle" && i < ceil(detectIdx);
    if (detected) {
      noFill();
      stroke(100, 255, 100, 200);
      strokeWeight(1.5);
      ellipse(px, py, st.size + 8, st.size + 8);
    }

    if ((solvePhase === "matching" || solvePhase === "solved") && i < 3) {
      stroke(255, 180, 50, 220);
      strokeWeight(2);
      noFill();
      ellipse(px, py, st.size + 14, st.size + 14);
      fill(255, 220, 100);
      noStroke();
      textSize(10);
      textAlign(LEFT, BOTTOM);
      text("#" + (i + 1), px + st.size / 2 + 8, py - 2);
    }
  }

  // Triangle
  if (solvePhase === "matching" || solvePhase === "solved") {
    let bright = stars.slice(0, 3);
    let alpha =
      solvePhase === "matching" ? constrain(matchTimer * 255, 0, 255) : 255;
    stroke(255, 180, 50, alpha);
    strokeWeight(2);
    noFill();
    beginShape();
    for (let st of bright) vertex(ox + st.x, oy + st.y);
    endShape(CLOSE);

    // Dashed lines to catalog
    let cx = ox + s - CAT_SIZE - 5,
      cy = oy + 5;
    let sc = catScale();
    for (let i = 0; i < 3; i++) {
      let sx = ox + bright[i].x,
        sy = oy + bright[i].y;
      let dx = cx + 15 + bright[i].x * sc,
        dy = cy + 15 + bright[i].y * sc;
      stroke(255, 255, 100, alpha * 0.3);
      strokeWeight(1);
      drawingContext.setLineDash([4, 6]);
      line(sx, sy, dx, dy);
      drawingContext.setLineDash([]);
    }
  }

  // Solved grid
  if (solvePhase === "solved") {
    stroke(100, 200, 255, 80);
    strokeWeight(0.5);
    let sp = s / 5;
    for (let i = 1; i < 5; i++) {
      line(ox + i * sp, oy, ox + i * sp, oy + s);
      line(ox, oy + i * sp, ox + s, oy + i * sp);
    }

    fill(100, 200, 255, 120);
    noStroke();
    textSize(9);
    textAlign(CENTER, TOP);
    for (let i = 0; i < 6; i++) {
      let ra = 5.5 - i * 0.1,
        rh = floor(ra),
        rm = floor((ra - rh) * 60);
      text(rh + "h " + rm + "m", ox + i * sp, oy + 2);
    }

    textAlign(LEFT, CENTER);
    for (let i = 0; i < 6; i++) {
      let dec = 2.0 - i * 0.15,
        dd = floor(dec),
        dm = abs(round((dec - dd) * 60));
      let sign = dec >= 0 ? "+" : "-";
      text(sign + abs(dd) + "° " + dm + "'", ox + s + 4, oy + i * sp);
    }

    let cx2 = ox + s / 2,
      cy2 = oy + s / 2;
    stroke(100, 200, 255, 150);
    strokeWeight(1.5);
    line(cx2 - 15, cy2, cx2 + 15, cy2);
    line(cx2, cy2 - 15, cx2, cy2 + 15);
    noFill();
    stroke(100, 200, 255, 60);
    ellipse(cx2, cy2, 8, 8);
  }

  // Phase text
  if (solvePhase === "detecting") {
    fill(100, 255, 100, 200);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    text(
      "Detecting stars... " +
        min(ceil(detectIdx), stars.length) +
        "/" +
        stars.length,
      ox + 15,
      oy + 15,
    );
    detectIdx += 0.35;
    if (detectIdx >= stars.length) {
      detectIdx = stars.length;
      solvePhase = "matching";
      matchTimer = 0;
    }
  } else if (solvePhase === "matching") {
    fill(255, 200, 80, 200);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    text("Pattern matching...", ox + 15, oy + 15);
    matchTimer += 0.02;
    if (matchTimer >= 1) {
      matchTimer = 1;
      solvePhase = "solved";
      solveTime = random(1.2, 3.5);
    }
  } else if (solvePhase === "solved") {
    fill(100, 255, 100, 200);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    text("Solved!", ox + 15, oy + 15);
    fill(120);
    textSize(11);
    text(solveTime.toFixed(2) + "s", ox + 15, oy + 38);
  }

  // Catalog panel
  if (solvePhase === "matching" || solvePhase === "solved") {
    let cx = ox + s - CAT_SIZE - 5,
      cy = oy + 5,
      sc = catScale();
    fill(20, 20, 30, 235);
    noStroke();
    rect(cx, cy, CAT_SIZE, CAT_SIZE, 4);
    stroke(255, 255, 100, 120);
    strokeWeight(1);
    noFill();
    rect(cx, cy, CAT_SIZE, CAT_SIZE, 4);
    fill(200, 200, 100, 180);
    noStroke();
    textSize(8);
    textAlign(LEFT, TOP);
    text("Catalog Ref", cx + 5, cy + 3);

    for (let i = 0; i < 10; i++) {
      let st = stars[i];
      let dx = cx + 15 + st.x * sc,
        dy = cy + 15 + st.y * sc;
      fill(200, 200, 255, 150);
      noStroke();
      ellipse(dx, dy, map(st.mag, 0.5, 9, 3, 0.5), map(st.mag, 0.5, 9, 3, 0.5));
    }

    let bright = stars.slice(0, 3);
    stroke(255, 200, 80, 180);
    strokeWeight(1.5);
    noFill();
    beginShape();
    for (let st of bright) vertex(cx + 15 + st.x * sc, cy + 15 + st.y * sc);
    endShape(CLOSE);
  }

  // Right panel
  let rx = ox + s + 20;
  fill(255);
  noStroke();
  textSize(18);
  textAlign(LEFT);
  text("Results", rx, 35);

  let iy = 65;
  fill(200);
  textSize(13);
  text("Status", rx, iy);
  iy += 5;

  let statusText =
    solvePhase === "idle"
      ? "Awaiting solve"
      : solvePhase === "detecting"
        ? "Detecting..."
        : solvePhase === "matching"
          ? "Matching..."
          : "Solved";
  fill(solvePhase === "solved" ? color(100, 255, 100) : color(255, 220, 100));
  textSize(22);
  text(statusText, rx, iy + 20);
  iy += 45;

  if (solvePhase === "solved") {
    fill(200);
    textSize(13);
    text("Field center", rx, iy);
    iy += 5;
    fill(255);
    textSize(20);
    text("RA 05h 34m 31s", rx, iy + 20);
    iy += 28;
    text("Dec +02° 12' 18\"", rx, iy + 20);
    iy += 45;

    fill(200);
    textSize(13);
    text("Field of view", rx, iy);
    iy += 5;
    fill(255);
    textSize(20);
    text("28.4' × 28.4'", rx, iy + 20);
    iy += 40;

    fill(200);
    textSize(13);
    text("Rotation", rx, iy);
    iy += 5;
    fill(255);
    textSize(20);
    text("87.3°", rx, iy + 20);
    iy += 40;

    fill(200);
    textSize(13);
    text("Stars matched", rx, iy);
    iy += 5;
    fill(100, 200, 255);
    textSize(22);
    text(stars.length + "/" + stars.length, rx, iy + 20);
    iy += 40;

    fill(200);
    textSize(13);
    text("Solve time", rx, iy);
    iy += 5;
    fill(255);
    textSize(22);
    text(solveTime.toFixed(2) + "s", rx, iy + 20);
    iy += 45;

    fill(100);
    textSize(10);
    text("Grid: 5.7' spacing", rx, iy);
    iy += 16;
    text("Solution trusted", rx, iy);
  } else if (solvePhase === "idle") {
    iy += 10;
    fill(140);
    textSize(12);
    text("A synthetic star field", rx, iy);
    iy += 18;
    text("is ready. Press [Solve]", rx, iy);
    iy += 18;
    text("to run the plate solver", rx, iy);
    iy += 18;
    text("through each step.", rx, iy);
    iy += 30;
    fill(100);
    textSize(10);
    text("40 stars generated", rx, iy);
    iy += 16;
    text("Brightest: mag " + stars[0].mag.toFixed(1), rx, iy);
    iy += 16;
    text("Faintest: mag " + stars[stars.length - 1].mag.toFixed(1), rx, iy);
  } else {
    iy += 10;
    fill(140);
    textSize(12);
    if (solvePhase === "detecting") {
      text("Scanning image for", rx, iy);
      iy += 18;
      text("star centroids above", rx, iy);
      iy += 18;
      text("the detection threshold.", rx, iy);
      iy += 18;
    } else {
      text("Matching triangle", rx, iy);
      iy += 18;
      text("asterism against", rx, iy);
      iy += 18;
      text("catalog reference.", rx, iy);
      iy += 18;
    }
    iy += 20;
    fill(100);
    textSize(10);
    text(
      "Detected: " + min(ceil(detectIdx), stars.length) + "/" + stars.length,
      rx,
      iy,
    );
  }
}
