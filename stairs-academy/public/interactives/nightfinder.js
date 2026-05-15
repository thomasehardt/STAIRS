let LATITUDE = 36;
let DAY_OF_YEAR = 180;
let isScanning = false;
let scanTime = 0;
let scanResult = null;

function sunDeclination(day) {
  return 23.44 * sin((radians(day - 81) * 360) / 365);
}

function sunAltitude(day, hour, lat) {
  let dec = sunDeclination(day);
  let ha = (hour - 12) * 15;
  let alt = degrees(
    asin(
      sin(radians(lat)) * sin(radians(dec)) +
        cos(radians(lat)) * cos(radians(dec)) * cos(radians(ha)),
    ),
  );
  return alt;
}

function findNextNight(lat, startDay) {
  let maxLookahead = 14;
  let astroTwilight = -18;

  for (let offset = 0; offset <= maxLookahead; offset++) {
    let day = startDay + offset;
    for (let h = 18; h < 30; h++) {
      let hour = h % 24;
      let alt = sunAltitude(day, hour, lat);
      if (alt <= astroTwilight) {
        return { day, startHour: hour, found: true, offset };
      }
    }
  }
  return { day: startDay, startHour: 0, found: false, offset: -1 };
}

function setup() {
  let canvas = createCanvas(860, 620);
  canvas.parent("canvas-container");

  function s(id, vId) {
    document.getElementById(id).addEventListener("input", (e) => {
      let val = parseInt(e.target.value);
      document.getElementById(vId).innerText = val;
      if (id === "latSlider") LATITUDE = val;
      else DAY_OF_YEAR = val;
      scanResult = null;
    });
  }
  s("latSlider", "latVal");
  s("daySlider", "dayVal");

  document.getElementById("playBtn").addEventListener("click", () => {
    isScanning = !isScanning;
    if (isScanning) {
      scanTime = 0;
      scanResult = null;
      document.getElementById("playBtn").textContent = "⏸ Scanning...";
      document.getElementById("playBtn").classList.add("active");
    } else {
      document.getElementById("playBtn").textContent = "▶ Scan";
      document.getElementById("playBtn").classList.remove("active");
    }
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    isScanning = false;
    scanTime = 0;
    scanResult = null;
    document.getElementById("playBtn").textContent = "▶ Scan";
    document.getElementById("playBtn").classList.remove("active");
  });
}

