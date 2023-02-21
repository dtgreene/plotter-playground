// drops points within a certain distance from the previous point
export function simplify(
  segments,
  { mergeDistance = 0.1, minPathSize = 0.5 } = {}
) {
  return segments.reduce((acc, current) => {
    // drop short paths
    let drop = true;
    for (let i = 2; i < current.length; i += 2) {
      const d = distanceTo(current[0], current[1], current[i], current[i + 1]);

      if (d > minPathSize) {
        drop = false;
        break;
      }
    }

    if (drop) return acc;

    // merge close points
    let index = 0;

    const result = [];

    while (index < current.length) {
      const x1 = current[index];
      const y1 = current[index + 1];

      result.push(x1, y1);

      let increment = 2;
      let x2 = current[index + increment];
      let y2 = current[index + increment + 1];

      while (
        // skip the last point
        index + increment < current.length - 2 &&
        distanceTo(x1, y1, x2, y2) < mergeDistance
      ) {
        increment += 2;

        x2 = current[index + increment];
        y2 = current[index + increment + 1];
      }

      index += increment;
    }

    // set the end point to the start point if within the distance
    if (result.length > 3) {
      const x1 = result[0];
      const y1 = result[1];
      const x2 = result[result.length - 2];
      const y2 = result[result.length - 1];

      if (distanceTo(x1, y1, x2, y2) < mergeDistance) {
        result[result.length - 2] = result[0];
        result[result.length - 1] = result[1];
      }
    }

    acc.push(result);

    return acc;
  }, []);
}

function distanceTo(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}
