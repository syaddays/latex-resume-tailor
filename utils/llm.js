const OPENROUTER_API_KEY = "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";

export async function callLLM(prompt, model = "mistralai/mistral-7b-instruct") {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

export function createJDAnalysisPrompt(jdText) {
  return `Extract from this job description:
1. Technical skills (comma-separated list)
2. High-priority keywords
3. Company name

Format response as JSON:
{
  "techSkills": [],
  "keywords": [],
  "company": ""
}

Job Description:
${jdText.substring(0, 3000)}`;
}

export function createSummaryPrompt(originalSummary, skills) {
  return `Rewrite this resume summary to emphasize ${skills.join(', ')}:
  
Original Summary:
"${originalSummary}"

Revised Summary:`;
}