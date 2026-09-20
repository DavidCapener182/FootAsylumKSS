"use client";
import { useEffect, useRef } from "react";
export function Signature({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    drawing = useRef(false),
    dirty = useRef(false);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (value) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, c.width, c.height);
      image.src = value;
    }
  }, [value]);
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <canvas
        ref={canvas}
        width={600}
        height={180}
        aria-label={`${label} drawing area`}
        className="h-32 w-full touch-none rounded-lg border border-slate-300 bg-white"
        onPointerDown={(e) => {
          if (disabled) return;
          const c = e.currentTarget,
            r = c.getBoundingClientRect(),
            ctx = c.getContext("2d")!;
          drawing.current = true;
          dirty.current = false;
          c.setPointerCapture(e.pointerId);
          ctx.beginPath();
          ctx.moveTo(
            ((e.clientX - r.left) * 600) / r.width,
            ((e.clientY - r.top) * 180) / r.height,
          );
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#17291f";
          ctx.lineCap = "round";
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const c = e.currentTarget,
            r = c.getBoundingClientRect(),
            ctx = c.getContext("2d")!;
          ctx.lineTo(
            ((e.clientX - r.left) * 600) / r.width,
            ((e.clientY - r.top) * 180) / r.height,
          );
          ctx.stroke();
          dirty.current = true;
        }}
        onPointerUp={(e) => {
          if (!drawing.current) return;
          drawing.current = false;
          if (dirty.current) onChange(e.currentTarget.toDataURL("image/png"));
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      {!disabled && (
        <button
          type="button"
          className="mt-1 min-h-10 text-sm underline"
          onClick={() => onChange("")}
        >
          Clear signature
        </button>
      )}
    </div>
  );
}
