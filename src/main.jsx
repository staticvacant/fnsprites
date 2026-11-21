import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './assets/fonts/roboto.css';
import '../styles.css';
import App from './App.jsx';

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <App />
        </StrictMode>
    );
}
