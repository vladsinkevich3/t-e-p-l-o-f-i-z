import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPNG(width, height, isMaskable = false) {
  // RGBA buffer: (width * 4 + 1) * height
  // Filter byte 0 for each row
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.45;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background
      let r = 15; // #0f172a (slate-900)
      let g = 23;
      let b = 42;
      let a = 255;

      if (!isMaskable) {
        // Rounded squircle background
        const cornerR = width * 0.22;
        const qx = Math.max(0, Math.abs(dx) - (cx - cornerR));
        const qy = Math.max(0, Math.abs(dy) - (cy - cornerR));
        const qDist = Math.sqrt(qx * qx + qy * qy);
        if (qDist > cornerR) {
          a = 0;
        }
      }

      if (a > 0) {
        // Gradient overlay from top-left (deep indigo/blue) to bottom-right (cyan/amber)
        const t = (x + y) / (width + height);
        r = Math.floor(15 + t * 20);
        g = Math.floor(23 + t * 45);
        b = Math.floor(52 + t * 90);

        // Draw central thermal physics emblem: building icon with heat flux
        // Scale coords -1 to 1 inside central safe area (0.7 of width)
        const scale = (width * 0.65) / 2;
        const nx = dx / scale;
        const ny = dy / scale;

        // Building silhouette: roof peak and walls
        const insideRoof = ny >= -0.7 && ny <= -0.1 && Math.abs(nx) <= (ny + 0.7) * 1.1;
        const insideBody = ny >= -0.1 && ny <= 0.75 && Math.abs(nx) <= 0.65;

        if (insideRoof || insideBody) {
          // Inner walls and thermal layers
          if (nx < -0.2) {
            // Cold side (cyan/blue: #38bdf8)
            r = 56;
            g = 189;
            b = 248;
          } else if (nx > 0.2) {
            // Warm side (amber/orange: #f97316)
            r = 249;
            g = 115;
            b = 22;
          } else {
            // Insulation core (emerald/green: #10b981)
            r = 16;
            g = 185;
            b = 129;
          }

          // Interior window cutouts
          if (ny >= 0.1 && ny <= 0.5 && Math.abs(nx) <= 0.45) {
            const wx = ((nx + 0.45) % 0.3) - 0.15;
            const wy = ((ny - 0.1) % 0.2) - 0.1;
            if (Math.abs(wx) < 0.1 && Math.abs(wy) < 0.07) {
              r = 15;
              g = 23;
              b = 42;
            }
          }
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG chunks helper
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff);
  }

  // Header: 8 bytes
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write PNG files
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(64, 64, false));

console.log('Successfully generated all PWA PNG icons!');
