import { Check, Copy, X } from "@octanejs/lucide";
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => setFailed(false), 2400);
    return () => clearTimeout(t);
  }, [failed]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  @{
    <span className="inline-flex">
      <button
        type="button"
        onClick={copy}
        title={failed ? "Copy failed — select the command text" : "Copy to clipboard"}
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
        }
        @if (!copied && failed) {
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[12px] text-destructive">copy failed</span>
            <X aria-hidden size={14} className="text-destructive" />
          </span>;
        }
        @if (!copied && !failed) {
          <Copy
            aria-hidden
            size={14}
            className="text-muted-foreground transition-opacity group-hover:text-foreground"
          />;
        }
      </button>
      <span role="status" className="sr-only">
        {copied ? "Copied to clipboard" : failed ? "Copy failed — select the command text" : ""}
      </span>
    </span>;
    };
}
