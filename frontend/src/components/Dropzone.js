import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './Dropzone.css';

const Dropzone = () => {
    const onDrop = useCallback((acceptedFiles) => {
        // Process dropped files here
        console.log(acceptedFiles);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div className={`dropzone ${isDragActive ? 'active' : ''}`} {...getRootProps()}>
            <input {...getInputProps()} />
            {
                isDragActive ?
                    <p>Drop the PDF files here ...</p> :
                    <p>Drag 'n' drop a PDF file here, or click to select one</p>
            }
        </div>
    );
};

export default Dropzone;
