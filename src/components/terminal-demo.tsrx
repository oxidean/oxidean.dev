import { useEffect, useState } from "octane";
import { cn } from "@/lib/utils";

type TermLine = { kind: "cmd" | "chat" | "out" | "ok"; text: string };

/**
 * One-shot typing terminal for the hero. Always-dark chrome: a terminal
 * window reads correctly on both palettes. Reduced-motion renders the full
 * transcript instantly. `version` comes from docs-versions.lock.json, so the
 * demo tracks the latest Ox-Agent release automatically.
 */
export function TerminalDemo({
  className,
  version,
}: {
  className?: string;
  version: string;
}) @{
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);

  /* The real Ox-Agent path across both surfaces: `$` is the shell — init
     materializes .ox-agent, doctor validates — and `>` is the agent
     harness, where skills drive brainstorm → spec → plan. Output shapes
     are representative of the bundled skill set, not literal transcripts. */
  const SCRIPT: TermLine[] = [
    { kind: "cmd", text: "ox-agent init --integrate" },
    { kind: "out", text: "Initialized .ox-agent" },
    { kind: "cmd", text: "ox-agent doctor" },
    { kind: "ok", text: `Ox-Agent doctor: healthy (binary ${version})` },
    { kind: "out", text: "# then in your agent:" },
    { kind: "chat", text: "/brainstorm add a health-check endpoint" },
    { kind: "out", text: "WI-0001 · directions weighed, tradeoffs kept" },
    { kind: "chat", text: "/specify" },
    { kind: "out", text: "spec.md · acceptance criteria defined" },
    { kind: "chat", text: "/multi-stage-plan" },
    { kind: "out", text: "plan.md · staged work, gates defined" },
  ];
  const LINES = SCRIPT.map((l, i) => ({
    ...l,
    i,
    typed: l.kind === "cmd" || l.kind === "chat",
  }));

  useEffect(() => {
    if (line >= LINES.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLine(LINES.length);
      return;
    }
    const cur = LINES[line];
    if (cur.typed && chars < cur.text.length) {
      const t = setTimeout(() => setChars(chars + 1), 24);
      return () => clearTimeout(t);
    }
    const delay =
      cur.kind === "cmd" ? 420 : cur.kind === "chat" ? 560 : cur.kind === "out" ? 750 : 550;
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
        <span className="ml-2 font-mono text-xs text-[#7c8692]">oxidean · ox-agent</span>
      </div>
      <div className="min-h-[16.5rem] p-4 font-mono text-[13px] leading-6 sm:text-sm">
        @for (const l of LINES; key l.i) {
          const shown = l.i === line && l.typed ? l.text.slice(0, chars) : l.text;
          const cls = cn(
            "whitespace-pre-wrap break-all",
            (l.kind === "cmd" || l.kind === "chat") && "text-[#e8edf3]",
            l.kind === "out" && "text-[#7c8692]",
            l.kind === "ok" && "text-[#3fb950]",
          );
          @if (l.i <= line) {
            <div className={cls}>
              @if (l.kind === "cmd") {
                <span className="select-none text-[#7c8692]">{"$ "}</span>;
              }
              @if (l.kind === "chat") {
                <span className="select-none text-[#ff7b4a]">{"> "}</span>;
              }
              {shown as string}
              @if (l.i === line && l.typed) {
                <span className="ml-0.5 inline-block h-[1em] w-[0.55em] translate-y-[0.15em] animate-pulse bg-[#ff7b4a]" />;
              }
            </div>;
          }
        }
      </div>
    </div>;
    };
}
