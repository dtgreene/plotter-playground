import RBush from 'rbush';
import Queue from 'tinyqueue';

// https://github.com/mourner/rbush
// https://github.com/mourner/rbush-knn

class PointRBush extends RBush {
  toBBox([x, y]) {
    return { minX: x, minY: y, maxX: x, maxY: y };
  }
  compareMinX(a, b) {
    return a[0] - b[0];
  }
  compareMinY(a, b) {
    return a[1] - b[1];
  }
}

export function sort(segments, allowReverse = true) {
  const tree = new PointRBush();
  const result = [];

  if (allowReverse) {
    const removePoint = (a, b) => a[4] === b[4];

    // create an array containing both the start and end points for each segment
    // the format is [x1, y1, x2, y2, index, reversed]
    const data = segments.reduce((acc, current, index) => {
      const endIndex = current.length - 2;

      // the path start
      const x1 = current[0];
      const y1 = current[1];

      // the path end
      const x2 = current[endIndex];
      const y2 = current[endIndex + 1];

      acc.push([x1, y1, x2, y2, index]);

      // if the path end is different than the path start
      // otherwise, reversing the path makes no difference
      if (x1 !== x2 || y1 !== y2) {
        acc.push([x2, y2, x1, y1, index, true]);
      }

      return acc;
    }, []);

    // bulk insert the segment data
    tree.load(data);

    // start at the origin
    let currentPoint = [0, 0];

    while (result.length < segments.length) {
      // find the nearest node
      const [nearest] = knn(tree, currentPoint[0], currentPoint[1], 1);

      // remove both the forward and reverse version of this node
      tree.remove(nearest, removePoint);
      tree.remove(nearest, removePoint);

      const [_x1, _y1, x2, y2, pathIndex, isReversed] = nearest;

      // update the current point
      currentPoint[0] = x2;
      currentPoint[1] = y2;

      // look up the original path
      const originalPath = segments[pathIndex];
      // reverse the path if this node is reversed
      const path = isReversed ? reversePath(originalPath) : originalPath;

      // add the path to the result
      result.push(path);
    }
  } else {
    const removePoint = (a, b) => a[2] === b[2];

    // create an array containing the start point for each segment
    // the format is [x, y, index]
    const data = segments.map((segment, index) => [
      segment[0],
      segment[1],
      index,
    ]);

    // bulk insert the segment data
    tree.load(data);

    // start at the origin
    let currentPoint = [0, 0];

    while (result.length < segments.length) {
      const [nearest] = knn(tree, currentPoint[0], currentPoint[1], 1);
      const pathIndex = nearest[2];
      const path = segments[pathIndex];

      // the current point is now the end of the path
      currentPoint[0] = path[path.length - 2];
      currentPoint[1] = path[path.length - 1];

      // remove this node
      tree.remove(nearest, removePoint);

      // add the path to the result
      result.push(path);
    }
  }

  return result;
}

function reversePath(path) {
  const result = [];

  for (let i = path.length - 1; i >= 0; i -= 2) {
    result.push(path[i - 1], path[i]);
  }

  return result;
}

function knn(tree, x, y, n, predicate, maxDistance) {
  let node = tree.data;
  let result = [];
  let toBBox = tree.toBBox;
  let i;
  let child;
  let dist;
  let candidate;

  const queue = new Queue(undefined, compareDist);
  const m2 = maxDistance * maxDistance || 0;

  while (node) {
    for (i = 0; i < node.children.length; i++) {
      child = node.children[i];
      dist = boxDist(x, y, node.leaf ? toBBox(child) : child);
      if (!m2 || dist <= m2) {
        queue.push({
          node: child,
          isItem: node.leaf,
          dist: dist,
        });
      }
    }

    while (queue.length && queue.peek().isItem) {
      candidate = queue.pop().node;
      if (!predicate || predicate(candidate)) {
        result.push(candidate);
      }
      if (n && result.length === n) {
        return result;
      }
    }

    node = queue.pop();

    if (node) {
      node = node.node;
    }
  }

  return result;
}

function compareDist(a, b) {
  return a.dist - b.dist;
}

function boxDist(x, y, box) {
  const dx = axisDist(x, box.minX, box.maxX);
  const dy = axisDist(y, box.minY, box.maxY);
  return dx * dx + dy * dy;
}

function axisDist(k, min, max) {
  if (k < min) {
    return min - k;
  } else if (k <= max) {
    return 0;
  }

  return k - max;
}
