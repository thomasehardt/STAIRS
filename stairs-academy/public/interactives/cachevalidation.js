let cacheEntries = [];
let nextId = 0;
const TTL_MS = 5000;
const MAX_ENTRIES = 10;
let time = 0;

function addCacheEntry(label, type) {
  cacheEntries.unshift({
    id: nextId++,
    label,
    type,
    addedAt: time,
    ttl: TTL_MS,
    expired: false,
    fetching: false,
    y: 150 + cacheEntries.length * 42,
  });
  if (cacheEntries.length > MAX_ENTRIES) cacheEntries.pop();
}

function setup() {
  let canvas = createCanvas(860, 620);
  canvas.parent("canvas-container");

  addCacheEntry("Ephemeris (tonight)", "ephemeris");
  addCacheEntry("Weather forecast", "weather");

  document.getElementById("fetchBtn").addEventListener("click", () => {
    let r = random();
    if (r < 0.4) addCacheEntry("Open-Meteo weather", "weather");
    else if (r < 0.7) addCacheEntry("Ephemeris (tonight)", "ephemeris");
    else addCacheEntry("Ephemeris + weather", "both");
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    cacheEntries = [];
    nextId = 0;
    addCacheEntry("Ephemeris (tonight)", "ephemeris");
    addCacheEntry("Weather forecast", "weather");
  });
}

