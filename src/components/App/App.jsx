import { useState, useContext } from 'react';
import {
  Box,
  Button,
  IconButton,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import produce from 'immer';
import { useForm } from 'react-hook-form';
import { Brightness7, DarkMode } from '@mui/icons-material';

import { getSVGFromFile, getSVGFromURL, segmentSVG } from '../../utils';
import { PreviewCanvas } from '../PreviewCanvas';
import { MuiContext } from '../../contexts/MuiProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const isFireFox = navigator.userAgent.indexOf('Firefox') != -1;

const styles = {
  app: {
    display: 'flex',
    justifyContent: 'center',
    overflow: 'hidden',
    height: '100%',
  },
  sidebarLeft: {
    width: 350,
    padding: 2,
    borderRight: '1px solid',
    borderColor: 'divider',
    overflowY: 'auto',
  },
  sidebarRight: {
    width: 350,
    padding: 2,
    borderLeft: '1px solid',
    borderColor: 'divider',
    overflowY: 'auto',
  },
};

export const App = () => {
  const [svg, setSVG] = useState(null);
  const [segments, setSegments] = useState(null);
  const [stats, setStats] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
  const [optimizations, setOptimizations] = useState({
    round: true,
    simplify: true,
    sort: true,
  });
  const [rendering, setRendering] = useState({
    original: true,
    penDown: false,
    penUp: false,
  });
  const [busy, setBusy] = useState(false);

  const [background, setBackground] = useLocalStorage(
    'plotter-playground:background',
    '#efefef'
  );
  const { isDark, toggleDarkMode } = useContext(MuiContext);
  const { register, handleSubmit: onSubmit } = useForm();

  const handleConfigSubmit = (data) => {
    if (!svg) return;

    const result = segmentSVG(svg, data, optimizations);

    setSegments(result.segments);
    setStats(result.stats);
    setRendering({
      original: false,
      penDown: true,
      penUp: true
    });
  };

  const handleOptimizationToggle = (key, event) => {
    setOptimizations(
      produce((draft) => {
        draft[key] = event.target.checked;
      })
    );
  };

  const handleRenderingToggle = (key, event) => {
    setRendering(
      produce((draft) => {
        draft[key] = event.target.checked;
      })
    );
  };

  const handleTestClick = async (fileName) => {
    try {
      if (busy) return;

      // reset state
      setSegments(null);
      setStats(null);
      setRendering({
        original: true,
        penDown: false,
        penUp: false
      });

      setBusy(true);
      setSVG(await getSVGFromURL(fileName));
      setBusy(false);
    } catch (e) {
      console.error(`Could not load SVG from URL: ${e.message}`);
    }
  };

  const handleFileChange = async (event) => {
    try {
      if (busy) return;

      const file = event.target.files[0];
      // if there's no file for some reason
      if (!file) return;

      // reset state
      setSegments(null);
      setStats(null);
      setRendering(
        produce((draft) => {
          draft.original = true;
        })
      );

      setBusy(true);
      setSVG(await getSVGFromFile(file));
      setBusy(false);
    } catch (e) {
      console.error(`Could not load SVG from file: ${e.message}`);
    }
  };

  const handleWidthChange = (event) => {
    setDimensions(
      produce((draft) => {
        draft.width = event.target.valueAsNumber;
      })
    );
  };

  const handleHeightChange = (event) => {
    setDimensions(
      produce((draft) => {
        draft.height = event.target.valueAsNumber;
      })
    );
  };

  const handleBackgroundChange = (event) => {
    setBackground(event.target.value);
  };

  return (
    <Box sx={styles.app}>
      <Box
        position="absolute"
        bottom={0}
        right={0}
        display="flex"
        p={1}
        zIndex={100}
      >
        <IconButton size="small" onClick={toggleDarkMode}>
          {isDark ? <Brightness7 /> : <DarkMode />}
        </IconButton>
      </Box>
      <Box sx={styles.sidebarLeft}>
        <Typography variant="h6" mb={1}>
          SVG
        </Typography>
        <Box mb={2} display="flex" gap={1}>
          <Button
            variant="outlined"
            onClick={() => handleTestClick('test_1.svg')}
          >
            test_1.svg
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleTestClick('test_2.svg')}
          >
            test_2.svg
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleTestClick('test_3.svg')}
          >
            test_3.svg
          </Button>
        </Box>
        <Box
          mb={2}
          p={2}
          border="1px solid"
          borderColor="divider"
          borderRadius={1}
        >
          <Box display="flex" flexDirection="column" gap={1}>
            <Typography textOverflow="ellipsis" color="text.secondary">
              {svg?.name ?? 'None selected'}
            </Typography>
            <Button variant="outlined" component="label">
              <span>Browse Files</span>
              <input
                onChange={handleFileChange}
                type="file"
                hidden
                accept=".svg"
              />
            </Button>
            {isFireFox && (
              <Typography color="text.secondary">
                Note: The width and height attributes are required to display
                properly in FireFox
              </Typography>
            )}
          </Box>
        </Box>
        <Typography variant="h6" mb={1}>
          Canvas
        </Typography>
        <Box mb={2} display="flex" alignItems="center" gap={1}>
          <TextField
            value={dimensions.width}
            onChange={handleWidthChange}
            inputProps={{ min: 0 }}
            label="Width"
            size="small"
            type="number"
          />
          <TextField
            value={dimensions.height}
            onChange={handleHeightChange}
            inputProps={{ min: 0 }}
            label="Height"
            size="small"
            type="number"
          />
        </Box>
        <Box mb={2}>
          <TextField
            value={background}
            onChange={handleBackgroundChange}
            label="Background color"
            size="small"
            fullWidth
          />
        </Box>
        <Typography variant="h6" mb={1}>
          Rendering
        </Typography>
        <Box mb={2} display="flex">
          <Box>
            <Switch
              checked={rendering.original}
              onChange={(event) => handleRenderingToggle('original', event)}
            />
            <span>Original</span>
          </Box>
        </Box>
        <Box mb={2} display="flex" alignItems="center" gap={1}>
          <Box flex={1}>
            <Switch
              checked={rendering.penDown}
              onChange={(event) => handleRenderingToggle('penDown', event)}
            />
            <span>Pen down</span>
          </Box>
          <Box flex={1}>
            <Switch
              checked={rendering.penUp}
              onChange={(event) => handleRenderingToggle('penUp', event)}
            />
            <span>Pen up</span>
          </Box>
        </Box>
      </Box>
      <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
        <PreviewCanvas
          svg={svg}
          dimensions={dimensions}
          background={background}
          segments={segments}
          rendering={rendering}
        />
      </Box>
      <Box sx={styles.sidebarRight}>
        <form onSubmit={onSubmit(handleConfigSubmit)}>
          <Typography variant="h6" mb={1}>
            Segments
          </Typography>
          <Box mb={2} display="flex" alignItems="center" gap={1}>
            <TextField
              inputProps={{
                ...register('recursion', { valueAsNumber: true }),
                min: 0,
              }}
              size="small"
              label="Recursion"
              type="number"
              defaultValue="8"
            />
            <TextField
              inputProps={register('epsilon', { valueAsNumber: true })}
              size="small"
              label="Epsilon"
              type="number"
              defaultValue="1.19209290e-7"
            />
          </Box>
          <Box mb={2} display="flex" alignItems="center" gap={1}>
            <TextField
              inputProps={{
                ...register('pathEpsilon', { valueAsNumber: true }),
                step: '0.1',
                min: 0,
              }}
              size="small"
              label="Path epsilon"
              type="number"
              defaultValue="0.5"
            />
            <TextField
              inputProps={{
                ...register('angleEpsilon', { valueAsNumber: true }),
                step: '0.01',
                min: 0,
              }}
              size="small"
              label="Angle epsilon"
              type="number"
              defaultValue="0.01"
            />
          </Box>
          <Box mb={2} display="flex" alignItems="center" gap={1}>
            <TextField
              inputProps={{
                ...register('angleTolerance', { valueAsNumber: true }),
                step: '0.1',
                min: 0,
              }}
              size="small"
              label="Angle tolerance"
              type="number"
              defaultValue="0"
            />
            <TextField
              inputProps={{
                ...register('cuspLimit', { valueAsNumber: true }),
                step: '0.1',
                min: 0,
              }}
              size="small"
              label="Cusp limit"
              type="number"
              defaultValue="0"
            />
          </Box>
          <Typography variant="h6" mb={1}>
            Selection Patterns
          </Typography>
          <Box mb={2} display="flex" alignItems="center" gap={1}>
            <TextField
              inputProps={register('layerId')}
              size="small"
              label="Layer Id"
              defaultValue="layer1"
            />
            <TextField
              inputProps={register('stroke')}
              size="small"
              label="Stroke"
            />
          </Box>
          <Box mb={2} display="flex">
            <TextField
              inputProps={register('fill')}
              size="small"
              label="Fill"
              fullWidth
            />
          </Box>
          <Typography variant="h6" mb={1}>
            Optimizations
          </Typography>
          <Box
            mb={1}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <span>Round</span>
            <Switch
              checked={optimizations.round}
              onChange={(event) => handleOptimizationToggle('round', event)}
            />
          </Box>
          <Box mb={2} display="flex">
            <TextField
              inputProps={{
                ...register('precision', { valueAsNumber: true }),
                min: 0,
              }}
              size="small"
              label="Precision"
              fullWidth
              type="number"
              defaultValue="4"
            />
          </Box>
          <Box
            mb={1}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <span>Simplify</span>
            <Switch
              checked={optimizations.simplify}
              onChange={(event) => handleOptimizationToggle('simplify', event)}
            />
          </Box>
          <Box mb={2} display="flex" alignItems="center" gap={1}>
            <TextField
              inputProps={{
                ...register('mergeDistance', { valueAsNumber: true }),
                step: '0.01',
                min: 0,
              }}
              size="small"
              label="Merge distance"
              type="number"
              defaultValue="0.1"
            />
            <TextField
              inputProps={{
                ...register('minPathSize', { valueAsNumber: true }),
                step: '0.01',
                min: 0,
              }}
              size="small"
              label="Minimum path size"
              type="number"
              defaultValue="1"
            />
          </Box>
          <Box
            mb={1}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <span>Sort</span>
            <Switch
              checked={optimizations.sort}
              onChange={(event) => handleOptimizationToggle('sort', event)}
            />
          </Box>
          <Typography variant="h6" mb={1}>
            Stats
          </Typography>
          <Box mb={2}>
            {stats ? (
              <Box>
                <Box display="flex" justifyContent="space-between">
                  <span>Process time:</span>
                  <span>{stats.duration}ms</span>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <span>Segment count:</span>
                  <span>{stats.segmentCount}</span>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <span>Point count:</span>
                  <span>{stats.pointCount}</span>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <span>Distance down:</span>
                  <span>{stats.distanceDown}</span>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <span>Distance up:</span>
                  <span>{stats.distanceUp}</span>
                </Box>
              </Box>
            ) : (
              <Box color="text.secondary">Nothing to see here</Box>
            )}
          </Box>
          <Button variant="contained" fullWidth type="submit" disabled={!svg}>
            Process
          </Button>
        </form>
      </Box>
    </Box>
  );
};
