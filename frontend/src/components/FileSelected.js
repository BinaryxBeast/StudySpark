import React from 'react';
import './FileSelected.css';

const FileSelected = ({ fileName, uploadStatus }) => {
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
                <span className="file-name-text">{fileName}</span>
            </div>
        </div>
    );
};

export default FileSelected;
