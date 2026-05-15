let rawData;
let histBins = new Array(256).fill(0);
let blackPt = 0,
  gammaVal = 1.0,
  whitePt = 255;

function generateRawNebula() {
  rawData = new Uint8Array(400 * 400);

  let clusters = [];
  for (let i = 0; i < 7; i++) {
    clusters.push({
      x: random(60, 340),
      y: random(60, 340),
      rx: random(50, 140),
      ry: random(50, 120),
      amp: random(40, 100),
    });
  }

  noiseDetail(4, 0.5);
  for (let y = 0; y < 400; y++) {
    for (let x = 0; x < 400; x++) {
      let val = random(0, 2);
      for (let c of clusters) {
        let dx = (x - c.x) / c.rx,
          dy = (y - c.y) / c.ry;
        let d2 = dx * dx + dy * dy;
        if (d2 > 3) continue;
        let gauss = exp(-d2 * 2.5);
        let n = noise(x * 0.025, y * 0.02);
        val += gauss * c.amp * (0.3 + 0.7 * n);
      }
      rawData[y * 400 + x] = constrain(val, 0, 255);
    }
  }

  for (let i = 0; i < 120; i++) {
    let sx = floor(random(400)),
      sy = floor(random(400));
    let bright = random(40, 220);
    let sz = random(0.5, 2.8);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        let px = sx + dx,
          py = sy + dy;
        if (px < 0 || px >= 400 || py < 0 || py >= 400) continue;
        let dist = sqrt(dx * dx + dy * dy);
        if (dist > sz + 0.5) continue;
        let falloff = max(0, 1 - dist / (sz + 0.5));
        let idx = py * 400 + px;
        rawData[idx] = constrain(rawData[idx] + bright * falloff, 0, 255);
      }
    }
  }
}

function computeHistogram() {
  histBins.fill(0);
  for (let v of rawData) histBins[floor(v)]++;
}

function applyStretch(val) {
  if (val <= blackPt) return 0;
  if (val >= whitePt) return 255;
  let t = (val - blackPt) / (whitePt - blackPt);
  return constrain(pow(t, 1 / gammaVal) * 255, 0, 255);
}

let stretchCache = { bp: -1, g: -1, wp: -1 };
let stretched = new Uint8Array(400 * 400);
let displayImg;

function computeStretched() {
  if (
    stretchCache.bp === blackPt &&
    stretchCache.g === gammaVal &&
    stretchCache.wp === whitePt
  )
    return;
  stretchCache = { bp: blackPt, g: gammaVal, wp: whitePt };
  for (let i = 0; i < rawData.length; i++)
    stretched[i] = applyStretch(rawData[i]);
}

function setup() {
  let canvas = createCanvas(860, 620);
  canvas.parent("canvas-container");

  generateRawNebula();
  computeHistogram();
  displayImg = createImage(400, 400);

  function slider(id, valId, onUpdate) {
    document.getElementById(id).addEventListener("input", (e) => {
      onUpdate(e);
      document.getElementById(valId).innerText =
        e.target.value + (id === "gammaSlider" ? "" : "%");
      stretchCache.bp = -1;
    });
  }
  slider(
    "blackSlider",
    "blackVal",
    (e) => (blackPt = map(parseInt(e.target.value), 0, 100, 0, 80)),
  );
  slider(
    "gammaSlider",
    "gammaVal",
    (e) => (gammaVal = parseInt(e.target.value) / 10),
  );
  slider(
    "whiteSlider",
    "whiteVal",
    (e) => (whitePt = map(parseInt(e.target.value), 0, 100, 80, 255)),
  );

  document.getElementById("autoBtn").addEventListener("click", () => {
    let sum = 0,
      count = 0;
    for (let v of rawData) {
      sum += v;
      count++;
    }
    let mean = sum / count;
    let cutoff = mean * 2.5;
    let maxVal = 0;
    for (let v of rawData) if (v > maxVal) maxVal = v;
    let newBlack = 0;
    let newGamma = 3.0;
    let newWhite = max(mean * 6, 80);
    document.getElementById("blackSlider").value = map(newBlack, 0, 80, 0, 100);
    document.getElementById("gammaSlider").value = newGamma * 10;
    document.getElementById("whiteSlider").value = map(
      newWhite,
      80,
      255,
      0,
      100,
    );
    blackPt = floor(newBlack);
    gammaVal = newGamma;
    whitePt = floor(newWhite);
    document.getElementById("blackVal").innerText =
      round(map(newBlack, 0, 80, 0, 100)) + "%";
    document.getElementById("gammaVal").innerText = gammaVal.toFixed(1);
    document.getElementById("whiteVal").innerText =
      round(map(newWhite, 80, 255, 0, 100)) + "%";
    stretchCache.bp = -1;
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("blackSlider").value = 0;
    document.getElementById("gammaSlider").value = 10;
    document.getElementById("whiteSlider").value = 100;
    blackPt = 0;
    gammaVal = 1.0;
    whitePt = 255;
    document.getElementById("blackVal").innerText = "0%";
    document.getElementById("gammaVal").innerText = "1.0";
    document.getElementById("whiteVal").innerText = "100%";
    stretchCache.bp = -1;
  });
}

