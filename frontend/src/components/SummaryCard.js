import React from 'react';
import '../App.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const SummaryCard = ({ summary }) => {
    if (!summary) return null;

    // --- MODE 1: CHEAT SHEET (Array of strings) ---
    // --- MODE 1: CHEAT SHEET (Markdown String or Array) ---
    // If it's a string, we assume it's the new Markdown format
    if (typeof summary.cheat_sheet === 'string') {
        return (
            <div className="summary-card cheat-sheet-mode markdown-mode">
                <div className="summary-content">
                    <div className="summary-text-content scrollable">
                        <div className="markdown-body">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                            >
                                {summary.cheat_sheet}
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
                                rehypePlugins={[rehypeKatex]}
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
