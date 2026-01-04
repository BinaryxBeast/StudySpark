import React, { useState } from 'react';
import './App.css';
import { storage, db } from './firebaseConfig';
import { ref, uploadBytesResumable } from "firebase/storage";
import { doc, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";
import logo from './studyspark-logo.png';
import SummaryCard from './components/SummaryCard';
import Flashcard from './components/Flashcard';
import Quiz from './components/Quiz';



function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);

  // UX State Machine
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  // Mode State - Defaulting to cheat-sheet as per requirement
  const [summaryMode, setSummaryMode] = useState('cheat-sheet'); // 'cheat-sheet' | 'detailed'


  const handleUpload = async (mode = 'cheat-sheet') => {
    if (!file) return;

    // 0. Reset State & Delete Old Doc
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage(null);
    setSummaryMode(mode); // Ensure state reflects upload mode

    const docId = file.name.replace(".pdf", "");
    try {
      await deleteDoc(doc(db, "study_results", docId));
    } catch (e) {
      console.log("No existing doc or delete failed", e);
    }

    // 1. Upload the file with Progress
    const storageRef = ref(storage, file.name);
    // Add Metadata
    const metadata = {
      customMetadata: {
        summaryMode: mode
      }
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed", error);
        setUploadStatus('error');
        setErrorMessage("Upload failed. Please try again.");
      },
      () => {
        // Upload completed successfully
        setUploadStatus('success');
        setUploadProgress(100);

        // 2. Start listening immediately - UI handles the "Success -> Generating" transition
        const docId = file.name.replace(".pdf", "");
        const unsubscribe = onSnapshot(doc(db, "study_results", docId), (docSnapshot) => {
          if (docSnapshot.exists()) {
            const docData = docSnapshot.data();

            // Check for critical errors
            if (docData.status === 'error') {
              setUploadStatus('error');
              setErrorMessage(docData.error || "An error occurred during processing.");
              return;
            }

            // ONLY Redirect if we have a summary locally
            if (docData.summary) {
              // Check if we switched modes, etc.
              if (docData.summaryMode) {
                setSummaryMode(docData.summaryMode);
              }
              setData(docData);
              // If we have data, we are done uploading/processing
              setUploadStatus('complete');
            } else {
              // Document exists but no summary yet -> We are analyzing
              setUploadStatus('analyzing');
            }
          }
        });

        // Cleanup listener if component unmounts? 
        // In a real app we'd use useEffect, but here logic is inside handler. 
        // We rely on setData triggering re-render which might leave this listener active in closure 
        // but since we replace view, it's okay for this simple app. 
      }
    );
  };


  // Drag state
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = function (e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = function (e) {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadClick = async () => {
    if (!file) return;
    await handleUpload('cheat-sheet'); // Default to cheat-sheet
  };

  const handleGenerateDetailed = async () => {
    if (!file) return;
    const docId = file.name.replace(".pdf", "");
    const docRef = doc(db, "study_results", docId);

    try {
      await updateDoc(docRef, { requestDetailedSummary: true });
    } catch (error) {
      console.error("Error requesting detailed summary:", error);
    }
  };

  const handleGenerateFeature = async (feature) => {
    if (!file) return;
    const docId = file.name.replace(".pdf", "");
    const docRef = doc(db, "study_results", docId);

    try {
      if (feature === 'flashcards') {
        await updateDoc(docRef, { requestFlashcards: true });
      } else if (feature === 'quiz') {
        await updateDoc(docRef, { requestQuiz: true });
      }
    } catch (error) {
      console.error("Error requesting feature:", error);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <img src={logo} alt="StudySpark Logo" className="app-logo-image" />
        </div>
        <h3 className="app-tagline">Get instant summary, quizzes & flashcards from your PDF</h3>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {!data ? (
          <div className="upload-section">
            {/* Mode selection removed - defaulting to cheat sheet */}

            <form id="form-file-upload" onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()}>
              <input type="file" id="input-file-upload" multiple={false} onChange={handleChange} accept="application/pdf" disabled={uploadStatus === 'uploading' || uploadStatus === 'success' || uploadStatus === 'analyzing'} />
              <label id="label-file-upload" htmlFor="input-file-upload" className={dragActive ? "drag-active" : ""}>
                <div className="upload-card-content">
                  {!file ? (
                    <>
                      <div className={`upload-icon-wrapper ${dragActive ? 'pulse' : ''}`}>
                        {/* Material Upload Icon */}
                        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04ZM14 13V17H10V13H7L12 8L17 13H14Z" fill="#4285F4" />
                        </svg>
                      </div>
                      <p className="upload-text">Drag & drop PDF here</p>
                      <p className="upload-browse-hint">or click to browse</p>
                      <div className="upload-helper-group">
                        <p className="upload-helper-text">Max file size: 10 MB</p>
                        <p className="upload-helper-text">Supported format: PDF only</p>
                      </div>
                      <p className="trust-hint">Works with handwritten notes, textbooks & slides</p>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon-wrapper file-selected-icon">
                        {/* Document Icon - Blue */}
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="#4285F4" />
                        </svg>
                      </div>
                      <p className="file-name-selected">{file.name}</p>
                      <div className="file-change-hint">
                        {/* Show change file only if not currently processing */}
                        {uploadStatus !== 'analyzing' && uploadStatus !== 'uploading' && uploadStatus !== 'success' && (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
                              <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="#4285F4" />
                            </svg>
                            Change file
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </label>
              {dragActive && <div id="drag-file-element" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}></div>}
            </form>

            {file && (
              <div className="upload-action-container">
                {uploadStatus === 'uploading' ? (
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                    <span className="progress-text">{Math.round(uploadProgress)}% Uploaded</span>
                  </div>
                ) : uploadStatus === 'success' ? (
                  <div className="success-container fade-in">
                    <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                      <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                      <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                    <span className="success-text">Upload Complete</span>
                  </div>
                ) : uploadStatus === 'analyzing' ? (
                  <div className="analyzing-container fade-in">
                    <div className="analyzing-loader"></div>
                    <p className="analyzing-text">Analyzing PDF & Generating Summary...</p>
                    <p className="analyzing-subtext">This usually takes 10-20 seconds.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {uploadStatus === 'error' && <p className="error-message shake">{errorMessage}</p>}
                    <button className="upload-button" onClick={handleUploadClick}>
                      {uploadStatus === 'error' ? 'Retry Upload' : 'Generate Study Guide'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="results-container">
            {/* Keeping existing result display logic but wrapped cleanly */}
            <div className="results-header">
              <h2>Your Study Guide</h2>
              <button className="reset-button" onClick={() => { setData(null); setFile(null); setUploadStatus('idle'); setUploadProgress(0); setErrorMessage(null); }}>Upload Another</button>
            </div>

            <div className="results-section">
              <h3>Summary</h3>
              {data.summary ? (
                <>
                  {/* If we requested detailed mode but summary is still cheat-sheet, show loading or valid summary */}
                  {data.requestDetailedSummary ? (
                    <p className="loading-text">Generating detailed exam guide...</p>
                  ) : (
                    <>
                      <SummaryCard summary={data.summary} />
                      {summaryMode === 'cheat-sheet' && (
                        <div className="detailed-guide-promo">
                          <button className="generate-detailed-btn" onClick={handleGenerateDetailed}>
                            📚 Need more depth? Generate Detailed Exam Guide
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <p className="loading-text">Generating summary...</p>
              )}
            </div>

            <div className="results-section">
              <h3>Flashcards</h3>
              {data.flashcards ? (
                <div className="flashcards-container-wrapper">
                  <div className="flashcards-scroll">
                    {data.flashcards.map((card, i) => (
                      <Flashcard key={i} card={card} />
                    ))}
                  </div>
                  <div className="swipe-hint">Swipe →</div>
                </div>
              ) : (
                <div className="feature-generation-section">
                  {data.requestFlashcards ? (
                    <p className="loading-text">Generating flashcards...</p>
                  ) : (
                    <>
                      <p className="feature-description">Test your memory with auto-generated flashcards.</p>
                      <button
                        className="generate-feature-btn"
                        onClick={() => handleGenerateFeature('flashcards')}
                      >
                        ⚡ Generate Flashcards
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {data.quiz ? (
              <Quiz questions={data.quiz} />
            ) : (
              <div className="results-section quiz-section-loading">
                <h3>Interactive Quiz</h3>
                <div className="feature-generation-section">
                  {data.requestQuiz ? (
                    <p className="loading-text">Generating quiz...</p>
                  ) : (
                    <>
                      <p className="feature-description">Challenge yourself with a quick quiz.</p>
                      <button
                        className="generate-feature-btn"
                        onClick={() => handleGenerateFeature('quiz')}
                      >
                        📝 Generate Quiz
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>StudySpark • Your Revision Partner</p>
      </footer>
    </div>
  );
}

export default App;