function drawHistogram(x, y, w, h) {
  fill(15, 15, 25);
  noStroke();
  rect(x, y, w, h);
  stroke(50);
  strokeWeight(0.5);
  noFill();
  rect(x, y, w, h);

  let maxBin = max(histBins) || 1;
  noStroke();
  for (let i = 0; i < 256; i++) {
    let bh = map(histBins[i], 0, maxBin, 0, h - 4);
    fill(80, 140, 200, 120);
    rect(x + map(i, 0, 256, 0, w), y + h - 4 - bh, max(w / 256, 1), bh);
  }

  // Stretch curve
  stroke(255, 200, 100, 150);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i <= w; i++) {
    let input = map(i, 0, w, 0, 255);
    let output = applyStretch(input);
    vertex(x + i, y + h - 4 - map(output, 0, 255, 0, h - 4));
  }
  endShape();

  // Black point marker
  let bx = x + map(blackPt, 0, 255, 0, w);
  stroke(255, 60, 60, 200);
  strokeWeight(2);
  line(bx, y + 2, bx, y + h - 2);
  fill(255, 60, 60);
  noStroke();
  textSize(9);
  textAlign(CENTER, TOP);
  text("B", bx, y + 2);

  // White point marker
  let wx = x + map(whitePt, 0, 255, 0, w);
  stroke(60, 60, 255, 200);
  strokeWeight(2);
  line(wx, y + 2, wx, y + h - 2);
  fill(60, 60, 255);
  noStroke();
  textSize(9);
  textAlign(CENTER, TOP);
  text("W", wx, y + 2);

  // Gamma indicator
  let gammaOut = pow(0.5, 1 / gammaVal) * 255;
  let gx = x + map(gammaOut, 0, 255, 0, w);
  stroke(100, 255, 100, 200);
  strokeWeight(2);
  line(gx, y + 2, gx, y + h - 2);
  fill(100, 255, 100);
  noStroke();
  textSize(9);
  textAlign(CENTER, TOP);
  text("\u03b3", gx, y + 2);

  // Labels
  fill(120);
  noStroke();
  textSize(9);
  textAlign(LEFT, BOTTOM);
  text("0", x + 2, y + h - 2);
  textAlign(RIGHT, BOTTOM);
  text("255", x + w - 2, y + h - 2);
  fill(100);
  textAlign(CENTER, TOP);
  text("Pixel value", x + w / 2, y + h + 3);
}

function draw() {
  background(17);
  computeStretched();

  // Display stretched image
  displayImg.loadPixels();
  for (let i = 0; i < 400 * 400; i++) {
    let v = stretched[i];
    let idx = i * 4;
    displayImg.pixels[idx] = v;
    displayImg.pixels[idx + 1] = v * 0.93;
    displayImg.pixels[idx + 2] = v * 0.88;
    displayImg.pixels[idx + 3] = 255;
  }
  displayImg.updatePixels();
  image(displayImg, 20, 20);
  noFill();
  stroke(40);
  strokeWeight(1);
  rect(20, 20, 400, 400);

  // Before/after label
  fill(stretched.some((v) => v > 10) ? color(100, 255, 100) : 150);
  noStroke();
  textSize(15);
  textAlign(LEFT, TOP);
  text(
    whitePt < 255 || gammaVal > 1.2 || blackPt > 0
      ? "Stretched"
      : "Raw (linear)",
    26,
    26,
  );

  // Histogram
  drawHistogram(20, 440, 500, 140);

  // Right panel
  let rx = 540,
    ry = 25;
  fill(255);
  noStroke();
  textSize(17);
  textAlign(LEFT);
  text("Stretch Controls", rx, ry);
  ry += 28;

  fill(140);
  textSize(11);
  text("Adjust sliders to re-map", rx, ry);
  ry += 16;
  text("pixel values and reveal", rx, ry);
  ry += 16;
  text("faint nebula structure.", rx, ry);
  ry += 26;

  fill(200);
  textSize(13);
  text("Black point", rx, ry);
  ry += 4;
  fill(255);
  textSize(16);
  text(blackPt.toFixed(0), rx, ry + 16);
  ry += 28;

  fill(200);
  textSize(13);
  text("Gamma", rx, ry);
  ry += 4;
  fill(255);
  textSize(16);
  text(gammaVal.toFixed(1), rx, ry + 16);
  ry += 28;

  fill(200);
  textSize(13);
  text("White point", rx, ry);
  ry += 4;
  fill(255);
  textSize(16);
  text(whitePt.toFixed(0), rx, ry + 16);
  ry += 35;

  fill(120);
  textSize(10);
  text("Black: clips shadows", rx, ry);
  ry += 15;
  text("Gamma: brightens midtones", rx, ry);
  ry += 15;
  text("White: clips highlights", rx, ry);
  ry += 22;

  // Pixel statistics
  let totalPixels = 400 * 400;
  let clippedBlack = rawData.filter((v) => v <= blackPt).length;
  let clippedWhite = rawData.filter((v) => v >= whitePt).length;
  fill(100);
  textSize(10);
  text(
    "Pixels clipped black: " + round((clippedBlack / totalPixels) * 100) + "%",
    rx,
    ry,
  );
  ry += 14;
  text(
    "Pixels clipped white: " + round((clippedWhite / totalPixels) * 100) + "%",
    rx,
    ry,
  );
  ry += 18;

  fill(80);
  textSize(9);
  text("Transfer function:", rx, ry);
  ry += 12;

  // Draw mini transfer curve
  let tx = rx,
    ty = ry,
    tw = 120,
    th = 60;
  fill(20, 20, 30);
  noStroke();
  rect(tx, ty, tw, th);
  stroke(50);
  strokeWeight(0.5);
  noFill();
  rect(tx, ty, tw, th);
  stroke(255, 200, 100, 180);
  strokeWeight(1.5);
  noFill();
  beginShape();
  for (let i = 0; i <= tw; i++) {
    let input = map(i, 0, tw, 0, 255);
    let output = applyStretch(input);
    vertex(tx + i, ty + th - map(output, 0, 255, 0, th));
  }
  endShape();
  fill(60);
  noStroke();
  textSize(8);
  textAlign(LEFT, TOP);
  text("in", tx + 2, ty + th - 10);
  textAlign(RIGHT, TOP);
  text("out", tx + tw - 2, ty + 2);
}
