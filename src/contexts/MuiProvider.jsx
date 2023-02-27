import { useMemo, createContext } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { teal } from '@mui/material/colors';
import CssBaseline from '@mui/material/CssBaseline';
import produce from 'immer';

import { useLocalStorage } from '../hooks/useLocalStorage';

export const MuiContext = createContext({ toggleColorMode: () => {} });

const baseTheme = {
  palette: {
    primary: teal,
  },
  typography: {
    fontFamily: 'Poppins',
    fontSize: 12,
  },
};

export const MuiProvider = ({ children }) => {
  const [isDark, setIsDark] = useLocalStorage('plotter-playground:dark', false);

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
