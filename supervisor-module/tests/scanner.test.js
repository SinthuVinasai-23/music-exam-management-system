import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeFrame } from "../src/supervisor/scanner.js";

test("QR decoder reads a real admission-code QR image without native BarcodeDetector", () => {
  const matrix = JSON.parse(
    readFileSync(new URL("./qr-fixture.json", import.meta.url), "utf8"),
  );
  const scale = 6,
    border = 4,
    size = (matrix.length + border * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dark =
        matrix[Math.floor(y / scale) - border]?.[
          Math.floor(x / scale) - border
        ];
      if (dark) {
        const i = (y * size + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }
  assert.equal(
    decodeFrame({ data, width: size, height: size }),
    "MUS-7K9P-2X4Q",
  );
});
test("QR decoder returns no candidate code for a blank frame", () => {
  assert.equal(
    decodeFrame({
      data: new Uint8ClampedArray(100 * 100 * 4).fill(255),
      width: 100,
      height: 100,
    }),
    null,
  );
});
