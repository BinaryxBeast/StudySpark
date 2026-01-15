import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import '../markdown.css';
import '../App.css';

const PrintableStudyGuide = React.forwardRef(({ data, fileName, quizAnswers = {} }, ref) => {
  if (!data) return null;

  // Helper function to extract markdown string from summary object
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

      if (summary.common_mistakes && summary.common_mistakes.length > 0) {
        markdown += "## ⚠️ Common Mistakes\n\n";
        summary.common_mistakes.forEach(item => {
          markdown += `- ❌ ${item.point}\n  ✅ **Correction**: ${item.correction}\n`;
        });
        markdown += "\n";
      }

      return markdown;
    }

    return JSON.stringify(summary, null, 2);
  };

  // Get content
  const cheatSheetContent = extractSummaryString(data.cheatSheetSummary || data.summary);
  const detailedSummaryContent = extractSummaryString(data.detailedSummary);

  // Common styles
  const cardStyle = {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  };

  const pillStyle = {
    display: 'inline-block',
    padding: '8px 20px',
    backgroundColor: '#e8f0fe',
    color: '#125DD0',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: "'Google Sans', Inter, sans-serif"
  };

  const sectionTitleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '0 0 12px 0',
    fontFamily: "'Google Sans', Inter, sans-serif"
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
      padding: '24px 40px',
      fontFamily: "'Google Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      backgroundColor: '#ffffff',
      color: '#1a1a1a',
      lineHeight: '1.5',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      {/* Header with Logo - Compact */}
      <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
          <img
            src={process.env.PUBLIC_URL + '/favicon.png'}
            alt="StudySpark"
            style={{ width: '20px', height: '20px' }}
          />
          <span style={{
            fontSize: '18px',
            fontWeight: '600',
            fontFamily: "'Google Sans', Inter, sans-serif"
          }}>
            <span style={{ color: '#1a1a1a' }}>Study</span>
            <span style={{ color: '#125DD0' }}>Spark</span>
          </span>
        </div>
        <h1 style={{
          margin: '0 0 2px 0',
          fontSize: '18px',
          fontWeight: '500',
          color: '#1a1a1a',
          fontFamily: "'Google Sans', Inter, sans-serif"
        }}>
          Your Study Guide
        </h1>
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>{fileName}</p>
      </div>

      {/* Summary Section - Cheat Sheet - Inside Card */}
      {cheatSheetContent && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <span style={pillStyle}>Cheat Sheet</span>
          </div>
          <div style={cardStyle}>
            <div className="markdown-body" style={{ fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {cheatSheetContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Summary Section - Detailed Summary - Inside Card */}
      {detailedSummaryContent && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <span style={pillStyle}>Detailed Summary</span>
          </div>
          <div style={cardStyle}>
            <div className="markdown-body" style={{ fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {detailedSummaryContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Spark Questions - MCQs */}
      {data.quiz && data.quiz.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={sectionTitleStyle}>Spark Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span style={pillStyle}>MCQs</span>
              {score && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: score.correct >= score.attempts * 0.7 ? '#16a34a' : '#1a1a1a',
                  backgroundColor: score.correct >= score.attempts * 0.7 ? '#dcfce7' : '#f3f4f6',
                  padding: '4px 12px',
                  borderRadius: '12px'
                }}>
                  Score: {score.correct} / {score.attempts} Correct
                </span>
              )}
            </div>
          </div>

          {data.quiz.map((q, index) => {
            // Get user's answer state if available
            const userAnswer = quizAnswers[index];
            const hasUserInteracted = !!userAnswer;

            // Handle both array and object options
            const optionsArray = Array.isArray(q.options)
              ? q.options
              : Object.entries(q.options || {}).map(([k, v]) => v);

            // Correct answer - handle different data formats
            const correctAnswer = q.answer || q.correctAnswer;

            return (
              <div key={index} style={{
                ...cardStyle,
                pageBreakInside: 'avoid'
              }}>
                <p style={{
                  fontWeight: '600',
                  fontSize: '14px',
                  marginBottom: '12px',
                  color: '#1a1a1a',
                  fontFamily: "'Google Sans', Inter, sans-serif"
                }}>
                  {index + 1}. {q.question}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {optionsArray.map((opt, optIndex) => {
                    const letter = String.fromCharCode(65 + optIndex); // A, B, C, D
                    const isCorrect = opt === correctAnswer ||
                      (q.correctAnswer && String.fromCharCode(97 + optIndex) === q.correctAnswer);

                    // Determine if user selected this option
                    const isUserSelected = hasUserInteracted && userAnswer.selectedOption === opt;
                    const isUserCorrect = hasUserInteracted && userAnswer.isCorrect;

                    // Determine styling
                    let bgColor = '#ffffff';
                    let borderColor = '#e2e8f0';
                    let letterBg = '#e2e8f0';
                    let letterColor = '#64748b';

                    if (hasUserInteracted) {
                      if (isCorrect) {
                        bgColor = '#dcfce7';
                        borderColor = '#22c55e';
                        letterBg = '#22c55e';
                        letterColor = '#ffffff';
                      } else if (isUserSelected && !isUserCorrect) {
                        bgColor = '#fee2e2';
                        borderColor = '#ef4444';
                        letterBg = '#ef4444';
                        letterColor = '#ffffff';
                      }
                    } else {
                      // No interaction - just show correct answer in green
                      if (isCorrect) {
                        bgColor = '#dcfce7';
                        borderColor = '#22c55e';
                        letterBg = '#22c55e';
                        letterColor = '#ffffff';
                      }
                    }

                    return (
                      <div key={optIndex} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 14px',
                        backgroundColor: bgColor,
                        borderRadius: '8px',
                        border: `1px solid ${borderColor}`,
                      }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: letterBg,
                          color: letterColor,
                          fontWeight: '600',
                          fontSize: '11px',
                          marginRight: '10px',
                          flexShrink: 0,
                          fontFamily: "'Google Sans', Inter, sans-serif"
                        }}>
                          {letter}
                        </span>
                        <span style={{ fontSize: '13px', color: '#1a1a1a' }}>{opt}</span>
                        {isCorrect && <span style={{ marginLeft: 'auto', color: '#22c55e', fontWeight: 'bold', fontSize: '14px' }}>✓</span>}
                        {isUserSelected && !isUserCorrect && <span style={{ marginLeft: 'auto', color: '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>✕</span>}
                      </div>
                    );
                  })}
                </div>
                {/* Explanation */}
                {(q.explanation || hasUserInteracted) && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    backgroundColor: hasUserInteracted && !userAnswer?.isCorrect ? '#fee2e2' : '#dcfce7',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${hasUserInteracted && !userAnswer?.isCorrect ? '#ef4444' : '#22c55e'}`,
                  }}>
                    <p style={{
                      fontWeight: '600',
                      fontSize: '12px',
                      color: hasUserInteracted && !userAnswer?.isCorrect ? '#dc2626' : '#16a34a',
                      marginBottom: '2px'
                    }}>
                      {hasUserInteracted && !userAnswer?.isCorrect
                        ? `Incorrect. The correct answer is: ${correctAnswer}`
                        : 'Correct! Well done.'
                      }
                    </p>
                    {q.explanation && (
                      <p style={{ fontSize: '12px', color: '#1a1a1a', margin: 0 }}>{q.explanation}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Spark Questions - Long Answers */}
      {data.longQuestions && data.longQuestions.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={sectionTitleStyle}>Long Answers</h2>
            <span style={pillStyle}>Long Answers</span>
          </div>

          {data.longQuestions.map((q, index) => {
            const question = typeof q === 'string' ? q : q.question;
            const marks = q.marks || '5';
            // Try multiple possible field names for answer key
            const answerKey = q.answerKey || q.answer_key || q.answer || '';

            return (
              <div key={index} style={{
                ...cardStyle,
                pageBreakInside: 'avoid'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Q{index + 1}</span>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>({marks})</span>
                </div>
                <p style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '12px',
                  lineHeight: '1.5',
                  fontFamily: "'Google Sans', Inter, sans-serif"
                }}>
                  {question}
                </p>

                {/* Answer Key - Always Expanded */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#f1f5f9',
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#125DD0', margin: 0 }}>
                      Answer Key
                    </p>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    {answerKey ? (
                      typeof answerKey === 'string' ? (
                        <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                          {answerKey}
                        </p>
                      ) : Array.isArray(answerKey) ? (
                        answerKey.map((point, i) => (
                          <p key={i} style={{ fontSize: '12px', color: '#374151', margin: '0 0 6px 0', lineHeight: '1.5' }}>
                            • {point}
                          </p>
                        ))
                      ) : (
                        <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: '1.6' }}>
                          {JSON.stringify(answerKey)}
                        </p>
                      )
                    ) : (
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
                        Answer key not available for this question.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Spark Questions - Most Probable Questions */}
      {data.probableQuestions && data.probableQuestions.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={sectionTitleStyle}>Most Probable Questions</h2>
            <span style={pillStyle}>Most Probable Questions</span>
          </div>

          {data.probableQuestions.map((q, index) => {
            const question = typeof q === 'string' ? q : q.question;
            const probability = q.probability || 'High';
            const reason = q.reason || q.category || q.reasoning || '';

            return (
              <div key={index} style={{
                ...cardStyle,
                pageBreakInside: 'avoid'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>#{index + 1}</span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: '#dc2626',
                  }}>
                    🔥 {probability.toUpperCase()} PROBABILITY
                  </span>
                </div>
                <p style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '8px',
                  lineHeight: '1.5',
                  fontFamily: "'Google Sans', Inter, sans-serif"
                }}>
                  {question}
                </p>
                {reason && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    padding: '8px 10px',
                    borderRadius: '6px'
                  }}>
                    <span>💡</span>
                    <span>{reason}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '30px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#9ca3af',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '16px'
      }}>
        Generated by StudySpark
      </div>
    </div>
  );
});

export default PrintableStudyGuide;
