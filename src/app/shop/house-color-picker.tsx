"use client";

import { useState } from "react";

const HOUSE_COLORS = [
  "#6090e0", "#14F195", "#f0c060", "#e040c0",
  "#60c0f0", "#f85149", "#a78bfa", "#fb923c",
];

interface HouseColorPickerProps {
  accent: string;
  currentColor: string | null;
}

export default function HouseColorPicker({ accent, currentColor }: HouseColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor || "#6090e0");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleColorSelect = async (color: string) => {
    setSelectedColor(color);
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/resident/customize", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ house_color: color }),
      });
      if (res.ok) {
        setFeedback("Saved!");
        setTimeout(() => setFeedback(null), 2000);
      }
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  return (
    <div className="border-[3px] border-border bg-bg-raised p-6 sm:p-10">
      <h2 className="text-xs" style={{ color: accent }}>
        House Color
      </h2>
      <p className="mt-2 text-[10px] leading-relaxed text-muted normal-case">
        Choose a color for your house in the city. Your house will glow with
        this tint.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {HOUSE_COLORS.map((color) => (
          <button
            key={color}
            disabled={saving}
            onClick={() => handleColorSelect(color)}
            className="h-8 w-8 border-2 transition-transform hover:scale-110 disabled:opacity-50"
            style={{
              backgroundColor: color,
              borderColor: selectedColor === color ? "#fff" : "transparent",
              borderWidth: selectedColor === color ? "3px" : "2px",
            }}
          />
        ))}
      </div>
      {feedback && (
        <p className="mt-2 text-[10px]" style={{ color: "#14F195" }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
