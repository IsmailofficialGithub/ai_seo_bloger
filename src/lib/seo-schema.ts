import { z } from "zod";

export const blogRequestSchema = z.object({
  websiteDomain: z
    .string()
    .trim()
    .min(3, "Enter a valid website domain.")
    .max(120, "Domain is too long.")
    .refine((val) => {
      const cleaned = val
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/.*$/, "");
      return cleaned.includes(".");
    }, "Enter a valid website domain (e.g., example.com)."),
  mainKeyword: z
    .string()
    .trim()
    .min(2, "Enter a main keyword.")
    .max(160, "Keyword is too long."),
  targetAudience: z
    .string()
    .trim()
    .min(2, "Enter a target audience.")
    .max(220, "Audience is too long."),
  blogTone: z.string().trim().min(2, "Choose a blog tone.").max(80),
  blogLength: z.string().trim().min(2, "Choose a blog length.").max(80),
  productServiceName: z
    .string()
    .trim()
    .min(2, "Enter a product or service name.")
    .max(160, "Name is too long."),
  extraNotes: z.string().trim().max(1200, "Notes are too long.").optional(),
});

export const blogResponseSchema = z.object({
  intentAnalysis: z.string(),
  fullOutline: z.string(),
  researchEvidencePlan: z.string(),
  completeBlogPost: z.string(),
  seoBlock: z.object({
    metadata: z.object({
      titleTag: z.string(),
      metaDescription: z.string(),
      urlSlug: z.string(),
    }),
    keywordPlacementAudit: z.string(),
    schemaOpportunities: z.string(),
    internalLinkingSummary: z.string(),
    externalLinkingSuggestions: z.string(),
    imageAltTextSuggestions: z.string(),
  }),
  selfCheckResults: z.string(),
});

export type ExtractedKeyword = {
  keyword: string;
  source: "Ahrefs" | "Search Console" | "Suggested";
  volume?: number;
  traffic?: number;
  position?: number;
  clicks?: number;
  impressions?: number;
};

export type BlogRequest = z.infer<typeof blogRequestSchema>;
export type BlogResponse = z.infer<typeof blogResponseSchema>;
