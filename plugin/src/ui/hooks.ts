import { type TooltipOptions, setTooltip } from "obsidian";
import { useEffect } from "react";

export let useObsidianTooltip = (
  ref: HTMLElement | null,
  text: string,
  options?: TooltipOptions,
) => {
  useEffect(() => {
    if (ref !== null && text.length > 0) {
      setTooltip(ref, text, options);
    }
  }, [ref, text, options]);
};
