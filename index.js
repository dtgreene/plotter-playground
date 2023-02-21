import * as fs from 'fs';

import { segment } from './prep-svg/segment/segment.js';
import { simplify } from './prep-svg/simplify.js';
import { round } from './prep-svg/round.js';
import { sort } from './prep-svg/sort.js';

const svgFile = fs.readFileSync('./test_2.svg').toString();

const paths = segment(svgFile);
const targetLayerId = 'layer1';

let segments = paths.reduce((acc, current) => {
  if (current.layerId === targetLayerId) {
    acc = acc.concat(current.segments);
  }
  return acc;
}, []);

segments = round(segments, 4);
segments = simplify(segments, { mergeDistance: 0.1, minPathSize: 1 });
segments = sort(segments);

fs.writeFileSync('./output.json', JSON.stringify(segments));
