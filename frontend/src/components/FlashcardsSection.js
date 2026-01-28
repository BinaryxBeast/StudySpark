import React, { useState, useEffect, useCallback } from 'react';
import Flashcard from './Flashcard';
import '../App.css';

const FlashcardsSection = ({ flashcards, onContextUpdate }) => {
    const [currentConstructorDeck, setCurrentConstructorDeck] = useState([]); // Keeps track of the deck order
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isShuffled, setIsShuffled] = useState(false);
    const [showFlipHint, setShowFlipHint] = useState(true);

    // Initialize deck on load or when flashcards data changes
    useEffect(() => {
        if (flashcards) {
            setCurrentConstructorDeck([...flashcards]);
            setCurrentIndex(0);
            setIsShuffled(false);
            setShowFlipHint(true);
        }
    }, [flashcards]);

    // Update Chat Context when card changes
    useEffect(() => {
        if (onContextUpdate && currentConstructorDeck && currentConstructorDeck[currentIndex]) {
            const card = currentConstructorDeck[currentIndex];
            onContextUpdate({
                type: 'flashcard',
                topic: card.concept || 'this concept',
                question: card.question
            });
        }
    }, [currentIndex, currentConstructorDeck, onContextUpdate]);

    const handleNext = useCallback(() => {
        if (currentIndex < currentConstructorDeck.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setShowFlipHint(false);
        }
    }, [currentIndex, currentConstructorDeck.length]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex]);

    const handleShuffle = () => {
        const shuffled = [...currentConstructorDeck].sort(() => Math.random() - 0.5);
        setCurrentConstructorDeck(shuffled);
        setCurrentIndex(0);
        setIsShuffled(true);
        setShowFlipHint(false);
    };

    const handleReset = () => {
        setCurrentConstructorDeck([...flashcards]);
        setCurrentIndex(0);
        setIsShuffled(false);
        setShowFlipHint(true);
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev]);

    // Pagination Dots Logic (Show window of ±3 dots)
    const renderPaginationDots = () => {
        const total = currentConstructorDeck.length;
        if (total <= 12) {
            return currentConstructorDeck.map((_, idx) => (
                <span
                    key={idx}
                    className={`pagination-dot ${idx === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                />
            ));
        }

        // Window logic for large decks
        let start = Math.max(0, currentIndex - 3);
        let end = Math.min(total, start + 7); // Show 7 dots max window

        if (end - start < 7) {
            start = Math.max(0, end - 7);
        }

        const dots = [];
        for (let i = start; i < end; i++) {
            dots.push(
                <span
                    key={i}
                    className={`pagination-dot ${i === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(i)}
                />
            );
        }
        return dots;
    };

    // Touch / Swipe Logic
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null); // Reset
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }
    };

    if (!currentConstructorDeck || currentConstructorDeck.length === 0) return null;

    return (
        <div className="flashcards-section-container">
            {/* Unified Header */}
            <div className="flashcards-main-header">
                <h3>Flashcards</h3>

                <div className="flashcards-controls-group">
                    <span className="flashcards-progress-pill">
                        {currentIndex + 1} / {currentConstructorDeck.length}
                    </span>

                    <div className="flashcards-actions">
                        <button
                            className={`action-btn-text ${isShuffled ? 'active' : ''}`}
                            onClick={handleShuffle}
                            title="Shuffle Cards"
                        >
                            <span className="material-symbols-rounded">shuffle</span>
                            Shuffle
                        </button>
                        {isShuffled && (
                            <button
                                className="action-btn-text"
                                onClick={handleReset}
                                title="Reset Order"
                            >
                                <span className="material-symbols-rounded">restart_alt</span>
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Optional Progress Bar Line */}
            <div className="flashcards-progress-bar-line">
                <div
                    className="flashcards-progress-fill"
                    style={{ width: `${((currentIndex + 1) / currentConstructorDeck.length) * 100}%` }}
                ></div>
            </div>

            <div className="flashcard-display-area">
                <button
                    className="nav-arrow left"
                    onClick={handlePrev}
                    aria-label="Previous card"
                    disabled={currentIndex === 0}
                >
                    <span className="material-symbols-rounded">arrow_back_ios</span>
                </button>

                <div
                    className="active-card-wrapper"
                    key={currentIndex}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <Flashcard card={currentConstructorDeck[currentIndex]} />
                    {showFlipHint && currentIndex === 0 && (
                        <div className="click-flip-hint">↔ Click to flip</div>
                    )}
                </div>

                <button
                    className="nav-arrow right"
                    onClick={handleNext}
                    aria-label="Next card"
                    disabled={currentIndex === currentConstructorDeck.length - 1}
                >
                    <span className="material-symbols-rounded">arrow_forward_ios</span>
                </button>
            </div>

            <div className="pagination-dots">
                {renderPaginationDots()}
            </div>
        </div>
    );
};

export default FlashcardsSection;
