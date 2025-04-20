import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import './src/styles/index.css';

// React 18のcreateRoot APIを使用
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found!');
}