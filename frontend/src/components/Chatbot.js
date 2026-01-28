import React, { useState, useRef, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { functions } from '../firebaseConfig';
import './Chatbot.css';

const Chatbot = ({ fileName, context }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [suggestedPrompt, setSuggestedPrompt] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Generate Suggested Prompt based on context
    useEffect(() => {
        if (context) {
            if (context.type === 'quiz-question') {
                const questionSnippet = context.question.substring(0, 30) + "...";
                if (!context.isCorrect) {
                    setSuggestedPrompt(`For the question "${questionSnippet}", why is the correct answer "${context.correctAnswer}"?`);
                } else {
                    setSuggestedPrompt(`Explain why "${context.optionSelected}" is the correct answer for "${questionSnippet}"`);
                }
            } else if (context.type === 'quiz-tab') {
                setSuggestedPrompt(`Help me study specifically for ${context.tab}.`);
            } else {
                setSuggestedPrompt(null);
            }
        } else {
            setSuggestedPrompt(null);
        }
    }, [context]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const handleSend = async (e, manualText = null) => {
        if (e) e.preventDefault();

        const textToSend = manualText || input;

        if (!textToSend.trim() || !fileName) return;

        const userMessage = textToSend.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setLoading(true);
        // Clear suggestion after use if it matches
        if (suggestedPrompt === userMessage) {
            setSuggestedPrompt(null);
        }

        try {
            const chatFn = httpsCallable(functions, 'chatWithSpark');
            // Assume docId is fileName without .pdf for now (matching App.js logic)
            const docId = fileName.replace(".pdf", "");

            const response = await chatFn({
                message: userMessage,
                docId: docId,
                context: context,
                history: messages.map(m => ({ role: m.role, message: m.text })) // Send limited history
            });

            setMessages(prev => [...prev, { role: 'model', text: response.data.reply }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error connecting to the AI. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const applySuggestion = () => {
        if (suggestedPrompt) {
            handleSend(null, suggestedPrompt);
        }
    };

    return (
        <div className="chatbot-container">
            {/* Expanded State */}
            {isOpen && (
                <div className="chatbot-window">

                    {/* Header */}
                    <div className="chat-header">
                        <button className="close-chat-btn" onClick={toggleChat}>
                            <span className="material-symbols-rounded">expand_more</span>
                        </button>
                        <div className="chat-title">
                            <h4>StudySpark Assistant</h4>
                            {fileName && <p className="chat-subtitle">Chatting about {fileName}</p>}
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <div className="empty-state">
                                <span className="material-symbols-rounded empty-state-icon">school</span>
                                <h3 className="empty-title">Ask questions from your study material</h3>
                                <p className="empty-helper">Get explanations, examples, and quick help</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={idx} className={`chat-bubble ${msg.role}`}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div className="chat-bubble model typing">
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggested Prompt Chip (only horizontal scrolling area if needed, or just above input) */}
                    {suggestedPrompt && !loading && (
                        <div className="suggestion-area">
                            <button className="suggestion-chip" onClick={applySuggestion}>
                                <span className="material-symbols-rounded chip-icon">lightbulb_circle</span>
                                <span className="chip-text">{suggestedPrompt}</span>
                            </button>
                        </div>
                    )}

                    {/* Input Area */}
                    <form className="chat-input-area" onSubmit={(e) => handleSend(e)}>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                className="chat-input"
                                placeholder={fileName ? "Ask about this PDF..." : "Ask a question..."}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={!fileName}
                            />
                            <button type="submit" className="send-btn" disabled={!input.trim() || !fileName}>
                                <span className="material-symbols-rounded">send</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Collapsed State Toggle */}
            <button
                className="chatbot-toggle"
                onClick={toggleChat}
                title={isOpen ? "Close Chat" : "Open Chat"}
            >
                <span className="material-symbols-rounded chatbot-icon">
                    {isOpen ? 'close' : 'bolt'}
                </span>
            </button>
        </div>
    );
};

export default Chatbot;
