"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Loader2, Sparkles } from "lucide-react";
import { ZodError } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  blogRequestSchema,
  type BlogRequest,
  type BlogResponse,
} from "@/lib/seo-schema";

const initialForm: BlogRequest = {
  websiteDomain: "",
  mainKeyword: "",
  targetAudience: "",
  blogTone: "Helpful and expert",
  blogLength: "Medium, 1,200 to 1,500 words",
  productServiceName: "",
  extraNotes: "",
};

const toneOptions = [
  "Helpful and expert",
  "Conversational",
  "Professional",
  "Friendly",
  "Persuasive",
];

const lengthOptions = [
  "Short, 700 to 900 words",
  "Medium, 1,200 to 1,500 words",
  "Long, 1,800 to 2,400 words",
];

function formatBlogForCopy(blog: BlogResponse) {
  return [
    "1. Intent Analysis",
    blog.intentAnalysis,
    "",
    "2. Full Outline with image placeholders, internal link slots, EEAT notes",
    blog.fullOutline,
    "",
    "3. Research & Evidence Plan",
    blog.researchEvidencePlan,
    "",
    "4. Complete Blog Post",
    blog.completeBlogPost,
    "",
    "5. SEO Block",
    `Title tag: ${blog.seoBlock.metadata.titleTag}`,
    `Meta description: ${blog.seoBlock.metadata.metaDescription}`,
    `URL slug: ${blog.seoBlock.metadata.urlSlug}`,
    "",
    "Keyword placement audit:",
    blog.seoBlock.keywordPlacementAudit,
    "",
    "Schema opportunities:",
    blog.seoBlock.schemaOpportunities,
    "",
    "Internal linking summary:",
    blog.seoBlock.internalLinkingSummary,
    "",
    "External linking suggestions:",
    blog.seoBlock.externalLinkingSuggestions,
    "",
    "Image/alt text suggestions:",
    blog.seoBlock.imageAltTextSuggestions,
    "",
    "6. Self-Check Results",
    blog.selfCheckResults,
  ].join("\n");
}

