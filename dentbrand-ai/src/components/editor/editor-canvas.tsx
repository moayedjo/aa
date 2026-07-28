"use client";

import { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Group,
  Rect,
  Ellipse,
  Text,
  Image as KonvaImage,
} from "react-konva";
import type Konva from "konva";

import { useEditorStore } from "@/stores/editor-store";
import type { DesignLayer } from "@/lib/designs/schema";

/**
 * The editing canvas. Internally the Stage uses the design's real export
 * dimensions; the browser only applies a visual scale, so stored
 * coordinates and sizes always stay in export space.
 */
export function EditorCanvas() {
  const canvas = useEditorStore((s) => s.canvas);
  const layers = useEditorStore((s) => s.layers);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const updateLayer = useEditorStore((s) => s.updateLayer);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [, setFontsTick] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const fit = Math.min(
        rect.width / canvas.width,
        rect.height / canvas.height
      );
      setScale(Math.max(fit, 0.02));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [canvas.width, canvas.height]);

  // Re-render text once web fonts finish loading.
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ordered = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  const selected = layers.find((l) => l.id === selectedId);

  return (
    <div
      ref={containerRef}
      className="flex flex-1 items-center justify-center overflow-hidden"
    >
      {scale > 0 && (
        <Stage
          width={canvas.width * scale}
          height={canvas.height * scale}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={(e) => {
            // Clicking empty space clears the selection.
            if (e.target === e.target.getStage()) select(null);
          }}
          className="shadow-lg"
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={canvas.width}
              height={canvas.height}
              fill={canvas.backgroundColor}
              listening={false}
            />
            {ordered.map((layer) => (
              <CanvasLayer
                key={layer.id}
                layer={layer}
                onSelect={() => select(layer.id)}
                onMove={(x, y) => updateLayer(layer.id, { x, y })}
              />
            ))}
            {selected && !selected.hidden && (
              <Rect
                x={selected.x}
                y={selected.y}
                width={selected.width}
                height={selected.height}
                stroke={selected.editable ? "#2563eb" : "#9ca3af"}
                strokeWidth={2 / scale}
                dash={selected.editable ? undefined : [8 / scale, 6 / scale]}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

function CanvasLayer({
  layer,
  onSelect,
  onMove,
}: {
  layer: DesignLayer;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
}) {
  if (layer.hidden) return null;

  const common = {
    x: layer.x,
    y: layer.y,
    opacity: layer.opacity ?? 1,
    // Locked layers cannot be dragged; they remain clickable so users can
    // inspect them and see the "locked" state in the panel.
    draggable: layer.editable,
    onClick: onSelect,
    onTap: onSelect,
    onDragStart: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
      onMove(Math.round(e.target.x()), Math.round(e.target.y())),
  };

  switch (layer.type) {
    case "text":
      return (
        <Text
          {...common}
          width={layer.width}
          height={layer.height}
          text={layer.text}
          fontFamily={`${layer.fontFamily}, sans-serif`}
          fontSize={layer.fontSize}
          fontStyle={layer.fontWeight >= 600 ? "bold" : "normal"}
          fill={layer.fill}
          align={layer.align}
          direction={layer.direction}
          lineHeight={layer.lineHeight ?? 1.2}
          wrap="word"
        />
      );
    case "shape":
      return layer.shape === "ellipse" ? (
        <Ellipse
          {...common}
          x={layer.x + layer.width / 2}
          y={layer.y + layer.height / 2}
          radiusX={layer.width / 2}
          radiusY={layer.height / 2}
          fill={layer.fill}
          onDragEnd={(e) =>
            onMove(
              Math.round(e.target.x() - layer.width / 2),
              Math.round(e.target.y() - layer.height / 2)
            )
          }
        />
      ) : (
        <Rect
          {...common}
          width={layer.width}
          height={layer.height}
          fill={layer.fill}
          cornerRadius={layer.cornerRadius ?? 0}
        />
      );
    case "image":
    case "logo":
      return <AssetImage layer={layer} common={common} />;
    case "icon":
      return (
        <Ellipse
          {...common}
          x={layer.x + layer.width / 2}
          y={layer.y + layer.height / 2}
          radiusX={layer.width / 2}
          radiusY={layer.height / 2}
          fill={layer.fill}
        />
      );
  }
}

interface CommonProps {
  x: number;
  y: number;
  opacity: number;
  draggable: boolean;
  onClick: () => void;
  onTap: () => void;
  onDragStart: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

function AssetImage({
  layer,
  common,
}: {
  layer: Extract<DesignLayer, { type: "image" | "logo" }>;
  common: CommonProps;
}) {
  const assetUrls = useEditorStore((s) => s.assetUrls);
  const url = layer.src ? assetUrls[layer.src] : undefined;
  const image = useHtmlImage(url);

  if (!image) {
    // Placeholder box for empty or still-loading image slots.
    return (
      <Rect
        {...common}
        width={layer.width}
        height={layer.height}
        fill="#e2e8f0"
        cornerRadius={"cornerRadius" in layer ? (layer.cornerRadius ?? 0) : 0}
        dash={[12, 8]}
        stroke="#94a3b8"
        strokeWidth={2}
      />
    );
  }

  if (layer.fit === "contain") {
    const ratio = Math.min(
      layer.width / image.width,
      layer.height / image.height
    );
    const drawnWidth = image.width * ratio;
    const drawnHeight = image.height * ratio;
    // Group carries the layer position so drag reports layer coordinates;
    // the image is centered inside it.
    return (
      <Group {...common}>
        <KonvaImage
          x={(layer.width - drawnWidth) / 2}
          y={(layer.height - drawnHeight) / 2}
          width={drawnWidth}
          height={drawnHeight}
          image={image}
        />
      </Group>
    );
  }

  // cover: crop the source to the slot's aspect ratio.
  const slotRatio = layer.width / layer.height;
  const imageRatio = image.width / image.height;
  let crop;
  if (imageRatio > slotRatio) {
    const cropWidth = image.height * slotRatio;
    crop = {
      x: (image.width - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: image.height,
    };
  } else {
    const cropHeight = image.width / slotRatio;
    crop = {
      x: 0,
      y: (image.height - cropHeight) / 2,
      width: image.width,
      height: cropHeight,
    };
  }

  return (
    <KonvaImage
      {...common}
      width={layer.width}
      height={layer.height}
      image={image}
      crop={crop}
      cornerRadius={"cornerRadius" in layer ? (layer.cornerRadius ?? 0) : 0}
    />
  );
}

function useHtmlImage(url: string | undefined): HTMLImageElement | null {
  const [loaded, setLoaded] = useState<{
    url: string;
    image: HTMLImageElement;
  } | null>(null);

  useEffect(() => {
    if (!url) return;
    const element = new window.Image();
    element.crossOrigin = "anonymous";
    element.onload = () => setLoaded({ url, image: element });
    element.src = url;
    return () => {
      element.onload = null;
    };
  }, [url]);

  // Deriving from the current url avoids showing a stale image after the
  // source changes or clears.
  return url && loaded?.url === url ? loaded.image : null;
}
