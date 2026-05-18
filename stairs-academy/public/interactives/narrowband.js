let currentFilter = "hubble";
let haBuffer, o3Buffer, s2Buffer, hubbleBuffer, starBuffer;
let features = [];
let time = 0;

function preRenderStars(g) {
  for (let i = 0; i < 60; i++) {
    let x = random(500),
      y = random(500);
    let mag = random(0.5, 8);
    let sz = map(mag, 0.5, 8, 2.2, 0.4);
    let b = map(mag, 0.5, 8, 220, 60);
    g.noStroke();
    g.fill(b * 0.85, b * 0.8, b);
    g.ellipse(x, y, sz, sz);
  }
}

function preRenderChannel(g, ch, features) {
  g.background(0, 0, 0);
  for (let f of features) {
    let str = ch === "ha" ? f.ha : ch === "o3" ? f.o3 : f.s2;
    if (str < 0.05) continue;
    let r, gr, b;
    if (ch === "ha") {
      r = 180 * str + 60;
      gr = 15 + str * 20;
      b = 20 + str * 15;
    } else if (ch === "o3") {
      r = 20 + str * 20;
      gr = 60 * str + 40;
      b = 150 * str + 60;
    } else {
      r = 170 * str + 50;
      gr = 15 + str * 15;
      b = 15 + str * 10;
    }
    g.noStroke();
    g.fill(r, gr, b, constrain(str * 200, 0, 200));
    g.ellipse(
      f.x,
      f.y,
      f.sz * (0.6 + str * 0.4),
      f.sz * 0.35 * (0.6 + str * 0.4),
    );
  }
  g.image(starBuffer, 0, 0);
}

function preRenderHubble() {
  hubbleBuffer = createImage(500, 500);
  hubbleBuffer.loadPixels();
  haBuffer.loadPixels();
  o3Buffer.loadPixels();
  s2Buffer.loadPixels();
  let hd = hubbleBuffer.pixels,
    had = haBuffer.pixels;
  let o3d = o3Buffer.pixels,
    s2d = s2Buffer.pixels;
  for (let i = 0; i < 500 * 500; i++) {
    let idx = i * 4;
    hd[idx] = constrain(s2d[idx] * 1.5, 0, 255);
    hd[idx + 1] = constrain(had[idx] * 1.2, 0, 255);
    hd[idx + 2] = constrain(o3d[idx + 2] * 1.5, 0, 255);
    hd[idx + 3] = 255;
  }
  hubbleBuffer.updatePixels();
}

function setup() {
  let canvas = createCanvas(860, 640);
  canvas.parent("canvas-container");

  starBuffer = createGraphics(500, 500);
  preRenderStars(starBuffer);

  for (let i = 0; i < 130; i++) {
    let a = random(TWO_PI),
      r = pow(random(), 0.5) * 180;
    features.push({
      x: 250 + cos(a) * r,
      y: 250 + sin(a) * r * 0.85,
      sz: random(5, 28),
      ha: random(0.5, 1),
      o3: random(0, 0.3),
      s2: random(0, 0.15),
    });
  }
  for (let i = 0; i < 100; i++) {
    let a = random(TWO_PI),
      r = pow(random(), 0.6) * 220;
    features.push({
      x: 250 + cos(a) * r,
      y: 250 + sin(a) * r * 0.85,
      sz: random(7, 35),
      ha: random(0, 0.25),
      o3: random(0.4, 1),
      s2: random(0, 0.15),
    });
  }
  for (let i = 0; i < 70; i++) {
    let a = random(TWO_PI),
      r = pow(random(), 0.7) * 220;
    features.push({
      x: 250 + cos(a) * r,
      y: 250 + sin(a) * r * 0.85,
      sz: random(4, 18),
      ha: random(0, 0.2),
      o3: random(0, 0.2),
      s2: random(0.4, 1),
    });
  }

  haBuffer = createGraphics(500, 500);
  o3Buffer = createGraphics(500, 500);
  s2Buffer = createGraphics(500, 500);
  preRenderChannel(haBuffer, "ha", features);
  preRenderChannel(o3Buffer, "o3", features);
  preRenderChannel(s2Buffer, "s2", features);
  preRenderHubble();

  for (let [id, filter] of [
    ["haBtn", "ha"],
    ["o3Btn", "o3"],
    ["s2Btn", "s2"],
    ["hubbleBtn", "hubble"],
  ]) {
    document.getElementById(id).addEventListener("click", () => {
      currentFilter = filter;
      document
        .querySelectorAll(".controls button")
        .forEach((b) => b.classList.remove("active"));
      document.getElementById(id).classList.add("active");
    });
  }
}

function drawPreview(x, y, s, buf, label, active, borderCol) {
  fill(20, 20, 30);
  noStroke();
  rect(x, y, s, s, 4);
  image(buf, x + 3, y + 3, s - 6, s - 6);
  stroke(active ? borderCol : 60);
  strokeWeight(active ? 2 : 1);
  noFill();
  rect(x, y, s, s, 4);
  fill(active ? borderCol : 150);
  noStroke();
  textSize(13);
  textAlign(CENTER, BOTTOM);
  text(label, x + s / 2, y - 5);
}

