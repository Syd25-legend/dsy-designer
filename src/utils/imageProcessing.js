export const generateNormalMap = (ctx, width, height, settings) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Create a copy for the output
  const outputData = new Uint8ClampedArray(data.length);
  
  // Helper to get pixel grayscale value
  const getVal = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    const i = (y * width + x) * 4;
    // use simple luminosity for height evaluation
    let val = (data[i] * 0.3 + data[i+1] * 0.59 + data[i+2] * 0.11) / 255.0;
    if (settings.invertH) val = 1.0 - val;
    return val;
  };

  const str = settings.intensity;
  const filter = settings.filter || 'sobel';

  // weights
  const w1 = filter === 'scharr' ? 3.0 : 1.0;
  const w2 = filter === 'scharr' ? 10.0 : 2.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = getVal(x - 1, y - 1);
      const l  = getVal(x - 1, y);
      const bl = getVal(x - 1, y + 1);
      const t  = getVal(x, y - 1);
      const b  = getVal(x, y + 1);
      const tr = getVal(x + 1, y - 1);
      const r  = getVal(x + 1, y);
      const br = getVal(x + 1, y + 1);

      // Compute dx and dy
      let dX = (tr * w1 + r * w2 + br * w1) - (tl * w1 + l * w2 + bl * w1);
      let dY = (bl * w1 + b * w2 + br * w1) - (tl * w1 + t * w2 + tr * w1);
      
      dX *= str;
      dY *= str;
      const dZ = 1.0 / (settings.level || 7.0);

      // Normalize the vector
      const length = Math.sqrt(dX * dX + dY * dY + dZ * dZ);
      let nX = dX / length;
      let nY = dY / length;
      const nZ = dZ / length;

      if (settings.invertR) nX = -nX;
      if (settings.invertG) nY = -nY;

      // Map from [-1, 1] to [0, 255]
      const i = (y * width + x) * 4;
      outputData[i]     = (nX * 0.5 + 0.5) * 255;
      outputData[i + 1] = (nY * 0.5 + 0.5) * 255;
      outputData[i + 2] = (nZ * 0.5 + 0.5) * 255;
      outputData[i + 3] = 255; // Alpha
    }
  }

  const resultImageData = new ImageData(outputData, width, height);
  ctx.putImageData(resultImageData, 0, 0);
};

export const applyBlur = (ctx, width, height, amount) => {
  if (amount === 0) return;
  
  if (amount > 0) {
    // Blur
    ctx.filter = `blur(${amount}px)`;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = 'none';
  } else {
    // Sharpen (Negative blur)
    applySharpen(ctx, width, height, Math.abs(amount) / 10);
  }
};

const applySharpen = (ctx, w, h, mix) => {
  const weights = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0
  ];
  const katet = 3;
  const half = 1;
  const dstData = ctx.createImageData(w, h);
  const dstBuff = dstData.data;
  const srcBuff = ctx.getImageData(0, 0, w, h).data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dstOff = (y * w + x) * 4;
      let r = 0, g = 0, b = 0, a = 0;
      for (let cy = 0; cy < katet; cy++) {
        for (let cx = 0; cx < katet; cx++) {
          const scy = y + cy - half;
          const scx = x + cx - half;
          if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
            const srcOff = (scy * w + scx) * 4;
            const wt = weights[cy * katet + cx];
            r += srcBuff[srcOff] * wt;
            g += srcBuff[srcOff + 1] * wt;
            b += srcBuff[srcOff + 2] * wt;
            a += srcBuff[srcOff + 3] * wt;
          }
        }
      }
      dstBuff[dstOff]     = r * mix + srcBuff[dstOff] * (1 - mix);
      dstBuff[dstOff + 1] = g * mix + srcBuff[dstOff + 1] * (1 - mix);
      dstBuff[dstOff + 2] = b * mix + srcBuff[dstOff + 2] * (1 - mix);
      dstBuff[dstOff + 3] = srcBuff[dstOff + 3];
    }
  }
  ctx.putImageData(dstData, 0, 0);
};
