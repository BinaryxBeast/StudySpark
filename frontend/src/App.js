import React, { useState, useEffect } from 'react';
import './App.css';
import { storage, db } from './firebaseConfig';
import { ref, uploadBytesResumable } from "firebase/storage";
import { doc, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";
import logo from './studyspark-logo.png';
import SummaryCard from './components/SummaryCard';
import Flashcard from './components/Flashcard';
import Quiz from './components/Quiz';
import ThemeToggle from './components/ThemeToggle';
import FileSelected from './components/FileSelected';
import ProcessingIndicator from './components/ProcessingIndicator';


function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);

  // Theme State
  const [theme, setTheme] = useState('light');

  // UX State Machine
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  // Mode State - Defaulting to cheat-sheet as per requirement
  const [summaryMode, setSummaryMode] = useState('cheat-sheet'); // 'cheat-sheet' | 'detailed'
  // Toggle state for summary view (after detailed is generated)
  const [showDetailedView, setShowDetailedView] = useState(true); // true = detailed, false = short notes
  // Local loading states to prevent duplicate mobile taps
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Reset local loading states when results or errors arrive
  useEffect(() => {
    if (data?.flashcards || data?.flashcardsError) {
      setGeneratingFlashcards(false);
    }
    if (data?.quiz || data?.quizError) {
      setGeneratingQuiz(false);
    }
  }, [data?.flashcards, data?.flashcardsError, data?.quiz, data?.quizError]);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };



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

    // Prevent duplicate requests on mobile
    if (feature === 'flashcards' && generatingFlashcards) return;
    if (feature === 'quiz' && generatingQuiz) return;

    const docId = file.name.replace(".pdf", "");
    const docRef = doc(db, "study_results", docId);

    try {
      if (feature === 'flashcards') {
        setGeneratingFlashcards(true);
        await updateDoc(docRef, { requestFlashcards: true });
      } else if (feature === 'quiz') {
        setGeneratingQuiz(true);
        await updateDoc(docRef, { requestQuiz: true });
      }
    } catch (error) {
      console.error("Error requesting feature:", error);
      // Reset loading state on error
      if (feature === 'flashcards') setGeneratingFlashcards(false);
      if (feature === 'quiz') setGeneratingQuiz(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top App Bar - MD3 Flat Surface */}
      <header className="app-header">
        <div className="logo-container">
          <span className="app-wordmark">
            <img src={logo} alt="StudySpark Logo" className="header-logo-icon" />
            <span className="logo-study">Study</span>
            <span className="logo-spark">Spark</span>
          </span>
        </div>
        <div className="header-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          {data && (
            <button className="reset-button" onClick={() => { setData(null); setFile(null); setUploadStatus('idle'); setUploadProgress(0); setErrorMessage(null); }}>
              Upload Another
            </button>
          )}
        </div>
      </header >

      {/* Main Content */}
      < main className="main-content" >
        {!data ? (
          <div className="landing-section">
            {/* Hero Section */}
            <div className="hero-section">
              <h1 className="hero-headline">Welcome to StudySpark</h1>
              <p className="hero-tagline">Your Revision Partner</p>
              <div className="trust-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" fill="#34A853" />
                </svg>
                No login required
              </div>
            </div>

            {/* Primary Upload Card */}
            <form id="form-file-upload" onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()}>
              <input type="file" id="input-file-upload" multiple={false} onChange={handleChange} accept="application/pdf" disabled={uploadStatus === 'uploading' || uploadStatus === 'success' || uploadStatus === 'analyzing'} />
              <label id="label-file-upload" htmlFor="input-file-upload" className={dragActive ? "drag-active" : ""}>
                <div className="upload-card-content">
                  {!file ? (
                    <React.Fragment>
                      <div className={`upload-icon-wrapper ${dragActive ? 'pulse' : ''}`}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04ZM14 13V17H10V13H7L12 8L17 13H14Z" fill="#125DD0" />
                        </svg>
                      </div>
                      <p className="upload-text">Drag & drop PDF here</p>
                      <p className="upload-helper-combined">Max file size: 10 MB - PDF only</p>
                      <p className="upload-reassurance">Works with handwritten notes, textbooks & slides</p>
                    </React.Fragment>
                  ) : (
                    <FileSelected fileName={file.name} uploadStatus={uploadStatus} />
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
                ) : uploadStatus === 'success' || uploadStatus === 'analyzing' ? (
                  <ProcessingIndicator status={uploadStatus === 'success' ? 'complete' : 'analyzing'} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {uploadStatus === 'error' && <p className="error-message shake">{errorMessage}</p>}
                    <button className={`upload-button ${uploadStatus !== 'idle' && uploadStatus !== 'error' ? 'spark-active' : ''}`} onClick={handleUploadClick}>
                      <span className="material-symbols-rounded btn-icon">bolt</span>
                      {uploadStatus === 'error' ? 'Retry Upload' :
                        (uploadStatus === 'uploading' || uploadStatus === 'success' || uploadStatus === 'analyzing' ? 'Sparking your study guide...' : 'Spark')}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="results-container">
            {/* Page Header */}
            <div className="results-header">
              <h2 className="results-title">Your Study Guide</h2>
              <p className="results-filename">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM13 9V3.5L18.5 9H13Z" />
                </svg>
                {file?.name || 'Your uploaded document'}
              </p>
            </div>


            <div className="results-section">
              <h3>
                <span>Summary</span>
                {data.hasDetailedSummary && (
                  <span className="summary-mode-badge">
                    {showDetailedView ? 'Detailed Guide' : 'Short Notes'}
                  </span>
                )}
              </h3>
              {data.summary ? (
                <>
                  {/* If we requested detailed mode but summary is still cheat-sheet, show loading */}
                  {data.requestDetailedSummary ? (
                    <div className="feature-generation-section">
                      <div className="analyzing-loader" style={{ margin: '0 auto 16px' }}></div>
                      <p className="loading-text">Generating detailed exam guide...</p>
                    </div>
                  ) : (
                    <>
                      {/* Show appropriate summary based on toggle state */}
                      {data.hasDetailedSummary ? (
                        <>
                          <SummaryCard summary={showDetailedView ? data.detailedSummary : data.cheatSheetSummary} />
                          <div className="detailed-guide-promo">
                            <button
                              className="generate-detailed-btn summary-toggle-btn"
                              onClick={() => setShowDetailedView(!showDetailedView)}
                            >
                              {showDetailedView ? '📝 View Short Notes' : '📚 View Detailed Guide'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <SummaryCard summary={data.summary} />
                          {summaryMode === 'cheat-sheet' && (
                            <div className="detailed-guide-promo">
                              <button className="generate-detailed-btn" onClick={handleGenerateDetailed}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
                                </svg>
                                Generate Detailed Exam Guide
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="feature-generation-section">
                  <div className="skeleton skeleton-text" style={{ width: '100%' }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '75%' }}></div>
                </div>
              )}
            </div>


            <div className="results-section">
              <h3>
                <span>Flashcards</span>
                {data.flashcards && (
                  <span className="flashcards-progress">{data.flashcards.length} cards</span>
                )}
              </h3>
              {data.flashcards ? (
                <div className="flashcards-container-wrapper">
                  <div className="flashcards-scroll">
                    {data.flashcards.map((card, i) => (
                      <Flashcard key={i} card={card} />
                    ))}
                  </div>
                  <div className="swipe-hint">Swipe to see more →</div>
                </div>
              ) : (
                <div className="feature-generation-section flashcards-pending">
                  {data.requestFlashcards ? (
                    <>
                      <div className="analyzing-loader" style={{ margin: '0 auto 16px' }}></div>
                      <p className="loading-text">Generating flashcards...</p>
                    </>
                  ) : data.flashcardsError ? (
                    <>
                      <p className="error-message" style={{ color: 'var(--md-error)', marginBottom: '12px' }}>
                        {data.flashcardsError}
                      </p>
                      <button
                        className="generate-feature-btn"
                        onClick={() => handleGenerateFeature('flashcards')}
                        disabled={generatingFlashcards}
                      >
                        🔄 Retry Flashcards
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Placeholder Preview Cards */}
                      <div className="flashcard-placeholders">
                        <div className="flashcard-placeholder">
                          <span className="placeholder-question">What is LVDT?</span>
                          <span className="placeholder-hint">Tap to reveal</span>
                        </div>
                        <div className="flashcard-placeholder">
                          <span className="placeholder-question">Define null position</span>
                          <span className="placeholder-hint">Tap to reveal</span>
                        </div>
                        <div className="flashcard-placeholder">
                          <span className="placeholder-question">Explain signal conditioning</span>
                          <span className="placeholder-hint">Tap to reveal</span>
                        </div>
                      </div>
                      <div className="flashcards-cta">
                        <p className="feature-description">Test your memory with auto-generated flashcards.</p>
                        <button
                          className="generate-feature-btn"
                          onClick={() => handleGenerateFeature('flashcards')}
                          disabled={generatingFlashcards}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                          </svg>
                          Generate Flashcards
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>


            {data.quiz ? (
              <Quiz questions={data.quiz} />
            ) : (
              <div className="results-section quiz-section-pending">
                <h3>Interactive Quiz</h3>
                <div className="feature-generation-section">
                  {data.requestQuiz ? (
                    <>
                      <div className="analyzing-loader" style={{ margin: '0 auto 16px' }}></div>
                      <p className="loading-text">Generating quiz...</p>
                    </>
                  ) : data.quizError ? (
                    <>
                      <p className="error-message" style={{ color: 'var(--md-error)', marginBottom: '12px' }}>
                        {data.quizError}
                      </p>
                      <button
                        className="generate-feature-btn generate-quiz-btn"
                        onClick={() => handleGenerateFeature('quiz')}
                        disabled={generatingQuiz}
                      >
                        🔄 Retry Quiz
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Quiz Value Preview */}
                      <div className="quiz-value-preview">
                        <div className="quiz-value-item">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                          </svg>
                          <span>5 MCQs</span>
                        </div>
                        <div className="quiz-value-item">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                          </svg>
                          <span>Instant score</span>
                        </div>
                        <div className="quiz-value-item">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          <span>Exam-focused</span>
                        </div>
                      </div>
                      <p className="feature-description">Challenge yourself with a quick quiz based on your notes.</p>
                      <button
                        className="generate-feature-btn generate-quiz-btn"
                        onClick={() => handleGenerateFeature('quiz')}
                        disabled={generatingQuiz}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z" />
                        </svg>
                        Start Quiz
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

        )
        }
      </main >

      {/* Footer with Divider */}
      < footer className="app-footer" >
        <div className="footer-divider"></div>
        <p>Made with <span className="material-icons heart">favorite</span> by <strong>Team Genesis</strong></p>
      </footer >
    </div >
  );
}

export default App;
