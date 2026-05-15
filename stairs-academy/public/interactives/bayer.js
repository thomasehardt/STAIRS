const N = 8;
let mode = "individual";
let pixelCounts = [],
  flashTimers = [];
let photonCol = -1,
  photonRow = -1,
  photonY = -20;
let photonVisible = false,
  isFiring = false,
  showADC = false;
let totalPhotons = 0,
  colorCounts = { R: 0, G: 0, B: 0 };
let selectedFilter = "random";
let exposureTime = 0,
  exposureDuration = 10,
  exposureActive = false,
  maxPhoton = 800;
let debTarget = { r: 0, c: 0 },
  debStage = "idle",
  debProgress = 0;

const trueScene = [];

const swatches = {
  R: { r: 220, g: 25, b: 25 },
  B: { r: 25, g: 25, b: 220 },
  G: { r: 25, g: 220, b: 25 },
  W: { r: 220, g: 220, b: 220 },
  Y: { r: 220, g: 220, b: 25 },
  M: { r: 220, g: 25, b: 220 },
  C: { r: 25, g: 220, b: 220 },
  K: { r: 25, g: 25, b: 25 },
};
const sceneLayout = [
  ["R", "R", "R", "R", "B", "B", "B", "B"],
  ["R", "R", "R", "R", "B", "B", "B", "B"],
  ["G", "G", "G", "G", "W", "W", "W", "W"],
  ["G", "G", "G", "G", "W", "W", "W", "W"],
  ["Y", "Y", "Y", "Y", "M", "M", "M", "M"],
  ["Y", "Y", "Y", "Y", "M", "M", "M", "M"],
  ["C", "C", "C", "C", "K", "K", "K", "K"],
  ["C", "C", "C", "C", "K", "K", "K", "K"],
];

function getFilterColor(f) {
  if (f === "R") return [255, 80, 80];
  if (f === "G") return [80, 255, 80];
  return [80, 130, 255];
}

function pixelFilter(r, c) {
  return r % 2 === 0 ? (c % 2 === 0 ? "R" : "G") : c % 2 === 0 ? "G" : "B";
}

function initScene() {
  for (let r = 0; r < N; r++) {
    trueScene[r] = [];
    for (let c = 0; c < N; c++)
      trueScene[r][c] = { ...swatches[sceneLayout[r][c]] };
  }
}

function getIdealRaw() {
  let ideal = [];
  for (let r = 0; r < N; r++) {
    ideal[r] = [];
    for (let c = 0; c < N; c++) {
      let pf = pixelFilter(r, c);
      let ts = trueScene[r][c];
      ideal[r][c] = pf === "R" ? ts.r : pf === "G" ? ts.g : ts.b;
    }
  }
  return ideal;
}

function avgNeighbor(r, c, channel, data) {
  let sum = 0,
    count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      let nr = r + dr,
        nc = c + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      if (pixelFilter(nr, nc) === channel) {
        sum += data[nr][nc];
        count++;
      }
    }
  }
  return count > 0 ? sum / count : 0;
}

function debayerFromRaw(raw) {
  let result = [];
  for (let r = 0; r < N; r++) {
    result[r] = [];
    for (let c = 0; c < N; c++) {
      let pf = pixelFilter(r, c);
      let R = pf === "R" ? raw[r][c] : avgNeighbor(r, c, "R", raw);
      let G = pf === "G" ? raw[r][c] : avgNeighbor(r, c, "G", raw);
      let B = pf === "B" ? raw[r][c] : avgNeighbor(r, c, "B", raw);
      result[r][c] = { r: round(R), g: round(G), b: round(B) };
    }
  }
  return result;
}

