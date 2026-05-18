let SUB_TIME = 15,
  TARGET_SNR = 10,
  PER_SUB_SNR = 1.0;
let isPlaying = true;
let accumulatedFrames = 0;
let frameCounter = 0;

function setup() {
  let canvas = createCanvas(860, 620);
  canvas.parent("canvas-container");

  function s(id, vId, cb) {
    document.getElementById(id).addEventListener("input", (e) => {
      cb(e);
      document.getElementById(vId).innerText = e.target.value;
    });
  }
  s("subSlider", "subVal", (e) => {
    SUB_TIME = parseInt(e.target.value);
  });
  s("targetSlider", "targetVal", (e) => {
    TARGET_SNR = parseInt(e.target.value);
  });
  s("perSubSlider", "perSubVal", (e) => {
    PER_SUB_SNR = parseFloat(e.target.value);
  });

  document.getElementById("playBtn").addEventListener("click", () => {
    isPlaying = !isPlaying;
    document.getElementById("playBtn").textContent = isPlaying
      ? "⏸ Pause"
      : "▶ Play";
    document.getElementById("playBtn").classList.toggle("active", isPlaying);
  });
}

function calcSNR(Nframes) {
  return PER_SUB_SNR * sqrt(Nframes);
}

function draw() {
  background(17);

  if (isPlaying && accumulatedFrames < 20000) {
    frameCounter++;
    if (frameCounter % 2 === 0)
      accumulatedFrames = min(accumulatedFrames + 1, 20000);
  }

  let maxFrames = 20000;
  let plotW = 500,
    plotH = 340,
    px = 60,
    py = 120;

  // Plot background
  fill(15, 15, 25);
  noStroke();
  rect(px, py, plotW, plotH);
  stroke(50);
  strokeWeight(0.5);
  noFill();
  rect(px, py, plotW, plotH);

  fill(120);
  noStroke();
  textSize(14);
  textAlign(CENTER, BOTTOM);
  text("Total integration time (hours)", px + plotW / 2, py + plotH + 25);
  textAlign(LEFT, TOP);
  text("SNR", px - 5, py - 25);

  // Grid
  let maxHours = (maxFrames * SUB_TIME) / 3600;
  for (let h = 0; h <= ceil(maxHours); h += 2) {
    stroke(30);
    strokeWeight(0.5);
    let gx = px + map(h, 0, maxHours, 0, plotW);
    line(gx, py, gx, py + plotH);
    fill(60);
    noStroke();
    textSize(12);
    textAlign(CENTER, TOP);
    text(h + "h", gx, py + plotH + 5);
  }
  for (let snr = 0; snr <= max(TARGET_SNR * 1.5, 50); snr += 10) {
    stroke(30);
    strokeWeight(0.5);
    line(
      px,
      py + plotH - map(snr, 0, max(TARGET_SNR * 1.5, 50), 0, plotH - 20),
      px + plotW,
      py + plotH - map(snr, 0, max(TARGET_SNR * 1.5, 50), 0, plotH - 20),
    );
    fill(60);
    noStroke();
    textSize(12);
    textAlign(RIGHT, CENTER);
    text(
      snr,
      px - 8,
      py + plotH - map(snr, 0, max(TARGET_SNR * 1.5, 50), 0, plotH - 20),
    );
  }

  // SNR curve
  let res = 500;
  noFill();

  // Theoretical curve
  stroke(100, 180, 255, 80);
  strokeWeight(1.5);
  beginShape();
  for (let i = 0; i <= res; i++) {
    let f = (i / res) * maxFrames;
    let snr = calcSNR(f);
    let hours = (f * SUB_TIME) / 3600;
    vertex(
      px + map(hours, 0, maxHours, 0, plotW),
      py +
        plotH -
        map(snr, 0, max(calcSNR(maxFrames), TARGET_SNR * 1.5), 0, plotH - 20),
    );
  }
  endShape();

  // Current accumulated marker
  let currentSNR = calcSNR(accumulatedFrames);
  let currentHours = (accumulatedFrames * SUB_TIME) / 3600;
  let cx = px + map(currentHours, 0, maxHours, 0, plotW);
  let cy =
    py +
    plotH -
    map(
      currentSNR,
      0,
      max(calcSNR(maxFrames), TARGET_SNR * 1.5),
      0,
      plotH - 20,
    );

  stroke(255, 200, 100);
  strokeWeight(2.5);
  line(cx, py + plotH - 5, cx, cy);
  line(px, cy, cx, cy);

  fill(255, 200, 100);
  noStroke();
  circle(cx, cy, 10);

  fill(255, 200, 100);
  noStroke();
  textSize(16);
  textAlign(LEFT, BOTTOM);
  text("SNR: " + nf(currentSNR, 1, 1), cx + 10, cy - 4);

  // Target SNR line
  let targetHours = ((TARGET_SNR / PER_SUB_SNR) ** 2 * SUB_TIME) / 3600;
  stroke(255, 80, 80, 150);
  strokeWeight(1.5);
  drawingContext.setLineDash([5, 5]);
  let targetY =
    py +
    plotH -
    map(
      TARGET_SNR,
      0,
      max(calcSNR(maxFrames), TARGET_SNR * 1.5),
      0,
      plotH - 20,
    );
  line(px, targetY, px + plotW, targetY);
  drawingContext.setLineDash([]);
  fill(255, 80, 80);
  noStroke();
  textSize(14);
  textAlign(LEFT, BOTTOM);
  text("Target SNR: " + TARGET_SNR, px + plotW - 120, targetY - 2);

  let targetY2 =
    py +
    plotH -
    map(
      TARGET_SNR * 2,
      0,
      max(calcSNR(maxFrames), TARGET_SNR * 1.5),
      0,
      plotH - 20,
    );
  stroke(255, 80, 80, 60);
  strokeWeight(0.5);
  drawingContext.setLineDash([2, 4]);
  line(px, targetY2, px + plotW, targetY2);
  drawingContext.setLineDash([]);
  fill(255, 80, 80, 100);
  textSize(12);
  text("SNR: " + TARGET_SNR * 2, px + plotW - 120, targetY2 - 2);

  // Frames stacking visualization
  let stackX = 590,
    stackY = 120,
    stackW = 240,
    stackH = 340;
  fill(15, 15, 25);
  noStroke();
  rect(stackX, stackY, stackW, stackH);
  stroke(50);
  strokeWeight(0.5);
  noFill();
  rect(stackX, stackY, stackW, stackH);

  fill(200);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  text("Frame Stack", stackX + 12, stackY + 10);
  fill(100);
  textSize(14);
  text("N = " + accumulatedFrames + " subs", stackX + 12, stackY + 32);

  // Draw stacked frames
  let maxVisible = min(accumulatedFrames, 50);
  for (let i = 0; i < maxVisible; i++) {
    let fx = stackX + 15 + (i % 10) * 21;
    let fy = stackY + stackH - 35 - floor(i / 10) * 24;
    let alpha = map(i, 0, maxVisible, 60, 200);
    fill(100, 180, 255, alpha);
    noStroke();
    rect(fx, fy, 18, 18, 1);
  }

  if (accumulatedFrames > 50) {
    fill(100);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text(
      "... +" + (accumulatedFrames - 50) + " more",
      stackX + 15,
      stackY + stackH - 35 - ceil(50 / 10) * 24 + 24,
    );
  }

  // Info
  fill(200);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(15);
  let infoY = stackY + 65;
  text("Per-sub SNR: " + nf(PER_SUB_SNR, 1, 1), stackX + 12, infoY);
  text("Sub time: " + SUB_TIME + "s", stackX + 12, infoY + 20);
  text("Total: " + nf(currentHours, 1, 2) + "h", stackX + 12, infoY + 40);
  text("Current SNR: " + nf(currentSNR, 1, 1), stackX + 12, infoY + 60);

  let neededFrames = ceil((TARGET_SNR / PER_SUB_SNR) ** 2);
  let neededHours = (neededFrames * SUB_TIME) / 3600;
  let pct = min((currentSNR / TARGET_SNR) * 100, 100);

  // Progress toward target
  fill(30, 30, 40);
  noStroke();
  rect(stackX + 12, stackY + 155, stackW - 24, 22, 3);
  fill(pct >= 100 ? color(100, 255, 100) : color(100, 180, 255));
  rect(stackX + 12, stackY + 155, (stackW - 24) * min(pct / 100, 1), 22, 3);
  fill(255);
  noStroke();
  textSize(13);
  textAlign(CENTER, TOP);
  text(nf(pct, 1, 0) + "% of target SNR", stackX + stackW / 2, stackY + 158);

  // Needed info
  fill(140);
  textSize(14);
  textAlign(LEFT, TOP);
  text("Needed for SNR " + TARGET_SNR + ":", stackX + 12, stackY + 185);
  text(
    neededFrames + " subs (" + nf(neededHours, 1, 1) + "h)",
    stackX + 12,
    stackY + 205,
  );

  if (pct >= 100) {
    fill(100, 255, 100);
    textSize(18);
    textAlign(CENTER, TOP);
    text("✓ Target SNR reached!", stackX + stackW / 2, stackY + 235);
  }

  // Formula at bottom
  let fy = 485;
  fill(25, 25, 35);
  noStroke();
  rect(20, fy, 820, 85, 5);
  fill(160);
  textSize(16);
  textAlign(LEFT, TOP);
  text(
    "SNR(N) = SNRₘᵣₓ × √N    where SNRₘᵣₓ = " +
      nf(PER_SUB_SNR, 1, 1) +
      " and N = number of subs",
    30,
    fy + 10,
  );
  fill(120);
  textSize(13);
  text(
    "Doubling the number of subs multiplies SNR by √2 ≈ 1.41. To reach SNR = " +
      TARGET_SNR +
      " you need (T / PER_SUB_SNR)² = " +
      neededFrames +
      " subs = " +
      nf(neededHours, 1, 1) +
      " hours.",
    30,
    fy + 35,
  );
  fill(180);
  textSize(13);
  if (currentSNR < TARGET_SNR) {
    text(
      "Current: " +
        nf(accumulatedFrames, 0) +
        " subs at " +
        nf(currentHours, 1, 2) +
        "h. Keep integrating!",
      30,
      fy + 60,
    );
  } else {
    text(
      "✓ Reached " +
        nf(currentSNR, 1, 1) +
        " SNR with " +
        nf(accumulatedFrames, 0) +
        " subs.",
      30,
      fy + 60,
    );
  }

  // Time scale
  let timeX = 60,
    timeY = 585,
    timeW = 500,
    timeH = 8;
  fill(40);
  noStroke();
  rect(timeX, timeY, timeW, timeH, 3);
  let progress = accumulatedFrames / maxFrames;
  fill(100, 180, 255);
  rect(timeX, timeY, timeW * progress, timeH, 3);

  fill(80);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text("0h", timeX, timeY + 12);
  textAlign(RIGHT, TOP);
  text(nf(maxHours, 1, 0) + "h", timeX + timeW, timeY + 12);
  textAlign(CENTER, TOP);
  text(nf(currentHours, 1, 1) + "h", timeX + timeW * progress, timeY + 12);
}
