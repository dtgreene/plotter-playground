'use strict';

const canvasSize = 800;

// create background canvas
const { canvas, ctx } = createCanvas();
// create foreground canvas
const { canvas: workerCanvas, ctx: workerCtx } = createCanvas();

let image, imageProcessed;
let mousePos = { x: canvasSize * 0.5, y: canvasSize * 0.5 };
let pathLength = 100;
let renderMode = 0;

window.onload = async () => {
  const container = document.getElementById('canvas-container');
  // add canvas to DOM
  container.appendChild(canvas);

  const target = document.getElementById('target-svg');

  image = target;
  await updateProcessedImage();

  // add global listeners
  canvas.addEventListener('mousemove', handleMouseMove, false);
  document.addEventListener('visibilitychange', handleVisibilityChange, false);

  // path slider listeners
  const pathSlider = document.getElementById('path-length');
  pathSlider.addEventListener('change', handlePathSliderChange, false);

  // render mode radio listeners
  ['render-pen-down', 'render-pen-up', 'render-both'].forEach((id, index) => {
    const element = document.getElementById(id);

    if (index === renderMode) {
      element.checked = 'checked';
    }

    element.addEventListener('click', handleRenderModeClick, false);
  });

  updateStats();

  MainLoop.setUpdate(update).start();
};

function handleMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  mousePos = {
    x: event.clientX - rect.x,
    y: event.clientY - rect.y,
  };
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    MainLoop.start();
  } else {
    MainLoop.stop();
  }
}

function handlePathSliderChange(event) {
  pathLength = Number(event.target.value);
  updateProcessedImage();
}

function handleRenderModeClick(event) {
  renderMode = Number(event.target.value);
  updateProcessedImage();
}

function updateStats() {
  const penDown = document.getElementById('stat-pen-down');
  const penUp = document.getElementById('stat-pen-up');

  let stats = {
    penDown: 0,
    penUp: 0,
  };

  let lastUpPoint = [0, 0];

  window.segments.forEach((points) => {
    const endIndex = points.length - 2;

    // pen up is the distance from the last point to the start of the current path
    stats.penUp += distanceTo(
      lastUpPoint[0],
      lastUpPoint[1],
      points[0],
      points[1]
    );

    lastUpPoint = [points[endIndex], points[endIndex + 1]];

    // pen down is the total distance between each point
    let lastDownPoint = [points[0], points[1]];

    for (let i = 2; i < points.length; i += 2) {
      const x = points[i];
      const y = points[i + 1];

      stats.penDown += distanceTo(lastDownPoint[0], lastDownPoint[1], x, y);

      lastDownPoint = [x, y];
    }
  });

  penDown.innerHTML = Math.round(stats.penDown).toLocaleString();
  penUp.innerHTML = Math.round(stats.penUp).toLocaleString();
}

async function updateProcessedImage() {
  imageProcessed = await getStaticImage((ctx) => {
    // get the portion of segments to render
    const segments = window.segments.slice(
      0,
      Math.floor(window.segments.length * pathLength)
    );

    switch (renderMode) {
      case 0: {
        ctx.strokeStyle = 'red';
        segments.forEach((points) => {
          // draw pen down movement
          ctx.beginPath();
          ctx.moveTo(points[0], points[1]);
          for (let i = 2; i < points.length; i += 2) {
            const x = points[i];
            const y = points[i + 1];

            ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
        break;
      }
      case 1: {
        let lastSegment = [0, 0];
        ctx.strokeStyle = 'blue';
        segments.forEach((points) => {
          // draw pen up movement
          ctx.beginPath();
          ctx.moveTo(lastSegment[0], lastSegment[1]);
          ctx.lineTo(points[0], points[1]);
          ctx.stroke();

          lastSegment = [points[points.length - 2], points[points.length - 1]];
        });
        break;
      }
      case 2: {
        let lastSegment = [0, 0];
        segments.forEach((points) => {
          // draw pen up movement
          ctx.beginPath();
          ctx.moveTo(lastSegment[0], lastSegment[1]);
          ctx.strokeStyle = 'blue';
          ctx.lineTo(points[0], points[1]);
          ctx.stroke();

          // draw pen down movement
          ctx.strokeStyle = 'red';
          ctx.beginPath();
          ctx.moveTo(points[0], points[1]);
          for (let i = 2; i < points.length; i += 2) {
            const x = points[i];
            const y = points[i + 1];

            ctx.lineTo(x, y);

            lastSegment = [x, y];
          }
          ctx.stroke();
        });
        break;
      }
    }
  });
}

function update() {
  try {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    let percent = mousePos.x / canvasSize;

    percent = Math.min(1, percent);
    percent = Math.max(0, percent);

    const iPercent = 1 - percent;
    const lineX = canvasSize * percent;

    ctx.drawImage(image, 0, 0, lineX, canvasSize, 0, 0, lineX, canvasSize);

    ctx.drawImage(
      imageProcessed,
      lineX,
      0,
      canvasSize * iPercent,
      canvasSize,
      lineX,
      0,
      canvasSize * iPercent,
      canvasSize
    );

    ctx.beginPath();
    ctx.moveTo(lineX, 0);
    ctx.lineTo(lineX, canvasSize);
    ctx.stroke();
  } catch (e) {
    console.error(`MainLoop update failed: ${e.message}`);
  }
}

function createCanvas() {
  // create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // set canvas dimensions
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  return { canvas, ctx };
}

function getStaticImage(drawFn) {
  return new Promise((res, rej) => {
    // clear the worker canvas
    workerCtx.clearRect(0, 0, canvasSize, canvasSize);
    // call the draw function
    drawFn(workerCtx);

    const img = new Image();
    img.src = workerCanvas.toDataURL();
    img.onload = () => res(img);
    img.onerror = rej;
  });
}

function distanceTo(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}