function setup() {
  let canvas = createCanvas(860, 660);
  canvas.parent("canvas-container");

  for (let r = 0; r < N; r++) {
    pixelCounts[r] = [];
    flashTimers[r] = [];
    for (let c = 0; c < N; c++) {
      pixelCounts[r][c] = 0;
      flashTimers[r][c] = 0;
    }
  }
  initScene();

  document.getElementById("fireBtn").addEventListener("click", firePhoton);
  document.getElementById("autoBtn").addEventListener("click", (e) => {
    if (showADC || mode === "parallel") return;
    isFiring = !isFiring;
    e.target.innerText = isFiring ? "Stop" : "Auto";
    if (isFiring) firePhoton();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        pixelCounts[r][c] = 0;
        flashTimers[r][c] = 0;
      }
    totalPhotons = 0;
    colorCounts = { R: 0, G: 0, B: 0 };
    photonVisible = false;
    exposureTime = 0;
    showADC = false;
    isFiring = false;
    document.getElementById("autoBtn").innerText = "Auto";
    document.getElementById("adcBtn").innerText = "Readout";
    document.getElementById("fireBtn").disabled = mode === "parallel";
    document.getElementById("autoBtn").disabled = mode === "parallel";
    if (mode === "debayer") {
      debStage = "idle";
      debTarget = { r: 0, c: 0 };
      debProgress = 0;
    }
    if (mode === "parallel") startExposure();
  });
  document.getElementById("adcBtn").addEventListener("click", (e) => {
    showADC = !showADC;
    e.target.innerText = showADC ? "Live Counts" : "Readout";
    if (showADC) {
      if (isFiring) {
        isFiring = false;
        document.getElementById("autoBtn").innerText = "Auto";
      }
      if (mode === "parallel" && exposureActive) stopExposure();
    }
    document.getElementById("fireBtn").disabled = showADC;
    document.getElementById("autoBtn").disabled =
      showADC || mode === "parallel";
  });
  document.getElementById("stepBtn").addEventListener("click", stepDebayer);
  document.querySelectorAll('input[name="filter"]').forEach((el) => {
    el.addEventListener("change", (e) => {
      selectedFilter = e.target.value;
    });
  });
  document.querySelectorAll('input[name="exptime"]').forEach((el) => {
    el.addEventListener("change", (e) => {
      exposureDuration = parseInt(e.target.value);
    });
  });
  document.querySelectorAll('input[name="mode"]').forEach((el) => {
    el.addEventListener("change", (e) => {
      mode = e.target.value;
      if (mode === "parallel") {
        isFiring = false;
        document.getElementById("autoBtn").innerText = "Auto";
        document.getElementById("fireBtn").disabled = true;
        document.getElementById("autoBtn").disabled = true;
        document.getElementById("stepBtn").style.display = "none";
        document.getElementById("expTimeGroup").style.display = "";
        document
          .querySelectorAll('input[name="filter"]')
          .forEach((r) => (r.disabled = false));
        document.getElementById("speedSlider").disabled = false;
        document.getElementById("adcBtn").disabled = false;
        startExposure();
        if (showADC) {
          showADC = false;
          document.getElementById("adcBtn").innerText = "Readout";
        }
      } else if (mode === "debayer") {
        isFiring = false;
        document.getElementById("autoBtn").innerText = "Auto";
        document.getElementById("fireBtn").disabled = true;
        document.getElementById("autoBtn").disabled = true;
        document.getElementById("adcBtn").disabled = true;
        document.getElementById("stepBtn").style.display = "";
        document.getElementById("expTimeGroup").style.display = "none";
        document
          .querySelectorAll('input[name="filter"]')
          .forEach((r) => (r.disabled = true));
        document.getElementById("speedSlider").disabled = true;
        debStage = "idle";
        debTarget = { r: 0, c: 0 };
        debProgress = 0;
      } else {
        document.getElementById("fireBtn").disabled = false;
        document.getElementById("autoBtn").disabled = false;
        document.getElementById("stepBtn").style.display = "none";
        document.getElementById("expTimeGroup").style.display = "";
        document
          .querySelectorAll('input[name="filter"]')
          .forEach((r) => (r.disabled = false));
        document.getElementById("speedSlider").disabled = false;
        document.getElementById("adcBtn").disabled = false;
      }
    });
  });
}

function firePhoton() {
  if (showADC || photonVisible || totalPhotons >= maxPhoton) return;
  let candidates = [];
  if (selectedFilter === "random") {
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) candidates.push({ r, c });
  } else {
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        if (pixelFilter(r, c) === selectedFilter) candidates.push({ r, c });
  }
  if (candidates.length === 0) return;
  let pick = random(candidates);
  photonRow = pick.r;
  photonCol = pick.c;
  photonY = -15;
  photonVisible = true;
  document.getElementById("fireBtn").disabled = true;
}

