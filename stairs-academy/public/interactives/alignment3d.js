let lat = 45;
let time = 0;
let viewMode = "perspective";
let raAngle = 0;
let hudBuffer;
let camNoise = [];
let worldTarget;

function setup() {
  let canvas = createCanvas(900, 640, WEBGL);
  canvas.parent("canvas-container");

  hudBuffer = createGraphics(900, 640);

  for (let i = 0; i < 200; i++) {
    camNoise.push({
      x: random(100),
      y: random(100),
      s: random(1.5, 3),
      b: random(40, 80),
    });
  }

  document.getElementById("latSlider").addEventListener("input", (e) => {
    lat = parseInt(e.target.value);
    document.getElementById("latVal").innerText = lat + "°";
  });

  document.getElementById("viewSelect").addEventListener("change", (e) => {
    viewMode = e.target.value;
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    time = 0;
  });
}

function drawTelescope(isEQ, latitude, targetWorld, mountBasePos) {
  // targetPos is relative to mount base
  let targetPos = p5.Vector.sub(targetWorld, mountBasePos);

  push();

  // Base
  fill(60);
  noStroke();
  push();
  translate(0, 5, 0);
  cylinder(50, 10);
  pop();

  if (!isEQ) {
    // --- Alt-Az: Fixed to ground ---
    let az = atan2(targetPos.x, targetPos.z);
    rotateY(az);

    // Fork
    fill(100);
    translate(0, -30, 0);
    box(15, 60, 15);

    // Alt axis
    let distXZ = sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z);
    let alt = atan2(-targetPos.y - 30, distXZ);
    translate(0, -20, 0);
    rotateX(alt);

    // Tube
    fill(100, 150, 255);
    stroke(80, 120, 200);
    rotateX(HALF_PI);
    cylinder(20, 100);

    // Sensor
    translate(0, 50, 0);
    fill(255, 100, 100);
    box(35, 8, 35);
    stroke(255);
    strokeWeight(2);
    line(0, -5, -10, 0, -5, -25);
  } else {
    // --- EQ: Tilted by latitude ---
    let radLat = radians(latitude);

    // 1. Tilt to match Earth's axis (Polar Axis)
    rotateX(HALF_PI - radLat);

    // 2. RA Rotation
    // Compute target's position in this tilted frame
    let s_lat = sin(-(HALF_PI - radLat));
    let c_lat = cos(-(HALF_PI - radLat));
    let localY = targetPos.y * c_lat - targetPos.z * s_lat;
    let localZ = targetPos.y * s_lat + targetPos.z * c_lat;
    let localX = targetPos.x;

    let targetRA = atan2(localX, localZ);
    rotateY(targetRA);

    // RA Shaft
    fill(80);
    push();
    translate(0, 30, 0);
    cylinder(8, 120);
    pop();

    // Dec assembly
    fill(120);
    translate(0, -40, 0);

    // 3. Dec Rotation
    let distXZ_Local = sqrt(localX * localX + localZ * localZ);
    let targetDec = atan2(-localY + 40, distXZ_Local);
    rotateX(targetDec);

    // Tube
    fill(100, 255, 100);
    stroke(80, 200, 80);
    rotateX(HALF_PI);
    cylinder(20, 100);

    // Sensor
    translate(0, 50, 0);
    fill(100, 255, 100);
    box(35, 8, 35);
    stroke(255);
    strokeWeight(2);
    line(0, -5, -10, 0, -5, -25);
  }

  pop();
}

function drawDetailedGalaxy(cx, cy, rotation) {
  let s = 50;

  hudBuffer.push();
  hudBuffer.translate(cx, cy);
  hudBuffer.rotate(rotation);

  hudBuffer.noStroke();
  for (let n of camNoise) {
    hudBuffer.fill(255, n.b);
    hudBuffer.ellipse(-s + n.x, -s + n.y, n.s, n.s);
  }

  hudBuffer.noStroke();
  hudBuffer.fill(100, 150, 255, 50);
  hudBuffer.ellipse(0, 0, 70, 20);
  hudBuffer.fill(100, 150, 255, 30);
  hudBuffer.ellipse(0, 0, 90, 25);
  hudBuffer.fill(255, 150, 200, 40);
  hudBuffer.ellipse(0, 0, 80, 16);
  hudBuffer.fill(255, 255, 255, 90);
  hudBuffer.ellipse(0, 0, 18, 18);
  hudBuffer.fill(255, 255, 255, 180);
  hudBuffer.ellipse(0, 0, 7, 7);
  hudBuffer.pop();
}

