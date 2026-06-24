/**
 * Site-wide branding footer (Conthrax font, 12px).
 * Default colors are black bg / gold text — themes can override
 * by passing a className like `bg-card text-foreground`.
 */
interface LiwaMenuFooterProps {
  className?: string;
}

export function LiwaMenuFooter({ className }: LiwaMenuFooterProps) {
  return (
    <div
      className={`w-full text-center py-3 ${className ?? "bg-black text-indigo-400"}`}
      style={{ fontFamily: "'Conthrax', 'Orbitron', monospace", fontSize: "12px", letterSpacing: "0.02em" }}
    >
      <a
        href="https://www.liwamenu.com"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        LiwaMenu - www.liwamenu.com
      </a>
    </div>
  );
}
