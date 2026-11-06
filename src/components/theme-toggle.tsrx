import { Check, Monitor, Moon, Sun } from "@octanejs/lucide";
import { useEffect, useEffectEvent, useState } from "octane";
import { applyTheme, readThemePreference, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Monitor }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/**
 * Header theme control: icon trigger + dropdown. Writes both the landing
 * key (`oxidean-theme`) and the docs key (`starlight-theme`) so the choice
 * follows the visitor between the marketing pages and Starlight.
 */
export function ThemeToggle({ className }: { className?: string }) @{
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const pref = readThemePreference();
    setTheme(pref);
    applyTheme(pref);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemePreference() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const onDocPointer = useEffectEvent((event: PointerEvent) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    if (t.closest("[data-theme-menu]")) return;
    setOpen(false);
  });

  const onDocKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") setOpen(false);
  });

  useEffect(() => {
    if (!open) return;
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [open]);

  function choose(next: ThemePreference) {
    setTheme(next);
    applyTheme(next);
    setOpen(false);
  }

  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[0];

  @{
    <div className={cn("relative", className)} data-theme-menu>
      <button
        type="button"
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground",
          "transition-colors duration-150 hover:border-foreground/30 hover:bg-muted",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "border-primary bg-muted",
        )}
        aria-label={`Theme: ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Theme: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
      >
        <current.Icon aria-hidden size={18} />
      </button>

      @if (open) {
        <div
          role="listbox"
          aria-label="Theme"
          className="absolute right-0 top-full z-50 mt-2 w-36 rounded-md border border-border bg-popover p-1 shadow-lg"
        >
          @for (const opt of OPTIONS; key opt.value) {
            const selected = theme === opt.value;
            const Icon = opt.Icon;
            <button
              type="button"
              role="option"
              aria-selected={selected}
              className={cn(
                "flex w-full items-center gap-2 rounded-[5px] px-2.5 py-2 text-left text-[13px]",
                "outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => choose(opt.value)}
            >
              <Icon aria-hidden size={15} />
              <span className="flex-1">{opt.label}</span>
              @if (selected) {
                <Check aria-hidden size={14} className="text-primary" />;
              }
            </button>;
          }
        </div>;
      }
    </div>;
    };
}