function startExposure() {
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      pixelCounts[r][c] = 0;
      flashTimers[r][c] = 0;
    }
  totalPhotons = 0;
  colorCounts = { R: 0, G: 0, B: 0 };
  exposureTime = 0;
  exposureActive = true;
  showADC = false;
  document.getElementById("adcBtn").innerText = "Readout";
}

function stopExposure() {
  exposureActive = false;
}

function drawPipeline(y) {
  let idealRaw = getIdealRaw();
  let idealDebayered = debayerFromRaw(idealRaw);
  let alpha = min(totalPhotons / maxPhoton, 1);
  let cell = 16,
    gap = 2,
    labels = ["Scene", "Bayer Raw", "Debayered"];
  let pW = N * (cell + gap) - gap;

  fill(255);
  noStroke();
  textSize(13);
  textAlign(LEFT);
  text("Pipeline", 30, y - 12);

  for (let p = 0; p < 3; p++) {
    let ox = 30 + p * (pW + 25);
    fill(200);
    noStroke();
    textSize(11);
    textAlign(CENTER);
    text(labels[p], ox + pW / 2, y - 1);
    fill(120);
    textSize(9);
    if (p === 1)
      text("completeness: " + round(alpha * 100) + "%", ox + pW / 2, y + 8);
    else if (p === 2) {
      let err = 0;
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) {
          let s = trueScene[r][c],
            d = idealDebayered[r][c];
          err += abs(s.r - d.r) + abs(s.g - d.g) + abs(s.b - d.b);
        }
      text(
        "Bayer error: " + (err / (N * N * 3)).toFixed(1),
        ox + pW / 2,
        y + 8,
      );
    }
    let gridY = y + 14;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        let x = ox + c * (cell + gap);
        let yy = gridY + r * (cell + gap);
        if (p === 0) {
          let s = trueScene[r][c];
          fill(s.r, s.g, s.b);
        } else if (p === 1) {
          let val = idealRaw[r][c];
          let pf = pixelFilter(r, c);
          let cfc = getFilterColor(pf);
          fill(
            (cfc[0] * val) / 255,
            (cfc[1] * val) / 255,
            (cfc[2] * val) / 255,
            alpha * 255,
          );
        } else {
          let d = idealDebayered[r][c];
          fill(d.r, d.g, d.b, alpha * 255);
        }
        noStroke();
        rect(x, yy, cell, cell, 2);
        stroke(255, 30);
        strokeWeight(0.5);
        noFill();
        rect(x, yy, cell, cell, 2);
      }
    }
  }
}

function drawAccumGrid(cell, ox, oy) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let x = ox + c * (cell + 3);
      let y = oy + r * (cell + 3);
      let pf = pixelFilter(r, c);
      let cfc = getFilterColor(pf);
      let count = pixelCounts[r][c];
      let active =
        (photonVisible && photonRow === r && photonCol === c) ||
        flashTimers[r][c] > 0;

      fill(cfc[0], cfc[1], cfc[2], active ? 65 : 25);
      noStroke();
      rect(x, y, cell, cell, 4);
      stroke(cfc[0], cfc[1], cfc[2], active ? 200 : 60);
      strokeWeight(active ? 2.5 : 1);
      noFill();
      rect(x, y, cell, cell, 4);

      if (!showADC) {
        let fillH = map(min(count, 80), 0, 80, 0, cell - 6);
        if (fillH > 2) {
          noStroke();
          fill(cfc[0], cfc[1], cfc[2], 90);
          rect(x + 3, y + cell - 3 - fillH, cell - 6, fillH, 2);
          fill(cfc[0], cfc[1], cfc[2], 140);
          rect(x + 5, y + cell - 5 - fillH, cell - 10, max(fillH - 2, 2), 1);
        }
      }

      fill(255);
      noStroke();
      textSize(showADC ? 12 : 13);
      textAlign(CENTER, CENTER);
      if (showADC) {
        let adcVal = min(round(count * (4095 / 200)), 4095);
        text(adcVal, x + cell / 2, y + cell / 2 - 3);
        fill(120);
        textSize(8);
        text("ADC", x + cell / 2, y + cell / 2 + 12);
      } else if (count > 0) {
        text(
          count > 99 ? count : count > 9 ? " " + count : "  " + count,
          x + cell / 2,
          y + cell / 2,
        );
      }

      fill(cfc[0], cfc[1], cfc[2], 140);
      noStroke();
      textSize(8);
      textAlign(LEFT, TOP);
      text(pf, x + 2, y + 2);

      if (active && flashTimers[r][c] > 0) {
        noStroke();
        fill(255, 255, 255, flashTimers[r][c] * 180);
        ellipse(x + cell / 2, y + cell / 2, cell * 0.5, cell * 0.5);
      }
    }
  }
}

