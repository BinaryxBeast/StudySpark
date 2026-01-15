import React, { useState, useMemo } from 'react';
import '../App.css';

const Quiz = ({ questions, longQuestions, probableQuestions, onGenerateFeature, generatingState, requestsState, errorsState, externalAnswersState, onAnswersChange }) => {
    // Use external state if available, otherwise local state
    const [localAnswersState, setLocalAnswersState] = useState({});

    const answersState = externalAnswersState || localAnswersState;
    const setAnswersState = onAnswersChange || setLocalAnswersState;

    const [score, setScore] = useState(null);
    const [activeTab, setActiveTab] = useState('mcq');

    // Calculate running score
    const runningScore = useMemo(() => {
        let correct = 0;
        let answered = 0;
        if (answersState) {
            Object.values(answersState).forEach(state => {
                answered++;
                if (state.isCorrect) correct++;
            });
        }
        return { correct, answered };
    }, [answersState]);

    const handleOptionSelect = (qIndex, option) => {
        if (answersState[qIndex]) return; // Already answered

        const correctAnswer = questions[qIndex].answer;
        const isCorrect = option === correctAnswer;

        setAnswersState(prev => ({
            ...prev,
            [qIndex]: {
                selectedOption: option,
                isCorrect: isCorrect
            }
        }));
    };

    const calculateFinalScore = () => {
        let currentScore = 0;
        questions.forEach((q, index) => {
            if (answersState[index]?.isCorrect) currentScore++;
        });
        setScore(currentScore);
    };

    const allAnswered = Object.keys(answersState).length === questions.length;

    const renderMCQContent = () => (
        <>
            <div className="quiz-questions-list">
                {questions.map((q, index) => {
                    const state = answersState[index];
                    const hasAnswered = !!state;

                    return (
                        <div key={index} className="question-card">
                            <p className="question-text">
                                <strong>{index + 1}.</strong> {q.question}
                            </p>

                            <div className="options-list">
                                {q.options.map((opt, optIndex) => {
                                    let optionClass = "quiz-option";
                                    if (hasAnswered) {
                                        if (opt === q.answer) {
                                            optionClass += " correct";
                                        } else if (state.selectedOption === opt && !state.isCorrect) {
                                            optionClass += " wrong";
                                        } else {
                                            optionClass += " disabled";
                                        }
                                    }

                                    return (
                                        <div
                                            key={optIndex}
                                            className={optionClass}
                                            onClick={() => handleOptionSelect(index, opt)}
                                            role="button"
                                            tabIndex={hasAnswered ? -1 : 0}
                                            onKeyDown={(e) => e.key === 'Enter' && !hasAnswered && handleOptionSelect(index, opt)}
                                            aria-disabled={hasAnswered}
                                        >
                                            <span className="option-marker">
                                                {String.fromCharCode(65 + optIndex)}
                                            </span>
                                            <span className="option-text">{opt}</span>
                                            {hasAnswered && opt === q.answer && (
                                                <span className="feedback-icon">✓</span>
                                            )}
                                            {hasAnswered && state.selectedOption === opt && !state.isCorrect && (
                                                <span className="feedback-icon">✕</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Feedback / Explanation */}
                            {hasAnswered && (
                                <div className={`feedback-message ${state.isCorrect ? 'positive' : 'negative'}`}>
                                    {state.isCorrect
                                        ? "Correct! Well done."
                                        : `Incorrect. The correct answer is: ${q.answer}`
                                    }
                                    {q.explanation && (
                                        <p style={{ marginTop: '8px', fontWeight: 400, opacity: 0.9 }}>
                                            {q.explanation}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="quiz-footer">
                {score === null ? (
                    <button
                        className="submit-quiz-btn"
                        onClick={calculateFinalScore}
                        disabled={!allAnswered}
                    >
                        Finish Quiz
                    </button>
                ) : (
                    <div className="score-display">
                        <h3>
                            Your Score: {score} / {questions.length}
                            <span style={{
                                marginLeft: '12px',
                                fontSize: '16px',
                                color: score >= questions.length * 0.7 ? 'var(--md-success)' : 'var(--md-on-surface-variant)'
                            }}>
                                {score >= questions.length * 0.7 ? '🎉 Great job!' : '📚 Keep practicing!'}
                            </span>
                        </h3>
                        <button
                            className="retry-quiz-btn"
                            onClick={() => { setAnswersState({}); setScore(null); }}
                        >
                            Retry Quiz
                        </button>
                    </div>
                )}
            </div>
        </>
    );

    const renderLongAnswerContent = () => {
        // 1. Loading State
        if (generatingState?.long || requestsState?.long) {
            return (
                <div className="feature-generation-section">
                    <div className="analyzing-loader" style={{ margin: '0 auto 16px' }}></div>
                    <p className="loading-text">Generating long answer questions...</p>
                </div>
            );
        }

        // 2. Error State
        if (errorsState?.long) {
            return (
                <div className="feature-generation-section">
                    <p className="error-message" style={{ color: 'var(--md-error)', marginBottom: '12px' }}>
                        {errorsState.long}
                    </p>
                    <button
                        className="generate-feature-btn"
                        onClick={() => onGenerateFeature('long')}
                    >
                        🔄 Retry Long Answers
                    </button>
                </div>
            );
        }

        // 3. Not Generated State (Show CTA)
        if (!longQuestions) {
            return (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--md-on-surface-variant)', background: 'var(--md-surface)', borderRadius: '12px', border: '1px dashed var(--md-outline-variant)' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--md-primary)', opacity: 0.5, marginBottom: '16px', display: 'block', margin: '0 auto' }}>
                        description
                    </span>
                    <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 500 }}>
                        Long Answer Questions
                    </h3>
                    <p style={{ fontSize: '14px', opacity: 0.8, maxWidth: '300px', margin: '0 auto 24px' }}>
                        Generate detailed, exam-style 5-mark questions to practice descriptive answers.
                    </p>
                    <button
                        className="generate-feature-btn"
                        onClick={() => onGenerateFeature('long')}
                        style={{ margin: '0 auto' }}
                    >
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>auto_awesome</span>
                        Generate Questions
                    </button>
                </div>
            );
        }

        // 4. Success State (Render Questions)
        return (
            <div className="quiz-questions-list">
                {longQuestions.map((q, index) => (
                    <div key={index} className="question-card long-answer-card">
                        <div className="long-question-header">
                            <span className="question-number">Q{index + 1}</span>
                            <span className="question-marks">({q.marks} Marks)</span>
                        </div>
                        <p className="question-text" style={{ marginBottom: '16px', fontWeight: 600 }}>
                            {q.question}
                        </p>

                        <details className="answer-key-details">
                            <summary>View Answer Key</summary>
                            <div className="answer-key-content">
                                {q.answerKey ? (
                                    <div style={{ whiteSpace: 'pre-line' }}>{q.answerKey}</div>
                                ) : (
                                    <p>No answer key available.</p>
                                )}
                            </div>
                        </details>
                    </div>
                ))}
            </div>
        );
    };

    const renderProbableContent = () => {
        // 1. Loading State
        if (generatingState?.probable || requestsState?.probable) {
            return (
                <div className="feature-generation-section">
                    <div className="analyzing-loader" style={{ margin: '0 auto 16px' }}></div>
                    <p className="loading-text">Analyzing syllabus and generating probable questions...</p>
                </div>
            );
        }

        // 2. Error State
        if (errorsState?.probable) {
            return (
                <div className="feature-generation-section">
                    <p className="error-message" style={{ color: 'var(--md-error)', marginBottom: '12px' }}>
                        {errorsState.probable}
                    </p>
                    <button
                        className="generate-feature-btn"
                        onClick={() => onGenerateFeature('probable')}
                    >
                        🔄 Retry Analysis
                    </button>
                </div>
            );
        }

        // 3. Not Generated State (Show CTA)
        if (!probableQuestions) {
            return (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--md-on-surface-variant)', background: 'var(--md-surface)', borderRadius: '12px', border: '1px dashed var(--md-outline-variant)' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--md-primary)', opacity: 0.5, marginBottom: '16px', display: 'block', margin: '0 auto' }}>
                        star
                    </span>
                    <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 500 }}>
                        Most Probable Questions
                    </h3>
                    <p style={{ fontSize: '14px', opacity: 0.8, maxWidth: '300px', margin: '0 auto 24px' }}>
                        Get AI-curated high probability questions based on syllabus, PYQs, and key concepts.
                    </p>
                    <button
                        className="generate-feature-btn"
                        onClick={() => onGenerateFeature('probable')}
                        style={{ margin: '0 auto' }}
                    >
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>auto_awesome</span>
                        Identify Questions
                    </button>
                </div>
            );
        }

        // 4. Success State (Render Questions)
        return (
            <div className="quiz-questions-list">
                {probableQuestions.map((q, index) => (
                    <div key={index} className="question-card probable-question-card">
                        <div className="long-question-header" style={{ marginBottom: '8px' }}>
                            <span className="question-number">#{index + 1}</span>
                            <span className={`question-badge ${q.probability === 'High' ? 'badge-high' : 'badge-medium'}`}>
                                {q.probability === 'High' ? '🔥 High Probability' : '✨ Expected'}
                            </span>
                        </div>
                        <p className="question-text" style={{ marginBottom: '12px', fontWeight: 600 }}>
                            {q.question}
                        </p>
                        <div style={{ fontSize: '13px', color: 'var(--md-on-surface-variant)', background: 'var(--md-surface-container-low)', padding: '8px 12px', borderRadius: '8px', display: 'flex', gap: '8px' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '16px', marginTop: '1px' }}>lightbulb</span>
                            <span>{q.reason}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderPlaceholder = (type) => (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--md-on-surface-variant)', background: 'var(--md-surface)', borderRadius: '12px', border: '1px dashed var(--md-outline-variant)' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--md-primary)', opacity: 0.5, marginBottom: '16px', display: 'block', margin: '0 auto' }}>
                {type === 'long' ? 'description' : type === 'mcq' ? 'checklist' : 'psychology'}
            </span>
            <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 500 }}>
                {type === 'long' ? 'Long Answer Questions' : type === 'mcq' ? 'Interactive Quiz' : 'Most Probable Questions'}
            </h3>
            <p style={{ fontSize: '14px', opacity: 0.8, maxWidth: '300px', margin: '0 auto 24px' }}>
                {type === 'long'
                    ? 'Generate detailed, exam-style 5-mark questions.'
                    : type === 'mcq'
                        ? 'Test your knowledge with auto-generated multiple choice questions.'
                        : 'Curated high-probability exam questions (Coming Soon).'}
            </p>
            {type === 'mcq' && (
                <button
                    className="generate-feature-btn"
                    onClick={() => onGenerateFeature('quiz')}
                    style={{ margin: '0 auto' }}
                    disabled={generatingState?.quiz}
                >
                    {generatingState?.quiz ? 'Generating...' : 'Generate Quiz'}
                </button>
            )}
        </div>
    );

    return (
        <div className="quiz-section-container">
            <div className="quiz-header">
                <div>
                    <h3>Spark Questions</h3>
                    <p className="quiz-subtitle">Test your knowledge</p>
                </div>
                {score === null && runningScore.answered > 0 && activeTab === 'mcq' && (
                    <span className="quiz-score-indicator">
                        {runningScore.correct} / {runningScore.answered} correct
                    </span>
                )}
            </div>

            {/* Navigation Pills */}
            <div className="spark-nav-pills" style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {[
                    { id: 'mcq', label: 'MCQs' },
                    { id: 'long', label: 'Long Answers' },
                    { id: 'probable', label: 'Most Probable Questions' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: activeTab === tab.id ? '1px solid transparent' : '1px solid var(--md-outline-variant)',
                            background: activeTab === tab.id ? 'var(--md-primary-container)' : 'transparent',
                            color: activeTab === tab.id ? 'var(--md-on-primary-container)' : 'var(--md-on-surface-variant)',
                            fontFamily: 'var(--md-font-display)',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            outline: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {tab.id === 'mcq' && <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>checklist</span>}
                        {tab.id === 'long' && <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>description</span>}
                        {tab.id === 'probable' && <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>star</span>}
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'mcq' && (questions ? renderMCQContent() : renderPlaceholder('mcq'))}
            {activeTab === 'long' && renderLongAnswerContent()}
            {activeTab === 'probable' && renderProbableContent()}
        </div>
    );
};

export default Quiz;
