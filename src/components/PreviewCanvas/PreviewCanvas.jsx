import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

export const PreviewCanvas = ({
  dimensions,
  svg,
  background,
  segments,
  rendering,
}) => {
  const canvasRef = useRef();
  const ctxRef = useRef();
  const [imageObject, setImageObject] = useState(null);

  useEffect(() => {
    // get the drawing context
    ctxRef.current = canvasRef.current.getContext('2d');
  }, []);

  // the main drawing effect
  useEffect(() => {
    if (!ctxRef.current) return;

    const { width, height } = dimensions;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    // set the canvas dimensions
    if (!width || !height || isNaN(width) || isNaN(height)) return;

    canvas.width = width;
    canvas.height = height;

    // clear the drawing area
    ctx.clearRect(0, 0, width, height);

    // draw the image scaled and centered
    if (imageObject) {
      let targetWidth = width;
      let targetHeight = height;

      const { viewBox } = svg;

      // constrain the image to the smallest target dimension
      if (width < height) {
        targetHeight = width * viewBox.ratio;
      } else {
        targetWidth = height / viewBox.ratio;
      }

      // offset the position to center the image
      const x = (width - targetWidth) * 0.5;
      const y = (height - targetHeight) * 0.5;

      if (rendering.original) {
        ctx.drawImage(imageObject, x, y, targetWidth, targetHeight);
      }

      if (!segments) return;

      // translate the drawing context to match the target dimensions
      const viewBoxRatio = {
        width: targetWidth / viewBox.width,
        height: targetHeight / viewBox.height,
      };

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(viewBoxRatio.width, viewBoxRatio.height);

      if (rendering.points) {
        ctx.fillStyle = 'red';
        segments.forEach((points) => {
          for (let i = 0; i < points.length; i += 2) {
            const x = points[i];
            const y = points[i + 1];

            ctx.fillRect(x - 1, y - 1, 2, 2);
          }
        });
      }

      let lastSegment = [0, 0];

      if (rendering.penDown && !rendering.penUp) {
        // render pen down but not pen up
        ctx.strokeStyle = 'red';
        segments.forEach((points) => {
          // draw pen down movement
          ctx.beginPath();
          ctx.moveTo(points[0], points[1]);
          for (let i = 2; i < points.length; i += 2) {
            const x = points[i];
            const y = points[i + 1];

            ctx.lineTo(x, y);

            lastSegment = [x, y];
          }
          // actually closing the path helps prevent weird artifacts
          if (points[0] === lastSegment[0] && points[1] === lastSegment[1]) {
            ctx.closePath();
          }
          ctx.stroke();
        });
      } else if (rendering.penUp && !rendering.penDown) {
        // render pen up but not pen down
        ctx.strokeStyle = 'blue';
        segments.forEach((points) => {
          // draw pen up movement
          ctx.beginPath();
          ctx.moveTo(lastSegment[0], lastSegment[1]);
          ctx.lineTo(points[0], points[1]);
          ctx.stroke();

          lastSegment = [points[points.length - 2], points[points.length - 1]];
        });
      } else if (rendering.penDown && rendering.penUp) {
        // render both pen down and pen up
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
          // actually closing the path helps prevent weird artifacts
          if (points[0] === lastSegment[0] && points[1] === lastSegment[1]) {
            ctx.closePath();
          }
          ctx.stroke();
        });
      }

      // restore the drawing context
      ctx.restore();
    }
  }, [dimensions, imageObject, rendering, segments]);

  // create an image object when image data changes
  useEffect(() => {
    if (!svg) return;

    const img = new Image();
    img.onload = () => setImageObject(img);
    img.src = svg.dataURL;
  }, [svg?.dataURL]);

  return (
    <Box flex={1} display="flex" position="relative" minHeight={0}>
      <Box
        borderColor="divider"
        display="flex"
        justifyContent="center"
        alignItems="center"
        flex={1}
        style={{ background }}
      >
        <Box display="flex" boxShadow={3}>
          <canvas ref={canvasRef} />
        </Box>
      </Box>
    </Box>
  );
};
