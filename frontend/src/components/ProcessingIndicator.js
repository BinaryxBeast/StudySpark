import React, { useState, useEffect } from 'react';
import './ProcessingIndicator.css';

const ProcessingIndicator = ({ status }) => {
    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        let interval;
        if (status === 'analyzing' && !isComplete) {
            // Simulate smooth progress from 0 to 95%
            interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 95) {
                        clearInterval(interval);
                        return 95;
                    }
                    // Increment faster at first, then slow down
                    const increment = prev < 50 ? 2 : prev < 80 ? 1 : 0.5;
                    return Math.min(prev + increment, 95);
                });
            }, 300);
        } else if (status === 'complete' || status === 'success') {
            // Jump to 100% when complete
            setProgress(100);
            setTimeout(() => setIsComplete(true), 300);
        }

        return () => clearInterval(interval);
    }, [status, isComplete]);

    return (
        <div className="processing-indicator-container">
            <div className="processing-icon-wrapper">
                <span
                    className={`material-symbols-rounded processing-bolt ${status === 'analyzing' ? 'pulsing' : ''} ${isComplete ? 'activated' : ''}`}
                >
                    bolt
                </span>
            </div>

            <div className={`processing-progress-wrapper ${isComplete ? 'collapsed' : ''}`}>
                <div
                    className="processing-progress-bar"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <div className="processing-text-container">
                <span className="processing-status-text">
                    {isComplete ? 'Your study guide is ready' : 'Sparking your study guide...'}
                </span>
                {!isComplete && (
                    <p className="processing-subtext">
                        Analyzing PDF & Generating Summary (usually 10-20s)
                    </p>
                )}
            </div>
        </div>
    );
};

export default ProcessingIndicator;
