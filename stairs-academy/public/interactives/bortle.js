let bortleLevel = 1;
let stars = [];
let milkyPatches = [];
let showTarget = true;
let nebulaPatches = [];
let time = 0;

const bortleInfo = [
  {
    label: "Excellent dark sky",
    nelm: 7.8,
    sky: [0, 0, 0],
    glow: [0, 0, 0],
    sb: 22.0,
    desc: "Airglow visible, zodiacal light bright, M33 naked-eye",
  },
  {
    label: "Typical truly dark",
    nelm: 7.3,
    sky: [2, 2, 4],
    glow: [4, 2, 5],
    sb: 21.7,
    desc: "Zodiacal light obvious, summer Milky Way casts shadow",
  },
  {
    label: "Rural sky",
    nelm: 6.8,
    sky: [6, 4, 8],
    glow: [10, 6, 10],
    sb: 21.3,
    desc: "Zodiacal light visible, Milky Way detailed",
  },
  {
    label: "Rural/suburban",
    nelm: 6.3,
    sky: [12, 8, 14],
    glow: [20, 14, 18],
    sb: 20.8,
    desc: "Milky Way shows structure, light dome on horizon",
  },
  {
    label: "Suburban sky",
    nelm: 5.8,
    sky: [22, 16, 22],
    glow: [35, 26, 30],
    sb: 20.2,
    desc: "Milky Way washed out, light domes obvious",
  },
  {
    label: "Bright suburban",
    nelm: 5.3,
    sky: [35, 28, 30],
    glow: [55, 42, 42],
    sb: 19.5,
    desc: "Milky Way only near zenith, clouds lit",
  },
  {
    label: "Suburban/urban",
    nelm: 4.8,
    sky: [52, 42, 40],
    glow: [80, 62, 55],
    sb: 18.8,
    desc: "Milky Way invisible, neighbors' lights glare",
  },
  {
    label: "City sky",
    nelm: 4.3,
    sky: [75, 60, 50],
    glow: [110, 85, 68],
    sb: 18.0,
    desc: "Stars sparse, sky orange, only bright Messiers",
  },
  {
    label: "Inner city sky",
    nelm: 3.5,
    sky: [105, 82, 62],
    glow: [145, 110, 80],
    sb: 17.0,
    desc: " < 100 stars visible, Jupiter overpowers",
  },
];

function setup() {
  let canvas = createCanvas(860, 580);
  canvas.parent("canvas-container");

  let skyW = 580;
  for (let i = 0; i < 250; i++) {
    let mag = random(0.3, 11.5);
    stars.push({
      x: random(30, skyW - 30),
      y: random(30, height - 50),
      mag: mag,
      size: map(mag, 0.3, 11.5, 3.2, 0.6),
      r: randomGaussian(255, 20),
      g: randomGaussian(235, 20),
      b: randomGaussian(210, 25),
      temp: random(), // 0 = hot (blue), 1 = cool (red)
    });
  }
  for (let i = 0; i < 300; i++) {
    let t = random(TWO_PI);
    let bx = skyW * 0.25 + skyW * 0.5 * sin(t * 0.6 + 0.5);
    let by = height * 0.25 + height * 0.35 * cos(t * 0.4 + 0.3);
    milkyPatches.push({
      x: bx + randomGaussian(0, 35),
      y: by + randomGaussian(0, 35),
      w: random(15, 55),
      h: random(8, 25),
      a: random(30, 90),
    });
  }
  initNebula();

  document.getElementById("bortleSlider").addEventListener("input", (e) => {
    bortleLevel = parseInt(e.target.value);
    document.getElementById("bortleDisplay").innerText = "Class " + bortleLevel;
  });
  document.getElementById("showTarget").addEventListener("change", (e) => {
    showTarget = e.target.checked;
  });
}

