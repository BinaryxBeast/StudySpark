import React, { useState, useMemo } from 'react';
import '../App.css';

const Quiz = ({ questions }) => {
    const [answersState, setAnswersState] = useState({});
    const [score, setScore] = useState(null);

    // Calculate running score
    const runningScore = useMemo(() => {
        let correct = 0;
        let answered = 0;
        Object.values(answersState).forEach(state => {
            answered++;
            if (state.isCorrect) correct++;
        });
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

    return (
        <div className="quiz-section-container">
            <div className="quiz-header">
                <div>
                    <h3>Interactive Quiz</h3>
                    <p className="quiz-subtitle">Test your knowledge</p>
                </div>
                {score === null && runningScore.answered > 0 && (
                    <span className="quiz-score-indicator">
                        {runningScore.correct} / {runningScore.answered} correct
                    </span>
                )}
            </div>

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
        </div>
    );
};

export default Quiz;