function drawPhoton(cell, ox, oy) {
  if (!photonVisible) return;
  let cx = ox + photonCol * (cell + 3) + cell / 2;
  let targetY = oy + photonRow * (cell + 3) + cell / 2;
  let pf = pixelFilter(photonRow, photonCol);
  let fc = getFilterColor(pf);
  let speed = map(
    parseInt(document.getElementById("speedSlider").value),
    1,
    20,
    1.2,
    13,
  );
  photonY += speed;
  let cy = -15 + photonY;

  if (cy > 15) {
    noStroke();
    for (let i = 0; i < 5; i++) {
      let ty = cy - i * 4;
      if (ty > 10) {
        let ta = map(i, 0, 5, 90, 0);
        let ts = map(i, 0, 5, 5, 1.5);
        fill(fc[0], fc[1], fc[2], ta);
        ellipse(cx, ty, ts, ts);
      }
    }
  }
  if (cy < targetY) {
    let glow = map(cy, 20, targetY, 10, 5);
    noStroke();
    fill(fc[0], fc[1], fc[2], 25);
    ellipse(cx, cy, glow, glow);
    fill(fc[0], fc[1], fc[2], 240);
    ellipse(cx, cy, 6, 6);
    fill(255, 160);
    ellipse(cx, cy, 3, 3);
  }
  if (cy >= targetY) {
    photonVisible = false;
    pixelCounts[photonRow][photonCol]++;
    totalPhotons++;
    colorCounts[pf]++;
    flashTimers[photonRow][photonCol] = 1;
    document.getElementById("fireBtn").disabled = false;
    if (isFiring && totalPhotons < maxPhoton) {
      let flt = ["R", "G", "B"];
      selectedFilter = flt[floor(random(3))];
      document.querySelectorAll('input[name="filter"]').forEach((el) => {
        el.checked = el.value === selectedFilter;
      });
      firePhoton();
    }
  }
}

function tickParallel() {
  if (!exposureActive) return;
  exposureTime += 1 / 60;
  if (exposureTime >= exposureDuration) {
    stopExposure();
    return;
  }
  let rate = map(
    parseInt(document.getElementById("speedSlider").value),
    1,
    20,
    0.005,
    0.15,
  );
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (pixelCounts[r][c] >= 200) continue;
      let pf = pixelFilter(r, c);
      let target =
        pf === "R"
          ? trueScene[r][c].r
          : pf === "G"
            ? trueScene[r][c].g
            : trueScene[r][c].b;
      if (random() < (target / 255) * rate) {
        pixelCounts[r][c]++;
        totalPhotons++;
        colorCounts[pf]++;
        flashTimers[r][c] = 1;
      }
    }
  }
}

function stepDebayer() {
  if (mode !== "debayer") return;
  if (debStage === "idle") {
    debStage = "arrows";
    debProgress = 0;
  } else if (debStage === "arrows") {
    debStage = "values";
    debProgress = 1;
  } else if (debStage === "values") {
    debStage = "complete";
  } else if (debStage === "complete") {
    let nc = debTarget.c + 1;
    let nr = debTarget.r;
    if (nc >= 4) {
      nc = 0;
      nr++;
    }
    if (nr >= 4) {
      nr = 0;
    }
    debTarget = { r: nr, c: nc };
    debStage = "idle";
    debProgress = 0;
  }
}

