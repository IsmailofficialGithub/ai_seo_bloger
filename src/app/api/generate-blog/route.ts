import { NextResponse } from "next/server";

import { generateSeoBlog } from "@/lib/openai-blog";
import { blogRequestSchema } from "@/lib/seo-schema";
import { extractSeoKeywords, fetchSeoData } from "@/lib/seo-providers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = blogRequestSchema.parse(body);
    const seoData = await fetchSeoData(input);
    const extractedKeywords = extractSeoKeywords(seoData, input.mainKeyword);
    const blog = await generateSeoBlog(input, seoData, extractedKeywords);

    return NextResponse.json({ blog, extractedKeywords });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while generating the blog.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