function draw() {
  time++;
  background(17);

  // Nebula view
  let viewBuffer =
    currentFilter === "ha"
      ? haBuffer
      : currentFilter === "o3"
        ? o3Buffer
        : currentFilter === "s2"
          ? s2Buffer
          : hubbleBuffer;
  image(viewBuffer, 20, 20);
  noFill();
  stroke(40);
  strokeWeight(1);
  rect(20, 20, 500, 500);

  // Breathing glow overlay
  let pulse = 0.5 + 0.5 * sin(time * 0.008);
  noStroke();
  fill(255, 255, 255, pulse * 5);
  rect(20, 20, 500, 500);

  // Labels on image
  let filterLabel =
    currentFilter === "ha"
      ? "Hα (656 nm)"
      : currentFilter === "o3"
        ? "OIII (500 nm)"
        : currentFilter === "s2"
          ? "SII (672 nm)"
          : "SHO Hubble Palette";
  let labelCol =
    currentFilter === "ha"
      ? color(255, 100, 100)
      : currentFilter === "o3"
        ? color(100, 180, 255)
        : currentFilter === "s2"
          ? color(255, 80, 80)
          : color(255, 200, 100);
  fill(labelCol);
  noStroke();
  textSize(22);
  textAlign(LEFT, TOP);
  text(filterLabel, 35, 35);

  // Channel strip
  let csX = 20,
    csY = 535,
    csS = 85,
    csGap = 10;
  let filters = [
    { id: "ha", label: "Hα", col: color(255, 80, 80) },
    { id: "o3", label: "OIII", col: color(80, 160, 255) },
    { id: "s2", label: "SII", col: color(255, 70, 70) },
    { id: "hubble", label: "SHO", col: color(255, 200, 80) },
  ];
  for (let i = 0; i < filters.length; i++) {
    let f = filters[i];
    let buf =
      f.id === "ha"
        ? haBuffer
        : f.id === "o3"
          ? o3Buffer
          : f.id === "s2"
            ? s2Buffer
            : hubbleBuffer;
    drawPreview(
      csX + i * (csS + csGap),
      csY,
      csS,
      buf,
      f.label,
      currentFilter === f.id,
      f.col,
    );
  }

  // Right panel
  let rx = 545,
    ry = 25;
  fill(255);
  noStroke();
  textSize(22);
  textAlign(LEFT);
  text("Narrowband Filters", rx, ry);
  ry += 40;

  fill(140);
  textSize(14);
  text("Each filter isolates a specific", rx, ry);
  ry += 18;
  text("emission line from ionized gas.", rx, ry);
  ry += 30;

  // Filter details
  let details = {
    ha: {
      wave: "656.3 nm",
      color: "Deep red",
      traces: "Hydrogen (HII regions)",
      struct: "Filamentary, bright cores",
    },
    o3: {
      wave: "500.7 nm",
      color: "Teal/blue",
      traces: "Doubly ionized oxygen",
      struct: "Diffuse, wispy halos",
    },
    s2: {
      wave: "671.6 nm",
      color: "Deep red",
      traces: "Ionized sulfur",
      struct: "Shock fronts, faint edges",
    },
    hubble: {
      wave: "SHO composite",
      color: "False color",
      traces: "SII→R, Hα→G, OIII→B",
      struct: "Hubble Palette",
    },
  };
  let d = details[currentFilter];

  fill(200);
  textSize(15);
  text("Wavelength", rx, ry);
  ry += 4;
  fill(255);
  textSize(18);
  text(d.wave, rx, ry + 18);
  ry += 35;

  fill(200);
  textSize(15);
  text("Emission", rx, ry);
  ry += 4;
  fill(255);
  textSize(16);
  text(d.traces, rx, ry + 16);
  ry += 32;

  fill(200);
  textSize(15);
  text("Morphology", rx, ry);
  ry += 4;
  fill(200);
  textSize(15);
  text(d.struct, rx, ry + 16);
  ry += 32;

  fill(200);
  textSize(15);
  text("Color", rx, ry);
  ry += 4;
  fill(
    details[currentFilter].color === "Teal/blue"
      ? color(80, 180, 255)
      : details[currentFilter].color === "False color"
        ? color(255, 200, 100)
        : color(255, 120, 120),
  );
  textSize(16);
  text(d.color, rx, ry + 16);
  ry += 40;

  // Hubble mapping diagram
  if (currentFilter === "hubble") {
    ry += 5;
    fill(200);
    textSize(14);
    text("Channel mapping", rx, ry);
    ry += 22;
    let mapY = ry;
    let mapW = 240,
      mapH = 65;
    noStroke();
    fill(60, 20, 20, 200);
    rect(rx, mapY, mapW / 3, mapH);
    fill(20, 60, 20, 200);
    rect(rx + mapW / 3, mapY, mapW / 3, mapH);
    fill(20, 20, 60, 200);
    rect(rx + (2 * mapW) / 3, mapY, mapW / 3, mapH);
    stroke(255, 80, 80, 180);
    strokeWeight(1);
    noFill();
    rect(rx, mapY, mapW / 3, mapH);
    stroke(80, 255, 80, 180);
    rect(rx + mapW / 3, mapY, mapW / 3, mapH);
    stroke(80, 130, 255, 180);
    rect(rx + (2 * mapW) / 3, mapY, mapW / 3, mapH);
    fill(255);
    noStroke();
    textSize(13);
    textAlign(CENTER, CENTER);
    text("SII\n→\nR", rx + mapW / 6, mapY + mapH / 2);
    fill(200);
    text("Hα\n→\nG", rx + mapW / 2, mapY + mapH / 2);
    text("OIII\n→\nB", rx + (5 * mapW) / 6, mapY + mapH / 2);
    ry += mapH + 25;
  } else {
    ry += 5;
    fill(100);
    textSize(13);
    text("Switch to Hubble Palette to", rx, ry);
    ry += 18;
    text("see the false-color composite.", rx, ry);
    ry += 18;
  }

  fill(120);
  textSize(12);
  text("Narrowband filters allow", rx, ry);
  ry += 16;
  text("imaging even under light", rx, ry);
  ry += 16;
  text("pollution by rejecting", rx, ry);
  ry += 16;
  text("broad-spectrum skyglow.", rx, ry);
}