function draw() {
  background(17);
  time += deltaTime;

  let dt = deltaTime;

  // Update expiry
  for (let e of cacheEntries) {
    if (time - e.addedAt > e.ttl && !e.expired) {
      e.expired = true;
    }
  }

  // Draw pipeline
  let px = 50,
    py = 50,
    pw = 500,
    ph = 520;
  fill(15, 15, 25);
  noStroke();
  rect(px, py, pw, ph);
  stroke(50);
  strokeWeight(0.5);
  noFill();
  rect(px, py, pw, ph);

  fill(200);
  noStroke();
  textSize(18);
  textAlign(LEFT, TOP);
  text("Cache Pipeline", px + 12, py + 8);
  fill(100);
  textSize(14);
  text(
    "TTL: " +
      nf(TTL_MS / 1000, 1, 0) +
      "s simulated  |  " +
      cacheEntries.length +
      "/" +
      MAX_ENTRIES +
      " entries",
    px + 12,
    py + 32,
  );

  // Draw cache entries
  let cy = py + 65;
  for (let i = 0; i < cacheEntries.length; i++) {
    let e = cacheEntries[i];
    let alpha = e.expired ? 100 : 255;
    let ageS = (time - e.addedAt) / 1000;
    let agePct = min(ageS / (TTL_MS / 1000), 1);

    // Entry card
    let cardW = pw - 30,
      cardH = 40;
    fill(e.expired ? color(40, 30, 30) : color(25, 35, 30), alpha);
    noStroke();
    rect(px + 15, cy, cardW, cardH, 4);

    // Type color indicator
    let typeCol =
      e.type === "weather"
        ? color(100, 180, 255)
        : e.type === "ephemeris"
          ? color(255, 200, 100)
          : color(200, 100, 255);
    fill(typeCol, alpha);
    noStroke();
    rect(px + 15, cy, 5, cardH, 2);

    // TTL bar
    fill(e.expired ? color(80, 40, 40) : color(40, 60, 40), alpha);
    noStroke();
    rect(px + 22, cy + cardH - 6, cardW - 14, 4, 1.5);
    fill(e.expired ? color(255, 80, 80, alpha) : color(100, 255, 100, alpha));
    rect(px + 22, cy + cardH - 6, (cardW - 14) * (1 - agePct), 4, 1.5);

    // Label
    fill(200, alpha);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(14);
    text(e.label, px + 25, cy + 4);
    fill(120, alpha);
    textSize(12);
    text(
      "ID: " +
        e.id +
        "  |  Age: " +
        nf(ageS, 1, 1) +
        "s" +
        (e.expired
          ? "  EXPIRED"
          : "  TTL: " + nf(TTL_MS / 1000 - ageS, 1, 1) + "s"),
      px + 25,
      cy + 22,
    );

    cy += cardH + 8;
  }

  // Refresh indicator
  if (cacheEntries.some((e) => e.expired)) {
    fill(255, 200, 100, 200);
    noStroke();
    textSize(15);
    textAlign(CENTER, TOP);
    text(
      "⚠ Stale data detected — re-fetch scheduled",
      px + pw / 2,
      py + ph - 25,
    );
  } else {
    fill(100, 255, 100, 100);
    textSize(15);
    textAlign(CENTER, TOP);
    text("✓ All cache entries are fresh", px + pw / 2, py + ph - 25);
  }

  // Right panel — explanation
  let rx = 570,
    ry = 40;
  fill(255);
  noStroke();
  textSize(20);
  textAlign(LEFT, TOP);
  text("Cache Lifecycle", rx, ry);
  ry += 35;

  fill(140);
  textSize(14);
  text("Each cache entry has a TTL", rx, ry);
  ry += 18;
  text("(time-to-live). When a request", rx, ry);
  ry += 18;
  text("comes in:", rx, ry);
  ry += 30;

  let steps = [
    { label: "1. Check cache for matching entry", done: true },
    {
      label: "2. Entry exists and fresh? Use it.",
      done: cacheEntries.some((e) => !e.expired),
    },
    {
      label: "3. Entry stale or missing? Re-fetch.",
      done: cacheEntries.some((e) => e.expired),
    },
    { label: "4. Update cache with new data", done: false },
  ];

  for (let s of steps) {
    fill(s.done ? color(100, 200, 100) : color(100, 100, 120));
    textSize(14);
    textAlign(LEFT, TOP);
    text(s.label, rx, ry);
    ry += 22;
  }

  ry += 20;
  fill(200);
  textSize(16);
  text("Entry Types", rx, ry);
  ry += 25;

  let typeInfo = [
    {
      label: "Weather forecast",
      col: [100, 180, 255],
      desc: "Open-Meteo: clouds, seeing, etc.",
    },
    {
      label: "Ephemeris",
      col: [255, 200, 100],
      desc: "Sun/Moon pos, twilight times.",
    },
    {
      label: "Combined",
      col: [200, 100, 255],
      desc: "Batch fetch for efficiency",
    },
  ];
  for (let t of typeInfo) {
    fill(t.col[0], t.col[1], t.col[2], 200);
    noStroke();
    textSize(14);
    textAlign(LEFT, TOP);
    text("■ " + t.label, rx, ry);
    ry += 18;
    fill(100);
    textSize(13);
    text("  " + t.desc, rx, ry);
    ry += 22;
  }

  // Stats
  ry = 360;
  fill(25, 25, 35);
  noStroke();
  rect(rx, ry, 260, 100, 5);
  fill(200);
  textSize(16);
  textAlign(LEFT, TOP);
  text("Cache Stats", rx + 15, ry + 10);
  fill(140);
  textSize(13);
  let total = cacheEntries.length;
  let fresh = cacheEntries.filter((e) => !e.expired).length;
  let stale = cacheEntries.filter((e) => e.expired).length;
  text(
    "Total: " + total + "  |  Fresh: " + fresh + "  |  Stale: " + stale,
    rx + 15,
    ry + 32,
  );
  text(
    "Cache hit rate: " + nf(total > 0 ? (fresh / total) * 100 : 0, 1, 0) + "%",
    rx + 15,
    ry + 52,
  );
  text("TTL: " + nf(TTL_MS / 1000, 1, 0) + "s simulated", rx + 15, ry + 72);

  // Legend at bottom
  fill(80);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  text(
    "Simulated cache: entries expire after " +
      nf(TTL_MS / 1000, 1, 0) +
      's. Click "Simulate API Fetch" to add new entries.',
    50,
    590,
  );
}
