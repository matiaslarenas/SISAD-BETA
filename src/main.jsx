import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { AppDataProvider } from './context/AppDataContext';
import { seedData } from './utils/storage';
import './styles.css';

seedData();

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
