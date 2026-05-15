// api/analyze.js
// Complete brand analysis with market research, competitors, positioning, and dynamic axes

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const data = JSON.parse(event.body);
    const { brand, market, location, whatYouDo, realWhy, customerDesc, competitors, customerVoice, topCustomer, wantExpand } = data;

    // Step 1: Market Research
    const marketResearchPrompt = `You are a professional market research analyst. Analyze this REAL market based on actual data.

Brand: ${brand}
Market: ${market}
Location: ${location}
Customer description: ${customerDesc}
Customer voice: "${customerVoice}"

Identify 3-4 REAL customer segments in this market. For each provide:
- Name (e.g., "The Coffee Nerd")
- Description (1-2 sentences)
- Job-To-Be-Done (what problem they're solving)
- Pain points (list 2-3)
- Desires/motivations (list 2-3)

Format as JSON:
{
  "segments": [
    {"name": "...", "description": "...", "jtbd": "...", "pain_points": ["..."], "desires": ["..."], "content_type": "..."}
  ],
  "market_context": "Brief market overview (4-5 sentences about competitive landscape in this specific market)"
}`;

    // Step 2: Competitor Research
    const competitorPrompt = `You are a competitive analyst. Analyze the REAL direct competitors for this brand.

Brand: ${brand}
Market: ${market}
Location: ${location}
Competitors mentioned: ${competitors}

Find and analyze 3 REAL direct competitors that actually exist. For each provide:
- Company name (real company)
- Threat level (HIGH/MEDIUM/LOW)
- What they do well (2-3 sentences)
- Their competitive weakness or gap (1-2 sentences)
- Strategic analysis (1-2 sentences why they matter)

Format as JSON:
{
  "competitors": [
    {"name": "...", "threat_level": "HIGH", "strengths": "...", "weakness": "...", "analysis": "..."}
  ]
}`;

    // Step 3: Positioning with Dynamic Axes
    const positioningPrompt = `You are an expert brand strategist. Create a complete positioning strategy for this brand.

Brand: ${brand}
Market: ${market}
Location: ${location}
Why they exist: ${realWhy}
What they do: ${whatYouDo}
Real customer: ${customerDesc}
Customer voice: "${customerVoice}"
Top customer: ${topCustomer}
Expansion plans: ${wantExpand}

Provide COMPLETE strategy as JSON:
{
  "white_space": "Where is the unoccupied market position? (2-3 sentences)",
  "positioning_statement": "[WHO] help [WHO] achieve [WHAT] through [HOW] because [WHY] - make it specific to their brand",
  "why_works": "Why this positioning is credible for them (2-3 sentences)",
  "differentiation": "What makes them genuinely different from competitors (2-3 sentences)",
  "how_to_communicate": "Specific messaging approach and example language (2-3 sentences)",
  "x_axis": {"name": "Market dimension name", "left": "One end of spectrum", "right": "Other end"},
  "y_axis": {"name": "Market dimension name", "left": "One end of spectrum", "right": "Other end"},
  "axes_rationale": "Why these axes matter for this market",
  "key_strengths": "3-4 specific strengths they have to lean into",
  "risks": "Honest risks or doubts about their positioning",
  "opportunities": "3-4 specific market gaps they can own",
  "tactical_recommendations": "Specific actions: messaging approach, channels, content types, events, community building",
  "expansion_strategy": "If expanding: specific recommendations for new markets/regions"
}`;

    // Make 3 parallel API calls
    const [marketRes, competitorRes, positioningRes] = await Promise.all([
      callClaude(marketResearchPrompt, true),
      callClaude(competitorPrompt, true),
      callClaude(positioningPrompt, false)
    ]);

    // Parse responses
    const marketData = parseJSON(marketRes);
    const competitorData = parseJSON(competitorRes);
    const positioningData = parseJSON(positioningRes);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        market: marketData,
        competitors: competitorData,
        positioning: positioningData,
        brand: { name: brand, market, location },
      }),
    };

  } catch (error) {
    console.error("Analysis error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Analysis failed" }),
    };
  }
};

async function callClaude(prompt, useWebSearch = false) {
  const tools = useWebSearch ? [{ type: "web_search_20250305", name: "web_search" }] : undefined;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
      ...(tools && { tools }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  let text = "";
  for (const block of data.content) {
    if (block.type === "text") {
      text += block.text;
    }
  }
  return text;
}

function parseJSON(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Parse error:", e);
  }
  return null;
}
