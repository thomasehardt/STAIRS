let magnitude = 5.0;

const REFERENCES = [
  { name: "Venus", mag: -4.4 },
  { name: "Vega", mag: 0.0 },
  { name: "Naked-eye limit", mag: 6.0 },
  { name: "50mm scope limit", mag: 10.5 },
];

const MAG_MIN = -5; // top of both axes (brightest)
const MAG_MAX = 15; // bottom of both axes (faintest)

function relFlux(m) {
  // Flux relative to magnitude 0 (Vega-ish reference)
  return Math.pow(10, -0.4 * m);
}

function setup() {
  let canvas = createCanvas(800, 500);
  canvas.parent("canvas-container");

  document.getElementById("magSlider").addEventListener("input", (e) => {
    magnitude = parseFloat(e.target.value);
    document.getElementById("magVal").innerText = magnitude.toFixed(1);
  });
}

function draw() {
  background(10);

  const panelTop = 60;
  const panelBottom = height - 50;
  const panelH = panelBottom - panelTop;

  drawLinearPanel(60, panelTop, 320, panelH);
  drawLogPanel(460, panelTop, 320, panelH);

  noStroke();
  fill(255);
  textAlign(CENTER, TOP);
  textSize(20);
  text("Magnitude: " + magnitude.toFixed(1), width / 2, 12);

  const flux = relFlux(magnitude);
  fill(180);
  textSize(14);
  const fluxLabel =
    flux >= 1
      ? flux.toFixed(1) + "x brighter than Vega"
      : "1/" + Math.round(1 / flux).toLocaleString() + " as bright as Vega";
  text(fluxLabel, width / 2, 36);
}

function drawLinearPanel(x, y, w, h) {
  stroke(60);
  fill(18);
  rect(x - 20, y - 20, w + 40, h + 70, 8);

  noStroke();
  fill(180);
  textAlign(CENTER, TOP);
  textSize(15);
  text("Linear Brightness Scale", x + w / 2, y - 12);

  // Reference max: brightest fixed reference (Venus) sets the linear scale
  const refMaxFlux = relFlux(-4.4);
  const barBaseY = y + h;

  const allBars = REFERENCES.map((r) => ({
    name: r.name,
    mag: r.mag,
    flux: relFlux(r.mag),
    current: false,
  }));
  allBars.push({
    name: "Slider",
    mag: magnitude,
    flux: relFlux(magnitude),
    current: true,
  });

  const n = allBars.length;
  const barW = 34;
  const gap = (w - barW * n) / (n + 1);

  for (let i = 0; i < n; i++) {
    const b = allBars[i];
    const bx = x + gap + i * (barW + gap);
    const barH = constrain((b.flux / refMaxFlux) * h, 0.5, h);

    noStroke();
    fill(b.current ? color(255, 210, 90) : color(120, 160, 255));
    rect(bx, barBaseY - barH, barW, barH, 2);

    fill(150);
    textAlign(CENTER, TOP);
    textSize(11);
    text(b.name, bx + barW / 2, barBaseY + 6, barW + 20);
  }

  fill(120);
  textSize(12);
  textAlign(CENTER, TOP);
  text(
    "Most bars are invisible here — that's the problem with a linear scale.",
    x + w / 2,
    y + h + 40,
  );
}

function drawLogPanel(x, y, w, h) {
  stroke(60);
  fill(18);
  rect(x - 20, y - 20, w + 40, h + 70, 8);

  noStroke();
  fill(180);
  textAlign(CENTER, TOP);
  textSize(15);
  text("Magnitude (Log) Scale", x + w / 2, y - 12);

  const barBaseY = y + h;

  function magToBarH(m) {
    const frac = (MAG_MAX - m) / (MAG_MAX - MAG_MIN);
    return constrain(frac * h, 0.5, h);
  }

  const allBars = REFERENCES.map((r) => ({
    name: r.name,
    mag: r.mag,
    current: false,
  }));
  allBars.push({ name: "Slider", mag: magnitude, current: true });

  const n = allBars.length;
  const barW = 34;
  const gap = (w - barW * n) / (n + 1);

  for (let i = 0; i < n; i++) {
    const b = allBars[i];
    const bx = x + gap + i * (barW + gap);
    const barH = magToBarH(b.mag);

    noStroke();
    fill(b.current ? color(255, 210, 90) : color(120, 160, 255));
    rect(bx, barBaseY - barH, barW, barH, 2);

    fill(220);
    textAlign(CENTER, BOTTOM);
    textSize(11);
    text(b.mag.toFixed(1), bx + barW / 2, barBaseY - barH - 4);

    fill(150);
    textAlign(CENTER, TOP);
    textSize(11);
    text(b.name, bx + barW / 2, barBaseY + 6, barW + 20);
  }

  fill(120);
  textSize(12);
  textAlign(CENTER, TOP);
  text(
    "Same objects, evenly spaced — every 5 magnitudes is exactly 100x.",
    x + w / 2,
    y + h + 40,
  );
}
