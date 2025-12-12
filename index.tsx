import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Erreur critique au démarrage de l'application :", error);
  rootElement.innerHTML = `
    <div style="color: red; padding: 20px; text-align: center; font-family: sans-serif;">
      <h1>Erreur de chargement</h1>
      <p>L'application n'a pas pu démarrer correctement.</p>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}