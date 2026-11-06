import { lazy, Suspense } from "react";
import { Box, Link } from "@mui/material";

// The Markdown parser (unified/micromark/mdast, ~100 kB) is only needed once a reply is on screen,
// so it is fetched on first use instead of living in the entry chunk.
const Markdown = lazy(() => import("react-markdown"));

/**
 * Renders the Markdown of an AI reply (AI-1, AI-4). NFR-7: raw HTML is never rendered: react-markdown
 * does not parse it into elements by default, `skipHtml` drops it instead of showing it as text, and no
 * rehype-raw plugin is added. Its default URL filter also removes `javascript:` links.
 * Styling is by descendant selectors on the theme's tokens, so nothing here is hard-coded.
 */
export function AiMarkdown({ children }: { children: string }) {
  return (
    <Box
      sx={{
        overflowWrap: "anywhere",
        "& > :first-of-type": { mt: 0 },
        "& > :last-child": { mb: 0 },
        "& p": { my: 1 },
        "& h1, & h2, & h3, & h4, & h5, & h6": {
          typography: "h6",
          mt: 2,
          mb: 0.75,
        },
        "& ul, & ol": { my: 1, pl: 3 },
        "& li": { my: 0.25 },
        "& li > p": { my: 0 },
        "& blockquote": {
          my: 1,
          mx: 0,
          pl: 1.5,
          borderLeft: "3px solid",
          borderColor: "border.strong",
          color: "text.secondary",
        },
        "& hr": { my: 2, border: 0, borderTop: "1px solid", borderColor: "divider" },
        "& code": {
          fontFamily: "var(--kb-font-mono)",
          fontSize: "0.8125rem",
          px: 0.5,
          py: 0.125,
          borderRadius: 1,
          bgcolor: "surface.sunken",
        },
        "& pre": {
          my: 1,
          p: 1.5,
          overflowX: "auto",
          borderRadius: 2,
          bgcolor: "surface.sunken",
        },
        "& pre code": { p: 0, bgcolor: "transparent" },
      }}
    >
      {/* Until the parser arrives the reply shows as plain text (never as HTML), so it is not blank. */}
      <Suspense fallback={<Box sx={{ whiteSpace: "pre-wrap" }}>{children}</Box>}>
        <Markdown
          skipHtml
          components={{
            // AI text is untrusted: links open in a new tab without handing over `window.opener`.
            a: ({ href, children: label }) => (
              <Link href={href} target="_blank" rel="noopener noreferrer">
                {label}
              </Link>
            ),
          }}
        >
          {children}
        </Markdown>
      </Suspense>
    </Box>
  );
}
