import { describe, expect, it } from "vitest";
import { classifyExecutionUrl, isValidExecutionUrl } from "@/lib/domain/urls";

describe("execution url validation", () => {
  it("accepts github repositories, issues, pull requests, discussions, and releases", () => {
    expect(classifyExecutionUrl("https://github.com/org/repo")).toEqual({ provider: "github", linkType: "repository" });
    expect(classifyExecutionUrl("https://github.com/org/repo/issues/12")).toEqual({ provider: "github", linkType: "issue" });
    expect(classifyExecutionUrl("https://github.com/org/repo/pull/34")).toEqual({ provider: "github", linkType: "pull_request" });
    expect(classifyExecutionUrl("https://github.com/org/repo/discussions/56")).toEqual({ provider: "github", linkType: "discussion" });
    expect(classifyExecutionUrl("https://github.com/org/repo/releases/tag/v1")).toEqual({ provider: "github", linkType: "release" });
  });

  it("accepts https demos as other links", () => {
    expect(classifyExecutionUrl("https://demo.example.com")).toEqual({ provider: "web", linkType: "other" });
  });

  it("rejects non-http urls", () => {
    expect(isValidExecutionUrl("javascript:alert(1)")).toBe(false);
    expect(isValidExecutionUrl("ftp://example.com/repo")).toBe(false);
  });
});
