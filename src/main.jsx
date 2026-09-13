import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { AppDataProvider } from './context/AppDataContext';
import './styles.css';

// El estado ya no vive en localStorage de cada dispositivo: lo sirve el
// servidor local (server/index.js) corriendo en el computador de
// escritorio. AppDataProvider lo consulta al montar. Ver docs/GUIA_DE_DEPLOYMENT.md.

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <AppDataProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppDataProvider>
  </React.StrictMode>
);