function initNebula() {
  for (let i = 0; i < 250; i++) {
    let angle = random(TWO_PI);
    let radius = pow(random(), 0.5) * 90;
    nebulaPatches.push({
      x: cos(angle) * radius,
      y: sin(angle) * radius * 0.55,
      size: random(6, 35),
      hue: random(), // 0 = pink/red, 1 = blue/purple
      warp: random(TWO_PI),
    });
  }
}

function drawNebula(cx, cy, alpha) {
  noiseDetail(3, 0.5);
  for (let p of nebulaPatches) {
    let n = noise(
      (cx + p.x) * 0.02 + time * 0.0015 + p.warp * 0.1,
      (cy + p.y) * 0.02 + time * 0.002 + cos(p.warp) * 0.1,
    );
    let a = alpha * constrain(n * 0.9, 0.05, 0.85);
    let sz = p.size * (0.7 + n * 0.6);
    let r = lerp(190, 110, p.hue) + n * 50;
    let g = lerp(70, 55, p.hue) + n * 35;
    let b = lerp(110, 200, p.hue) + n * 40;
    fill(r, g, b, a * 200);
    noStroke();
    ellipse(cx + p.x + n * 8, cy + p.y + n * 8, sz, sz * 0.65);
  }
  fill(255, 230, 240, alpha * 120);
  ellipse(cx, cy, 14, 9);
  fill(255, 255, 250, alpha * 60);
  ellipse(cx, cy, 22, 16);
}

