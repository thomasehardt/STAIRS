let stackedBuffer;
let incomingBuffer;
let framesStacked = 0;

let boxWidth = 350;
let boxHeight = 350;

let isPlaying = true;
let frameTimer = 0;

let noiseCount = 1500;
let maxFrames = 150;

function generateIncomingFrame() {
  incomingBuffer.clear();
  incomingBuffer.noStroke();

  incomingBuffer.push();
  incomingBuffer.translate(boxWidth / 2, boxHeight / 2);

  incomingBuffer.push();
  incomingBuffer.rotate(PI / 6);
  incomingBuffer.fill(100, 150, 255, random(8, 14));
  incomingBuffer.ellipse(0, 0, 200 + random(-4, 4), 60 + random(-3, 3));
  incomingBuffer.pop();

  incomingBuffer.push();
  incomingBuffer.rotate(-PI / 6);
  incomingBuffer.fill(255, 150, 200, random(6, 12));
  incomingBuffer.ellipse(0, 0, 240 + random(-4, 4), 50 + random(-3, 3));
  incomingBuffer.pop();

  incomingBuffer.fill(255, 255, 255, random(10, 18));
  incomingBuffer.ellipse(0, 0, 40 + random(-2, 2), 40 + random(-2, 2));
  incomingBuffer.pop();

  incomingBuffer.fill(255, random(160, 220));
  for (let i = 0; i < noiseCount; i++) {
    incomingBuffer.ellipse(random(boxWidth), random(boxHeight), 3, 3);
  }
}

function stackOneFrame() {
  if (framesStacked >= maxFrames) return;
  framesStacked++;
  updateStackedBuffer();
  if (framesStacked < maxFrames) {
    generateIncomingFrame();
  }
}

function setup() {
  let canvas = createCanvas(850, 500);
  canvas.parent("canvas-container");

  stackedBuffer = createGraphics(boxWidth, boxHeight);
  incomingBuffer = createGraphics(boxWidth, boxHeight);

  stackedBuffer.background(0);
  generateIncomingFrame();

  document.getElementById("playPauseBtn").addEventListener("click", (e) => {
    isPlaying = !isPlaying;
    e.target.innerText = isPlaying ? "Pause" : "Play";
  });

  document.getElementById("stepBtn").addEventListener("click", () => {
    stackOneFrame();
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    framesStacked = 0;
    stackedBuffer.background(0);
    frameTimer = 0;
    generateIncomingFrame();
  });
}

function updateStackedBuffer() {
  let progress = min(framesStacked / maxFrames, 1.0);

  stackedBuffer.clear();
  stackedBuffer.background(0);
  stackedBuffer.noStroke();

  let noiseOpacity = 200 * Math.pow(1 - progress, 1.5);
  if (noiseOpacity > 1) {
    stackedBuffer.fill(255, noiseOpacity);
    for (let i = 0; i < noiseCount; i++) {
      stackedBuffer.ellipse(random(boxWidth), random(boxHeight), 3, 3);
    }
  }

  let sigAlpha = 255 * progress;

  stackedBuffer.push();
  stackedBuffer.translate(boxWidth / 2, boxHeight / 2);

  stackedBuffer.push();
  stackedBuffer.rotate(PI / 6);
  for (let r = 1; r <= 6; r++) {
    stackedBuffer.fill(100, 150, 255, (sigAlpha * 0.15) / r);
    stackedBuffer.ellipse(0, 0, 160 + r * 15, 40 + r * 8);
  }
  stackedBuffer.pop();

  stackedBuffer.push();
  stackedBuffer.rotate(-PI / 6);
  for (let r = 1; r <= 6; r++) {
    stackedBuffer.fill(255, 150, 200, (sigAlpha * 0.12) / r);
    stackedBuffer.ellipse(0, 0, 200 + r * 20, 30 + r * 6);
  }
  stackedBuffer.pop();

  for (let r = 1; r <= 5; r++) {
    stackedBuffer.fill(255, 255, 255, (sigAlpha * 0.3) / r);
    stackedBuffer.ellipse(0, 0, 60 - r * 8, 60 - r * 8);
  }
  stackedBuffer.fill(255, 255, 255, sigAlpha);
  stackedBuffer.ellipse(0, 0, 15, 15);

  stackedBuffer.pop();
}

function draw() {
  background(17);

  let speedMult = parseFloat(document.getElementById("speedSlider").value);

  let leftX = 50;
  let rightX = 450;
  let yPos = 50;

  noStroke();
  fill(255);
  textSize(22);
  textAlign(CENTER);
  text("Incoming Raw Frame", leftX + boxWidth / 2, yPos - 15);
  text("Stacked Result", rightX + boxWidth / 2, yPos - 15);

  noFill();
  strokeWeight(2);
  stroke(100, 100, 255);
  rect(leftX, yPos, boxWidth, boxHeight);
  stroke(100, 255, 100);
  rect(rightX, yPos, boxWidth, boxHeight);

  image(incomingBuffer, leftX, yPos);
  image(stackedBuffer, rightX, yPos);

  if (isPlaying && framesStacked < maxFrames) {
    frameTimer += 1 * speedMult;
    if (frameTimer >= 30) {
      frameTimer = 0;
      stackOneFrame();
    }
  }

  if (framesStacked >= maxFrames) {
    fill(100, 255, 100);
    noStroke();
    textSize(28);
    textAlign(CENTER);
    text("Stacking Complete!", leftX + boxWidth / 2, yPos + boxHeight / 2);
  }

  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(20);
  text("Frames Stacked: " + framesStacked, rightX, yPos + boxHeight + 35);

  let snrRatio = min(framesStacked / maxFrames, 1);
  let snrColor = lerpColor(color(255, 80, 80), color(80, 255, 80), snrRatio);
  fill(snrColor);
  text(
    "Relative SNR: " + Math.floor(snrRatio * 100) + "%",
    rightX,
    yPos + boxHeight + 65,
  );
}
