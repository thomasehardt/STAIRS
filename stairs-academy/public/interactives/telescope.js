let progressSlider;
let telescopeType = "reflector";

function setup() {
  let canvas = createCanvas(800, 400);
  canvas.parent("canvas-container");
  progressSlider = document.getElementById("progressSlider");

  document.getElementById("telescopeType").addEventListener("change", (e) => {
    telescopeType = e.target.value;
    progressSlider.value = 0;
  });
}

function drawReflector(cx, cy, t) {
  stroke(80);
  strokeWeight(6);
  line(cx - 250, cy - 120, cx + 200, cy - 120);
  line(cx - 250, cy + 120, cx + 200, cy + 120);

  noFill();
  stroke(100, 150, 255);
  strokeWeight(6);
  arc(cx + 200, cy, 80, 240, HALF_PI + 0.1, PI + HALF_PI - 0.1);

  stroke(100, 255, 100);
  strokeWeight(8);
  line(cx - 150, cy - 40, cx - 150, cy + 40);

  fill(50, 200, 50);
  noStroke();
  rect(cx + 230, cy - 30, 15, 60);

  fill(255);
  noStroke();
  textSize(16);
  textAlign(CENTER);
  text("Primary Mirror", cx + 200, cy - 145);
  text("Secondary Mirror", cx - 150, cy - 60);
  text("Sensor", cx + 240, cy + 65);

  fill(150);
  textSize(13);
  text("Light enters \u2192", cx - 310, cy + 5);

  let photons = [
    { y: -90, pX: 180, sY: -25 },
    { y: -50, pX: 195, sY: -10 },
    { y: 50, pX: 195, sY: 10 },
    { y: 90, pX: 180, sY: 25 },
  ];

  for (let p of photons) {
    let p1_start = cx - 350;
    let p1_end = cx + p.pX;
    let p2_endX = cx - 140;
    let p3_endX = cx + 230;

    let p1_t = constrain(map(t, 0, 0.4, 0, 1), 0, 1);
    let p2_t = constrain(map(t, 0.4, 0.7, 0, 1), 0, 1);
    let p3_t = constrain(map(t, 0.7, 1.0, 0, 1), 0, 1);

    let curX = cx - 350;
    let curY = cy + p.y;

    stroke(255, 255, 0, 100);
    strokeWeight(3);
    noFill();
    beginShape();
    if (p1_t > 0) {
      vertex(p1_start, cy + p.y);
      curX = lerp(p1_start, p1_end, p1_t);
      vertex(curX, cy + p.y);
    }
    if (p2_t > 0) {
      curX = lerp(p1_end, p2_endX, p2_t);
      curY = lerp(cy + p.y, cy + p.sY, p2_t);
      vertex(curX, curY);
    }
    if (p3_t > 0) {
      curX = lerp(p2_endX, p3_endX, p3_t);
      curY = lerp(cy + p.sY, cy, p3_t);
      vertex(curX, curY);
    }
    endShape();

    if (t > 0 && t < 1.0) {
      noStroke();
      fill(255, 255, 0);
      ellipse(curX, curY, 10, 10);
    }
  }

  if (t === 1.0) {
    fill(255, 255, 0, 150);
    noStroke();
    ellipse(cx + 230, cy, 40, 40);
    fill(255);
    text("Light Captured!", cx + 230, cy - 40);
  }
}

function drawRefractor(cx, cy, t) {
  let tubeTop = cy - 85;
  let tubeBot = cy + 85;
  let tubeLeft = cx - 250;
  let tubeRight = cx + 130;
  let lensX = cx - 190;
  let prismX = cx + 110;
  let prismS = 32;
  let sensorX = prismX;
  let sensorY = cy - 142;

  stroke(80);
  strokeWeight(5);
  line(tubeLeft, tubeTop, tubeRight, tubeTop);
  line(tubeLeft, tubeBot, tubeRight, tubeBot);
  line(tubeRight, tubeTop, tubeRight, tubeBot);

  noFill();
  stroke(100, 150, 255);
  strokeWeight(5);
  arc(lensX, cy, 55, 170, -PI / 2 - 0.35, PI / 2 + 0.35);

  fill(100, 150, 255, 35);
  noStroke();
  quad(
    prismX,
    cy - prismS,
    prismX + prismS,
    cy,
    prismX,
    cy + prismS,
    prismX - prismS,
    cy,
  );

  stroke(180, 200, 255);
  strokeWeight(3);
  line(prismX - prismS, cy - prismS, prismX + prismS, cy + prismS);

  fill(50, 200, 50);
  noStroke();
  rect(sensorX - 22, sensorY - 10, 44, 10);

  stroke(60);
  strokeWeight(4);
  noFill();
  rect(sensorX - 28, sensorY - 16, 56, 22);

  fill(255);
  noStroke();
  textSize(16);
  textAlign(CENTER);
  text("Objective Lens", lensX, tubeTop - 18);
  text("Diagonal (Amici Prism)", prismX, tubeBot + 35);
  text("Sensor", sensorX, sensorY - 22);

  fill(150);
  textSize(13);
  text("Parallel light enters \u2192", cx - 330, cy + 5);

  fill(180, 200, 255, 120);
  textSize(12);
  text("45\u00B0 fold mirror inside prism", prismX, tubeTop + 20);

  let refractPhotons = [{ y: -65 }, { y: -32 }, { y: 32 }, { y: 65 }];

  for (let p of refractPhotons) {
    let startX = cx - 350;

    let p1_t = constrain(map(t, 0, 0.35, 0, 1), 0, 1);
    let p2_t = constrain(map(t, 0.35, 0.65, 0, 1), 0, 1);
    let p3_t = constrain(map(t, 0.65, 0.92, 0, 1), 0, 1);

    let curX = startX;
    let curY = cy + p.y;

    stroke(255, 255, 0, 100);
    strokeWeight(3);
    noFill();
    beginShape();
    if (p1_t > 0) {
      curX = lerp(startX, lensX, p1_t);
      vertex(startX, cy + p.y);
      vertex(curX, curY);
    }
    if (p2_t > 0) {
      curX = lerp(lensX, prismX, p2_t);
      vertex(curX, curY);
    }
    if (p3_t > 0) {
      curY = lerp(cy + p.y, sensorY + 3, p3_t);
      vertex(prismX, curY);
    }
    endShape();

    if (t > 0 && t < 1.0) {
      noStroke();
      fill(255, 255, 0);
      ellipse(curX, curY, 8, 8);
    }
  }

  if (t >= 0.8) {
    let flashAlpha = map(t, 0.8, 1.0, 0, 150);
    fill(255, 255, 0, flashAlpha);
    noStroke();
    ellipse(sensorX, sensorY + 4, 35, 35);
  }

  if (t === 1.0) {
    fill(255, 255, 0, 150);
    noStroke();
    ellipse(sensorX, sensorY + 4, 40, 40);
    fill(255);
    text("Light Captured!", sensorX, sensorY - 22);
  }
}

function draw() {
  background(17);

  let cx = width / 2;
  let cy = height / 2;
  let t = progressSlider.value / 100.0;

  if (telescopeType === "reflector") {
    drawReflector(cx, cy, t);
  } else {
    drawRefractor(cx, cy, t);
  }
}
