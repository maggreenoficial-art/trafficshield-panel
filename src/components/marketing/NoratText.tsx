"use client";

import { Fragment } from "react";
import { NoratHighlight } from "@/components/marketing/NoratHighlight";

interface NoratTextProps {
  children: string;
  highlightClassName?: string;
}

export function NoratText({ children, highlightClassName }: NoratTextProps) {
  const parts = children.split(/(norat)/gi);

  return (
    <>
      {parts.map((part, index) =>
        /^norat$/i.test(part) ? (
          <NoratHighlight key={index} className={highlightClassName} />
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  );
}
