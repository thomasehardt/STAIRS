let timeSlider;

function setup() {
  let canvas = createCanvas(900, 450);
  canvas.parent("canvas-container");
  timeSlider = document.getElementById("timeSlider");
}

function draw() {
  background(17);

  let t = timeSlider.value / 120.0; // 0 to 1

  let leftX = 250;
  let rightX = 650;
  let cy = 240;

  // Draw Panels
  noFill();
  strokeWeight(2);
  stroke(255, 100, 100);
  rect(leftX - 180, cy - 180, 360, 360);

  stroke(100, 255, 100);
  rect(rightX - 180, cy - 180, 360, 360);

  fill(255);
  noStroke();
  textSize(24);
  textAlign(CENTER);
  text("Alt-Az Mount", leftX, cy - 200);
  text("Equatorial Mount", rightX, cy - 200);

  // Draw Grid to represent sensor bounds
  stroke(255, 30);
  strokeWeight(1);
  for (let i = -150; i <= 150; i += 50) {
    line(leftX - 180, cy + i, leftX + 180, cy + i);
    line(leftX + i, cy - 180, leftX + i, cy + 180);

    line(rightX - 180, cy + i, rightX + 180, cy + i);
    line(rightX + i, cy - 180, rightX + i, cy + 180);
  }

  let stars = [
    { x: 0, y: 0, r: 5, c: color(255, 255, 0) }, // Guide star
    { x: 60, y: -80, r: 3, c: color(255) },
    { x: -90, y: 100, r: 3, c: color(255) },
    { x: -60, y: -120, r: 4, c: color(100, 150, 255) },
    { x: 120, y: 50, r: 3, c: color(255, 150, 200) },
    { x: 100, y: 130, r: 2, c: color(200) },
    { x: -120, y: -20, r: 2, c: color(200) },
  ];

  let maxAngle = PI / 4; // Field rotation amount over 2 minutes
  let currentAngle = t * maxAngle;

  // --- Draw Alt-Az (Trails) ---
  for (let i = 0; i < stars.length; i++) {
    let s = stars[i];
    let dist = sqrt(s.x * s.x + s.y * s.y);
    let startAngle = atan2(s.y, s.x);

    if (i !== 0) {
      // Don't draw trail for center guide star
      noFill();
      stroke(s.c);
      strokeWeight(2);
      beginShape();
      for (let a = 0; a <= currentAngle; a += 0.02) {
        vertex(
          leftX + dist * cos(startAngle + a),
          cy + dist * sin(startAngle + a),
        );
      }
      vertex(
        leftX + dist * cos(startAngle + currentAngle),
        cy + dist * sin(startAngle + currentAngle),
      );
      endShape();
    }

    // Draw the current star position
    let endX = leftX + dist * cos(startAngle + currentAngle);
    let endY = cy + dist * sin(startAngle + currentAngle);
    noStroke();
    fill(s.c);
    ellipse(endX, endY, s.r * 2, s.r * 2);
  }

  // --- Draw Eq (Points) ---
  for (let s of stars) {
    noStroke();
    fill(s.c);
    // Position doesn't change relative to the sensor on EQ mount
    ellipse(rightX + s.x, cy + s.y, s.r * 2, s.r * 2);
  }

  // Info
  fill(255, 255, 0);
  text(`Exposure Time: ${timeSlider.value}s`, width / 2, height - 20);

  textSize(18);
  if (t > 0) {
    fill(255, 100, 100);
    text("Field Rotation occurs", leftX, cy + 220);
    fill(100, 255, 100);
    text("No Field Rotation", rightX, cy + 220);
  }
}
