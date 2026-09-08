import { describe, it, expect } from "vitest";
import { newMessageEmailContent } from "@/lib/email/new-message";

describe("newMessageEmailContent", () => {
  it("names the client and links to their thread", () => {
    const { subject, text, html } = newMessageEmailContent("Eddy", "Hey coach, quick question", "client-123");
    expect(subject).toBe("New message from Eddy");
    expect(text).toContain("Eddy");
    expect(text).toContain("/coach/messages/client-123");
    expect(html).toContain("/coach/messages/client-123");
  });

  it("escapes HTML in the client name and message", () => {
    const { html } = newMessageEmailContent("<b>x</b>", "<script>alert(1)</script>", "c1");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("truncates a long preview", () => {
    const long = "a".repeat(500);
    const { text } = newMessageEmailContent("Sam", long, "c1");
    expect(text).toContain("…");
    expect(text).not.toContain("a".repeat(400));
  });

  it("falls back to a generic name when blank", () => {
    expect(newMessageEmailContent("   ", "hi", "c1").subject).toBe("New message from A client");
  });
});