function draw() {
  background(17);

  // Pipeline section
  drawPipeline(50);

  // Separator
  stroke(60);
  strokeWeight(1);
  line(20, 232, 840, 232);

  // Decay flash timers
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (flashTimers[r][c] > 0) {
        flashTimers[r][c] -= 0.045;
        if (flashTimers[r][c] < 0) flashTimers[r][c] = 0;
      }

  if (mode === "debayer") {
    if (debStage === "arrows" && debProgress < 1) {
      debProgress += 0.012;
      if (debProgress > 1) debProgress = 1;
    }
    drawDebayerView();
    return;
  }

  // Accumulation section
  let cell = 38;
  let gW = N * (cell + 3) - 3;
  let ox = 30,
    oy = 245;

  fill(255);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  text(
    mode === "individual"
      ? "Accumulation \u2014 Individual Photons"
      : "Accumulation \u2014 Parallel Exposure",
    ox,
    oy - 6,
  );
  fill(120);
  textSize(11);
  text(
    mode === "individual"
      ? "One photon lands on a single pixel at a time."
      : "All 64 pixels accumulate simultaneously at rates set by scene brightness.",
    ox,
    oy + 10,
  );

  oy += 26;
  drawAccumGrid(cell, ox, oy);

  if (mode === "individual") {
    drawPhoton(cell, ox, oy);
  } else {
    tickParallel();
  }

  // Right panel
  let rx = ox + gW + 35;
  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT);
  text("Statistics", rx, 250);

  let iy = 275;
  fill(200);
  textSize(13);
  let showTotal =
    mode === "individual" ? min(totalPhotons, maxPhoton) : totalPhotons;
  text("Total: " + showTotal, rx, iy);
  iy += 24;

  for (let f of ["R", "G", "B"]) {
    let cfc = getFilterColor(f);
    fill(cfc[0], cfc[1], cfc[2]);
    noStroke();
    textSize(13);
    text(f + ": " + colorCounts[f], rx + 4, iy);
    iy += 20;
  }

  if (mode === "parallel") {
    iy += 4;
    let remaining = max(exposureDuration - exposureTime, 0);
    let expComplete = !exposureActive && remaining <= 0;
    fill(expComplete ? color(100, 255, 100) : 180);
    textSize(13);
    text(
      expComplete
        ? "Exposure Complete"
        : "Remaining: " + remaining.toFixed(1) + "s",
      rx,
      iy,
    );
    iy += 22;
    fill(120);
    textSize(11);
    let curRate = map(
      parseInt(document.getElementById("speedSlider").value),
      1,
      20,
      0.005,
      0.15,
    );
    text(
      exposureDuration + "s, " + round(curRate * 60 * 100) / 100 + " ph/s max",
      rx,
      iy,
    );
    iy += 20;
  }

  iy += 4;
  fill(140);
  textSize(10);
  if (showADC) {
    text("READOUT \u2014 exposure ended.", rx, iy);
    iy += 15;
    text("Each pixel\u2019s charge converted", rx, iy);
    iy += 14;
    text("to 12-bit ADC (0\u20134095).", rx, iy);
    iy += 18;
  } else if (mode === "parallel") {
    if (exposureActive) {
      text("Bright pixels accumulate faster.", rx, iy);
      iy += 14;
      text("Rate calibrated for given exp.", rx, iy);
      iy += 14;
    } else {
      text("Exposure ended. Press Readout", rx, iy);
      iy += 14;
      text("to see ADC values, or switch", rx, iy);
      iy += 14;
      text("mode / Reset to restart.", rx, iy);
      iy += 14;
    }
    iy += 18;
  } else {
    text("Manual: Fire / Auto / R/G/B/Rnd", rx, iy);
    iy += 15;
    text("Each photon lands on one pixel.", rx, iy);
    iy += 14;
    text("Counts = relative brightness.", rx, iy);
    iy += 18;
  }

  let idealRaw = getIdealRaw();
  let idealDeb = debayerFromRaw(idealRaw);
  let bayerErr = 0;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      let s = trueScene[r][c],
        d = idealDeb[r][c];
      bayerErr += abs(s.r - d.r) + abs(s.g - d.g) + abs(s.b - d.b);
    }
  bayerErr = (bayerErr / (N * N * 3)).toFixed(1);

  iy += 4;
  fill(100);
  textSize(10);
  text("Debayered: bilinear interp.", rx, iy);
  iy += 14;
  text("Theoretical Bayer error: " + bayerErr, rx, iy);
  iy += 14;
  text("(residual from interpolation", rx, iy);
  iy += 14;
  text("of missing channels at edges).", rx, iy);
  iy += 14;
  text("Pipeline panels show IDEAL", rx, iy);
  iy += 14;
  text("target fading in as photons", rx, iy);
  iy += 14;
  text("accumulate. Compare with the", rx, iy);
  iy += 14;
  text("noisy grid below.", rx, iy);

  // Saturation
  if (totalPhotons >= maxPhoton && mode === "individual") {
    fill(100, 255, 100, 200);
    noStroke();
    textSize(14);
    text("Sensor Saturated!", rx, iy + 20);
  }
}

