import { describe, it, expect } from "vitest";
import { renderPrompt } from "./index.ts";

describe("renderPrompt", () => {
  describe("agent-instructions", () => {
    it("injects currentDate", () => {
      const { prompt } = renderPrompt("agent-instructions", {
        currentDate: "March 31, 2026, 10:00 AM",
      });

      expect(prompt).toContain("March 31, 2026, 10:00 AM");
    });

    it("renders empty string for missing currentDate", () => {
      const { prompt } = renderPrompt("agent-instructions");

      expect(prompt).toContain("Current date and time: ");
      expect(prompt).not.toContain("{{currentDate}}");
    });

    it("contains expected static content", () => {
      const { prompt } = renderPrompt("agent-instructions", {
        currentDate: "now",
      });

      expect(prompt).toContain("research assistant");
      expect(prompt).toContain("searchWeb");
      expect(prompt).toContain("markdown links");
    });
  });

  describe("summarize-url", () => {
    it("injects all variables", () => {
      const { prompt } = renderPrompt("summarize-url", {
        query: "climate change",
        title: "Nature Article",
        url: "https://example.com/article",
        date: "2024-01-01",
        conversation: "User asked about climate",
        scrapedContent: "Global temperatures are rising.",
      });

      expect(prompt).toContain("climate change");
      expect(prompt).toContain("Nature Article");
      expect(prompt).toContain("https://example.com/article");
      expect(prompt).toContain("2024-01-01");
      expect(prompt).toContain("User asked about climate");
      expect(prompt).toContain("Global temperatures are rising.");
    });

    it("does not escape XML tags or special characters in scrapedContent", () => {
      const { prompt } = renderPrompt("summarize-url", {
        query: "test",
        title: "Title",
        url: "https://example.com",
        date: "2024-01-01",
        conversation: "",
        scrapedContent: "<article>Some <b>bold</b> content & more</article>",
      });

      expect(prompt).toContain(
        "<article>Some <b>bold</b> content & more</article>",
      );
    });
  });

  describe("factuality", () => {
    it("injects question, groundTruth, and submission", () => {
      const { prompt } = renderPrompt("factuality", {
        question: "What is the capital of France?",
        groundTruth: "Paris",
        submission: "The capital of France is Paris.",
      });

      expect(prompt).toContain("What is the capital of France?");
      expect(prompt).toContain("Paris");
      expect(prompt).toContain("The capital of France is Paris.");
    });

    it("contains expected structural markers", () => {
      const { prompt } = renderPrompt("factuality", {
        question: "Q",
        groundTruth: "GT",
        submission: "S",
      });

      expect(prompt).toContain("[Question]:");
      expect(prompt).toContain("[Expert]:");
      expect(prompt).toContain("[Submission]:");
    });
  });

  describe("caching", () => {
    it("renders correctly on repeated calls with different data", () => {
      renderPrompt("agent-instructions", { currentDate: "first call" });
      const { prompt } = renderPrompt("agent-instructions", {
        currentDate: "second call",
      });

      expect(prompt).toContain("second call");
      expect(prompt).not.toContain("first call");
    });
  });
});
