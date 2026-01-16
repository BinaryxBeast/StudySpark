import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import '../markdown.css';
import '../App.css';

const PrintableStudyGuide = React.forwardRef(({ data, fileName, quizAnswers = {} }, ref) => {
  if (!data) return null;

  // --- Theme Constants ---
  const THEME = {
    primary: '#125DD0', // StudySpark Blue
    success: '#22c55e',
    error: '#ef4444',
    text: '#1a1a1a',
    muted: '#6b7280',
    border: '#e5e7eb',
    bg: '#ffffff'
  };

  const FONTS = {
    title: "26px",
    section: "18px",
    subHeader: "14px",
    body: "11px",
    mono: "10px"
  };

  // Helper function to extract markdown string from summary object
  // Now EXCLUDES 'common_mistakes' so we can render it manually
  const extractSummaryString = (summary) => {
    if (!summary) return '';
    if (typeof summary === 'string') return summary;

    if (summary.cheat_sheet) {
      if (typeof summary.cheat_sheet === 'string') {
        return summary.cheat_sheet;
      }
      return JSON.stringify(summary.cheat_sheet, null, 2);
    }

    // If it's a detailed summary object, build markdown
    if (summary.definitions || summary.must_revise || summary.important_questions) {
      let markdown = "";

      if (summary.definitions && summary.definitions.length > 0) {
        markdown += "## 📌 Important Definitions\n\n";
        summary.definitions.forEach(item => {
          markdown += `- **${item.term}**: ${item.definition}\n`;
        });
        markdown += "\n";
      }

      if (summary.must_revise && summary.must_revise.length > 0) {
        markdown += "## 🔥 Must Revise Concepts\n\n";
        summary.must_revise.forEach(item => {
          markdown += `- **${item.concept}** — ${item.reason}\n`;
        });
        markdown += "\n";
      }

      if (summary.important_questions && summary.important_questions.length > 0) {
        markdown += "## ❓ Most Important Questions\n\n";
        summary.important_questions.forEach(item => {
          const importanceBadge = item.importance ? `**[${item.importance}]** ` : "";
          markdown += `- ${importanceBadge}${item.question}\n`;
        });
        markdown += "\n";
      }

      if (summary.exam_focus && summary.exam_focus.length > 0) {
        markdown += "## 🎯 Exam Focus Strategy\n\n";
        summary.exam_focus.forEach(item => {
          markdown += `- **${item.topic}**: ${item.strategy}\n`;
        });
        markdown += "\n";
      }

      // REMOVED common_mistakes from here to render manually

      return markdown;
    }

    return JSON.stringify(summary, null, 2);
  };

  // Get content
  const cheatSheetContent = extractSummaryString(data.cheatSheetSummary || data.summary);
  const detailedSummaryContent = extractSummaryString(data.detailedSummary);

  // Extract Common Mistakes separately if they exist in detailedSummary
  const commonMistakes = data.detailedSummary?.common_mistakes;

  // --- Styles ---

  // Clean, no-card layout
  const sectionContainerStyle = {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: `1px solid ${THEME.border}`,
  };

  const sectionTitleStyle = {
    fontSize: FONTS.section,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: '16px',
    borderBottom: `2px solid ${THEME.primary}`,
    display: 'inline-block',
    paddingBottom: '4px',
    fontFamily: "'Google Sans', Inter, sans-serif"
  };

  const subHeaderStyle = {
    fontSize: FONTS.subHeader,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: '8px',
    fontFamily: "'Google Sans', Inter, sans-serif"
  };

  const bodyStyle = {
    fontSize: FONTS.body,
    color: THEME.text,
    lineHeight: '1.5',
  };

  const calculateScore = () => {
    if (!quizAnswers || Object.keys(quizAnswers).length === 0) return null;
    let correct = 0;
    let attempts = 0;
    Object.values(quizAnswers).forEach(ans => {
      attempts++;
      if (ans.isCorrect) correct++;
    });
    return { correct, attempts };
  };
  const score = calculateScore();

  return (
    <div ref={ref} className="printable-container" style={{
      padding: '40px 50px', // Standard document padding
      fontFamily: "'Google Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      backgroundColor: '#ffffff',
      color: THEME.text,
      lineHeight: '1.5',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', paddingBottom: '20px', borderBottom: `2px solid ${THEME.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <img
            src={process.env.PUBLIC_URL + '/favicon.png'}
            alt="StudySpark Logo"
            style={{ width: '32px', height: '32px' }}
          />
          <h1 style={{
            margin: '0',
            fontSize: FONTS.title,
            fontWeight: '700',
            color: THEME.text,
            lineHeight: '1.2'
          }}>
            <span style={{ color: THEME.primary }}>StudySpark:</span> Study Guide
          </h1>
        </div>

        {/* Filename Subtitle */}
        <div style={{ fontSize: FONTS.section, color: THEME.muted, fontWeight: '500' }}>
          {fileName}
        </div>
      </div>

      {/* Summary Section - Cheat Sheet */}
      {cheatSheetContent && (
        <div style={sectionContainerStyle}>
          <h2 style={sectionTitleStyle}>Cheat Sheet</h2>
          <div className="markdown-body" style={{ ...bodyStyle }}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {cheatSheetContent}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Summary Section - Detailed Summary */}
      {detailedSummaryContent && (
        <div style={sectionContainerStyle}>
          <h2 style={sectionTitleStyle}>Detailed Summary</h2>
          <div className="markdown-body" style={{ ...bodyStyle }}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {detailedSummaryContent}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Common Mistakes - Custom Rendering */}
      {commonMistakes && commonMistakes.length > 0 && (
        <div style={sectionContainerStyle}>
          <h2 style={sectionTitleStyle}>⚠️ Common Mistakes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {commonMistakes.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                borderLeft: `3px solid ${THEME.error}`,
                paddingLeft: '16px',
                backgroundColor: '#fff', // clean, no extra bg
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{ color: THEME.error, marginRight: '8px', fontSize: '14px', fontWeight: 'bold' }}>✕</span>
                    <span style={{ fontSize: '12px', color: THEME.text, fontStyle: 'italic' }}>"{item.point}"</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ color: THEME.success, marginRight: '8px', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: THEME.text }}>Correction: <span style={{ fontWeight: '400' }}>{item.correction}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spark Questions - MCQs */}
      {data.quiz && data.quiz.length > 0 && (
        <div style={sectionContainerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Quiz Questions</h2>
            {score && (
              <span style={{ fontSize: FONTS.mono, fontWeight: '600', color: THEME.muted, border: `1px solid ${THEME.border}`, padding: '4px 8px', borderRadius: '4px' }}>
                Score: {score.correct}/{score.attempts}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {data.quiz.map((q, index) => {
              const userAnswer = quizAnswers[index];
              const correctAnswer = q.answer || q.correctAnswer;

              // Only formatting text, no boxes
              return (
                <div key={index} style={{ pageBreakInside: 'avoid' }}>
                  <p style={{ ...subHeaderStyle, marginBottom: '8px' }}>
                    {index + 1}. {q.question}
                  </p>

                  {/* Options List */}
                  <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                    {(Array.isArray(q.options) ? q.options : Object.values(q.options || {})).map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isCorrect = opt === correctAnswer || (q.correctAnswer && String.fromCharCode(97 + optIdx) === q.correctAnswer);
                      const isSelected = userAnswer?.selectedOption === opt;

                      let color = THEME.text;
                      let weight = '400';
                      let prefix = `${letter}. `;

                      // Minimalist coloring only
                      if (isCorrect) {
                        color = THEME.success;
                        weight = '600';
                      } else if (isSelected && !userAnswer.isCorrect) {
                        color = THEME.error;
                      }

                      return (
                        <div key={optIdx} style={{ fontSize: FONTS.body, color: color, fontWeight: weight }}>
                          {prefix}{opt}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation - Subtle */}
                  {(q.explanation || userAnswer) && (
                    <div style={{ paddingLeft: '16px', borderLeft: `2px solid ${THEME.border}`, marginLeft: '4px' }}>
                      <p style={{ fontSize: FONTS.mono, color: THEME.muted, margin: 0 }}>
                        {userAnswer && !userAnswer.isCorrect && <span style={{ color: THEME.error, fontWeight: 'bold', marginRight: '6px' }}>Incorrect.</span>}
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spark Questions - Long Answers */}
      {data.longQuestions && data.longQuestions.length > 0 && (
        <div style={sectionContainerStyle}>
          <h2 style={sectionTitleStyle}>Long Answer Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {data.longQuestions.map((q, index) => {
              const question = typeof q === 'string' ? q : q.question;
              const marks = q.marks || '5';
              const answerKey = q.answerKey || q.answer_key || q.answer || '';

              return (
                <div key={index} style={{ pageBreakInside: 'avoid' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                    <span style={subHeaderStyle}>Q{index + 1}. {question}</span>
                    <span style={{ fontSize: FONTS.mono, color: THEME.muted }}>({marks} marks)</span>
                  </div>

                  {/* Answer Key - Text only, no box */}
                  {answerKey && (
                    <div style={{ paddingLeft: '0', marginTop: '8px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color: THEME.muted, display: 'block', marginBottom: '4px' }}>Key Points</span>
                      {typeof answerKey === 'string' ? (
                        <p style={{ fontSize: FONTS.body, color: THEME.text, whiteSpace: 'pre-line', margin: 0 }}>{answerKey}</p>
                      ) : Array.isArray(answerKey) ? (
                        <ul style={{ margin: '0 0 0 16px', padding: 0, fontSize: FONTS.body, color: THEME.text }}>
                          {answerKey.map((pt, i) => <li key={i}>{pt}</li>)}
                        </ul>
                      ) : (
                        <p style={{ fontSize: FONTS.body, color: THEME.text }}>{JSON.stringify(answerKey)}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spark Questions - Most Probable Questions */}
      {data.probableQuestions && data.probableQuestions.length > 0 && (
        <div style={sectionContainerStyle}>
          <h2 style={sectionTitleStyle}>Most Probable Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.probableQuestions.map((q, index) => {
              const question = typeof q === 'string' ? q : q.question;
              const probability = q.probability || 'High';
              const reason = q.reason || q.category || q.reasoning || '';

              return (
                <div key={index} style={{ pageBreakInside: 'avoid', borderLeft: `3px solid ${THEME.primary}`, paddingLeft: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: FONTS.mono, fontWeight: '700', color: THEME.primary }}>{probability.toUpperCase()} PROBABILITY</span>
                  </div>
                  <p style={{ ...subHeaderStyle, marginBottom: '4px' }}>{question}</p>
                  {reason && (
                    <p style={{ fontSize: FONTS.body, color: THEME.muted, margin: 0, fontStyle: 'italic' }}>
                      Why? {reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Timestamp */}
      <div style={{
        marginTop: '40px',
        paddingTop: '12px',
        borderTop: `1px solid ${THEME.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: FONTS.mono,
        color: THEME.muted
      }}>
        <span>Generated by StudySpark</span>
        <span>{new Date().toLocaleString()}</span>
      </div>

    </div>
  );
});

export default PrintableStudyGuide;
