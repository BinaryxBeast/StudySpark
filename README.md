https://studyspark-ed989.firebaseapp.com/

# StudySpark

**Turn PDFs into Smart Revision Notes — Instantly**

StudySpark is an AI-powered learning tool that transforms academic PDFs into structured, exam-ready revision material. It helps students save time by automatically generating summaries, key points, questions, and revision aids from lengthy documents.

---

## Overview

Students often face challenges such as:
- Large and unstructured PDFs
- Time-consuming manual note-making
- Difficulty identifying exam-relevant content

StudySpark addresses these problems by analyzing uploaded PDFs and converting them into concise, well-organized learning resources optimized for quick revision.

---

## Features

- **PDF Analysis**  
  Upload study material such as notes, textbooks, or slides.

- **Smart Summaries**  
  Topic-wise summaries designed for fast understanding.

- **Key Points Extraction**  
  Highlights the most important concepts.

- **Cheat Sheet**  
  Ultra-condensed revision format for last-minute prep.

- **Flashcards**  
  Supports active recall and memory retention.

- **Quiz Generation**  
  Auto-generated questions to test understanding.

- **Long Answer Questions**  
  Exam-oriented descriptive answers.

- **Most Probable Questions**  
  Identifies high-likelihood exam questions.

- **PDF Export**  
  Download clean, readable result PDFs aligned with the website UI.

---

## How It Works

1. Upload a PDF
2. StudySpark analyzes the content using AI
3. Structured revision material is generated
4. Review online or export as a PDF

> **Tip:** Upload shorter PDFs for faster and more accurate results.

---

## Why StudySpark

- Saves hours of manual note preparation
- Designed specifically for students and exam revision
- Clean, modern UI inspired by Material Design 3
- Fast, lightweight, and easy to use
- Output balances website-like UI with professional PDF formatting

---

## Tech Stack

- **Frontend:** Modern web interface (Material 3 principles)
- **Backend:** AI-based document analysis
- **PDF Engine:** Structured content generation
- **Architecture:** Modular and scalable

---

## Use Cases

- Last-minute exam revision
- Competitive exam preparation
- Simplifying college notes
- Quick concept refresh before tests

---

## Screenshots
<img width="1365" height="652" alt="image" src="https://github.com/user-attachments/assets/2817570b-06e1-45cd-8729-81a5f670d798" />
<img width="1365" height="648" alt="image" src="https://github.com/user-attachments/assets/08cbd0b7-1e99-4c3e-b653-296581543076" />
<img width="1349" height="653" alt="image" src="https://github.com/user-attachments/assets/85f313b4-4d56-4a84-bc13-f2c310604484" />
<img width="1327" height="652" alt="image" src="https://github.com/user-attachments/assets/6f07a0a7-eeae-43f0-83be-a6d0b2c9d085" />
<img width="1348" height="652" alt="image" src="https://github.com/user-attachments/assets/db7825ce-112a-420f-a4ab-74bae0cc8a54" />
<img width="1344" height="649" alt="image" src="https://github.com/user-attachments/assets/e787b98e-ec7e-44d6-8f87-90af7802f6ab" />



---

## Roadmap

- Chapter-wise navigation
- Formula and definition highlighting
- User history and saved sessions
- Collaborative study features

---

## Deployment

StudySpark is automatically deployed to Firebase Hosting using GitHub Actions.

### Continuous Deployment
- **Production:** Automatic deployment to [studyspark-ed989.firebaseapp.com](https://studyspark-ed989.firebaseapp.com/) on push to `main`
- **Preview:** Automatic preview deployments for pull requests

### Manual Deployment

```bash
# Install dependencies
cd frontend
npm install

# Build the app
npm run build

# Deploy to Firebase (requires Firebase CLI and authentication)
cd ..
firebase deploy --only hosting
```

For detailed deployment instructions, see [.github/workflows/README.md](.github/workflows/README.md).

---

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

---

## License

This project is licensed under the **MIT License**.

---

## Support

If you find StudySpark useful:
- Star the repository
- Share it with other students
