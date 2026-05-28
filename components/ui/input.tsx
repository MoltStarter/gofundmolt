import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={["input", props.className].filter(Boolean).join(" ")} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={["input textarea", props.className].filter(Boolean).join(" ")} {...props} />;
}
