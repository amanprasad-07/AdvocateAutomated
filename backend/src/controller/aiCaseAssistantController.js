import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const aiCaseAssistant = async (req, res, next) => {
  try {
    const {
      description,
      category,
      urgency,
      hasDocuments,
      location,
    } = req.body;

    const prompt = `
SYSTEM ROLE:
You are an AI Case Assistant embedded in a legal services platform. Your output is consumed programmatically and must follow a strict schema. Invalid tokens will break the backend.

ABSOLUTE OUTPUT RULES (READ CAREFULLY):
1) Return ONLY a single JSON object and nothing else. No markdown, no backticks, no commentary, no extra fields, no trailing commas.
2) The JSON MUST exactly match this shape (keys and types):
{
  "caseType": string,
  "urgency": "Immediate" | "Soon" | "Exploratory",
  "evidenceReadiness": "Low" | "Medium" | "High",
  "recommendedSpecialization": "Civil" | "Criminal" | "Family" | "Property" | "Corporate" | "Consumer Protection" | "Labour" | "Intellectual Property" | "Tax" | "Personal Injury" | "Other",
  "nextSteps": [ string, ... ]   // array of 3-5 actionable strings
}

MANDATORY BEHAVIOR (must follow exactly):
A) BEFORE returning, perform this deterministic validation & mapping step ON YOUR OUTPUT:
   1. If "urgency" is not exactly one of ["Immediate","Soon","Exploratory"], map it using:
      - any token in (case-insensitive) ["urgent","now","high","immediate","asap"]  => "Immediate"
      - any token in ["medium","moderate","soon"] => "Soon"
      - any token in ["low","later","exploratory","not urgent"] => "Exploratory"
      - otherwise => "Exploratory" (fallback)
   2. If "evidenceReadiness" is not exactly one of ["Low","Medium","High"], map it using:
      - tokens like ["high","ample","strong"] => "High"
      - tokens like ["medium","moderate"] => "Medium"
      - tokens like ["low","insufficient","weak"] => "Low"
      - otherwise => "Low"
   3. If "recommendedSpecialization" is not exactly one of the allowed list, map common synonyms (e.g., "real estate" => "Property", "family law" => "Family", "ip" => "Intellectual Property"). If no reasonable mapping, set "Other".
   4. Ensure "nextSteps" is an array with 3 to 5 short actionable steps (each 3–12 words). If fewer than 3, add neutral, safe steps such as "Gather all relevant documents", "Take photos of evidence", "Book an appointment on the platform".
   5. Ensure "caseType" is a concise description (single short phrase).

B) If you ever would otherwise produce legal advice or mention locations or external lawyers, you MUST instead use platform-safe wording such as:
   - "Consult an advocate listed on this platform"
   - "Proceed with an advocate from the recommended specialization"
   - "Book an appointment with a suitable advocate through this platform"

C) NEVER mention external lawyers, cities, towns, or jurisdictions.

OUTPUT EXAMPLES (must follow format exactly)

Valid example:
{
  "caseType":"Property boundary dispute",
  "urgency":"Immediate",
  "evidenceReadiness":"High",
  "recommendedSpecialization":"Property",
  "nextSteps":["Collect title documents","Photograph boundary markers","Book an appointment on the platform"]
}

Edge-case mapping example (internal behavior — do not output this text):
- If model initially decides "urgency":"High" it must map to "Immediate" per mapping rules and output final JSON with "urgency":"Immediate".

INPUT DETAILS (use these to infer values; be conservative):
Description: ${description}
Category: ${category}
Urgency: ${urgency}
Documents available: ${hasDocuments}
Location: ${location}

FINAL REMARK: You must produce exactly one JSON object that passes the validation & mapping rules above. No extra keys allowed. If you cannot infer a safe value, use the defined fallback ("Exploratory" for urgency, "Low" for evidenceReadiness, "Other" for specialization) and ensure nextSteps contains 3 actionable items.
`;


    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text;

    // Parse JSON safely
    const data = JSON.parse(
      text.replace(/```json|```/g, "").trim()
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
