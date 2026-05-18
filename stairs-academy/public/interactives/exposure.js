let isExposing = false;
let exposureTime = 0;
let photons = [];

function setup() {
  let canvas = createCanvas(800, 450);
  canvas.parent("canvas-container");

  document.getElementById("shutterBtn").addEventListener("click", (e) => {
    isExposing = !isExposing;
    e.target.innerText = isExposing ? "Close Shutter" : "Open Shutter";
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    isExposing = false;
    document.getElementById("shutterBtn").innerText = "Open Shutter";
    exposureTime = 0;
    photons = [];
  });
}

function draw() {
  background(17);

  let cx = width / 2;
  let cy = height / 2;

  if (isExposing) {
    exposureTime += deltaTime / 1000;
    // Accumulate photons
    for (let i = 0; i < 15; i++) {
      if (random() < 0.6) {
        // Signal (Gaussian cluster)
        photons.push({
          x: randomGaussian(cx, 60),
          y: randomGaussian(cy, 40),
          c: random([color(100, 150, 255), color(255, 150, 200), color(255)]),
          a: random(20, 80),
        });
      } else {
        // Noise (Uniform distribution)
        photons.push({
          x: random(cx - 300, cx + 300),
          y: random(cy - 180, cy + 180),
          c: random([color(100), color(150), color(255, 100, 100)]),
          a: random(20, 60),
        });
      }
    }
  }

  // Draw sensor bounds
  noFill();
  stroke(100);
  strokeWeight(2);
  rect(cx - 300, cy - 180, 600, 360);

  noStroke();
  for (let p of photons) {
    // constrain to box
    if (p.x > cx - 300 && p.x < cx + 300 && p.y > cy - 180 && p.y < cy + 180) {
      fill(red(p.c), green(p.c), blue(p.c), p.a);
      ellipse(p.x, p.y, 4, 4);
    }
  }

  // Status text
  fill(255);
  textSize(28);
  textAlign(CENTER);
  text(`Exposure Time: ${exposureTime.toFixed(1)} s`, cx, cy - 210);

  if (isExposing) {
    fill(255, 0, 0);
    ellipse(cx - 160, cy - 216, 14, 14);
    textSize(18);
    textAlign(LEFT);
    text("RECORDING", cx - 142, cy - 210);
  }
}
