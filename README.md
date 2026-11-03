# 🎯 InterviewVerse AI

**An AI-powered platform for practicing technical and HR interviews with personalized feedback.**

🚀 **Live Demo:** [InterviewVerse AI](https://interview-verse-ai-snowy.vercel.app)

Built using the **Project Scaffolding** approach.

---

## ✨ Features

### 🎤 1. Technical & HR Interview Practice
Practice technical and HR interviews with structured questions, different difficulty levels, and interactive interview sessions. Get feedback on your answers and improve your interview skills.

### 🤖 2. Gemini AI Interview Coach
Get AI-powered evaluation and personalized feedback on your answers based on relevance, structure, specificity, depth, and communication. A local scoring system is also available when AI mode is not configured.

### 📊 3. Performance Reports & History
Review interview reports, scores, strengths, and areas for improvement. Track previous sessions and monitor your preparation progress over time.

### 🧑‍💻 4. Coding Arena
Practice programming through coding challenges, sample test cases, and an in-browser JavaScript code editor. Other supported languages can be saved, but are not executed.

### 🏗️ 5. AI Project Builder
Generate starter projects from descriptions using supported technology stacks. Preview generated files, validate project structure, and download the project as a ZIP file.

### 🗣️ 6. Voice & AI Avatar Interviews
Experience spoken interview practice with browser-based speech features and illustrated AI interviewer avatars. Practice technical, HR, or mixed interview rounds.

### 📈 7. Learning Roadmap & Progress Tracking
Track learning activities, review performance trends, and get suggested next steps based on your interview practice and saved progress.

### 🎯 8. Personalized Interview & Job Match
Create a candidate profile based on your skills, experience, and target role. Practice profile-based questions and compare your skills with a pasted job description.

---

## 🛠️ Tech Stack

- Next.js, React & TypeScript
- Tailwind CSS
- Google Gemini API
- Upstash Redis
- Browser Local Storage
- Vercel

---

## 🏗️ Architecture

- **Frontend:** Next.js & React
- **Backend:** Next.js API Routes
- **AI Integration:** Gemini API
- **Rate Limiting:** Upstash Redis
- **Data Storage:** Browser Local Storage

*Note: The current version does not use a centralized database. Interview history is stored locally in the user's browser.*

---

## ⚙️ Installation

```bash
git clone https://github.com/Aayushi-Agarwal123/InterviewVerseAI.git
cd InterviewVerseAI
npm install
npm run dev
```

Open: `http://127.0.0.1:43123`

For AI features, configure the required environment variables using `.env.example` as a guide. Keep API keys and tokens private.

---

## 🚀 Deployment

The application is deployed on **Vercel**, with both frontend and backend API routes hosted in the same project.

**Live URL:** https://interview-verse-ai-snowy.vercel.app

---

**GitHub Repository:** [InterviewVerse AI](https://github.com/Aayushi-Agarwal123/InterviewVerseAI)
