/**
 * Unit tests for decodeEntities, the helper every title shown on the site
 * goes through (the search autocomplete included).
 */

import { describe, it, expect } from "vitest";
import { decodeEntities } from "./decode-entities";

describe("decodeEntities", () => {
  it("decodes the quote entity stored in some product titles", () => {
    expect(decodeEntities("Samsung TV 55&quot; QLED")).toBe('Samsung TV 55" QLED');
  });

  it("decodes numeric entities, decimal and hex", () => {
    expect(decodeEntities("a&#39;b &#x41;")).toBe("a'b A");
  });

  it("decodes &amp; last so it never double-decodes", () => {
    expect(decodeEntities("&amp;lt;")).toBe("&lt;");
  });

  it("leaves unknown entities and plain text unchanged", () => {
    expect(decodeEntities("Fish &chips; 55 inch")).toBe("Fish &chips; 55 inch");
  });

  it("returns an empty string for null, undefined and empty input", () => {
    expect(decodeEntities(null)).toBe("");
    expect(decodeEntities(undefined)).toBe("");
    expect(decodeEntities("")).toBe("");
  });
});
