import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";

type ButtonTone = "primary" | "secondary" | "ghost" | "danger";

function classes(tone: ButtonTone, className?: string) {
  return ["button", `button-${tone}`, className].filter(Boolean).join(" ");
}

export function Button({
  tone = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return <button className={classes(tone, className)} {...props} />;
}

export function ButtonLink({
  tone = "primary",
  className,
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  tone?: ButtonTone;
  href: Route;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={classes(tone, className)} {...props}>
      {children}
    </Link>
  );
}
