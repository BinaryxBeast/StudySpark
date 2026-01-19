import React from 'react';
import '../App.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const SummaryCard = ({ summary }) => {
    if (!summary) return null;

    // --- MODE 1: CHEAT SHEET (Markdown String or Array) ---
    // If it's a string, we assume it's the new Markdown format
    if (summary.cheat_sheet !== undefined && summary.cheat_sheet !== null) {
        // Ensure we have a string for ReactMarkdown
        const cheatSheetContent = typeof summary.cheat_sheet === 'string'
            ? summary.cheat_sheet
            : JSON.stringify(summary.cheat_sheet, null, 2);

        return (
            <div className="summary-card cheat-sheet-mode markdown-mode">
                <div className="summary-content">
                    <div className="summary-text-content scrollable">
                        <div className="markdown-body">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                            >
                                {cheatSheetContent}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Fallback for legacy Array format
    if (summary.cheat_sheet && Array.isArray(summary.cheat_sheet)) {
        const lines = summary.cheat_sheet;

        return (
            <div className="summary-card cheat-sheet-mode">
                <div className="summary-content">
                    <div className="summary-text-content scrollable">
                        <ul className="summary-list">
                            {lines.map((line, index) => (
                                <li key={index} className="summary-list-item">
                                    {typeof line === 'string' ? line : JSON.stringify(line)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // --- MODE 3: EXAM GUIDE (New JSON structure) ---
    if (summary.exam_guide) {
        return (
            <div className="summary-card detailed-mode markdown-mode">
                <div className="summary-content">
                    {/* Analysis Header */}
                    {summary.analysis && (
                        <div className="analysis-header" style={{
                            marginBottom: '16px',
                            padding: '12px',
                            background: 'var(--md-surface-variant)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            display: 'flex',
                            gap: '16px',
                            flexWrap: 'wrap',
                            color: 'var(--md-on-surface-variant)'
                        }}>
                            <span><strong>Subject:</strong> {summary.analysis.detected_subject}</span>
                            <span><strong>Level:</strong> {summary.analysis.academic_level}</span>
                            <span><strong>Type:</strong> {summary.analysis.exam_type}</span>
                            {summary.analysis.reasoning_summary && (
                                <div style={{ width: '100%', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.1)', fontStyle: 'italic' }}>
                                    "{summary.analysis.reasoning_summary}"
                                </div>
                            )}
                        </div>
                    )}
                    <div className="summary-text-content scrollable">
                        <div className="markdown-body">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                            >
                                {summary.exam_guide}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- MODE 4: QUESTION SOLVER (Unanswered Questions) ---
    if (summary.unansweredQuestions) {
        if (summary.unansweredQuestions.length === 0) {
            return (
                <div className="summary-card detailed-mode">
                    <div className="summary-content" style={{ textAlign: 'center', padding: '48px 24px', opacity: 0.8 }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--md-primary)', marginBottom: '16px' }}>
                            check_circle
                        </span>
                        <h3>No Unanswered Questions Found</h3>
                        <p>It looks like this document already has solutions for all its questions, or consists mainly of examples and theory.</p>
                    </div>
                </div>
            );
        }

        // Check if new string format (Markdown)
        if (typeof summary.unansweredQuestions === 'string') {
            // robustness: check if it's actually a JSON string (from previous bug)
            let isJsonArray = false;
            let parsedArray = null;
            if (summary.unansweredQuestions.trim().startsWith('[')) {
                try {
                    parsedArray = JSON.parse(summary.unansweredQuestions);
                    if (Array.isArray(parsedArray)) {
                        isJsonArray = true;
                    }
                } catch (e) {
                    // Not JSON, continue as markdown
                }
            }

            if (!isJsonArray) {
                return (
                    <div className="summary-card detailed-mode markdown-mode">
                        <div className="summary-content">
                            <div className="summary-text-content scrollable">
                                <div className="markdown-body">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                                    >
                                        {summary.unansweredQuestions}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            } else {
                // If it WAS a JSON string, update our local ref so the array logic below can handle it
                summary.unansweredQuestions = parsedArray;
            }
        }

        // Fallback for Legacy Array Format
        let solverMarkdown = "";
        if (Array.isArray(summary.unansweredQuestions)) {
            summary.unansweredQuestions.forEach((item, index) => {
                solverMarkdown += `### Q${index + 1}. ${item.question}\n\n`;
                solverMarkdown += `**Solution:**\n\n`;
                solverMarkdown += `${item.solution}\n\n`;
                if (index < summary.unansweredQuestions.length - 1) {
                    solverMarkdown += `---\n\n`;
                }
            });

            return (
                <div className="summary-card detailed-mode markdown-mode">
                    <div className="summary-content">
                        <div className="summary-text-content scrollable">
                            <div className="markdown-body">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                                >
                                    {solverMarkdown}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // --- MODE 2: DETAILED REVISION (Object with sections) ---
    if (summary.definitions || summary.must_revise || summary.important_questions) {

        let detailedMarkdown = "";

        // 1. Definitions
        if (summary.definitions && summary.definitions.length > 0) {
            detailedMarkdown += "## 📌 Important Definitions\n\n";
            summary.definitions.forEach(item => {
                detailedMarkdown += `- **${item.term}**: ${item.definition}\n`;
            });
            detailedMarkdown += "\n";
        }

        // 2. Must Revise
        if (summary.must_revise && summary.must_revise.length > 0) {
            detailedMarkdown += "## 🔥 Must Revise Concepts\n\n";
            summary.must_revise.forEach(item => {
                detailedMarkdown += `- **${item.concept}** — ${item.reason}\n`;
            });
            detailedMarkdown += "\n";
        }

        // 3. Important Questions
        if (summary.important_questions && summary.important_questions.length > 0) {
            detailedMarkdown += "## ❓ Most Important Questions\n\n";
            summary.important_questions.forEach(item => {
                const importanceBadge = item.importance ? `**[${item.importance}]** ` : "";
                detailedMarkdown += `- ${importanceBadge}${item.question}\n`;
            });
            detailedMarkdown += "\n";
        }

        // 4. Exam Focus
        if (summary.exam_focus && summary.exam_focus.length > 0) {
            detailedMarkdown += "## 🎯 Exam Focus Strategy\n\n";
            summary.exam_focus.forEach(item => {
                detailedMarkdown += `- **${item.topic}**: ${item.strategy}\n`;
            });
            detailedMarkdown += "\n";
        }

        // 5. Common Mistakes
        if (summary.common_mistakes && summary.common_mistakes.length > 0) {
            detailedMarkdown += "## ⚠️ Common Mistakes\n\n";
            summary.common_mistakes.forEach(item => {
                detailedMarkdown += `- ❌ ${item.point}\n  ✅ **Correction**: ${item.correction}\n`;
            });
            detailedMarkdown += "\n";
        }

        return (
            <div className="summary-card detailed-mode markdown-mode">
                <div className="summary-content">
                    <div className="summary-text-content scrollable">
                        <div className="markdown-body">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                            >
                                {detailedMarkdown}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- FALLBACK (Legacy plain text) ---
    const summaryText = typeof summary === 'string' ? summary : JSON.stringify(summary);
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
