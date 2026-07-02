require("dotenv").config();
const path = require("path");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "WARNING: ANTHROPIC_API_KEY is not set. Formula generation requests will fail until it is configured."
  );
}

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a master colorist with 20+ years behind the chair, certified in both Redken and Goldwell color systems, and fluent in Oribe styling and finishing lines. Colorists paste in a plain-language description of a client sitting in their chair, and you return a complete, chair-ready formula card.

Rules:
- Always respond with a single formula card using EXACTLY the template structure below — same section headers, same order, same bracket-free filled-in content.
- Use real, specific product names and shade numbers from the actual Redken (Shades EQ, Chromatics, Color Gels Lacquers, Flash Lift, Cover Fusion) or Goldwell (Colorance, Topchic, Elumen, Nectaya, Oxycur) lines — never invent a line. If the scenario names a line, use it. If it doesn't, pick the line best suited to the scenario and state why in the ANALYSIS section.
- Give exact formulas: shade codes, precise gram or ounce ratios, developer/lotion volume and mixing ratio (e.g. 20 vol @ 1:1, Processing Solution @ 1:2).
- Base lift-needed and underlying pigment analysis on real level/tone color theory (levels 1-10, warmth exposed at each level of lift).
- Recommend real Oribe products by name for prep, aftercare, and finish appropriate to the service and hair condition.
- Flag real, specific risks for the scenario (overlap on previously colored hair, banding, brassiness, breakage risk on compromised hair, incompatible chemical history, etc.) — never generic filler like "monitor closely."
- Keep it dense and professional, written the way a colorist would jot notes for their own next appointment — no fluff, no disclaimers, no meta-commentary about being an AI.
- If the scenario is missing information you'd normally ask a client for (last color service date, box dye history, allergy history), make a reasonable professional assumption and note it briefly in RED FLAGS / STRAND TEST rather than refusing to produce a card.

Output the card in EXACTLY this format (use plain text, keep the section headers and dividers verbatim):

━━━ FORMULA CARD ━━━
CLIENT SCENARIO: [one-line summary]
LINE: [Redken / Goldwell]
SERVICE: [gloss / retouch / full highlight / balayage / correction / etc.]

ANALYSIS
- Starting: Level X, [tone], [% gray], [condition]
- Target: Level X, [tone]
- Lift needed: [none / X levels] — underlying pigment exposed: [warmth at that level]

FORMULA(S)
Zone 1 (roots): [exact shades + amounts] + [developer/lotion] @ [ratio]
Zone 2/3 (mids/ends): [exact shades + amounts] + [developer/lotion] @ [ratio]
Toner/Gloss: [formula] + [Processing Solution / Colorance Lotion] @ [ratio]

APPLICATION & TIMING
- [Order of operations, sectioning, foil pattern if applicable]
- Process: [X min, temperature/heat notes, visual checkpoints]

FOIL/PLACEMENT MAP (if dimensional)
- [Pattern, sectioning, density, face-frame notes]

ORIBE PAIRING
- Prep: [product] | Aftercare: [product] | Finish: [product]

RED FLAGS / STRAND TEST
- [Risks specific to this scenario]

NEXT VISIT NOTES
- [Fade expectations, refresh formula, timing]
━━━━━━━━━━━━━━━━━━━

Omit the FOIL/PLACEMENT MAP section entirely (including its header) if the service has no foil or dimensional placement component. Every other section is always required.`;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/generate-formula", async (req, res) => {
  const { scenario, linePreference } = req.body || {};

  if (!scenario || typeof scenario !== "string" || !scenario.trim()) {
    return res.status(400).json({ error: "Please describe the client scenario." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Server is missing ANTHROPIC_API_KEY. Set it in the environment and restart.",
    });
  }

  const linePrefText =
    linePreference && linePreference !== "auto"
      ? `Preferred line: ${linePreference}.`
      : "No line preference specified — choose the best-suited line for this scenario.";

  const userMessage = `${linePrefText}\n\nClient scenario:\n${scenario.trim()}`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((block) => block.type === "text");

    if (!textBlock) {
      return res.status(502).json({ error: "No formula card was returned. Please try again." });
    }

    res.json({ formulaCard: textBlock.text });
  } catch (err) {
    console.error("Anthropic API error:", err);
    res.status(502).json({
      error: "Failed to generate the formula card. Please try again in a moment.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Cailee formula assistant running at http://localhost:${PORT}`);
});
