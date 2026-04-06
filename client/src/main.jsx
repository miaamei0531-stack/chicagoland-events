import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Clean up leftover # fragment from Supabase OAuth redirect
// Supabase leaves bare # after processing access_token from hash
if (window.location.hash === '#' || window.location.hash === '') {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
