import React, { useState } from 'react';
import '../App.css';

const Flashcard = ({ card }) => {
    const [flipped, setFlipped] = useState(false);

    return (
        <div
            className={`card-container ${flipped ? 'flipped' : ''}`}
            onClick={() => setFlipped(!flipped)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setFlipped(!flipped)}
            aria-label={flipped ? "Flashcard showing answer. Click to see question." : "Flashcard showing question. Click to see answer."}
        >
            <div className="card-inner">
                <div className="card-front">
                    <div className="card-content">
                        {card.front}
                    </div>
                    <span className="card-hint">Tap to flip</span>
                </div>
                <div className="card-back">
                    <div className="card-content">
                        {card.back}
                    </div>
                    <span className="card-hint">Tap to flip back</span>
                </div>
            </div>
        </div>
    );
};

export default Flashcard;
