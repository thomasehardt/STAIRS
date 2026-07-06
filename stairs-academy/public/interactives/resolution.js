let aperture = 80;
let separation = 2.0;
const pxPerArcsec = 40;

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("canvas-container");

  document.getElementById("apSlider").addEventListener("input", (e) => {
    aperture = parseInt(e.target.value);
    document.getElementById("apVal").innerText = aperture + "mm";
  });

  document.getElementById("sepSlider").addEventListener("input", (e) => {
    separation = parseFloat(e.target.value);
    document.getElementById("sepVal").innerText = separation.toFixed(1) + '"';
  });
}

function draw() {
  background(10);

  const cx = width / 2;
  const cy = height / 2 - 20;

  // Dawes' Limit: resolution (arcsec) = 116 / aperture(mm)
  const resolutionLimit = 116 / aperture;
  const sepPx = separation * pxPerArcsec;
  const haloRadius = resolutionLimit * pxPerArcsec;

  const x1 = cx - sepPx / 2;
  const x2 = cx + sepPx / 2;

  drawStarBlob(x1, cy, haloRadius);
  drawStarBlob(x2, cy, haloRadius);

  // Status
  const ratio = separation / resolutionLimit;
  let status, statusColor;
  if (ratio >= 1.3) {
    status = "RESOLVED — two distinct stars";
    statusColor = color(100, 255, 140);
  } else if (ratio >= 0.7) {
    status = "MARGINAL — right at Dawes' Limit";
    statusColor = color(255, 210, 90);
  } else {
    status = "NOT RESOLVED — merged into one blob";
    statusColor = color(255, 100, 100);
  }

  noStroke();
  textAlign(LEFT, TOP);
  fill(255);
  textSize(20);
  text("Aperture: " + aperture + "mm", 40, 30);
  fill(180);
  textSize(16);
  text(
    "Dawes' Limit (resolution): " + resolutionLimit.toFixed(2) + '"',
    40,
    58,
  );
  text("True separation: " + separation.toFixed(1) + '"', 40, 80);

  textAlign(CENTER, TOP);
  fill(statusColor);
  textSize(22);
  text(status, width / 2, height - 60);
}

function drawStarBlob(x, y, haloRadius) {
  noStroke();
  const steps = 10;
  for (let i = steps; i > 0; i--) {
    const r = haloRadius * (i / steps);
    const alpha = 55 / i;
    fill(200, 220, 255, alpha);
    ellipse(x, y, r * 2, r * 2);
  }
  fill(255);
  ellipse(x, y, 6, 6);
}
