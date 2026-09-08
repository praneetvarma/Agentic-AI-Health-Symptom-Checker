require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

// ── IBM watsonx.ai Configuration ─────────────────────────────────────────────
const IBM_WATSONX_URL  = "https://us-south.ml.cloud.ibm.com";
const IBM_API_URL      = `${IBM_WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`;
const IBM_IAM_URL      = "https://iam.cloud.ibm.com/identity/token";
const MODEL_ID         = "ibm/granite-4-h-small";
const PROJECT_ID       = process.env.PROJECT_ID  || "9efd52f7-8e03-4431-af67-7c1057382be0";
const IBM_API_KEY      = process.env.IBM_API_KEY;

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// ── IBM IAM Token Cache ───────────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiry = 0;

async function getIBMAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const params = new URLSearchParams();
  params.append("grant_type", "urn:ibm:params:oauth:grant-type:apikey");
  params.append("apikey", IBM_API_KEY);

  const response = await axios.post(IBM_IAM_URL, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  cachedToken = response.data.access_token;
  // Expire 5 minutes before actual expiry to be safe
  tokenExpiry = now + (response.data.expires_in - 300) * 1000;
  return cachedToken;
}

// ── System Prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are an Agentic AI Health Symptom Checker — a trusted, empathetic, and evidence-based health assistant.

Your role is to:
1. Analyze the user's described symptoms carefully.
2. Provide a structured health assessment including:
   - **Possible Conditions**: List 2-4 probable conditions matching the symptoms (with brief explanations).
   - **Urgency Level**: Classify as 🟢 Low (home care), 🟡 Moderate (see doctor soon), or 🔴 High (seek emergency care immediately).
   - **Home Remedies & Self-Care**: Practical, safe steps the user can take at home.
   - **When to See a Doctor**: Clear indicators that warrant professional medical consultation.
   - **Preventive Tips**: Actionable advice to prevent recurrence.
   - **Disclaimer**: Always remind the user this is educational information, not a medical diagnosis.

Guidelines:
- Base responses on WHO guidelines, CDC recommendations, and established medical literature.
- Use clear, simple, non-technical language accessible to the general public.
- Be empathetic, supportive, and non-alarmist.
- Never provide a definitive diagnosis. Always recommend professional consultation for serious symptoms.
- If symptoms suggest a medical emergency (chest pain, difficulty breathing, stroke signs, severe bleeding), immediately advise the user to call emergency services (911/112).
- Support multi-language responses if the user writes in a language other than English — respond in the same language.
- Avoid harmful, speculative, or unverified health claims.

Format your response in clean sections with headers. Be thorough but concise.`;
}

// ── Health Check Endpoint ─────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Health Symptom Checker API", version: "1.0.0" });
});

// ── Main Symptom Analysis Endpoint ───────────────────────────────────────────
app.post("/api/analyze", async (req, res) => {
  const { symptoms, language, age, gender } = req.body;

  if (!symptoms || symptoms.trim().length === 0) {
    return res.status(400).json({ error: "Symptoms field is required." });
  }

  // Build contextual user message
  const contextParts = [];
  if (age) contextParts.push(`Patient Age: ${age}`);
  if (gender) contextParts.push(`Gender: ${gender}`);
  contextParts.push(`Symptoms: ${symptoms.trim()}`);
  if (language && language !== "en") {
    contextParts.push(`Please respond in ${language}.`);
  }

  const userMessage = contextParts.join("\n");

  const prompt = `<|system|>
${buildSystemPrompt()}
<|user|>
${userMessage}
<|assistant|>
`;

  try {
    const accessToken = await getIBMAccessToken();

    const ibmResponse = await axios.post(
      IBM_API_URL,
      {
        model_id: MODEL_ID,
        project_id: PROJECT_ID,
        input: prompt,
        parameters: {
          decoding_method: "greedy",
          max_new_tokens: 1024,
          min_new_tokens: 100,
          stop_sequences: ["<|user|>", "<|endoftext|>"],
          repetition_penalty: 1.1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const generatedText =
      ibmResponse.data?.results?.[0]?.generated_text?.trim() || "";

    if (!generatedText) {
      return res.status(500).json({ error: "No response generated. Please try again." });
    }

    res.json({
      success: true,
      analysis: generatedText,
      model: MODEL_ID,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("IBM API Error:", err?.response?.data || err.message);

    // IAM returns 400 for invalid/expired API key, 401 for bad bearer token
    const isAuthError =
      err?.response?.status === 401 ||
      (err?.response?.status === 400 &&
        err?.response?.data?.errorCode?.startsWith("BXNIM"));
    if (isAuthError) {
      cachedToken = null; // Clear bad token
      return res.status(401).json({
        error: "IBM API authentication failed. The API key may be invalid or expired. Please update IBM_API_KEY in backend/.env.",
        details: err?.response?.data?.errorMessage || "",
      });
    }

    if (err?.response?.status === 429) {
      return res.status(429).json({ error: "Rate limit reached. Please wait a moment and try again." });
    }

    res.status(500).json({
      error: "Failed to analyze symptoms. Please try again.",
      details: err?.response?.data?.errors?.[0]?.message || err.message,
    });
  }
});

// ── Quick Triage Endpoint (emergency keywords) ────────────────────────────────
app.post("/api/triage", (req, res) => {
  const { symptoms } = req.body;
  if (!symptoms) return res.status(400).json({ error: "Symptoms required." });

  const emergencyKeywords = [
    "chest pain", "heart attack", "can't breathe", "cannot breathe",
    "difficulty breathing", "stroke", "unconscious", "not breathing",
    "severe bleeding", "coughing blood", "vomiting blood", "overdose",
    "seizure", "anaphylaxis", "allergic reaction", "sudden vision loss",
    "slurred speech", "facial drooping", "arm weakness", "suicide",
    "self harm", "poisoning",
  ];

  const lowerSymptoms = symptoms.toLowerCase();
  const isEmergency = emergencyKeywords.some((kw) => lowerSymptoms.includes(kw));

  res.json({
    isEmergency,
    message: isEmergency
      ? "⚠️ Your symptoms may indicate a medical emergency. Please call 911 (or your local emergency number) immediately or go to the nearest emergency room."
      : "Symptoms do not appear to be an immediate emergency. Proceeding with analysis.",
  });
});

// ── Serve Frontend ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏥 Health Symptom Checker running at http://localhost:${PORT}`);
  console.log(`   Model  : ${MODEL_ID}`);
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`   App URL: http://localhost:${PORT}/\n`);
});