function drawDebayerView() {
  let cell = 65,
    gap = 6;
  let gW = 4 * (cell + gap) - gap;
  let ox = 80;
  let oy = 255;
  let tr = debTarget.r,
    tc = debTarget.c;
  let targetPF = pixelFilter(tr, tc);

  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT);
  text("Debayer / Demosaicing Animation", ox, oy - 15);
  fill(140);
  textSize(11);
  text(
    "4\u00d74 pixel cluster \u2014 Bilinear interpolation of missing color channels",
    ox,
    oy - 2,
  );

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let x = ox + c * (cell + gap);
      let y = oy + r * (cell + gap);
      let pf = pixelFilter(r, c);
      let cfc = getFilterColor(pf);
      let count = pixelCounts[r][c];
      let isTarget = r === tr && c === tc;

      fill(cfc[0], cfc[1], cfc[2], isTarget ? 60 : 25);
      noStroke();
      rect(x, y, cell, cell, 4);
      strokeWeight(isTarget ? 3 : 1);
      stroke(
        isTarget ? color(255, 255, 100) : color(cfc[0], cfc[1], cfc[2], 80),
      );
      noFill();
      rect(x, y, cell, cell, 4);

      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(14);
      text(count, x + cell / 2, y + cell / 2 - 4);
      fill(cfc[0], cfc[1], cfc[2], 180);
      textSize(9);
      textAlign(LEFT, TOP);
      text(pf, x + 3, y + 3);
      fill(80);
      textSize(8);
      textAlign(RIGHT, BOTTOM);
      text("(" + r + "," + c + ")", x + cell - 3, y + cell - 3);
    }
  }

  let cx = ox + tc * (cell + gap) + cell / 2;
  let cy = oy + tr * (cell + gap) + cell / 2;

  let contrib = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      let nr = tr + dr,
        nc = tc + dc;
      if (nr < 0 || nr >= 4 || nc < 0 || nc >= 4) continue;
      let npf = pixelFilter(nr, nc);
      if (npf !== targetPF) contrib.push({ r: nr, c: nc, ch: npf });
    }
  }

  let showArrows =
    debStage === "arrows" || debStage === "values" || debStage === "complete";
  if (showArrows) {
    let t = debStage === "arrows" ? debProgress : 1;
    for (let p of contrib) {
      let sx = ox + p.c * (cell + gap) + cell / 2;
      let sy = oy + p.r * (cell + gap) + cell / 2;
      let col =
        p.ch === "R"
          ? color(255, 80, 80, 200)
          : p.ch === "G"
            ? color(80, 255, 80, 200)
            : color(80, 130, 255, 200);
      let ex = lerp(sx, cx, t);
      let ey = lerp(sy, cy, t);

      stroke(col);
      strokeWeight(2);
      line(sx, sy, ex, ey);

      if (t > 0.03) {
        let angle = atan2(ey - sy, ex - sx);
        push();
        translate(ex, ey);
        rotate(angle);
        fill(col);
        noStroke();
        triangle(7, 0, -5, -4, -5, 4);
        pop();
      }
    }

    if (debStage === "values" || debStage === "complete") {
      for (let p of contrib) {
        let sx = ox + p.c * (cell + gap) + cell / 2;
        let sy = oy + p.r * (cell + gap) + cell / 2;
        let col =
          p.ch === "R"
            ? color(255, 180, 180)
            : p.ch === "G"
              ? color(180, 255, 180)
              : color(180, 200, 255);
        let val = pixelCounts[p.r][p.c];
        fill(col);
        noStroke();
        textSize(14);
        textAlign(CENTER, BOTTOM);
        text(val, sx, sy - 6);
      }
    }
  }

  // Right panel
  let rx = ox + gW + 35;
  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT);
  text("Debayer Info", rx, oy + 5);

  let iy = oy + 30;
  fill(200);
  textSize(13);
  let stageLabels = {
    idle: "Step 1: Idle",
    arrows: "Step 2: Arrows",
    values: "Step 3: Values",
    complete: "Step 4: Result",
  };
  text(stageLabels[debStage] || "", rx, iy);
  iy += 22;

  fill(140);
  textSize(11);
  text("Target: (" + tr + "," + tc + ")", rx, iy);
  iy += 17;
  text("Filter: " + targetPF, rx, iy);
  iy += 17;
  text("Raw: " + pixelCounts[tr][tc], rx, iy);
  iy += 24;

  let missing = [];
  if (targetPF !== "R") missing.push("R");
  if (targetPF !== "G") missing.push("G");
  if (targetPF !== "B") missing.push("B");
  text("Missing: " + missing.join(", "), rx, iy);
  iy += 20;
  text("Contributors: " + contrib.length, rx, iy);
  iy += 24;

  if (debStage === "idle") {
    fill(160);
    textSize(11);
    text("Press [Step] to animate", rx, iy);
    iy += 16;
    text("arrows from contributing", rx, iy);
    iy += 16;
    text("neighbors to target pixel.", rx, iy);
  } else if (debStage === "arrows") {
    fill(160);
    textSize(11);
    text("Arrows show neighboring", rx, iy);
    iy += 16;
    text("pixels that contribute", rx, iy);
    iy += 16;
    text("missing color channel data.", rx, iy);
  } else if (debStage === "values") {
    fill(160);
    textSize(11);
    text("Each neighbor\u2019s value is", rx, iy);
    iy += 16;
    text("shown. The average fills", rx, iy);
    iy += 16;
    text("the missing channel.", rx, iy);
  } else if (debStage === "complete") {
    let rContrib = contrib.filter((p) => p.ch === "R");
    let gContrib = contrib.filter((p) => p.ch === "G");
    let bContrib = contrib.filter((p) => p.ch === "B");

    let R =
      targetPF === "R"
        ? pixelCounts[tr][tc]
        : round(
            rContrib.reduce((s, p) => s + pixelCounts[p.r][p.c], 0) /
              max(rContrib.length, 1),
          );
    let G =
      targetPF === "G"
        ? pixelCounts[tr][tc]
        : round(
            gContrib.reduce((s, p) => s + pixelCounts[p.r][p.c], 0) /
              max(gContrib.length, 1),
          );
    let B =
      targetPF === "B"
        ? pixelCounts[tr][tc]
        : round(
            bContrib.reduce((s, p) => s + pixelCounts[p.r][p.c], 0) /
              max(bContrib.length, 1),
          );

    fill(100, 255, 100);
    textSize(14);
    text("RGB(" + R + "," + G + "," + B + ")", rx, iy);
    iy += 22;

    fill(160);
    textSize(10);
    if (missing.includes("R")) {
      let rStr = rContrib.map((p) => pixelCounts[p.r][p.c]).join("+");
      text("R = (" + rStr + ")/" + rContrib.length + " = " + R, rx, iy);
      iy += 14;
    }
    if (missing.includes("G")) {
      let gStr = gContrib.map((p) => pixelCounts[p.r][p.c]).join("+");
      text("G = (" + gStr + ")/" + gContrib.length + " = " + G, rx, iy);
      iy += 14;
    }
    if (missing.includes("B")) {
      let bStr = bContrib.map((p) => pixelCounts[p.r][p.c]).join("+");
      text("B = (" + bStr + ")/" + bContrib.length + " = " + B, rx, iy);
      iy += 14;
    }

    iy += 8;
    fill(60);
    noStroke();
    rect(rx, iy, 80, 80, 4);
    fill(R, G, B);
    noStroke();
    rect(rx + 2, iy + 2, 76, 76, 3);
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(10);
    text("Interpolated", rx + 40, iy + 40);

    iy += 90;
    fill(100);
    textSize(10);
    text("Press [Step] for next pixel.", rx, iy);
  }
}
