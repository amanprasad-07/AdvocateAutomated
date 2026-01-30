export const normalizeAiOutput = (output = {}) => {
  const allowedUrgency = ["Immediate", "Soon", "Exploratory"];
  const allowedEvidence = ["Low", "Medium", "High"];

  const mapUrgency = (val) => {
    if (!val) return "Exploratory";
    const v = String(val).trim().toLowerCase();
    if (["immediate", "urgent", "high"].includes(v)) return "Immediate";
    if (["soon", "medium", "moderate"].includes(v)) return "Soon";
    if (["low", "exploratory", "later"].includes(v)) return "Exploratory";
    if (allowedUrgency.includes(val)) return val;
    // fallback
    return "Exploratory";
  };

  const mapEvidence = (val) => {
    if (!val) return "Low";
    const v = String(val).trim().toLowerCase();
    if (["high"].includes(v)) return "High";
    if (["medium", "med"].includes(v)) return "Medium";
    if (["low"].includes(v)) return "Low";
    if (allowedEvidence.includes(val)) return val;
    return "Low";
  };

  return {
    ...output,
    urgency: mapUrgency(output.urgency),
    evidenceReadiness: mapEvidence(output.evidenceReadiness),
  };
};
