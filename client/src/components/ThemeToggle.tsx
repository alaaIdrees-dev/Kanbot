import DarkMode from "@mui/icons-material/DarkMode";
import LightMode from "@mui/icons-material/LightMode";
import { IconButton, Tooltip } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";

/**
 * Dark ⇄ light switch for the top bar / user menu. The choice is persisted by MUI
 * (localStorage `mui-mode`), so it survives a reload; dark is the default.
 */
export function ThemeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  // MUI can't know the mode before it reads storage: render nothing until it does.
  if (!mode) return null;

  const resolved = mode === "system" ? systemMode : mode;
  const next = resolved === "dark" ? "light" : "dark";
  const label = `Switch to ${next} theme`;

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(next)} color="inherit">
        {resolved === "dark" ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
