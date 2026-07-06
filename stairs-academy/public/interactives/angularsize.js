let logSize = 1.4; // log10(true size in light-years)
let logDist = 3.1; // log10(distance in light-years)

const FOV_ARCMIN = 60; // reference field of view for the "eyepiece" panel

const LANDMARKS = [
  { name: "a typical globular cluster", arcmin: 15 },
  { name: "the Orion Nebula", arcmin: 65 },
  { name: "the Full Moon", arcmin: 31 },
  { name: "the Andromeda Galaxy", arcmin: 190 },
  { name: "a distant spiral galaxy (like M51)", arcmin: 11 },
];

function setup() {
  let canvas = createCanvas(800, 460);
  canvas.parent("canvas-container");

  document.getElementById("sizeSlider").addEventListener("input", (e) => {
    logSize = parseFloat(e.target.value);
    document.getElementById("sizeVal").innerText = formatLy(
      Math.pow(10, logSize),
    );
  });

  document.getElementById("distSlider").addEventListener("input", (e) => {
    logDist = parseFloat(e.target.value);
    document.getElementById("distVal").innerText = formatLy(
      Math.pow(10, logDist),
    );
  });

  document.getElementById("sizeVal").innerText = formatLy(
    Math.pow(10, logSize),
  );
  document.getElementById("distVal").innerText = formatLy(
    Math.pow(10, logDist),
  );
}

function formatLy(v) {
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M ly";
  if (v >= 1e3) return Math.round(v).toLocaleString() + " ly";
  return Math.round(v) + " ly";
}

function draw() {
  background(10);

  const trueSize = Math.pow(10, logSize);
  const dist = Math.pow(10, logDist);
  const angularSizeRad = trueSize / dist;
  const angularSizeArcmin = angularSizeRad * 3437.75;

  drawSchematicPanel(20, 20, 380, 420, trueSize, dist);
  drawEyepiecePanel(420, 20, 360, 420, angularSizeArcmin);

  // Nearest familiar comparison
  let nearest = LANDMARKS[0];
  let bestDiff = Infinity;
  for (const lm of LANDMARKS) {
    const diff = Math.abs(
      Math.log10(lm.arcmin) - Math.log10(angularSizeArcmin),
    );
    if (diff < bestDiff) {
      bestDiff = diff;
      nearest = lm;
    }
  }

  noStroke();
  fill(255);
  textAlign(CENTER, TOP);
  textSize(18);
  const displayAngle =
    angularSizeArcmin >= 60
      ? (angularSizeArcmin / 60).toFixed(2) + "°"
      : angularSizeArcmin.toFixed(2) + "'";
  text("Angular size: " + displayAngle, width / 2, height - 34);
  fill(150, 200, 255);
  textSize(15);
  text("closest in apparent size to " + nearest.name, width / 2, height - 12);
}

function drawSchematicPanel(x, y, w, h, trueSize, dist) {
  stroke(60);
  fill(18);
  rect(x, y, w, h, 8);

  noStroke();
  fill(180);
  textAlign(CENTER, TOP);
  textSize(14);
  text("Not to scale — for intuition only", x + w / 2, y + 10);

  // Eye/telescope icon on the left
  const originX = x + 40;
  const originY = y + h / 2;
  fill(200);
  ellipse(originX, originY, 22, 22);
  fill(10);
  ellipse(originX, originY, 10, 10);

  // Distance mapped log-scale across the panel width
  const distFrac = constrain((Math.log10(dist) - 1) / (8 - 1), 0, 1);
  const objX = originX + 60 + distFrac * (w - 140);

  // Size mapped log-scale to a drawn radius
  const sizeFrac = constrain((Math.log10(trueSize) - 0) / (5.5 - 0), 0, 1);
  const objR = 6 + sizeFrac * 90;

  stroke(80);
  line(originX, originY, objX, originY);

  noStroke();
  fill(120, 160, 255, 180);
  ellipse(objX, originY, objR * 2, objR * 2);
  fill(200, 220, 255);
  ellipse(objX, originY, 4, 4);

  fill(150);
  textAlign(CENTER, TOP);
  textSize(13);
  text(
    "bigger = larger true size   farther right = greater distance",
    x + w / 2,
    y + h - 24,
  );
}

function drawEyepiecePanel(x, y, w, h, angularSizeArcmin) {
  stroke(60);
  fill(0);
  rect(x, y, w, h, 8);

  const cx = x + w / 2;
  const cy = y + h / 2 - 10;
  const frameR = 150;

  noFill();
  stroke(80);
  strokeWeight(2);
  ellipse(cx, cy, frameR * 2, frameR * 2);

  fill(180);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(14);
  text(
    "Through the eyepiece (fixed " + FOV_ARCMIN + "' field of view)",
    cx,
    y + 10,
  );

  const objR = (angularSizeArcmin / FOV_ARCMIN) * frameR;

  if (objR > frameR) {
    // Way too big to fit
    noStroke();
    fill(120, 160, 255, 160);
    rect(x + 10, cy - frameR, w - 20, frameR * 2, 4);
    fill(255, 210, 90);
    textAlign(CENTER, CENTER);
    textSize(16);
    text("Too large for this field of view", cx, cy);
  } else if (objR < 1.5) {
    noStroke();
    fill(255);
    ellipse(cx, cy, 3, 3);
    fill(150);
    textAlign(CENTER, TOP);
    textSize(14);
    text("Effectively point-like at this scale", cx, cy + frameR + 16);
  } else {
    noStroke();
    fill(120, 160, 255, 200);
    ellipse(cx, cy, objR * 2, objR * 2);
  }
}
