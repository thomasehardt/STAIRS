let atoms = [];
let photons = [];
let electrons = [];
let wavelength = 500;
let flux = 3;
let workFunction = 4.5; // eV for silicon approx (simplified)
let thresholdWavelength = 1100; // Above this, no effect (IR)

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("canvas-container");

  // Create Silicon Lattice
  let rows = 4;
  let cols = 6;
  let spacingX = width / (cols + 1);
  let spacingY = height / (rows + 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      atoms.push({
        x: spacingX * (c + 1),
        y: spacingY * (r + 3),
        hasElectron: true,
        flash: 0,
      });
    }
  }

  document.getElementById("waveSlider").addEventListener("input", (e) => {
    wavelength = parseInt(e.target.value);
    document.getElementById("waveVal").innerText = wavelength + "nm";
  });

  document.getElementById("fluxSlider").addEventListener("input", (e) => {
    flux = parseInt(e.target.value);
    document.getElementById("fluxVal").innerText = flux;
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    atoms.forEach((a) => (a.hasElectron = true));
    electrons = [];
  });
}

function nmToRGB(nm) {
  let r, g, b;
  if (nm >= 380 && nm <= 440) {
    r = -(nm - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (nm >= 440 && nm <= 490) {
    r = 0;
    g = (nm - 440) / (490 - 440);
    b = 1;
  } else if (nm >= 490 && nm <= 510) {
    r = 0;
    g = 1;
    b = -(nm - 510) / (510 - 490);
  } else if (nm >= 510 && nm <= 580) {
    r = (nm - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (nm >= 580 && nm <= 645) {
    r = 1;
    g = -(nm - 645) / (645 - 580);
    b = 0;
  } else if (nm >= 645 && nm <= 780) {
    r = 1;
    g = 0;
    b = 0;
  } else {
    r = 0.3;
    g = 0.3;
    b = 0.3; // Outside visible
  }
  return [r * 255, g * 255, b * 255];
}

function draw() {
  background(17);

  // Draw Silicon Lattice (Bonds)
  stroke(40);
  strokeWeight(2);
  for (let i = 0; i < atoms.length; i++) {
    let a = atoms[i];
    // Draw horizontal bonds
    if ((i + 1) % 6 !== 0) line(a.x, a.y, atoms[i + 1].x, atoms[i + 1].y);
    // Draw vertical bonds
    if (i < atoms.length - 6) line(a.x, a.y, atoms[i + 6].x, atoms[i + 6].y);
  }

  // Draw Atoms
  for (let a of atoms) {
    noStroke();
    fill(
      a.flash > 0
        ? lerpColor(color(60), color(255, 255, 100), a.flash)
        : color(60),
    );
    ellipse(a.x, a.y, 30, 30);

    if (a.hasElectron) {
      fill(100, 200, 255);
      ellipse(a.x + 8, a.y - 8, 8, 8);
    }

    if (a.flash > 0) a.flash -= 0.05;
  }

  // Emission Logic
  if (frameCount % floor(map(flux, 1, 10, 60, 5)) === 0) {
    photons.push({
      x: random(width),
      y: -20,
      v: map(wavelength, 300, 900, 8, 3),
      w: wavelength,
    });
  }

  // Draw Photons
  for (let i = photons.length - 1; i >= 0; i--) {
    let p = photons[i];
    p.y += p.v;

    let col = nmToRGB(p.w);
    stroke(col[0], col[1], col[2]);
    strokeWeight(2);
    noFill();

    // Squiggly photon line
    beginShape();
    for (let j = 0; j < 20; j++) {
      let amp = map(p.w, 300, 900, 5, 15);
      let freq = map(p.w, 300, 900, 0.5, 0.1);
      vertex(p.x + sin((p.y - j) * freq) * amp, p.y - j);
    }
    endShape();

    // Collision Check
    for (let a of atoms) {
      if (dist(p.x, p.y, a.x, a.y) < 20) {
        a.flash = 1;
        // Energy check: Silicon bandgap is ~1.1 eV (approx 1100nm)
        // Shorter wavelength = higher energy
        if (p.w < 1100 && a.hasElectron) {
          a.hasElectron = false;
          electrons.push({
            x: a.x,
            y: a.y,
            vx: random(-2, 2),
            vy: random(-4, -1),
            alpha: 255,
          });
        }
        photons.splice(i, 1);
        break;
      }
    }

    if (p.y > height + 20) photons.splice(i, 1);
  }

  // Draw Electrons
  for (let i = electrons.length - 1; i >= 0; i--) {
    let e = electrons[i];
    e.x += e.vx;
    e.y += e.vy;
    e.alpha -= 2;

    fill(100, 200, 255, e.alpha);
    noStroke();
    ellipse(e.x, e.y, 8, 8);

    if (e.alpha <= 0) electrons.splice(i, 1);
  }

  // Legend and Labels
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(18);
  text("Legend:", 20, 20);

  fill(60);
  ellipse(30, 55, 18, 18);
  fill(200);
  textSize(16);
  text("Silicon Atom", 50, 48);

  fill(100, 200, 255);
  ellipse(30, 85, 10, 10);
  fill(200);
  textSize(16);
  text("Electron (Bound)", 50, 78);

  // Status Info
  let energyStr = (1240 / wavelength).toFixed(2) + " eV";
  fill(255);
  textAlign(RIGHT, TOP);
  textSize(18);
  text("Photon Energy: " + energyStr, width - 20, 20);

  if (wavelength > 1100) {
    fill(255, 100, 100);
    textSize(16);
    text("ENERGY TOO LOW (Threshold not met)", width - 20, 45);
  } else {
    fill(100, 255, 100);
    textSize(16);
    text("ENERGY OK (Photoelectrons emitted)", width - 20, 45);
  }
}
