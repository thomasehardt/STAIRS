let electrons = [];
let photons = [];
let pixelCharge = 0;
let digitalValue = null;
let isReadingOut = false;
let readoutProgress = 0;

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("canvas-container");

  document.getElementById("fireBtn").addEventListener("click", () => {
    if (isReadingOut) return;
    photons.push({
      x: 100,
      y: random(100, 200),
      targetX: 400 + random(-80, 80),
      targetY: 280,
      speed: 8,
    });
  });

  document.getElementById("readoutBtn").addEventListener("click", () => {
    if (electrons.length === 0 || isReadingOut) return;
    isReadingOut = true;
    readoutProgress = 0;
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    electrons = [];
    photons = [];
    pixelCharge = 0;
    digitalValue = null;
    isReadingOut = false;
    readoutProgress = 0;
  });
}

function draw() {
  background(17);

  let pixelX = 400;
  let pixelY = 350;
  let pixelW = 200;
  let pixelH = 150;

  // 1. Draw Silicon Pixel Structure
  noFill();
  stroke(100);
  strokeWeight(2);
  // The "Bucket" / Potential Well
  rect(pixelX - pixelW / 2, pixelY - pixelH / 2, pixelW, pixelH, 10);
  fill(50, 50, 80, 50);
  rect(pixelX - pixelW / 2, pixelY - pixelH / 2, pixelW, pixelH, 10);

  fill(255);
  noStroke();
  textAlign(CENTER);
  textSize(18);
  text("Silicon Pixel (Potential Well)", pixelX, pixelY + pixelH / 2 + 30);

  // 2. Handle Photons
  for (let i = photons.length - 1; i >= 0; i--) {
    let p = photons[i];
    p.x += p.speed;
    // Simple arc trajectory
    let t = map(p.x, 100, p.targetX, 0, 1);
    let curY = lerp(p.y, p.targetY, t) - sin(t * PI) * 50;

    fill(255, 255, 0);
    ellipse(p.x, curY, 8, 8);

    if (p.x >= p.targetX) {
      // Photoelectric Effect!
      for (let j = 0; j < 3; j++) {
        electrons.push({
          x: p.targetX,
          y: p.targetY,
          vx: random(-2, 2),
          vy: random(1, 3),
          inBucket: false,
        });
      }
      photons.splice(i, 1);
    }
  }

  // 3. Handle Electrons
  for (let e of electrons) {
    if (!e.inBucket) {
      e.x += e.vx;
      e.y += e.vy;
      if (e.y > pixelY + pixelH / 2 - 10) {
        e.y = pixelY + pixelH / 2 - 10;
        e.inBucket = true;
      }
      if (e.x < pixelX - pixelW / 2 + 10) e.x = pixelX - pixelW / 2 + 10;
      if (e.x > pixelX + pixelW / 2 - 10) e.x = pixelX + pixelW / 2 - 10;
    } else if (isReadingOut) {
      // Move towards ADC during readout
      e.x = lerp(e.x, 700, 0.1);
      e.y = lerp(e.y, 150, 0.1);
    }

    fill(100, 200, 255);
    ellipse(e.x, e.y, 6, 6);
  }

  // 4. Analog to Digital Converter (ADC)
  let adcX = 700;
  let adcY = 150;
  fill(40);
  stroke(150);
  rect(adcX - 40, adcY - 40, 80, 80, 5);
  fill(255);
  noStroke();
  textSize(14);
  text("ADC", adcX, adcY - 45);

  if (isReadingOut) {
    readoutProgress += 0.02;
    if (readoutProgress >= 1.0) {
      isReadingOut = false;
      digitalValue = electrons.length * 8; // Arbitrary scale
      electrons = [];
    }

    stroke(0, 255, 0);
    strokeWeight(2);
    line(pixelX + pixelW / 2, pixelY, adcX - 40, adcY);
  }

  // 5. Display Value
  if (digitalValue !== null) {
    fill(0, 255, 0);
    textSize(32);
    text(digitalValue, adcX, adcY + 10);
    textSize(16);
    text("Digital Value", adcX, adcY + 60);
  }

  // Explanatory Text
  textAlign(LEFT);
  fill(200);
  textSize(14);
  if (electrons.length > 0 && !isReadingOut && digitalValue === null) {
    text("Electrons accumulated: " + electrons.length, 50, 400);
    text("This represents stored charge (analog signal).", 50, 420);
  }
}
