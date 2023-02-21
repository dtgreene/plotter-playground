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
    // create an array containing both the start and end points for each segment
    // the format is [x, y, index, reversed]
    const data = segments.reduce((acc, current, index) => {
      const endIndex = current.length - 2;

      acc.push([current[0], current[1], index]);
      acc.push([current[endIndex], current[endIndex + 1], index, true]);

      return acc;
    }, []);

    // bulk insert the segment data
    tree.load(data);

    // start at the origin
    let currentPoint = [0, 0];

    while (tree.all().length > 0) {
      // find the nearest node
      const [nearest] = knn(tree, currentPoint[0], currentPoint[1], 1);
      const pathIndex = nearest[2];
      const path = segments[pathIndex];

      // update the current point
      currentPoint[0] = nearest[0];
      currentPoint[1] = nearest[1];

      // remove both this node and the reversed neighbor
      tree.remove(nearest, removePoint);
      tree.remove(nearest, removePoint);

      // check the reverse flag and try not to mutate the original data
      if (nearest[3]) {
        path.slice().reverse();
      }

      // add the path to the result
      result.push(path);
    }
  } else {
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

    while (tree.all().length > 0) {
      // find the nearest node
      const [nearest] = knn(tree, currentPoint[0], currentPoint[1], 1);
      const pathIndex = nearest[2];
      const path = segments[pathIndex];

      // update the current point
      currentPoint[0] = nearest[0];
      currentPoint[1] = nearest[1];

      // remove this node
      tree.remove(nearest, removePoint);

      // add the path to the result
      result.push(path);
    }
  }

  return result;
}

function removePoint(a, b) {
  return a[2] === b[2];
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

  while (node) {
    for (i = 0; i < node.children.length; i++) {
      child = node.children[i];
      dist = boxDist(x, y, node.leaf ? toBBox(child) : child);
      if (!maxDistance || dist <= maxDistance * maxDistance) {
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
