import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Bigface variants, layered on shadcn's Button without touching components/ui/button.tsx.
// `tone` picks a Bigface look; shadcn's own `variant` / `size` still pass straight through. The BG
// classes are merged last, so on a conflict (background, padding, radius…) they win over shadcn's.
export const bgButtonVariants = cva("", {
  variants: {
    tone: {
      none: "",
      // the bright call to action: blue gradient plate, dark ink
      glow: "h-auto rounded-full bg-transparent hover:bg-transparent px-[1.15rem] py-[0.7rem] text-[0.94rem] font-semibold no-underline bg-linear-135 from-bf-blue to-bf-light-blue text-ink-on-bright shadow-[0_8px_26px_color-mix(in_srgb,var(--bf-blue)_30%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--bf-caret)_50%,transparent)] hover:-translate-y-0.5 hover:from-bf-light-blue hover:to-bf-pale-blue hover:text-ink-on-bright hover:shadow-[0_14px_34px_color-mix(in_srgb,var(--bf-blue)_40%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--bf-caret)_60%,transparent)]",
      // quiet outline pill next to the glow button
      ghost:
        "h-auto rounded-full border-bf-selection bg-bf-border/6 px-[1.15rem] py-[0.7rem] text-[0.94rem] font-semibold text-foreground no-underline hover:border-bf-blue hover:bg-bf-blue/8 hover:text-bf-blue",
      // the small mono "copy" pill
      copy: "h-auto cursor-pointer gap-1.5 rounded-full border-bf-selection bg-bf-border/8 px-[0.6rem] py-[0.35rem] font-code text-[0.72rem] font-normal tracking-[0.04em] text-bf-fg-muted hover:border-bf-blue hover:bg-bf-blue/12 hover:text-foreground [&.done]:border-bf-lime [&.done]:text-bf-lime",
      // filter / chip that fills when aria-pressed
      chip: "h-auto cursor-pointer rounded-full border-bf-selection bg-bf-border/5 px-[0.85rem] py-[0.4rem] text-[0.82rem] font-medium text-bf-fg-muted hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-linear-135 aria-pressed:from-bf-pale-blue aria-pressed:to-bf-blue aria-pressed:text-ink-on-bright",
    },
  },
  defaultVariants: { tone: "none" },
});

type ButtonProps = React.ComponentProps<typeof Button>;
export type BGButtonProps = Omit<ButtonProps, "asChild"> &
  VariantProps<typeof bgButtonVariants> & {
    /** Render as a link (shadcn's asChild + <a>), so .astro pages can pass plain text children. */
    href?: string;
  };

export function BGButton({
  tone,
  className,
  href,
  children,
  variant,
  size,
  ...props
}: BGButtonProps) {
  const classes = cn(bgButtonVariants({ tone }), className);
  const outline = tone === "ghost" || tone === "copy" || tone === "chip" ? "outline" : variant;
  if (href !== undefined) {
    const { type: _type, ...rest } = props;
    return (
      <Button asChild variant={outline} size={size} className={classes}>
        <a href={href} {...(rest as React.ComponentProps<"a">)}>
          {children}
        </a>
      </Button>
    );
  }
  return (
    <Button type="button" variant={outline} size={size} className={classes} {...props}>
      {children}
    </Button>
  );
}
