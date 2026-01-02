import React, { useState } from 'react';
import './App.css';
import { storage, db } from './firebaseConfig';
import { ref, uploadBytes } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";

const Flashcard = ({ card }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className={`card-container ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
      <div className="card-inner">
        <div className="card-front">{card.front}</div>
        <div className="card-back">{card.back}</div>
      </div>
    </div>
  );
};

const Quiz = ({ questions }) => {
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(null);

  const checkResults = () => {
    let currentScore = 0;
    questions.forEach((q, index) => {
      if (userAnswers[index] === q.answer) currentScore++;
    });
    setScore(currentScore);
  };

  return (
    <div className="quiz-section" style={{ marginTop: '20px', padding: '20px', borderTop: '1px solid #eee' }}>
      <h2>Interactive Quiz</h2>
      {questions.map((q, index) => (
        <div key={index} className="question-box" style={{ marginBottom: '15px', textAlign: 'left' }}>
          <p><strong>{index + 1}. {q.question}</strong></p>
          {q.options.map(opt => (
            <label key={opt} style={{ display: 'block', margin: '5px 0' }}>
              <input
                type="radio"
                name={`q${index}`}
                onChange={() => setUserAnswers({ ...userAnswers, [index]: opt })}
              /> {opt}
            </label>
          ))}
        </div>
      ))}
      <button onClick={checkResults} style={{ marginTop: '10px', padding: '10px 20px' }}>Submit Quiz</button>
      {score !== null && <h3>Your Score: {score} / {questions.length}</h3>}
    </div>
  );
};

function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    // 1. Upload the file
    const storageRef = ref(storage, file.name);
    await uploadBytes(storageRef, file);

    // 2. Wait for the Backend to save results in Firestore
    const docId = file.name.replace(".pdf", "");
    onSnapshot(doc(db, "study_results", docId), (doc) => {
      if (doc.exists()) {
        setData(doc.data());
        setLoading(false);
      }
    });
  };

  return (
    <div className="App" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🎓 StudySpark AI</h1>
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Gemini is thinking..." : "Generate Study Guide"}
      </button>

      {data && (
        <div className="results">
          <h2>Summary</h2>
          <p>{data.summary}</p>

          <h2>Flashcards</h2>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px', perspective: '1000px' }}>
            {data.flashcards.map((card, i) => (
              <Flashcard key={i} card={card} />
            ))}
          </div>

          {data.quiz && <Quiz questions={data.quiz} />}
        </div>
      )}
    </div>
  );
}

export default App;
