const MarkdownIt = require("markdown-it");

const markdown = new MarkdownIt();

function replaceEmphasisMarkers(value, marker, limit) {
    if (!limit) return value;

    const escapedMarker = marker.replace(/\*/g, "\\*");
    const prefix = marker.includes("_") ? "(^|[^\\\\\\w])" : "(^|[^\\\\])";
    const suffix = marker.includes("_") ? "(?!\\w)" : "";
    const pattern = new RegExp(`${prefix}${escapedMarker}(?=\\S)(.*?\\S)${escapedMarker}${suffix}`, "g");
    let replacements = 0;

    return value.replace(pattern, (match, leading, inner) => {
        if (replacements >= limit || inner.endsWith("\\")) return match;
        replacements++;
        return `${leading}${inner}`;
    });
}

function transformOutsideCodeSpans(value, transform) {
    let result = "";
    let plainStart = 0;
    let index = 0;

    while (index < value.length) {
        if (value[index] !== "`") {
            index++;
            continue;
        }

        let markerEnd = index;
        while (value[markerEnd] === "`") markerEnd++;
        const marker = value.slice(index, markerEnd);
        const closingIndex = value.indexOf(marker, markerEnd);

        if (closingIndex === -1) {
            index = markerEnd;
            continue;
        }

        result += transform(value.slice(plainStart, index));
        result += value.slice(index, closingIndex + marker.length);
        index = closingIndex + marker.length;
        plainStart = index;
    }

    return result + transform(value.slice(plainStart));
}

function normalizeHeadingContent(content, emphasisMarkers) {
    return transformOutsideCodeSpans(content, value => {
        let normalized = value;
        normalized = replaceEmphasisMarkers(normalized, "**", emphasisMarkers["**"]);
        normalized = replaceEmphasisMarkers(normalized, "__", emphasisMarkers["__"]);
        normalized = replaceEmphasisMarkers(normalized, "*", emphasisMarkers["*"]);
        normalized = replaceEmphasisMarkers(normalized, "_", emphasisMarkers["_"]);
        return normalized;
    });
}

function formatMarkdown(content) {
    const chunks = content.split(/(\r\n|\n|\r)/);
    const lines = chunks.filter((_, index) => index % 2 === 0);
    const tokens = markdown.parse(lines.join("\n"), {});

    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.type !== "inline"
            || tokens[index - 1]?.type !== "heading_open"
            || !token.map
            || !token.children) {
            continue;
        }

        const emphasisMarkers = token.children.reduce((markers, child) => {
            if (child.type === "strong_open" || child.type === "em_open") {
                markers[child.markup] = (markers[child.markup] || 0) + 1;
            }
            return markers;
        }, {});

        if (!Object.keys(emphasisMarkers).length) continue;

        const lineIndex = token.map[0];
        const line = lines[lineIndex];
        const contentIndex = line.indexOf(token.content);
        if (contentIndex === -1) continue;

        const normalizedHeading = normalizeHeadingContent(token.content, emphasisMarkers);
        lines[lineIndex] = line.slice(0, contentIndex)
            + normalizedHeading
            + line.slice(contentIndex + token.content.length);
    }

    let lineIndex = 0;
    return chunks.map((chunk, index) => {
        if (index % 2 === 1) return chunk;
        return lines[lineIndex++];
    }).join("");
}

module.exports = { formatMarkdown };
