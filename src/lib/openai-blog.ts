
import OpenAI from "openai";

import {
  blogResponseSchema,
  type BlogRequest,
  type BlogResponse,
  type ExtractedKeyword,
} from "@/lib/seo-schema";
import type { SeoData } from "@/lib/seo-providers";

const blogJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "intentAnalysis",
    "fullOutline",
    "researchEvidencePlan",
    "completeBlogPost",
    "seoBlock",
    "selfCheckResults",
  ],
  properties: {
    intentAnalysis: { type: "string" },
    fullOutline: { type: "string" },
    researchEvidencePlan: { type: "string" },
    completeBlogPost: { type: "string" },
    seoBlock: {
      type: "object",
      additionalProperties: false,
      required: [
        "metadata",
        "keywordPlacementAudit",
        "schemaOpportunities",
        "internalLinkingSummary",
        "externalLinkingSuggestions",
        "imageAltTextSuggestions",
      ],
      properties: {
        metadata: {
          type: "object",
          additionalProperties: false,
          required: ["titleTag", "metaDescription", "urlSlug"],
          properties: {
            titleTag: { type: "string" },
            metaDescription: { type: "string" },
            urlSlug: { type: "string" },
          },
        },
        keywordPlacementAudit: { type: "string" },
        schemaOpportunities: { type: "string" },
        internalLinkingSummary: { type: "string" },
        externalLinkingSuggestions: { type: "string" },
        imageAltTextSuggestions: { type: "string" },
      },
    },
    selfCheckResults: { type: "string" },
  },
} as const;

function formatExtractedKeywords(keywords: ExtractedKeyword[]) {
  return keywords
    .map((keyword, index) => {
      const metrics = [
        keyword.volume ? `volume ${keyword.volume}` : "",
        keyword.traffic ? `traffic ${keyword.traffic}` : "",
        keyword.clicks ? `clicks ${keyword.clicks}` : "",
        keyword.impressions ? `impressions ${keyword.impressions}` : "",
        keyword.position ? `position ${keyword.position.toFixed(1)}` : "",
      ].filter(Boolean);

      return `${index + 1}. ${keyword.keyword} (${keyword.source}${
        metrics.length ? `, ${metrics.join(", ")}` : ""
      })`;
    })
    .join("\n");
}

