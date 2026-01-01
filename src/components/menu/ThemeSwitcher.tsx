import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themes = [
  { value: "system", icon: Monitor, labelKey: "theme.auto" },
  { value: "light", icon: Sun, labelKey: "theme.light" },
  { value: "dark", icon: Moon, labelKey: "theme.dark" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const currentTheme = themes.find((t) => t.value === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <CurrentIcon className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className={`cursor-pointer gap-2 ${theme === themeOption.value ? "bg-accent" : ""}`}
            >
              <Icon className="w-4 h-4" />
              {t(themeOption.labelKey)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
