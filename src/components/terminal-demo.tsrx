import { useEffect, useState } from "octane";
import { cn } from "@/lib/utils";

type TermLine = { kind: "cmd" | "out" | "ok"; text: string };

/* The real self-host eval path — clone ships deploy/selfhost, the compose
   bundle runs from published images with no build step. */
const SCRIPT: TermLine[] = [
  { kind: "cmd", text: "git clone --depth 1 https://github.com/oxidean/oxidean" },
  { kind: "cmd", text: "cd oxidean/deploy/selfhost && cp .env.example .env" },
  { kind: "cmd", text: "docker compose up -d" },
  { kind: "out", text: "[+] Running 3/3 — postgres, api, web" },
  { kind: "ok", text: "Oxidean is up — /setup walks you through the admin account" },
];
const LINES = SCRIPT.map((l, i) => ({ ...l, i }));

/**
 * One-shot typing terminal for the hero. Always-dark chrome — a terminal
 * window reads correctly on both palettes. Reduced-motion renders the full
 * transcript instantly.
 */
export function TerminalDemo({ className }: { className?: string }) @{
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (line >= LINES.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLine(LINES.length);
      return;
    }
    const cur = LINES[line];
    if (cur.kind === "cmd" && chars < cur.text.length) {
      const t = setTimeout(() => setChars(chars + 1), 24);
      return () => clearTimeout(t);
    }
    const delay = cur.kind === "cmd" ? 420 : cur.kind === "out" ? 750 : 550;
    const t = setTimeout(() => {
      setLine(line + 1);
      setChars(0);
    }, delay);
    return () => clearTimeout(t);
  }, [line, chars]);

  @{
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[#2a2d33] bg-[#0d0e10] shadow-2xl",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-[#23262c] px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-[#7c8692]">oxidean — self-host</span>
      </div>
      <div className="min-h-[10rem] p-4 font-mono text-[13px] leading-6 sm:text-sm">
        @for (const l of LINES; key l.i) {
          const shown = l.i === line && l.kind === "cmd" ? l.text.slice(0, chars) : l.text;
          const cls = cn(
            "whitespace-pre-wrap break-all",
            l.kind === "cmd" && "text-[#e8edf3]",
            l.kind === "out" && "text-[#7c8692]",
            l.kind === "ok" && "text-[#3fb950]",
          );
          @if (l.i <= line) {
            <div className={cls}>
              @if (l.kind === "cmd") {
                <span className="select-none text-[#7c8692]">{"$ "}</span>;
              }
              {shown as string}
              @if (l.i === line && l.kind === "cmd") {
                <span className="ml-0.5 inline-block h-[1em] w-[0.55em] translate-y-[0.15em] animate-pulse bg-[#ff7b4a]" />;
              }
            </div>;
          }
        }
      </div>
    </div>;
    };
}