function draw() {
  time++;
  let info = bortleInfo[bortleLevel - 1];
  let skyW = 580;
  let horizonY = height - 30;

  // Sky background — gradient from horizon to zenith
  for (let y = 0; y < horizonY; y++) {
    let t = 1 - y / horizonY; // 1 at top, 0 at horizon
    let horizonGlow = pow(1 - t, 3);
    let r = lerp(info.glow[0], info.sky[0], t);
    let g = lerp(info.glow[1], info.sky[1], t);
    let b = lerp(info.glow[2], info.sky[2], t);
    stroke(r, g, b);
    strokeWeight(1);
    line(0, y, skyW, y);
  }

  // Ground
  noStroke();
  fill(10, 8, 8);
  rect(0, horizonY, skyW, height - horizonY);
  fill(20, 18, 16);
  rect(0, horizonY, skyW, 3);

  // Horizon light dome — smooth gradient using alpha
  let domeStr = map(bortleLevel, 1, 9, 0, 1);
  if (domeStr > 0.01) {
    for (let y = horizonY - 1; y > horizonY - 140; y--) {
      let h = (horizonY - y) / 140;
      let a = domeStr * (1 - h) * 180;
      noStroke();
      fill(info.glow[0], info.glow[1], info.glow[2], a);
      rect(0, y, skyW, 1);
    }
  }

  // Milky Way
  let mwAlpha = map(bortleLevel, 1, 6, 1, 0);
  if (mwAlpha > 0) {
    noStroke();
    for (let p of milkyPatches) {
      fill(200, 210, 255, p.a * mwAlpha * 0.3);
      ellipse(p.x, p.y, p.w, p.h);
    }
  }

  // Stars
  let limitMag = info.nelm + 3.5;
  let visibleCount = 0;
  for (let s of stars) {
    if (s.mag > limitMag) continue;
    let starAlpha = constrain(
      map(s.mag, limitMag, limitMag - 2, 30, 255),
      30,
      255,
    );
    let sfc =
      s.mag > 6
        ? color(255, 255, 255, starAlpha * 0.3)
        : color(
            constrain(s.r * (1 - s.temp * 0.5), 120, 255),
            constrain(s.g * (1 - s.temp * 0.3), 130, 235),
            constrain(s.b + s.temp * 40, 180, 255),
            starAlpha,
          );
    noStroke();
    fill(sfc);
    let sz = s.size * (1 + (6 - min(s.mag, 6)) * 0.1);
    ellipse(s.x, s.y, sz, sz);

    // Glow on bright stars
    if (s.mag < 2) {
      fill(red(sfc), green(sfc), blue(sfc), 30);
      ellipse(s.x, s.y, sz * 3, sz * 3);
    }
    visibleCount++;
  }

  // Target nebula
  if (showTarget) {
    let tx = skyW * 0.4,
      ty = height * 0.4;
    let bgBrightness = (info.sky[0] + info.sky[1] + info.sky[2]) / 3 / 255;
    let contrast = 1 - constrain(bgBrightness * 2.5, 0, 0.95);
    let nebAlpha = constrain(contrast, 0.02, 1);

    drawNebula(tx, ty, nebAlpha);

    fill(255, 180, 255, nebAlpha * 200);
    textSize(11);
    textAlign(CENTER);
    noStroke();
    text("M42 — Orion Nebula", tx, ty + 70);
  }

  // Right panel
  let rx = skyW + 20;
  fill(255);
  noStroke();
  textSize(18);
  textAlign(LEFT);
  text("Bortle Class " + bortleLevel, rx, 35);

  fill(
    info.nelm > 6
      ? color(100, 255, 100)
      : info.nelm > 5
        ? color(255, 255, 100)
        : color(255, 100, 100),
  );
  textSize(14);
  text(info.label, rx, 60);

  let iy = 95;
  fill(200);
  textSize(13);
  text("NELM", rx, iy);
  iy += 5;
  fill(255);
  textSize(28);
  text(info.nelm.toFixed(1), rx, iy + 25);
  iy += 45;

  fill(200);
  textSize(13);
  text("Sky brightness", rx, iy);
  iy += 5;
  fill(255);
  textSize(22);
  text(info.sb.toFixed(1) + " mag/□″", rx, iy + 20);
  iy += 40;

  fill(140);
  textSize(11);
  let fovMag = constrain(limitMag, 4, 12);
  text("Limiting mag: " + fovMag.toFixed(1), rx, iy);
  iy += 20;
  text("Stars visible: " + visibleCount, rx, iy);
  iy += 30;

  // SNR bar
  fill(200);
  textSize(13);
  text("Relative SNR", rx, iy);
  iy += 22;
  let snr = constrain(map(bortleLevel, 1, 9, 1, 0.02), 0.02, 1);
  noStroke();
  fill(60);
  rect(rx, iy, 180, 14, 7);
  let snrColor =
    snr > 0.5
      ? color(100, 255, 100)
      : snr > 0.2
        ? color(255, 200, 50)
        : color(255, 60, 60);
  fill(snrColor);
  rect(rx + 1, iy + 1, (180 - 2) * snr, 12, 6);
  fill(255);
  textSize(11);
  textAlign(CENTER);
  text(round(snr * 100) + "%", rx + 90, iy + 10);
  iy += 30;

  // Description
  fill(140);
  textSize(10);
  text(info.desc, rx, iy, 180, 80);
  iy += 85;

  // Emission spectrum reference
  fill(80);
  textSize(10);
  textAlign(LEFT);
  text("Emission spectrum", rx, iy);
  iy += 15;
  let specY = iy,
    specW = 180;
  for (let j = 0; j < specW; j++) {
    let t = j / specW;
    let r = constrain(120 + 135 * t - 100 * t * t, 0, 255);
    let g = constrain(40 + 200 * t - 180 * (1 - t) * (1 - t), 0, 255);
    let b = constrain(200 - 250 * t + 100 * t * t, 0, 255);
    stroke(r, g, b);
    strokeWeight(1);
    line(rx + j, specY, rx + j, specY + 12);
  }
  iy += 25;
  iy += 25;

  // Narrowband filter indicator
  let nbOpacity = map(bortleLevel, 3, 9, 1, 0);
  if (nbOpacity > 0) {
    fill(100, 200, 255, nbOpacity * 180);
    textSize(10);
    text("Narrowband filters", rx, iy);
    iy += 14;
    fill(120, 180, 255, nbOpacity * 120);
    textSize(9);
    text("can recover contrast", rx, iy);
    iy += 14;
    text("even in severe LP.", rx, iy);
  }
}
