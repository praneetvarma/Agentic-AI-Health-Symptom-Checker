# 🏥 Agentic AI Health Symptom Checker

An AI-powered health symptom checker built with **IBM Granite 4** via IBM watsonx.ai.
Users describe symptoms in natural language and receive a structured, evidence-based health assessment.

---

## 🏗️ Project Structure

```
Agentic AI Health Symptom Checker/
├── backend/
│   ├── server.js          # Express API server
│   ├── package.json
│   └── .env.example       # Environment variable template
├── frontend/
│   └── index.html         # Single-page frontend application
└── README.md
```

---

## ⚡ Quick Start

### 1. Setup the Backend

```bash
cd backend
npm install
```

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
IBM_API_KEY=olSA2x_s2qJFF2bSWtG9RXwNnSMoJfV4mBBPOjRjREvT--
IBM_API_URL=https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29
IBM_IAM_URL=https://iam.cloud.ibm.com/identity/token
MODEL_ID=ibm/granite-4-h-small
PROJECT_ID=9efd52f7-8e03-4431-af67-7c1057382be0
PORT=3001
```

### 2. Start the Backend Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

The API will be live at: `http://localhost:3001`

### 3. Open the Frontend

Open `frontend/index.html` directly in a browser — **no build step needed**.

Or serve it with a simple static server:

```bash
npx serve ./frontend
```

---

## 🔌 API Endpoints

| Method | Endpoint       | Description                                      |
|--------|----------------|--------------------------------------------------|
| GET    | `/health`      | Server health check                              |
| POST   | `/api/analyze` | Analyze symptoms with IBM Granite AI             |
| POST   | `/api/triage`  | Quick emergency keyword triage (no AI call)      |

### POST `/api/analyze`

**Request body:**
```json
{
  "symptoms": "I have a sore throat and fever of 38.5°C for 2 days",
  "age": 32,
  "gender": "Male",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": "## Possible Conditions\n...",
  "model": "ibm/granite-4-h-small",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 🤖 AI Model

- **Model:** `ibm/granite-4-h-small`
- **Platform:** IBM watsonx.ai (`us-south`)
- **Auth:** IBM IAM API key (auto-renewed token with caching)
- **Parameters:** Greedy decoding, max 1024 tokens, repetition penalty 1.1

---

## 🩺 Features

- **Natural language symptom input** with quick-select chips
- **Agentic structured analysis:** Possible conditions, urgency level, home remedies, when to see a doctor, preventive tips
- **Emergency triage:** Instantly flags life-threatening symptom keywords before API call
- **Multi-language support** (9 languages)
- **Patient context:** Age and gender for better accuracy
- **Evidence-based:** System prompt aligned with WHO/CDC guidelines
- **No diagnosis risk:** Educational framing with doctor referral guidance
- **Clean responsive UI** — works on desktop and mobile

---

## ⚠️ Medical Disclaimer

This tool provides **educational health information only** and is **not** a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns. In emergencies, call **911** or your local emergency number immediately.

---

## 🛠️ Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | HTML5 / CSS3 / Vanilla JavaScript |
| Backend  | Node.js + Express.js              |
| AI Model | IBM Granite 4 (ibm/granite-4-h-small) |
| Platform | IBM watsonx.ai                    |
| Auth     | IBM IAM Token API                 |
