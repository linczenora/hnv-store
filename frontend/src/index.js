import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';

// Reset CSS cơ bản
const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f5f3; }
  input, select, textarea { font-size: 16px; } /* prevent iOS zoom */
  button { font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  a { text-decoration: none; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);