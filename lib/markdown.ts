import type { TweetData } from "./types";

function wikilinkBody(content: string): string {
  let result = content;
  // Wrap @mentions in wikilinks: @user → [[@user]]
  result = result.replace(/(?<!\[)@(\w+)/g, "[[@$1]]");
  // Wrap #hashtags in wikilinks: #topic → [[topic]]
  result = result.replace(/#(\w+)/g, "[[$1]]");
  return result;
}

function formatArray(arr: string[]): string {
  if (arr.length === 0) return "[]";
  const needsQuotes = arr.some((item) => item.startsWith("@"));
  if (needsQuotes) {
    return `[${arr.map((item) => `"${item}"`).join(", ")}]`;
  }
  return `[${arr.join(", ")}]`;
}

export function toMarkdown(data: TweetData): string {
  const frontmatter = [
    "---",
    `source: ${data.source}`,
    `author: "${data.author}"`,
    `name: "${data.name}"`,
    `date: ${data.date}`,
    `type: ${data.type}`,
    `topics: ${formatArray(data.topics)}`,
    `mentions: ${formatArray(data.mentions)}`,
    "---",
  ].join("\n");

  const body = wikilinkBody(data.content);

  return `${frontmatter}\n\n${body}\n`;
}
