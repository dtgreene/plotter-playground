import { segment } from '../lib/segment-svg/segment';
import { round, simplify, sort } from '../lib/segment-optimize/index';

export function getSVGFromFile(file) {
  return new Promise((res) => {
    const reader = new FileReader();
    reader.onload = ({ target: { result: contents } }) => {
      res(formatSVGContents(file.name, contents));
    };

    // read the string contents of the svg
    reader.readAsText(file, 'utf-8');
  });
}

export async function getSVGFromURL(url) {
  const result = await fetch(url);
  const contents = await result.text();

  return formatSVGContents(url, contents);
}

function formatSVGContents(name, data) {
  // take the string contents and create a valid image source
  const svg = new Blob([data], { type: 'image/svg+xml' });
  const dataURL = URL.createObjectURL(svg);

  const [width, height] = parseViewBox(data);

  return {
    data,
    dataURL,
    name,
    viewBox: {
      width,
      height,
      ratio: height / width,
    },
  };
}

function parseViewBox(data) {
  try {
    const viewBox = data.match(/viewBox="(.*)"/);

    if (!viewBox[1]) {
      throw new Error('Attribute not found');
    }

    // parse the width and height from the viewBox attribute
    const [width, height] = viewBox[1].split(' ').slice(2);

    if (!width || !height) {
      throw new Error('Attribute invalid');
    }

    return [parseFloat(width), parseFloat(height)];
  } catch (e) {
    throw new Error(`Could not parse viewBox: ${e.message}`);
  }
}

export function distanceTo(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

export function segmentSVG(svg, config, optimizations) {
  const {
    recursion,
    epsilon,
    pathEpsilon,
    angleEpsilon,
    angleTolerance,
    cuspLimit,
    layerId,
    stroke,
    fill,
    precision,
    mergeDistance,
    minPathSize,
  } = config;

  const startTime = performance.now();

  let paths = segment(svg.data, {
    recursion,
    epsilon,
    pathEpsilon,
    angleEpsilon,
    angleTolerance,
    cuspLimit,
  });

  // get segment selection
  if (layerId) {
    paths = paths.filter((path) => path.layerId.indexOf(layerId) > -1);
  }
  if (stroke) {
    paths = paths.filter((path) => path.stroke.indexOf(stroke) > -1);
  }
  if (fill) {
    paths = paths.filter((path) => path.fill.indexOf(fill) > -1);
  }

  // get only the segments
  let segments = paths.reduce(
    (acc, current) => acc.concat(current.segments),
    []
  );

  // optimizations
  if (optimizations.round) {
    segments = round(segments, precision);
  }
  if (optimizations.simplify) {
    segments = simplify(segments, { mergeDistance, minPathSize });
  }
  if (optimizations.sort) {
    segments = sort(segments);
  }

  const stopTime = performance.now();

  let distanceDown = 0;
  let distanceUp = 0;

  let lastUpPoint = [0, 0];

  let pointCount = 0;

  for (let i = 0; i < segments.length; i++) {
    const points = segments[i];
    const endIndex = points.length - 2;

    // pen up is the distance from the last point to the start of the current path
    distanceUp += distanceTo(
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

      distanceDown += distanceTo(lastDownPoint[0], lastDownPoint[1], x, y);

      lastDownPoint = [x, y];
    }
    pointCount += points.length;
  }

  return {
    segments,
    stats: {
      duration: stopTime - startTime,
      segmentCount: segments.length.toLocaleString(),
      pointCount: pointCount.toLocaleString(),
      distanceDown: Math.round(distanceDown).toLocaleString(),
      distanceUp: Math.round(distanceUp).toLocaleString(),
    },
  };
}

export function getContrastYIQ(hexcolor) {
  if (hexcolor.startsWith('#')) {
    hexcolor = hexcolor.slice(1);
  }

  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'black' : 'white';
}
