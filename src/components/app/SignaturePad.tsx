import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  height?: number;
  label?: string;
  hint?: string;
  className?: string;
};

/**
 * Draw or upload a signature. Renders on a fixed-size canvas and exports
 * a transparent PNG data URL. Uploaded images are inlined as-is.
 */
export function SignaturePad({
  value,
  onChange,
  height = 140,
  label = "Signature",
  hint = "Draw here, or upload PNG/SVG",
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<"draw" | "preview">(value ? "preview" : "draw");

  useEffect(() => {
    if (value) setMode("preview");
  }, [value]);

  function ctx() {
    const c = canvasRef.current;
    if (!c) return null;
    return c.getContext("2d");
  }

  function pointer(e: PointerEvent | React.PointerEvent) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pointer(e);
  }
  function onMove(e: React.PointerEvent) {
    if (!drawing.current) return;
    const c = ctx();
    if (!c || !last.current) return;
    const p = pointer(e);
    c.strokeStyle = "#0B1220";
    c.lineWidth = 2.4;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(last.current.x, last.current.y);
    c.lineTo(p.x, p.y);
    c.stroke();
    last.current = p;
  }
  function onUp() {
    drawing.current = false;
    last.current = null;
    const c = canvasRef.current;
    if (!c) return;
    onChange(c.toDataURL("image/png"));
  }

  function clear() {
    const c = ctx();
    const el = canvasRef.current;
    if (!c || !el) return;
    c.clearRect(0, 0, el.width, el.height);
    onChange(null);
    setMode("draw");
  }

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(f);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3 w-3" /> Upload
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-[11px] text-destructive hover:text-destructive"
            onClick={clear}
          >
            <Eraser className="h-3 w-3" /> Clear
          </Button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div
        className="relative overflow-hidden rounded-md border border-dashed border-border bg-white"
        style={{ height }}
      >
        {mode === "preview" && value ? (
          <button
            type="button"
            onClick={() => setMode("draw")}
            className="group grid h-full w-full place-items-center bg-white"
            title="Click to redraw"
          >
            <img src={value} alt="Signature preview" className="max-h-[80%] max-w-[80%] object-contain" />
            <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white opacity-0 transition-opacity group-hover:opacity-100">
              Click to redraw
            </span>
          </button>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={640}
              height={height * 2}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
              className="h-full w-full cursor-crosshair touch-none"
            />
            <div className="pointer-events-none absolute inset-x-4 bottom-2 flex items-center justify-between text-[10px] text-neutral-400">
              <span className="flex items-center gap-1">
                <PenLine className="h-3 w-3" /> {hint}
              </span>
              <span>Signature line</span>
            </div>
            <div className="pointer-events-none absolute inset-x-6 bottom-6 h-px bg-neutral-300" />
          </>
        )}
      </div>
    </div>
  );
}
