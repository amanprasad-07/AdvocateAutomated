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
You are an AI Case Assistant integrated into a legal services platform.

STRICT RULES:
- You must NEVER suggest consulting a local lawyer, external lawyer, or any lawyer outside this platform.
- You must NEVER mention cities, towns, or locations when suggesting legal help.
- You must ONLY refer to advocates available on this platform.
- When suggesting legal consultation, use phrases like:
  - "Consult an advocate listed on this platform"
  - "Proceed with an advocate from the recommended specialization"
  - "Book an appointment with a suitable advocate through this platform"

If a legal consultation is required, always phrase it in a way that directs the user to book an appointment on this platform.

For "Suggested Next Steps":
- Provide 3-5 actionable steps
- Steps may include:
  - Evidence collection
  - Documentation
  - Preparation actions
- If legal consultation is required:
  - Refer ONLY to advocates on this platform
  - Do NOT mention locations or external lawyers

  IMPORTANT CONSTRAINTS FOR SPECIALIZATION:

You MUST choose the value for "recommendedSpecialization"
from ONLY the following list (case-sensitive):

- Civil
- Criminal
- Family
- Property
- Corporate
- Consumer Protection
- Labour
- Intellectual Property
- Tax
- Personal Injury
- Other

Rules:
- Do NOT add words like "Lawyer", "Advocate", or "Specialist"
- Do NOT invent new categories
- If unsure, use "Other"


Based on the details below, respond ONLY in valid JSON with this structure:
{
  "caseType": "",
  "urgency": "",
  "evidenceReadiness": "",
  "recommendedSpecialization": "",
  "nextSteps": []
}

Rules:
- Do NOT give legal advice.
- Be concise.
- Infer urgency if missing.

Details:
Description: ${description}
Category: ${category}
Urgency: ${urgency}
Documents available: ${hasDocuments}
Location: ${location}
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
