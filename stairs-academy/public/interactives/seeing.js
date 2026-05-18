let stars = [];
let seeing = 2.0;
let wind = 1.0;
let t = 0;

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("canvas-container");

  // Create a few clusters of stars (like a small galaxy or star field)
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      brightness: random(100, 255),
      size: random(0.5, 3),
      offset: random(1000),
    });
  }

  document.getElementById("seeingSlider").addEventListener("input", (e) => {
    seeing = parseFloat(e.target.value);
    document.getElementById("seeingVal").innerText = seeing.toFixed(1) + '"';
  });

  document.getElementById("windSlider").addEventListener("input", (e) => {
    wind = parseFloat(e.target.value);
    document.getElementById("windVal").innerText = wind.toFixed(1);
  });
}

function draw() {
  background(10);
  t += 0.05 * wind;

  // Draw a "Reference" star that stays perfectly sharp
  drawStar(100, 100, 255, 2, "Perfect (No Atmosphere)", 0);

  // Draw the actual simulation
  for (let s of stars) {
    // Seeing creates a random walk/displacement and a bloat
    let displacementX = noise(s.offset + t, 0) * seeing * 5 - seeing * 2.5;
    let displacementY = noise(0, s.offset + t) * seeing * 5 - seeing * 2.5;

    // The "Bloat" - stars appear larger as seeing worsens
    let bloat = (seeing / 2) * 4;

    noStroke();
    fill(s.brightness, 180);
    ellipse(
      s.x + displacementX,
      s.y + displacementY,
      s.size + bloat,
      s.size + bloat,
    );

    // Core of the star
    fill(255);
    ellipse(s.x + displacementX, s.y + displacementY, s.size, s.size);
  }

  // Draw a magnified view of a single star to show "boiling"
  drawMagnifiedStar(width - 150, 100);
}

function drawStar(x, y, b, sz, label, displ) {
  fill(255, 100);
  noStroke();
  ellipse(x, y, sz + 2, sz + 2);
  fill(b);
  ellipse(x, y, sz, sz);

  fill(200);
  textSize(16);
  textAlign(CENTER);
  text(label, x, y + 35);
}

function drawMagnifiedStar(cx, cy) {
  let zoom = 10;
  let baseSize = 4;

  // Seeing displacement for the magnified star
  let dx = (noise(t) - 0.5) * seeing * zoom;
  let dy = (noise(t + 100) - 0.5) * seeing * zoom;

  // Outer halo (bloat)
  let haloSize = (baseSize + seeing * 2) * zoom;

  fill(20, 20, 40);
  stroke(60);
  rect(cx - 80, cy - 80, 160, 160, 10);

  noStroke();
  for (let i = 5; i > 0; i--) {
    fill(200, 220, 255, 40 / i);
    ellipse(cx + dx, cy + dy, haloSize * (i / 5), haloSize * (i / 5));
  }

  fill(255);
  ellipse(cx + dx, cy + dy, (baseSize * zoom) / 2, (baseSize * zoom) / 2);

  fill(200);
  textSize(18);
  textAlign(CENTER);
  text("Magnified View", cx, cy + 105);
  textSize(15);
  text("Notice the 'boiling' effect", cx, cy + 125);
}
