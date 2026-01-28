import React, { useState, useEffect } from 'react';
import '../App.css';

const Flashcard = ({ card }) => {
    const [flipped, setFlipped] = useState(false);

    // Reset flip state when card content changes (i.e. navigation)
    useEffect(() => {
        setFlipped(false);
    }, [card]);

    return (
        <div
            className={`card-container ${flipped ? 'flipped' : ''}`}
            onClick={() => setFlipped(!flipped)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFlipped(!flipped)}
            aria-label={flipped ? "Flashcard showing answer. Click to flip back." : "Flashcard showing question. Click to reveal answer."}
        >
            <div className="card-inner">
                {/* Front Side */}
                <div className="card-front">
                    <div className="card-header-concept">
                        {card.front.split('\n')[0] || "Concept"}
                    </div>
                    <div className="card-body-hint">
                        {card.front.split('\n').slice(1).join('\n') || card.front}
                    </div>
                    <div className="card-footer-action">
                        <span className="material-symbols-rounded flip-icon">sync_alt</span>
                    </div>
                </div>

                {/* Back Side */}
                <div className="card-back">
                    <div className="card-header-concept">
                        {card.front.split('\n')[0] || "Concept"}
                    </div>
                    <div className="card-body-definition">
                        {card.back}
                    </div>
                    {/* Optional: if we had a separate example field, we would render it here. 
                         For now, assuming it might be part of the text. */}
                    <div className="card-footer-action">
                        <span className="material-symbols-rounded flip-icon">sync_alt</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Flashcard;