export default function Home() {
  const [form, setForm] = useState<BlogRequest>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [blog, setBlog] = useState<BlogResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyText = useMemo(() => (blog ? formatBlogForCopy(blog) : ""), [blog]);

  function updateField(name: keyof BlogRequest, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  }

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBlog(null);
    setCopied(false);

    try {
      const payload = blogRequestSchema.parse(form);
      setIsGenerating(true);

      const response = await fetch("/api/generate-blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate the blog.");
      }

      setBlog(data.blog);
    } catch (caughtError) {
      if (caughtError instanceof ZodError) {
        const errors: Record<string, string> = {};
        caughtError.issues.forEach((issue) => {
          const key = issue.path[0];
          if (typeof key === "string") {
            errors[key] = issue.message;
          }
        });
        setFieldErrors(errors);
        setError("Please fix the highlighted fields.");
      } else {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to generate the blog.",
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!copyText) {
      return;
    }

    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Sparkles className="size-4" />
            One-time SEO Blog Generator
          </div>
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Generate an SEO blog from keyword, Ahrefs, and Search Console data.
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Fill the form, generate once, and copy the finished blog package.
              No auth, no database, no saved content.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[420px_1fr] lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Blog inputs</CardTitle>
            <CardDescription>
              These fields are sent to the API route for SEO data and AI writing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleGenerate}>
              <FieldError message={error} />

              <div className="space-y-2">
                <Label htmlFor="websiteDomain">Website domain</Label>
                <Input
                  id="websiteDomain"
                  placeholder="nobltravel.com"
                  value={form.websiteDomain}
                  onChange={(event) =>
                    updateField("websiteDomain", event.target.value)
                  }
                />
                <FieldError message={fieldErrors.websiteDomain} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mainKeyword">Main keyword</Label>
                <Input
                  id="mainKeyword"
                  placeholder="luxury family travel"
                  value={form.mainKeyword}
                  onChange={(event) =>
                    updateField("mainKeyword", event.target.value)
                  }
                />
                <FieldError message={fieldErrors.mainKeyword} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target audience</Label>
                <Input
                  id="targetAudience"
                  placeholder="Parents planning premium vacations"
                  value={form.targetAudience}
                  onChange={(event) =>
                    updateField("targetAudience", event.target.value)
                  }
                />
                <FieldError message={fieldErrors.targetAudience} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label>Blog tone</Label>
                  <Select
                    value={form.blogTone}
                    onValueChange={(value) => updateField("blogTone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {toneOptions.map((tone) => (
                        <SelectItem key={tone} value={tone}>
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldErrors.blogTone} />
                </div>

                <div className="space-y-2">
                  <Label>Blog length</Label>
                  <Select
                    value={form.blogLength}
                    onValueChange={(value) => updateField("blogLength", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose length" />
                    </SelectTrigger>
                    <SelectContent>
                      {lengthOptions.map((length) => (
                        <SelectItem key={length} value={length}>
                          {length}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldErrors.blogLength} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productServiceName">
                  Product/service name
                </Label>
                <Input
                  id="productServiceName"
                  placeholder="Nobl Travel planning service"
                  value={form.productServiceName}
                  onChange={(event) =>
                    updateField("productServiceName", event.target.value)
                  }
                />
                <FieldError message={fieldErrors.productServiceName} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="extraNotes">Extra notes</Label>
                <Textarea
                  id="extraNotes"
                  placeholder="Mention destinations, offers, brand style, or must-include points."
                  value={form.extraNotes}
                  onChange={(event) =>
                    updateField("extraNotes", event.target.value)
                  }
                />
                <FieldError message={fieldErrors.extraNotes} />
              </div>

              <Button className="w-full" disabled={isGenerating} type="submit">
                {isGenerating ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                {isGenerating ? "Generating..." : "Generate Blog"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="min-h-[640px]">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Generated result</CardTitle>
              <CardDescription>
                The final blog package appears here after generation.
              </CardDescription>
            </div>
            <Button
              disabled={!blog}
              onClick={handleCopy}
              size="sm"
              type="button"
              variant="outline"
            >
              {copied ? <Check /> : <Clipboard />}
              {copied ? "Copied" : "Copy Blog"}
            </Button>
          </CardHeader>
          <CardContent>
            {!blog ? (
              <div className="flex min-h-[480px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm leading-6 text-slate-500">
                {isGenerating
                  ? "Fetching SEO data and writing the blog..."
                  : "Generated SEO title, metadata, outline, article, FAQs, links, image prompt, and SEO score suggestions will show here."}
              </div>
            ) : (
              <article className="space-y-7">
                <ResultBlock
                  title="1. Intent Analysis"
                  content={blog.intentAnalysis}
                />
                <ResultBlock
                  title="2. Full Outline"
                  content={blog.fullOutline}
                />
                <ResultBlock
                  title="3. Research & Evidence Plan"
                  content={blog.researchEvidencePlan}
                />
                <ResultBlock
                  title="4. Complete Blog Post"
                  content={blog.completeBlogPost}
                />

                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">5. SEO Block</h2>
                  <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                    <p>
                      <span className="font-medium text-slate-950">
                        Title tag:
                      </span>{" "}
                      {blog.seoBlock.metadata.titleTag}
                    </p>
                    <p>
                      <span className="font-medium text-slate-950">
                        Meta description:
                      </span>{" "}
                      {blog.seoBlock.metadata.metaDescription}
                    </p>
                    <p>
                      <span className="font-medium text-slate-950">
                        URL slug:
                      </span>{" "}
                      <span className="font-mono">
                        {blog.seoBlock.metadata.urlSlug}
                      </span>
                    </p>
                    <SubBlock
                      title="Keyword placement audit"
                      content={blog.seoBlock.keywordPlacementAudit}
                    />
                    <SubBlock
                      title="Schema opportunities"
                      content={blog.seoBlock.schemaOpportunities}
                    />
                    <SubBlock
                      title="Internal linking summary"
                      content={blog.seoBlock.internalLinkingSummary}
                    />
                    <SubBlock
                      title="External linking suggestions"
                      content={blog.seoBlock.externalLinkingSuggestions}
                    />
                    <SubBlock
                      title="Image/alt text suggestions"
                      content={blog.seoBlock.imageAltTextSuggestions}
                    />
                  </div>
                </section>

                <ResultBlock
                  title="6. Self-Check Results"
                  content={blog.selfCheckResults}
                />
              </article>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm leading-5 text-red-600">{message}</p>;
}

function ResultBlock({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
        {content}
      </div>
    </section>
  );
}

function SubBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="border-t border-slate-100 pt-3">
      <h3 className="font-medium text-slate-950">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-slate-700">{content}</p>
    </div>
  );
}
