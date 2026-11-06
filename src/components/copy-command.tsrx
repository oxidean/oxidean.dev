import { Check, Copy } from "@octanejs/lucide";
import { useEffect, useState } from "octane";
import { cn } from "@/lib/utils";

/**
 * Mono command pill with a copy affordance — used for install one-liners.
 * Pure clipboard UX; the command itself is passed in as a prop.
 */
export function CopyCommand({
  command,
  className,
}: {
  command: string;
  className?: string;
}) @{
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // clipboard API unavailable (non-secure context) — leave the pill readable
    }
  }

  @{
    <button
      type="button"
      onClick={copy}
      title="Copy to clipboard"
      className={cn(
        "group inline-flex h-11 items-center gap-3 rounded-md border border-border bg-card pl-4 pr-3",
        "transition-colors duration-150 hover:border-foreground/30 hover:bg-muted",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <code className="font-mono text-[13px] text-foreground">{command}</code>
      @if (copied) {
        <Check aria-hidden size={14} className="text-success" />;
      } @else {
        <Copy
          aria-hidden
          size={14}
          className="text-muted-foreground transition-opacity group-hover:text-foreground"
        />;
      }
    </button>;
    };
}
