import React, { useState } from 'react';
import '../App.css';

const Flashcard = ({ card }) => {
    const [flipped, setFlipped] = useState(false);

    return (
        <div className={`card-container ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
            <div className="card-inner">
                <div className="card-front">
                    <div className="card-content">
                        {card.front}
                    </div>
                    <div className="card-hint">
                        Tap to flip
                    </div>
                </div>
                <div className="card-back">
                    <div className="card-content">
                        {card.back}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Flashcard;
