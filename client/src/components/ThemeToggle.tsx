import { useId, useState } from "react";
import Check from "@mui/icons-material/Check";
import DarkMode from "@mui/icons-material/DarkMode";
import LightMode from "@mui/icons-material/LightMode";
import SettingsBrightness from "@mui/icons-material/SettingsBrightness";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";

type Mode = "light" | "dark" | "system";

const OPTIONS: { mode: Mode; label: string; icon: typeof LightMode }[] = [
  { mode: "light", label: "Light", icon: LightMode },
  { mode: "dark", label: "Dark", icon: DarkMode },
  { mode: "system", label: "System", icon: SettingsBrightness },
];

/**
 * Light / Dark / System switch for the top bar. The choice is persisted by MUI in localStorage
 * (`mui-mode`) and survives a reload; with no stored choice (or "System") the OS preference
 * decides and follows it live. `index.html` applies the same rule before first paint.
 */
export function ThemeToggle() {
  const menuId = useId();
  const { mode, systemMode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // MUI can't know the mode before it reads storage: render nothing until it does.
  if (!mode) return null;

  const resolved = mode === "system" ? systemMode : mode;
  const label = `Theme: ${OPTIONS.find((o) => o.mode === mode)?.label ?? "System"}`;
  const close = () => setAnchor(null);

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          aria-label={`${label}. Change theme`}
          aria-haspopup="menu"
          aria-controls={anchor ? menuId : undefined}
          aria-expanded={anchor ? "true" : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
          color="inherit"
        >
          {resolved === "dark" ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Menu id={menuId} anchorEl={anchor} open={!!anchor} onClose={close}>
        {OPTIONS.map(({ mode: value, label: text, icon: Icon }) => (
          <MenuItem
            key={value}
            selected={mode === value}
            role="menuitemradio"
            aria-checked={mode === value}
            onClick={() => {
              setMode(value);
              close();
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{text}</ListItemText>
            {mode === value && <Check fontSize="small" sx={{ ml: 1.5 }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