function drawHUD() {
  hudBuffer.clear();

  hudBuffer.noStroke();
  hudBuffer.fill(255, 200);
  hudBuffer.textSize(24);
  hudBuffer.textAlign(LEFT, TOP);

  // Titles
  hudBuffer.fill(255, 100, 100);
  hudBuffer.text("Alt-Az Mount", 50, 30);
  hudBuffer.fill(100, 255, 100);
  hudBuffer.text("Equatorial Mount", 550, 30);

  hudBuffer.fill(180);
  hudBuffer.textSize(16);
  hudBuffer.text("Base horizontal. Moves Up/Down + Left/Right.", 50, 65);
  hudBuffer.text("Base tilted to Pole. One axis tracks perfectly.", 550, 65);

  let sSize = 120;
  let leftCX = 150;
  let rightCX = 650;
  let camY = 510;

  // Alt-Az Sensor
  hudBuffer.noStroke();
  hudBuffer.fill(0, 0, 0, 220);
  hudBuffer.rect(leftCX - sSize / 2, camY - sSize / 2, sSize, sSize);
  hudBuffer.stroke(255, 100, 100);
  hudBuffer.strokeWeight(2);
  hudBuffer.noFill();
  hudBuffer.rect(leftCX - sSize / 2, camY - sSize / 2, sSize, sSize);

  // Field rotation visual: sky rotation - mount az rotation
  let azRotation = atan2(worldTarget.x + 250, worldTarget.z);
  drawDetailedGalaxy(leftCX, camY, -raAngle + azRotation * 0.5);

  hudBuffer.fill(255);
  hudBuffer.noStroke();
  hudBuffer.textAlign(CENTER);
  hudBuffer.textSize(18);
  hudBuffer.text("Sensor View", leftCX, camY - sSize / 2 - 15);
  hudBuffer.fill(255, 100, 100, 200);
  hudBuffer.textSize(16);
  hudBuffer.text("Field rotates!", leftCX, camY + sSize / 2 + 25);

  // EQ Sensor
  hudBuffer.noStroke();
  hudBuffer.fill(0, 0, 0, 220);
  hudBuffer.rect(rightCX - sSize / 2, camY - sSize / 2, sSize, sSize);
  hudBuffer.stroke(100, 255, 100);
  hudBuffer.strokeWeight(2);
  hudBuffer.noFill();
  hudBuffer.rect(rightCX - sSize / 2, camY - sSize / 2, sSize, sSize);

  drawDetailedGalaxy(rightCX, camY, 0);

  hudBuffer.fill(255);
  hudBuffer.noStroke();
  hudBuffer.textAlign(CENTER);
  hudBuffer.textSize(18);
  hudBuffer.text("Sensor View", rightCX, camY - sSize / 2 - 15);
  hudBuffer.fill(100, 255, 100, 200);
  hudBuffer.textSize(16);
  hudBuffer.text("Stable Field", rightCX, camY + sSize / 2 + 25);
}

function draw() {
  background(17);
  time++;
  raAngle = time * 0.005;

  push();
  ambientLight(80);
  pointLight(255, 255, 255, 0, -500, 0);

  if (viewMode === "perspective") {
    orbitControl();
    camera(0, -400, 600, 0, -100, 0, 0, 1, 0);
  } else if (viewMode === "top") {
    camera(0, -800, 0.1, 0, 0, 0, 0, 1, 0);
  } else if (viewMode === "side") {
    camera(800, -100, 0, 0, -100, 0, 0, 1, 0);
  }

  // Ground
  push();
  rotateX(HALF_PI);
  fill(30);
  noStroke();
  plane(2000, 2000);
  stroke(50);
  for (let i = -10; i <= 10; i++) {
    line(i * 100, -1000, i * 100, 1000);
    line(-1000, i * 100, 1000, i * 100);
  }
  pop();

  // Target Star
  let radLat = radians(lat);
  let starR = 400;
  let dec = PI * 0.2;
  let localStar = createVector(
    starR * cos(dec) * cos(raAngle),
    -starR * sin(dec),
    starR * cos(dec) * sin(raAngle),
  );

  worldTarget = localStar.copy();
  let angleX = HALF_PI - radLat;
  let ty = worldTarget.y * cos(angleX) - worldTarget.z * sin(angleX);
  let tz = worldTarget.y * sin(angleX) + worldTarget.z * cos(angleX);
  worldTarget.y = ty;
  worldTarget.z = tz;

  push();
  noStroke();
  fill(255, 255, 200);
  translate(worldTarget.x, worldTarget.y, worldTarget.z);
  sphere(15);
  pop();

  // Path
  push();
  rotateX(HALF_PI - radLat);
  noFill();
  stroke(255, 50);
  ellipse(0, 0, starR * 2 * cos(dec), starR * 2 * cos(dec));
  pop();

  // Axis line
  stroke(255, 100);
  line(0, 0, 0, 0, -sin(radLat) * 600, cos(radLat) * 600);

  // Mounts
  push();
  translate(-250, 0, 0);
  drawTelescope(false, lat, worldTarget, createVector(-250, 0, 0));
  pop();

  push();
  translate(250, 0, 0);
  drawTelescope(true, lat, worldTarget, createVector(250, 0, 0));
  pop();

  pop();

  drawHUD();

  push();
  resetMatrix();
  ortho();
  translate(-width / 2, -height / 2);
  image(hudBuffer, 0, 0);
  pop();
}
