import { useMemo, createContext } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { teal } from '@mui/material/colors';
import CssBaseline from '@mui/material/CssBaseline';
import produce from 'immer';

import { useLocalStorage } from '../hooks/useLocalStorage';

const defaultContext = { toggleColorMode: () => {} };
const baseTheme = {
  palette: {
    primary: teal,
  },
  typography: {
    fontFamily: 'Poppins',
    fontSize: 12,
  },
};

export const MuiContext = createContext(defaultContext);

export const MuiProvider = ({ children }) => {
  const [isDark, setIsDark] = useLocalStorage('plotter-playground:dark', true);

  const theme = useMemo(
    () =>
      createTheme(
        produce(baseTheme, (draft) => {
          draft.palette.mode = isDark ? 'dark' : 'light';
        })
      ),
    [isDark]
  );

  const value = {
    toggleDarkMode: () => {
      setIsDark((previous) => !previous);
    },
    isDark,
  };

  return (
    <MuiContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        {children}
        <CssBaseline />
      </ThemeProvider>
    </MuiContext.Provider>
  );
};
