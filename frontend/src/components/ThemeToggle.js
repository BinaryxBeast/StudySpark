import React from 'react';
import './ThemeToggle.css';

function ThemeToggle({ theme, onToggle }) {
    return (
        <button
            className="theme-toggle"
            onClick={onToggle}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
            <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
        </button>
    );
}

export default ThemeToggle;
