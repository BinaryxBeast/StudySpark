import React, { useState } from 'react';
import '../App.css';

const Quiz = ({ questions }) => {
    // State to track answers for each question: { qIndex: { selectedOption: string, isCorrect: boolean } }
    const [answersState, setAnswersState] = useState({});
    const [score, setScore] = useState(null);

    const handleOptionSelect = (qIndex, option, correctParam) => {
        // Determine the correct answer if not provided directly in 'option' (API structure varies)
        // Assuming 'questions' has 'answer' field which is the correct string
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
    }

    return (
        <div className="quiz-section-container">
            <div className="quiz-header">
                <h3>Interactive Quiz</h3>
                <p className="quiz-subtitle">Test your knowledge</p>
            </div>

            <div className="quiz-questions-list">
                {questions.map((q, index) => {
                    const state = answersState[index];
                    const hasAnswered = !!state;

                    return (
                        <div key={index} className="question-card">
                            <p className="question-text"><strong>{index + 1}. {q.question}</strong></p>

                            <div className="options-list">
                                {q.options.map((opt, optIndex) => {
                                    let optionClass = "quiz-option";
                                    if (hasAnswered) {
                                        if (opt === q.answer) {
                                            optionClass += " correct"; // Always show correct answer
                                        } else if (state.selectedOption === opt && !state.isCorrect) {
                                            optionClass += " wrong"; // Selected wrong answer
                                        } else {
                                            optionClass += " disabled";
                                        }
                                    }

                                    return (
                                        <div
                                            key={optIndex}
                                            className={optionClass}
                                            onClick={() => !hasAnswered && handleOptionSelect(index, opt)}
                                        >
                                            <span className="option-marker">{String.fromCharCode(65 + optIndex)}</span>
                                            <span className="option-text">{opt}</span>
                                            {hasAnswered && opt === q.answer && <span className="feedback-icon">✔</span>}
                                            {hasAnswered && state.selectedOption === opt && !state.isCorrect && <span className="feedback-icon">✖</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Feedback Area */}
                            {hasAnswered && (
                                <div className={`feedback-message ${state.isCorrect ? 'positive' : 'negative'}`}>
                                    {state.isCorrect ? "Correct!" : `Incorrect. The correct answer is ${q.answer}.`}
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
                        disabled={Object.keys(answersState).length !== questions.length}
                    >
                        Finish Quiz
                    </button>
                ) : (
                    <div className="score-display">
                        <h3>Your Score: {score} / {questions.length}</h3>
                        <button className="retry-quiz-btn" onClick={() => { setAnswersState({}); setScore(null); }}>Retry Quiz</button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Quiz;
