const W = 240;
const H = 144;
const LOOP = 6;
const SCALE = 3;

let leaves = [
  { phase: 0.02, x: 105, drift: -24, fall: 60, color: "#e6a64b" },
  { phase: 0.19, x: 139, drift: 24, fall: 55, color: "#d97742" },
  { phase: 0.36, x: 120, drift: -30, fall: 66, color: "#f0c56a" },
  { phase: 0.53, x: 148, drift: 18, fall: 58, color: "#d97742" },
  { phase: 0.70, x: 99, drift: 32, fall: 52, color: "#e6a64b" },
  { phase: 0.87, x: 132, drift: -22, fall: 62, color: "#f0c56a" }
];

function setup() {
  createCanvas(W * SCALE, H * SCALE);
  noSmooth();
  frameRate(30);
}

function draw() {
  // Normalized time, always from 0 up to (but not including) 1.
  let t = (millis() / 1000 % LOOP) / LOOP;
  let a = TWO_PI * t;

  background("#202c42");

  // Draw the pixel art at its native resolution.
  push();
  scale(SCALE);
  noStroke();

  // Twilight sky
  fill("#19273b");
  rect(0, 0, W, H);
  fill("#202c42");
  rect(0, 0, W, 64);

  // Stars
  fill("#a9b6c4");
  [
    [25,19], [57,33], [86,15], [159,29],
    [218,45], [45,55], [204,12], [115,24]
  ].forEach(([x,y], i) => rect(x, y, i % 3 === 0 ? 2 : 1, 1));

  // Stars
  fill("#a9b6c4");
  [
    [25,19], [57,33], [86,15], [159,27],
    [218,30], [45,55], [204,12], [115,22]
  ].forEach(([x,y], i) => rect(x+5, y+53, i % 3 === 0 ? 2 : 1, 1));

  // Moon
  fill("#d7d5bc");
  rect(180, 20, 19, 10);
  rect(185, 15, 10, 19);
  rect(182, 17, 15, 15);

  // Moon spots
  fill("#a9b7b7");
  rect(185, 25, 4, 4);
  rect(194, 25, 3, 3);
  rect(189, 19, 3, 3);

  // Distant hills
  fill("#354c4b");
  rect(0, 89, 45, 9);
  rect(45, 84, 38, 14);
  rect(83, 91, 44, 7);
  rect(127, 85, 42, 13);
  rect(169, 90, 71, 8);

  // Ground
  fill("#263e3b");
  rect(0, 99, W, 45);
  fill("#314a40");
  rect(0, 105, W, 39);
  fill("#263c36");
  rect(0, 112, W, 32);

  // Grass details
  for (let i = 0; i < 36; i++) {
    let x = (i * 37) % W;
    let y = 106 + (i * 13) % 35;
    fill(i % 2 ? "#49634c" : "#3b5545");
    rect(x, y, 2, 1);
  }

  // Grass tufts
  for (let i = 0; i < 20; i++) {
    fill("#547053");
    rect((i * 29 + 7) % W, 105 + (i % 3), 2, 4);
  }

  // Tree trunk
  fill("#493b36");
  rect(51, 79, 19, 43);
  fill("#59433a");
  rect(56, 61, 11, 50);
  fill("#684c3d");
  rect(59, 54, 7, 20);

  // Roots
  fill("#493b36");
  rect(43, 117, 32, 5);
  rect(36, 121, 15, 3);
  rect(66, 120, 18, 3);

  // Branches and canopy move together.
  // Because the rotation is a sine wave, it returns exactly
  // to its starting angle after every six-second cycle.
  push();
  translate(62, 78);
  rotate(sin(a) * 0.045);

  // Branches
  fill("#684c3d");
  rect(-4, -22, 8, 27);
  rect(-22, -29, 29, 5);
  rect(-25, -42, 5, 18);
  rect(2, -39, 22, 5);
  rect(17, -50, 5, 15);
  rect(-11, -48, 5, 17);

  // Pixelated canopy
  const canopy = [
    [-25,-45,24,15,"#496b50"],
    [-36,-37,20,16,"#3e604a"],
    [-18,-56,23,15,"#537653"],
    [-2,-45,24,17,"#496b50"],
    [6,-56,22,16,"#3e604a"],
    [18,-46,20,15,"#496b50"],
    [21,-35,15,13,"#3e604a"],
    [-9,-35,26,15,"#436849"],
    [-32,-31,17,11,"#496b50"],
    [-12,-63,16,11,"#66865b"],
    [5,-63,13,10,"#66865b"],
    [27,-43,9,10,"#66865b"]
  ];

  for (const b of canopy) {
    fill(b[4]);
    rect(b[0], b[1], b[2], b[3]);
  }

  // Leaf highlights
  const highlights = [
    [-22,-53], [-8,-58], [9,-54], [20,-43],
    [-31,-37], [0,-39], [13,-34], [-15,-45]
  ];

  highlights.forEach((p, i) => {
    fill(i % 2 ? "#73915e" : "#8a9b62");
    rect(p[0], p[1], 4, 3);
  });

  fill("#b18a51");
  rect(-24, -33, 5, 3);
  fill("#d0a253");
  rect(11, -58, 4, 3);
  fill("#b18a51");
  rect(26, -38, 3, 3);

  pop(); // End tree canopy transform


  // Falling leaves.
  // Each leaf follows a deterministic path. It fades out before
  // restarting, so it never visibly jumps back to the top.
  for (const leaf of leaves) {
    let u = (t + leaf.phase) % 1;

    // Reserve the final 16% of its cycle for invisibility.
    if (u > 0.84) continue;

    let q = u / 0.84;

    let x = leaf.x
      + leaf.drift * q
      + sin(q * 7 + leaf.phase * 20) * 3;

    let y = 30 + leaf.fall * q;

    let alpha = min(1, q * 9, (1 - q) * 9);

    push();
    translate(round(x), round(y));
    rotate(sin(q * 8 + leaf.phase * 20) * 0.65 + q * 1.4);

    drawingContext.globalAlpha = max(0, alpha);

    fill(leaf.color);
    rect(-2, -1, 5, 3);
    rect(1, -3, 2, 3);

    fill("#c6a35d");
    rect(-3, 0, 2, 2);

    drawingContext.globalAlpha = 1;
    pop();
  }

  // Gentle wind streaks
  // Their brightness rises and falls periodically.
  let wind = pow((sin(a) + 1) / 2, 1);

  drawingContext.globalAlpha = 0.35 * wind;

  fill("#c3d1ce");

  for (let i = 0; i < 3; i++) {
    let x = 143 + i * 8 + sin(a + i) * 4;
    let y = 59 + i * 9;

    let offset_1 = 20;

    if (i > 0) {
      rect(x-offset_1, y, 12, 1);
      rect(x-offset_1 + 12, y - 1, 4, 1);
    }
  }

  drawingContext.globalAlpha = 1;

  pop();
}
