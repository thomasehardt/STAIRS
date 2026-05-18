let photons = [];
let collected = 0;
let aperture = 50;
let magnitude = 5.0;
let time = 0;

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("canvas-container");

  document.getElementById("apSlider").addEventListener("input", (e) => {
    aperture = parseInt(e.target.value);
    document.getElementById("apVal").innerText = aperture + "mm";
  });

  document.getElementById("magSlider").addEventListener("input", (e) => {
    magnitude = parseFloat(e.target.value);
    document.getElementById("magVal").innerText = magnitude.toFixed(1);
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    collected = 0;
    photons = [];
  });
}

function draw() {
  background(17);
  time++;

  let cx = width / 2;
  let cy = height / 2;

  // Draw Bucket (Telescope Aperture)
  let bucketR = map(aperture, 5, 250, 20, 200);
  noFill();
  stroke(100);
  strokeWeight(3);
  ellipse(cx, cy + 100, bucketR * 2, 60); // Base of bucket
  line(cx - bucketR, cy - 50, cx - bucketR, cy + 100);
  line(cx + bucketR, cy - 50, cx + bucketR, cy + 100);
  ellipse(cx, cy - 50, bucketR * 2, 60); // Top rim

  fill(50, 50, 100, 40);
  noStroke();
  ellipse(cx, cy - 50, bucketR * 2, 60);

  // Photon Flux Calculation
  // F = C * D^2 * 10^(-0.4 * m)
  let fluxRate = 5 * pow(aperture / 50, 2) * pow(10, -0.4 * (magnitude - 5));

  if (random(10) < fluxRate) {
    photons.push({
      x: cx + random(-bucketR, bucketR),
      y: -20,
      v: random(4, 7),
      active: true,
    });
  }

  // Draw Photons
  for (let i = photons.length - 1; i >= 0; i--) {
    let p = photons[i];
    if (p.active) {
      p.y += p.v;
      fill(255, 255, 0);
      noStroke();
      ellipse(p.x, p.y, 6, 6);

      // Collision with rim plane
      if (p.y > cy - 50) {
        // Check if inside ellipse
        let dist =
          pow(p.x - cx, 2) / pow(bucketR, 2) +
          pow(p.y - (cy - 50), 2) / pow(30, 2);
        if (dist <= 1.1) {
          p.active = false;
          collected++;
        }
      }
    }

    if (p.y > height + 20) photons.splice(i, 1);
  }

  // Status Info
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(22);
  text("Aperture: " + aperture + "mm", 40, 40);
  fill(200);
  textSize(18);
  text("Target Mag: " + magnitude.toFixed(1), 40, 70);

  fill(255, 255, 0);
  textSize(24);
  text("Photons Collected: " + collected, 40, 110);

  let fluxDisplay = (fluxRate * 6).toFixed(1); // Scale for display
  fill(150);
  textSize(16);
  text("Current Catch Rate: ~" + fluxDisplay + " photons/sec", 40, 145);

  // Comparison Label
  fill(100, 150, 255);
  textAlign(CENTER);
  if (aperture <= 7) text("Human Eye (7mm)", cx, cy + 180);
  else if (aperture <= 50) text("Smart Telescope (50mm)", cx, cy + 180);
  else if (aperture <= 150) text("Amateur Telescope (150mm)", cx, cy + 180);
  else text("Large Amateur Scope (250mm)", cx, cy + 180);
}
