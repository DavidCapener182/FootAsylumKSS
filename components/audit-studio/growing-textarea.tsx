"use client";
import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
export function GrowingTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const resize = () => { node.style.height = "auto"; node.style.height = `${node.scrollHeight + node.offsetHeight - node.clientHeight}px`; };
    resize();
    let width = node.clientWidth;
    const observer = new ResizeObserver(() => { if (width !== node.clientWidth) { width = node.clientWidth; resize(); } });
    observer.observe(node);
    return () => observer.disconnect();
  }, [props.value]);
  return <textarea {...props} ref={ref} className={`${props.className || ""} resize-none overflow-hidden`} />;
}
