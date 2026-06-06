const assert = require("node:assert/strict");
const test = require("node:test");
const { formatMarkdown } = require("../service/markdownFormatter");

test("removes emphasis styling from ATX and setext headings", () => {
    const input = [
        "# **Main heading**",
        "## *Bolded text*",
        "",
        "Section with _styled_ and __bold text__",
        "--------------------------",
        "",
        "Body with **bold text**.",
    ].join("\n");

    assert.equal(formatMarkdown(input), [
        "# Main heading",
        "## Bolded text",
        "",
        "Section with styled and bold text",
        "--------------------------",
        "",
        "Body with **bold text**.",
    ].join("\n"));
});

test("formats nested headings and removes combined emphasis", () => {
    const input = [
        "> ## __Quoted heading__",
        "- ### ***List heading***",
    ].join("\n");

    assert.equal(formatMarkdown(input), [
        "> ## Quoted heading",
        "- ### List heading",
    ].join("\n"));
});

test("does not modify code blocks, inline code, or escaped markers", () => {
    const input = [
        "# `**Code**` and **text**",
        "# \\**Literal markers\\**",
        "",
        "```markdown",
        "# **Code block heading**",
        "```",
    ].join("\n");

    assert.equal(formatMarkdown(input), [
        "# `**Code**` and text",
        "# \\**Literal markers\\**",
        "",
        "```markdown",
        "# **Code block heading**",
        "```",
    ].join("\n"));
});

test("preserves CRLF line endings", () => {
    assert.equal(
        formatMarkdown("# **Heading**\r\n\r\nText\r\n"),
        "# Heading\r\n\r\nText\r\n",
    );
});
