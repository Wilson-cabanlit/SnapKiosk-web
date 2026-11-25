import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Gallery from './page.jsx';
import './style.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><Gallery /></BrowserRouter></React.StrictMode>);
