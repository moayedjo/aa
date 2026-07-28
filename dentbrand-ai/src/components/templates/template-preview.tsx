"use client";

/* eslint-disable @next/next/no-img-element -- template images use short-lived signed URLs */

import { useEffect, useRef, useState } from "react";

import type {
  ResolvedLayer,
  ResolvedTemplate,
} from "@/lib/templates/resolve";

/**
 * HTML/CSS approximation of a template for gallery and admin previews.
 * The real canvas (React Konva) arrives in Phase 04; this renderer only
 * needs to be faithful enough to judge branding, layout and RTL.
 * Renders at natural canvas size and scales down via CSS transform, so
 * stored dimensions are never altered.
 */
export function TemplatePreview({
  resolved,
  className,
}: {
  resolved: ResolvedTemplate;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setScale(width / resolved.canvas.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [resolved.canvas.width]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        aspectRatio: `${resolved.canvas.width} / ${resolved.canvas.height}`,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {scale > 0 && (
        <div
          dir={resolved.language === "ar" ? "rtl" : "ltr"}
          lang={resolved.language}
          style={{
            width: resolved.canvas.width,
            height: resolved.canvas.height,
            backgroundColor: resolved.canvas.backgroundColor,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {resolved.layers.map((layer) => (
            <LayerView key={layer.id} layer={layer} />
          ))}
        </div>
      )}
    </div>
  );
}

function LayerView({ layer }: { layer: ResolvedLayer }) {
  if (layer.hidden) return null;

  const base: React.CSSProperties = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
    opacity: layer.opacity,
  };

  switch (layer.type) {
    case "text":
      return (
        <div
          style={{
            ...base,
            color: layer.fill,
            fontFamily: `'${layer.fontFamily}', sans-serif`,
            fontSize: layer.fontSize,
            fontWeight: layer.fontWeight,
            lineHeight: layer.lineHeight ?? 1.2,
            textAlign: layer.align,
            direction: layer.direction,
            overflow: "hidden",
          }}
        >
          {layer.text}
        </div>
      );
    case "shape":
      return (
        <div
          style={{
            ...base,
            backgroundColor: layer.fill,
            borderRadius:
              layer.shape === "ellipse" ? "50%" : (layer.cornerRadius ?? 0),
          }}
        />
      );
    case "image":
      return layer.src ? (
        <img
          src={layer.src}
          alt=""
          style={{
            ...base,
            objectFit: layer.fit,
            borderRadius: layer.cornerRadius ?? 0,
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            ...base,
            borderRadius: layer.cornerRadius ?? 0,
            background:
              "repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 20px, #f1f5f9 20px, #f1f5f9 40px)",
          }}
        />
      );
    case "logo":
      return layer.src ? (
        <img src={layer.src} alt="" style={{ ...base, objectFit: layer.fit }} />
      ) : (
        <div
          aria-hidden
          style={{
            ...base,
            borderRadius: 12,
            border: "3px dashed rgba(255,255,255,0.6)",
          }}
        />
      );
    case "icon":
      return (
        <div
          aria-hidden
          style={{ ...base, backgroundColor: layer.fill, borderRadius: "50%" }}
        />
      );
    case "group":
      return (
        <>
          {layer.children.map((child) => (
            <LayerView key={child.id} layer={child} />
          ))}
        </>
      );
  }
}
