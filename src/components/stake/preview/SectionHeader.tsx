// The preview's one section-header pattern: a title and an optional one-line
// description. Nothing else is allowed above a section.
//
// It replaced the uppercase-tracking eyebrow every stake panel used to carry, and
// then replaced its own replacement: the second pass numbered the sections
// (01 pick → 02 rates → 03 positions …) and the numbers read as a template. An
// eyebrow is supposed to name the topic in plain language, not enumerate; five
// identical headers already give the page its rhythm, so the index bought nothing
// and cost the page its voice. There is no `index` prop and no uppercase eyebrow
// anywhere under preview/.
//
// Rule for who renders it: whoever controls the section's visibility. Sections
// that can self-suppress (PositionsHub returns null with nothing staked) render
// their own header, so a header can never survive its body. Sections that always
// render get their header from StakePreview.
//
// Lives in its own file because preview-config.ts is a `.ts` module — the tokens
// it uses are all exported from there.
import { SECTION_DESC, SECTION_TITLE } from "@/components/stake/preview/preview-config";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  desc,
  className,
  children,
}: {
  title: string;
  /** Optional one-line description. Nothing else goes in the header. */
  desc?: string;
  className?: string;
  /** Trailing slot (badges). Sits on the title row, right-aligned. */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline gap-3">
        <h2 className={SECTION_TITLE}>{title}</h2>
        {children ? <div className="ml-auto shrink-0 self-center">{children}</div> : null}
      </div>
      {desc ? <p className={SECTION_DESC}>{desc}</p> : null}
    </div>
  );
}
