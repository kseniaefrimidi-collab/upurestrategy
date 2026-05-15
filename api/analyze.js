const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { brand, market, location, whatYouDo, realWhy, customerDesc, competitors, customerVoice, topCustomer, wantExpand } = req.body;

    const marketPrompt = `You are a market research analyst. Analyze this market based on real data.

Brand: ${brand}
Market: ${market}
Location: ${location}
Customer: ${customerDesc}
Customer voice: "${customerVoice}"

Return ONLY valid JSON, no other text:
{
  "segments": [
    {"name": "...", "description": "...", "jtbd": "...", "pain_points": ["...","..."], "desires": ["...","..."]}
  ],
  "market_context": "4-5 sentences about this market"
}`;

    const competitorPrompt = `You are a competitive analyst. Analyze these competitors for this brand.

Brand: ${brand}
Market: ${market}
Location: ${location}
Competitors: ${competitors}

Return ONLY valid JSON, no other text:
{
  "competitors": [
    {"name": "...", "threat_level": "HIGH", "strengths": "...", "weakness": "...", "analysis": "..."}
  ]
}`;

    const positioningPrompt = `You are a brand strategist. Create a positioning strategy.

Brand: ${brand}
Market: ${market}
Location: ${location}
Why they exist: ${realWhy}
What they do: ${whatYouDo}
Customer: ${customerDesc}
Customer voice: "${customerVoice}"
Top customer: ${topCustomer}
Expansion: ${wantExpand}

Return ONLY valid JSON, no other text:
{
  "white_space": "...",
  "positioning_statement": "...",
  "why_works": "...",
  "differentiation": "...",
  "how_to_communicate": "...",
  "x_axis": {"name": "...", "left": "...", "right": "..."},
  "y_axis": {"name": "...", "left": "...", "right": "..."},
  "key_strengths": "...",
  "risks": "...",
  "opportunities": "...",
  "tactical_recommendations": "...",
  "expansion_strategy": "..."
}`;

    const [marketRes, competitorRes, positioningRes] = await Promise.all([
      callClaude(marketPrompt),
      callClaude(competitorPrompt),
      callClaude(positioningPrompt)
    ]);

    const marketData = parseJSON(marketRes);
    const competitorData = parseJSON(competitorRes);
    const positioningData = parseJSON(positioningRes);

    return res.status(200).json({
      success: true,
      market: marketData,
      competitors: competitorData,
      positioning: positioningData,
      brand: { name: brand, market, location }
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message || "Analysis failed" });
  }
}

async function callClaude(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const data = await response.json();
  let text = "";
  for (const block of data.content) {
    if (block.type === "text") text += block.text;
  }
  return text;
}

function parseJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    console.error("Parse error:", e);
  }
  return null;
}
