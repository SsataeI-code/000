import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/coach/csv";

describe("toCsv", () => {
  it("returns empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("writes a header and rows", () => {
    const csv = toCsv([{ a: 1, b: "x" }, { a: 2, b: "y" }]);
    expect(csv).toBe("a,b\r\n1,x\r\n2,y");
  });

  it("quotes fields with commas, quotes, or newlines and doubles quotes", () => {
    const csv = toCsv([{ note: 'he said "hi", loudly', multi: "line1\nline2" }]);
    expect(csv).toBe('note,multi\r\n"he said ""hi"", loudly","line1\nline2"');
  });

  it("renders null/undefined as empty and JSON-stringifies objects", () => {
    const csv = toCsv([{ a: null, b: undefined, c: { x: 1 }, d: [1, 2] }]);
    expect(csv).toBe('a,b,c,d\r\n,,"{""x"":1}","[1,2]"');
  });

  it("unions keys across rows with missing fields", () => {
    const csv = toCsv([{ a: 1 }, { b: 2 }]);
    expect(csv).toBe("a,b\r\n1,\r\n,2");
  });
});
