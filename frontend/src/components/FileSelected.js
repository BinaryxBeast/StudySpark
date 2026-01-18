import React from 'react';
import './FileSelected.css';

const FileSelected = ({ fileName, uploadStatus, onSpark, errorMessage }) => {
    return (
        <div className="file-selected-container">
            <div className="file-selected-icon-stack">
                <span className="material-symbols-rounded file-icon">description</span>
                <div className="success-badge">
                    <span className="material-symbols-rounded check-icon">check</span>
                </div>
            </div>
            <div className="file-selected-text">
                <h3 className="file-selected-primary">File selected</h3>
                <p className="file-selected-secondary">Ready to upload</p>
            </div>
            <div className="file-name-chip">
                <span className="material-symbols-rounded file-pill-icon">description</span>
                <span className="file-name-text">{fileName}</span>
            </div>

            {uploadStatus === 'error' && <p className="file-error-message">{errorMessage}</p>}

            <button className="upload-pdf-btn-card spark-btn-card" onClick={onSpark}>
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>electric_bolt</span>
                Spark
            </button>
        </div>
    );
};

export default FileSelected;
