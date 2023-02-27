const epsilon = 1e-9;

export function getMotionPlan(
  segments,
  acceleration,
  maxVelocity,
  cornerFactor
) {
  const result = [];

  segments.forEach((points) => {
    result.push(
      // todo: move to start of path
      // todo: pen down
      // plan to plot this path
      getConstantAccelPlan(points, acceleration, maxVelocity, cornerFactor)
      // todo: pen up
    );
  });

  // todo: move back to origin

  return result;
}

function getConstantAccelPlan(points, acceleration, maxVelocity, cornerFactor) {
  const vectors = getVectors(points);

  const throttler = new Throttler(vectors, maxVelocity, 0.02, 0.001);
  const maxVelocities = throttler.getMaxVelocities();

  const segments = [];
  // create segments for each pair of vectors
  for (let i = 0; i < vectors.length - 1; i++) {
    segments.push(new Segment(vectors[i], vectors[i + 1]));
  }

  for (let i = 0; i < segments.length - 1; i++) {
    const maxVelocity = maxVelocities[i];
    const segment1 = segments[i];
    const segment2 = segments[i + 1];

    segment1.maxEntryVelocity = Math.min(
      segment1.maxEntryVelocity,
      maxVelocity
    );
    segment2.maxEntryVelocity = getCornerVelocity(
      segment1,
      segment2,
      maxVelocity,
      acceleration,
      cornerFactor
    );
  }

  // add dummy point to the segments to force zero final velocity

  let i = 0;
  while (i < segments.length - 1) {
    const segment1 = segments[i];
    const segment2 = segments[i + 1];
  }
}

function getTriangle(distance, vInitial, vFinal, accel, p1, p3) {
  const accelDistance =
    (2 * accel * distance + vFinal * vFinal - vInitial * vInitial) /
    (4 * accel);
  const decelDistance = distance - accelDistance;
  const vMax = Math.sqrt(vInitial * vInitial + 2 * accel * accelDistance);
  const t1 = (vMax - vInitial) / accel;
  const t2 = (vFinal - vMax) / -accel;
  const p2 = vadd(p1, vmul(vnorm(vsub(p3, p1)), accelDistance));
  return {
    s1: accelDistance,
    s2: decelDistance,
    t1,
    t2,
    vMax,
    p1,
    p2,
    p3,
  };
}

function getCornerVelocity(
  segment1,
  segment2,
  maxVelocity,
  acceleration,
  cornerFactor
) {
  // compute a maximum velocity at the corner of two segments
  // https://onehossshay.wordpress.com/2011/09/24/improving_grbl_cornering_algorithm/
  const cosine = -segment1.vector.dot(segment2.vector);
  if (Math.abs(cosine - 1) < epsilon) {
    return 0;
  }
  const sine = Math.sqrt((1 - cosine) / 2);
  if (Math.abs(sine - 1) < epsilon) {
    return maxVelocity;
  }
  const v = Math.sqrt((acceleration * cornerFactor * sine) / (1 - sine));
  return Math.min(v, maxVelocity);
}

function getVectors(points) {
  const result = [];
  for (let i = 0; i < points.length; i += 2) {
    result.push(new Vector(points[i], points[i + 1]));
  }
  return result;
}

class Throttler {
  constructor(vectors, maxVelocity, deltaT, threshold) {
    this.vectors = vectors;
    this.maxVelocity = maxVelocity;
    this.deltaT = deltaT;
    this.threshold = threshold;
    this.distances = [];

    // calculates distances between vectors
    for (let i = 1; i < this.vectors.length; i++) {
      const previous = this.vectors[i - 1];
      const current = this.vectors[i];

      this.distances.push(previous.distance(current));
    }

    // sort the distances
    this.distances.sort((a, b) => a - b);
  }
  lookup = (distance) => {
    return bisect(this.distances, distance) - 1;
  };
  isFeasible = (index, velocity) => {
    const delta = velocity * this.deltaT;
    const d0 = this.distances[index];
    const d1 = d0 + delta;
    const nextIndex = this.lookup(d1);

    if (index === nextIndex) {
      return true;
    }

    const v0 = this.vectors[index];
    const v1 = this.vectors[nextIndex];
    const v2 = this.vectors[nextIndex + 1] ?? v1;

    const d3 = d1 - this.distances[nextIndex];
    const v4 = v1.lerps(v2, d3);

    for (let i = index + 1; i < nextIndex; i++) {
      const vector = this.vectors[i];
      if (vector.segmentDistance(v0, v4) > this.threshold) {
        return false;
      }
    }

    return true;
  };
  getMaxVelocities = () => {
    const result = [];

    for (let i = 0; i < this.vectors.length - 1; i++) {
      if (this.isFeasible(i, this.maxVelocity)) {
        return this.maxVelocity;
      }

      let low = 0;
      let high = this.maxVelocity;

      for (let j = 0; j < 16; j++) {
        const velocity = (low + high) * 0.5;
        if (this.isFeasible(i, velocity)) {
          low = velocity;
        } else {
          high = velocity;
        }
      }

      result.push(low);
    }

    return result;
  };
}

class Segment {
  // a segment is a line segment between two points, which will be broken
  // up into blocks by the planner
  constructor(vector1, vector2) {
    this.vector1 = vector1;
    this.vector2 = vector2;
    this.length = vector1.distance(vector2);
    this.vector = vector2.sub(vector1).normalize();
    this.maxEntryVelocity = 0;
    this.entryVelocity = 0;
    this.blocks = [];
  }
}

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  length = () => {
    return Math.hypot(this.x, this.y);
  };
  normalize = () => {
    const d = this.length();
    if (d == 0) {
      return new Vector(0, 0);
    }
    return new Vector(this.x / d, this.y / d);
  };
  distance = (other) => {
    return Math.hypot(this.x - other.x, this.y - other.y);
  };
  distanceSquared = (other) => {
    return (this.x - other.x) ** 2 + (this.y - other.y) ** 2;
  };
  add = (other) => {
    return new Vector(this.x + other.x, this.y + other.y);
  };
  sub = (other) => {
    return new Vector(this.x - other.x, this.y - other.y);
  };
  mul = (factor) => {
    return new Vector(this.x * factor, this.y * factor);
  };
  dot = (other) => {
    return this.x * other.x + this.y * other.y;
  };
  lerps = (other, s) => {
    const v = other.sub(this).normalize();
    return this.add(v.mul(s));
  };
  segmentDistance = (v1, v2) => {
    const lenSquared = v1.distanceSquared(v2);
    if (lenSquared == 0) {
      return this.distance(v1);
    }
    let t =
      ((this.x - v1.x) * (v2.x - v1.x) + (this.y - v1.y) * (v2.y - v1.y)) /
      lenSquared;
    t = Math.min(1, t);
    t = Math.max(0, t);

    const x = v1.x + t * (v2.x - v1.x);
    const y = v1.y + t * (v2.y - v1.y);

    return this.distance(new Vector(x, y));
  };
}

function bisect(source, target) {
  let mid;
  let low = 0;
  let high = source.length - 1;
  while (high - low > 1) {
    mid = Math.floor((low + high) / 2);
    if (source[mid] < target) {
      low = mid;
    } else {
      high = mid;
    }
  }
  if (target - source[low] <= source[high] - target) {
    return low;
  }
  return high;
}