function draw() {
  background(17);

  if (isScanning) {
    scanTime += 0.01;
    if (scanTime >= 1) {
      scanResult = findNextNight(LATITUDE, DAY_OF_YEAR);
      isScanning = false;
      document.getElementById("playBtn").textContent = "▶ Scan";
      document.getElementById("playBtn").classList.remove("active");
    }
  }

  // Sun altitude trace
  let px = 50,
    py = 100,
    pw = 500,
    ph = 300;
  fill(15, 15, 25);
  noStroke();
  rect(px, py, pw, ph);
  stroke(50);
  strokeWeight(0.5);
  noFill();
  rect(px, py, pw, ph);

  fill(120);
  noStroke();
  textSize(9);
  textAlign(CENTER, BOTTOM);
  text("Hour of day", px + pw / 2, py + ph + 18);
  textAlign(LEFT, TOP);
  text("Sun altitude (\u00b0)", px - 5, py + 5);

  for (let h = 0; h < 24; h += 3) {
    stroke(30);
    strokeWeight(0.5);
    line(px + map(h, 0, 24, 0, pw), py, px + map(h, 0, 24, 0, pw), py + ph);
    fill(60);
    noStroke();
    textSize(7);
    textAlign(CENTER, TOP);
    text(h + ":00", px + map(h, 0, 24, 0, pw), py + ph + 2);
  }

  // -18° line (astronomical twilight)
  stroke(100, 180, 255, 100);
  strokeWeight(1);
  drawingContext.setLineDash([5, 5]);
  let twiY = py + ph - map(-18, -90, 90, 0, ph - 20);
  line(px, twiY, px + pw, twiY);
  drawingContext.setLineDash([]);
  fill(100, 180, 255);
  noStroke();
  textSize(8);
  textAlign(LEFT, BOTTOM);
  text("Astronomical twilight (-18\u00b0)", px + pw - 180, twiY - 2);

  // 0° line (horizon)
  stroke(60, 60, 80);
  strokeWeight(0.5);
  drawingContext.setLineDash([3, 3]);
  let hozY = py + ph - map(0, -90, 90, 0, ph - 20);
  line(px, hozY, px + pw, hozY);
  drawingContext.setLineDash([]);
  fill(80);
  textSize(7);
  textAlign(RIGHT, BOTTOM);
  text("Horizon", px + pw - 2, hozY - 2);

  // Sun altitude curve
  noFill();
  stroke(255, 200, 100, 200);
  strokeWeight(2);
  beginShape();
  for (let h = 0; h <= 24; h += 0.1) {
    let alt = sunAltitude(DAY_OF_YEAR, h, LATITUDE);
    vertex(px + map(h, 0, 24, 0, pw), py + ph - map(alt, -90, 90, 0, ph - 20));
  }
  endShape();

  // Fill below curve with gradient
  for (let h = 0; h < 240; h++) {
    let hh = h / 10;
    let alt = sunAltitude(DAY_OF_YEAR, hh, LATITUDE);
    let y = py + ph - map(alt, -90, 90, 0, ph - 20);
    let x = px + map(hh, 0, 24, 0, pw);
    let a = alt < -18 ? 30 : alt < 0 ? 15 : 0;
    stroke(255, 200, 100, a);
    strokeWeight(1.5);
    line(x, y, x, py + ph);
  }

  // Dark region below -18
  let darkStart = -1,
    darkEnd = -1;
  for (let h = 0; h < 240; h++) {
    let hh = h / 10;
    let alt = sunAltitude(DAY_OF_YEAR, hh, LATITUDE);
    if (alt <= -18 && darkStart < 0) darkStart = hh;
    if (alt <= -18) darkEnd = hh;
  }
  if (darkStart >= 0) {
    let dsx = px + map(darkStart, 0, 24, 0, pw);
    let dex = px + map(darkEnd, 0, 24, 0, pw);
    fill(50, 80, 150, 40);
    noStroke();
    rect(dsx, py, dex - dsx, ph - 20);
    fill(100, 180, 255);
    noStroke();
    textSize(8);
    textAlign(CENTER, BOTTOM);
    text("Astronomical night \u2190", (dsx + dex) / 2, py + 12);
  }

  // Sun icon at peak position
  let peakH = 14; // approximate
  let peakAlt = sunAltitude(DAY_OF_YEAR, peakH, LATITUDE);
  let sunX = px + map(peakH, 0, 24, 0, pw);
  let sunY = py + ph - map(peakAlt, -90, 90, 0, ph - 20);

  fill(255, 200, 50);
  noStroke();
  circle(sunX, sunY, 10);
  fill(255, 200, 50, 50);
  circle(sunX, sunY, 16);

  // Right panel — search visualization
  let rx = 580,
    ry = 30;
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  text("Night Search", rx, ry);
  ry += 24;

  fill(140);
  textSize(11);
  text("Latitude: " + LATITUDE + "\u00b0", rx, ry);
  ry += 16;
  text("Day: " + DAY_OF_YEAR, rx, ry);
  ry += 16;
  text("Sun dec: " + nf(sunDeclination(DAY_OF_YEAR), 1, 1) + "\u00b0", rx, ry);
  ry += 22;

  // Algorithm steps
  fill(200);
  textSize(11);
  text("Algorithm", rx, ry);
  ry += 18;

  let steps = [
    { label: "1. Check current Sun altitude", done: true },
    { label: "2. Below -18\u00b0? Use now as start.", done: darkStart >= 0 },
    {
      label: "3. If not, scan forward up to 14 days",
      done: scanResult !== null,
    },
    { label: "4. Check solar midnight each day", done: scanResult !== null },
    { label: "5. Find twilight evening crossing", done: scanResult !== null },
    { label: "6. Return start/end times", done: scanResult !== null },
  ];

  let stepAlpha = 200;
  for (let s of steps) {
    fill(s.done ? color(100, 255, 100) : color(100, 100, 120));
    textSize(9);
    textAlign(LEFT, TOP);
    text((s.done ? "\u2713 " : "\u25CB ") + s.label, rx, ry);
    ry += 16;
  }

  if (scanResult) {
    ry += 8;
    if (scanResult.found) {
      fill(100, 255, 100);
      textSize(12);
      text("Found!", rx, ry);
      ry += 18;
      fill(255);
      textSize(11);
      text("Day +" + scanResult.offset, rx, ry);
      ry += 16;
      text("Starts ~" + nf(scanResult.startHour, 2, 0) + ":00", rx, ry);
      ry += 16;
      // Compute end
      let endHour = scanResult.startHour + 6;
      if (sunAltitude(scanResult.day, endHour % 24, LATITUDE) > -18) {
        let e = scanResult.startHour;
        while (sunAltitude(scanResult.day, e % 24, LATITUDE) <= -18) e++;
        text("Ends ~" + nf(e % 24, 2, 0) + ":00", rx, ry);
        ry += 20;
      }
      fill(100);
      textSize(9);
      text("Duration varies by season and latitude.", rx, ry);
    } else {
      fill(255, 100, 100);
      textSize(12);
      text("No night found in 14 days.", rx, ry);
      ry += 18;
      fill(140);
      textSize(10);
      text("Likely polar summer where the", rx, ry);
      ry += 14;
      text("Sun never drops below -18\u00b0.", rx, ry);
    }
  }

  // Scanning animation
  if (isScanning) {
    ry = 250;
    let scanProgress = scanTime * 14;
    fill(30, 30, 40);
    noStroke();
    rect(rx, ry, 200, 20, 3);
    fill(100, 180, 255);
    rect(rx, ry, 200 * min(scanProgress / 14, 1), 20, 3);
    fill(255);
    textSize(9);
    textAlign(CENTER, TOP);
    text(
      "Scanning day +" + nf(floor(scanProgress), 0) + "/14",
      rx + 100,
      ry + 3,
    );
  }

  // Info text at bottom
  fill(80);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(9);
  text(
    "The astronomical night finder is critical for planning. If no night is found (e.g., Arctic summer), STAIRS raises an error.",
    30,
    545,
  );
  text(
    "The search checks solar midnight on each of the next 14 days. If the Sun is below -18\u00b0, it backtracks to find the exact twilight crossing.",
    30,
    560,
  );
}
