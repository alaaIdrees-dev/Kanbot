import { useId, useState, type ReactNode } from "react";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Box, ButtonBase, Collapse, Paper, Typography } from "@mui/material";

interface BacklogSectionProps {
  title: string;
  /** e.g. "15 todos · 29 pts" — shown on the right of the header. */
  summary: string;
  /** Right-aligned buttons (Day 4: Edit / Start sprint on planned sprints). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * A collapsible group of todo rows with a grey header band (wireframe 04: "▾ Backlog · 15 todos · 29 pts").
 * Day 4 reuses it for each planned sprint, so the header takes `actions`.
 */
export function BacklogSection({ title, summary, actions, children }: BacklogSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "surface.sunken",
          borderBottom: expanded ? "1px solid" : "none",
          borderColor: "divider",
        }}
      >
        <Typography component="h2" variant="h6" sx={{ flex: 1, minWidth: 0, m: 0 }}>
          <ButtonBase
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={contentId}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              flexWrap: "wrap",
              gap: 1,
              width: "100%",
              textAlign: "left",
              font: "inherit",
              py: 1.25,
              pl: { xs: 1, sm: 1.5 },
              pr: 1,
            }}
          >
            <ExpandMore
              fontSize="small"
              aria-hidden="true"
              sx={{
                transition: (theme) => theme.transitions.create("transform"),
                transform: expanded ? "none" : "rotate(-90deg)",
              }}
            />
            <span>{title}</span>
            <Typography variant="body2" component="span" sx={{ color: "text.secondary" }}>
              {summary}
            </Typography>
          </ButtonBase>
        </Typography>
        {actions && <Box sx={{ display: "flex", gap: 1, pr: 1.5, flexShrink: 0 }}>{actions}</Box>}
      </Box>
      <Collapse in={expanded} id={contentId}>
        {children}
      </Collapse>
    </Paper>
  );
}
