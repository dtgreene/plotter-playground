import * as fs from 'fs';

import { segment } from './lib/segment-svg/segment.js';
import { round, simplify, sort } from './lib/segment-optimize/index.js';

const svgFile = fs.readFileSync('./test_2.svg').toString();

const paths = segment(svgFile, { pathEpsilon: 0.5 });
const targetLayerId = 'layer1';

let segments = paths.reduce((acc, current) => {
  if (current.layerId === targetLayerId) {
    acc = acc.concat(current.segments);
  }
  return acc;
}, []);

// segments = segments.map((points) => points.map((value) => value *= 6.25))

segments = round(segments, 4);
segments = simplify(segments, { mergeDistance: 0.1, minPathSize: 1 });
segments = sort(segments);

fs.writeFileSync('./output.json', JSON.stringify(segments));
