import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './components/App';

import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/700.css';

import './styles.css';
import { MuiProvider } from './contexts/MuiProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <MuiProvider>
      <App />
    </MuiProvider>
  </React.StrictMode>
);
