// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sanitizeObject, sanitizeString } from "@/lib/sanitize";

describe("server-side quote sanitization", () => {
  it("strips markup and event handlers while preserving useful text", () => {
    expect(sanitizeString('  <b>Acme</b><img src=x onerror="alert(1)">  ')).toBe("Acme");
  });

  it("discards executable and hidden content", () => {
    expect(sanitizeString("<script>alert(1)</script><style>body{display:none}</style><template>hidden</template>Deliver today"))
      .toBe("Deliver today");
  });

  it("keeps encoded markup inert and escapes special characters", () => {
    expect(sanitizeString("A & B &lt;script&gt;test&lt;/script&gt;"))
      .toBe("A &amp; B &lt;script&gt;test&lt;/script&gt;");
  });

  it("preserves international names, line breaks, and non-string fields", () => {
    const input = { name: "  Влад  ", notes: "Dock 1\nCall first", nested: { company: "<b>Acme</b>" }, appointment: true, count: 2, email: null };
    expect(sanitizeObject(input)).toEqual({ ...input, name: "Влад", nested: { company: "Acme" } });
    expect(input.nested.company).toBe("<b>Acme</b>");
    expect(sanitizeString(undefined)).toBe("");
  });
});
