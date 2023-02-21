import RBush from 'rbush';

declare module 'adaptive-bezier-curve/function.js' {
  function adaptive(start: Point, c1: Point, c2: Point, end: Point): number[];

  type BuilderOptions = {
    recursion?: number;
    epsilon?: number;
    pathEpsilon?: number;
    angleEpsilon?: number;
    angleTolerance?: number;
    cuspLimit?: number;
  };

  export default function createBezierBuilder(
    opts: Partial<BuilderOptions>
  ): adaptive;
}