function buildBlogPrompt(
  input: BlogRequest,
  seoData: SeoData,
  extractedKeywords: ExtractedKeyword[],
) {
  const requiredKeywords = formatExtractedKeywords(extractedKeywords);

  const semanticEntities = [
    "Use Ahrefs top pages, Ahrefs metrics, and Google Search Console query/page data for semantic entities and LSI terms.",
    "Flag anything that needs manual confirmation.",
  ].join(" ");

  const internalLinks = [
    "Use Google Search Console page data and Ahrefs top pages as internal linking opportunities.",
    "If no relevant URLs are available, use descriptive [INTERNAL LINK: page description] placeholders.",
  ].join(" ");

  const paaQuestions =
    "Infer logical People Also Ask questions from the primary keyword and search intent unless API data provides clearer queries.";

  return `You are an expert SEO blog writer working for a travel/lifestyle brand. Your job is to produce content that ranks on Google and reads like a knowledgeable human wrote it — not an AI.

You will be given:
- PRIMARY KEYWORD: ${input.mainKeyword}
- REQUIRED KEYWORDS TO USE IN THE FINAL BLOG CONTENT:
${requiredKeywords}
- SEMANTIC ENTITIES / LSI TERMS: ${semanticEntities}
- SEARCH INTENT: informational / commercial / navigational / transactional
- TARGET AUDIENCE: ${input.targetAudience}
- TARGET WORD COUNT: ${input.blogLength}
- BRAND/SITE CONTEXT: ${input.productServiceName} — travel/lifestyle brand context for ${input.websiteDomain}
- COMPETITOR GAPS TO EXPLOIT: ${input.extraNotes || "Use SEO data to identify likely competitor gaps; flag uncertain claims as [NEEDS SOURCE]."}
- INTERNAL LINKING OPPORTUNITIES: ${internalLinks}
- PEOPLE ALSO ASK QUESTIONS TO ANSWER: ${paaQuestions}

---

STEP 1 — SEARCH INTENT MAPPING (show your thinking before writing)

Before drafting, output a brief Intent Analysis block:
- Confirmed search intent (what is the user actually trying to do?)
- Content format that best satisfies this intent (guide, comparison, how-to, listicle, etc.)
- What the top-ranking pages are likely covering and what angle this post will take to do it better
- One "content gap" or fresh angle competitors are missing
- Whether this is informational, commercial, or mixed intent — and how that affects tone and CTA placement

---

STEP 2 — CONTENT OUTLINE (output before drafting)

Produce a full outline with:
- H1 (title) — specific, keyword-rich, under 70 characters for SEO, contains primary keyword
- H2s and H3s — every subheading must be specific and descriptive, not generic (e.g., "Why Spinner Wheels Fail After 18 Months" not "About Luggage Wheels")
- FAQ section — minimum 4 questions pulled directly from People Also Ask or logical user queries
- Internal linking slots — mark [INTERNAL LINK: describe what page] where a link should go
- [IMAGE PLACEHOLDER: description] — mark where images, infographics, or charts belong
- EEAT opportunities — note where to insert stats, expert references, or first-hand experience signals
- Estimated word count per section

Only proceed to drafting after this outline is complete.

---

STEP 3 — RESEARCH & EVIDENCE PLAN (output before drafting)

For each H2 section, identify:
- At least one supporting data point, study, or verifiable fact needed
- The ideal source type (peer-reviewed study, government data, industry report, brand stat, user survey)
- Mark any section where a source cannot be confirmed as [NEEDS SOURCE — flag for manual fact-check]

Rules:
- Never fabricate statistics, journal names, or citations. Ever.
- Prefer sources from the last 3–5 years. If using older data, acknowledge it.
- Include institution/publication name, year, and sample size when citing studies.
- If a stat sounds surprising, note it prominently so it can be verified before publishing.

---

STEP 4 — FULL DRAFT

Write the complete blog post following this structure and all rules below.

STRUCTURE:
- Hook/Introduction: Under 3 sentences. Open with a surprising stat, bold statement, or relatable travel scenario. No throat-clearing. No definitions ("According to Merriam-Webster..."). The primary keyword must appear naturally within the first 100 words.
- Body: Follow the outline exactly. 4–7 H2 sections. Front-load the most valuable, surprising, or actionable information in the first third.
- FAQ Section: Answer each PAA question in 2–4 sentences. Direct, specific, no fluff.
- Closing: Strong, memorable takeaway or clear CTA. Never summarize everything you just said. Never write "In conclusion."

VOICE RULES (non-negotiable):
- Write like a knowledgeable person talking to a smart friend. Use contractions. Use "you" freely.
- Start sentences with "And," "But," or "So" where natural.
- Vary sentence length deliberately — alternate short punchy sentences with longer explanatory ones. Never run three long sentences in a row.
- Include at least one moment of genuine personal voice: a candid opinion, a "here's what most people get wrong" insight, or a relatable frustration.
- BANNED OPENERS: "In today's world," "It's no secret that," "Have you ever wondered," "Let's dive in," "In the fast-paced world of," "In an era where."
- BANNED WORDS/PHRASES: delve, landscape, tapestry, nuanced, crucial, unlock, seamless, robust, leveraging, it's worth noting, in conclusion, moreover, furthermore, navigating the complexities of, at the end of the day, a game-changer, comprehensive, meticulous, multifaceted.

EVIDENCE RULES:
- Every major claim needs a named, dated, specific source.
- Include at least 3–5 statistics or study findings woven into the narrative (not dumped in a list).
- Specificity is mandatory: "47% of travelers" not "many travelers." "$4.2 billion market" not "a large market."
- Acknowledge study limitations where relevant — it increases credibility.
- Any unverified claim = [NEEDS SOURCE].

FORMATTING RULES:
- Do not use Markdown header syntax like ## or ### for points, sub-items, lists, or structural structural text elements within content blocks. Use standard text lists or numbered steps instead.
- Do not use asterisks for bold text. Do not wrap headings or important phrases in ** markers.
- Do not include emojis or pictograms anywhere in the text or headers.
- Maintain a structured, plain text syntax that reads like data-driven AI output without conversational ornamentation or stylistic formatting clutter.
- No paragraph over 5 sentences. Most paragraphs: 1–3 sentences.
- No wall of text over 300 words without a visual break (subheading, image placeholder, or blockquote).
- Keep headings as plain text lines. The app will style them visually.
- Use [IMAGE PLACEHOLDER: description] tags where a supporting image, chart, or infographic would help.
- Use [INTERNAL LINK: page description] tags at every natural linking opportunity.
- Transitions must feel natural and conversational — never "Additionally," "Furthermore," "Moreover."

KEYWORD RULES:
- Use every REQUIRED KEYWORD in the Complete Blog Post field at least once.
- Use 10 to 12 REQUIRED KEYWORDS naturally in headings, intro, body, FAQ, or closing.
- Do not stuff keywords. If a keyword is awkward, use it once in a natural sentence.
- Keep exact spelling from the REQUIRED KEYWORDS list, even if it contains a typo from the user input.
- Do not invent a different keyword list.

TONE:
- Conversational but authoritative. The reader is smart — don't over-explain.
- Reader-first: every section should answer "why does this matter to me right now?"
- Match intent: informational = teach + build trust. Commercial = teach first, then position product/brand naturally. Never hard-sell.
- Reading level: 8th–10th grade Flesch-Kincaid. Educated general audience.

---

STEP 5 — ON-PAGE SEO OPTIMIZATION

After the draft, output a separate SEO block:

Metadata:
- Title tag (under 60 characters, primary keyword included)
- Meta description (150–160 characters, primary keyword included, written to compel a click)
- URL slug (short, hyphenated, keyword-rich — e.g., /how-to-replace-luggage-wheels)

Keyword placement audit:
- Confirm primary keyword appears in: H1, first 100 words, at least 2 H2s, meta description, closing paragraph
- Confirm secondary keywords are placed naturally throughout body (list where each one appears)
- Confirm semantic entities/LSI terms are woven in without stuffing

Schema opportunities:
- Note if HowTo, FAQ, Article, or Product schema is appropriate for this post

Internal linking summary:
- List all [INTERNAL LINK] placements with the target page description

External linking suggestions:
- Suggest 2–3 authoritative external sources to link (government, industry body, peer-reviewed study)

Image/alt text suggestions:
- List all [IMAGE PLACEHOLDER] slots with suggested alt text for each

---

STEP 6 — SELF-CHECK (run before outputting final version)

Score each item PASS or FAIL. Fix all FAILs before outputting.

Evidence & Accuracy:
□ Every major claim has a named, dated source or is flagged [NEEDS SOURCE]
□ All statistics are specific (exact percentages, dollar amounts, sample sizes)
□ No fabricated citations, journal names, or statistics
□ Sources are from the last 3–5 years where possible

Voice & Human Tone:
□ First two sentences would sound natural spoken aloud
□ Zero banned AI-tell words present (scan for: delve, landscape, tapestry, nuanced, crucial, unlock, seamless, robust, leveraging, moreover, furthermore)
□ At least one genuine personal/opinionated moment included
□ No three consecutive sentences of similar length

Structure & Readability:
□ Introduction is under 3 sentences and immediately engaging
□ Every subheading is specific, not generic
□ Every paragraph is 5 sentences or fewer
□ Closing delivers a clear takeaway or CTA — not a summary
□ Primary keyword in H1, first 100 words, 2+ H2s, meta description, closing

Fluff Test:
□ Every sentence teaches, clarifies, or advances the reader — nothing exists just to fill space
□ No hedging phrases ("it's important to note," "it should be mentioned")
□ No restated ideas in different words
□ No qualifiers that add nothing (very, really, extremely, quite, basically, essentially)

After fixing all FAILs, output the final clean post in the Complete Blog Post field. Keep planning, audit, and self-check information only in their JSON fields.

---

FINAL OUTPUT FORMAT:

1. Intent Analysis (Step 1)
2. Full Outline with image placeholders, internal link slots, EEAT notes (Step 2)
3. Research & Evidence Plan (Step 3)
4. Complete Blog Post — clean, final, ready to paste into WordPress/Surfer (Step 4)
5. SEO Block — metadata, keyword audit, schema, internal links, alt texts (Step 5)
6. Self-Check Results (Step 6)

SEO DATA CONTEXT:
${JSON.stringify(seoData, null, 2)}`;
}

export async function generateSeoBlog(
  input: BlogRequest,
  seoData: SeoData,
  extractedKeywords: ExtractedKeyword[],
): Promise<BlogResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    instructions:
      "Follow the user's writing prompt exactly. Return each final output section in the matching JSON field. Do not store data, do not mention private API mechanics in the article, and flag unverified claims as requested.",
    input: buildBlogPrompt(input, seoData, extractedKeywords),
    text: {
      format: {
        type: "json_schema",
        name: "seo_blog_response",
        strict: true,
        schema: blogJsonSchema,
      },
    },
  });

  const parsed = JSON.parse(response.output_text);
  return blogResponseSchema.parse(parsed);
}
