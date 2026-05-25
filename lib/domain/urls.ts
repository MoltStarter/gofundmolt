export type ExecutionProvider = "github" | "web";
export type ExecutionLinkType = "repository" | "issue" | "pull_request" | "discussion" | "release" | "demo" | "other";

export type ExecutionUrlClassification = {
  provider: ExecutionProvider;
  linkType: ExecutionLinkType;
};

export function classifyExecutionUrl(value: string): ExecutionUrlClassification | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  if (url.hostname === "github.com") {
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length === 2) {
      return { provider: "github", linkType: "repository" };
    }

    if (parts[2] === "issues" && parts[3]) {
      return { provider: "github", linkType: "issue" };
    }

    if (parts[2] === "pull" && parts[3]) {
      return { provider: "github", linkType: "pull_request" };
    }

    if (parts[2] === "discussions" && parts[3]) {
      return { provider: "github", linkType: "discussion" };
    }

    if (parts[2] === "releases") {
      return { provider: "github", linkType: "release" };
    }

    return { provider: "github", linkType: "other" };
  }

  return { provider: "web", linkType: "other" };
}

export function isValidExecutionUrl(value: string): boolean {
  return classifyExecutionUrl(value) !== null;
}
