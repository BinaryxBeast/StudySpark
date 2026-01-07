import React from 'react';
import '../App.css';

const SummaryCard = ({ summary }) => {
    if (!summary) return null;

    // --- MODE 1: CHEAT SHEET (Array of strings) ---
    if (summary.cheat_sheet && Array.isArray(summary.cheat_sheet)) {
        const lines = summary.cheat_sheet;

        return (
            <div className="summary-card cheat-sheet-mode">
                <div className="summary-content">
                    <div className="summary-text-content scrollable">
                        <ul style={{ margin: 0, paddingLeft: '24px' }}>
                            {lines.map((line, index) => (
                                <li key={index} className="summary-list-item">{line}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // --- MODE 2: DETAILED REVISION (Object with sections) ---
    if (summary.definitions || summary.must_revise || summary.important_questions) {
        return (
            <div className="summary-card detailed-mode">
                <div className="detailed-content scrollable">
                    {/* 1. Definitions */}
                    {summary.definitions && summary.definitions.length > 0 && (
                        <div className="detailed-section">
                            <h4>📌 Important Definitions</h4>
                            {summary.definitions.map((item, i) => (
                                <div key={i} className="detailed-item">
                                    <span className="term">{item.term}</span>: <span className="def">{item.definition}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 2. Must Revise */}
                    {summary.must_revise && summary.must_revise.length > 0 && (
                        <div className="detailed-section">
                            <h4>🔥 Must Revise Concepts</h4>
                            {summary.must_revise.map((item, i) => (
                                <div key={i} className="detailed-item">
                                    <strong>{item.concept}</strong> — <span>{item.reason}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 3. Important Questions */}
                    {summary.important_questions && summary.important_questions.length > 0 && (
                        <div className="detailed-section">
                            <h4>❓ Most Important Questions</h4>
                            {summary.important_questions.map((item, i) => (
                                <div key={i} className="detailed-item question-item">
                                    <span className={`badge ${item.importance?.toLowerCase().replace(' ', '-')}`}>{item.importance}</span>
                                    <span className="question-text">{item.question}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 4. Exam Focus */}
                    {summary.exam_focus && summary.exam_focus.length > 0 && (
                        <div className="detailed-section">
                            <h4>🎯 Exam Focus Strategy</h4>
                            {summary.exam_focus.map((item, i) => (
                                <div key={i} className="detailed-item">
                                    <strong>{item.topic}</strong>: {item.strategy}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 5. Common Mistakes */}
                    {summary.common_mistakes && summary.common_mistakes.length > 0 && (
                        <div className="detailed-section">
                            <h4>⚠️ Common Mistakes</h4>
                            {summary.common_mistakes.map((item, i) => (
                                <div key={i} className="detailed-item mistake-item">
                                    <span className="mistake-point">❌ {item.point}</span>
                                    <span className="mistake-correction">✅ {item.correction}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- FALLBACK (Legacy plain text) ---
    const summaryText = typeof summary === 'string' ? summary : String(summary);
    const lines = summaryText.split('\n').filter(line => line.trim() !== '');

    return (
        <div className="summary-card">
            <div className="summary-content">
                <div className="summary-text-content scrollable">
                    {lines.map((line, index) => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
                            return <li key={index} className="summary-list-item">{trimmed.replace(/^[-•]|\d+\.\s*/, '')}</li>
                        }
                        return <p key={index} className="summary-paragraph">{line}</p>
                    })}
                </div>
            </div>
        </div>
    );
};

export default SummaryCard;
