"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Dinero y compras",
    emojis: [
      "💰", "💵", "💶", "💷", "💸", "💳", "🪙", "🏦", "🧾", "💲",
      "📊", "📈", "📉", "🛒", "🛍️", "🏪", "🏬", "💎", "🎰", "🤑",
    ],
  },
  {
    label: "Hogar",
    emojis: [
      "🏠", "🏡", "🏢", "🛖", "🏗️", "🔑", "🛋️", "🛏️", "🪴", "🧹",
      "🧺", "🪣", "🔧", "🔨", "🪛", "💡", "🔌", "🚿", "🛁", "🧯",
      "🪟", "🚪", "🧊", "♨️",
    ],
  },
  {
    label: "Comida y bebida",
    emojis: [
      "🍕", "🍔", "🍟", "🌮", "🌯", "🥗", "🍣", "🍱", "🍜", "🍝",
      "🥘", "🍳", "🥐", "🍞", "🧀", "🥩", "🍖", "🥚", "🥛", "🧃",
      "☕", "🍺", "🍷", "🥤", "🍰", "🎂", "🍫", "🍩", "🍪", "🍎",
      "🍌", "🥑", "🥕", "🍅", "🌽", "🛒",
    ],
  },
  {
    label: "Transporte",
    emojis: [
      "🚗", "🚙", "🚕", "🏎️", "🚌", "🚎", "🚐", "🚑", "🚒", "🛻",
      "🏍️", "🛵", "🚲", "🛴", "✈️", "🚂", "🚆", "🚇", "🚊", "🚁",
      "⛽", "🅿️", "🛞", "🛣️", "⛵", "🚢",
    ],
  },
  {
    label: "Salud y deporte",
    emojis: [
      "🏥", "💊", "🩺", "🩹", "🦷", "👓", "🏋️", "🧘", "🚴", "🏊",
      "⚽", "🏀", "🎾", "🏓", "🎯", "🧗", "🤸", "🏄", "⛷️", "🏌️",
    ],
  },
  {
    label: "Educación y trabajo",
    emojis: [
      "📚", "🎓", "✏️", "📝", "💻", "🖥️", "⌨️", "🖨️", "📱", "📐",
      "🔬", "🧪", "🎒", "📎", "📌", "📋", "🗂️", "📂", "📁", "🗃️",
    ],
  },
  {
    label: "Ocio y entretenimiento",
    emojis: [
      "🎮", "🎬", "🎭", "🎪", "🎤", "🎧", "🎵", "🎶", "🎸", "🎹",
      "📺", "📻", "🎲", "🎳", "🎱", "🎨", "🖌️", "📷", "📸", "🎥",
      "🎠", "🎡", "🎢", "🍿", "🎻", "🥁",
    ],
  },
  {
    label: "Viajes y vacaciones",
    emojis: [
      "🏖️", "🏔️", "⛰️", "🗻", "🏕️", "🌴", "🌊", "🗼", "🗽", "🏰",
      "🕌", "⛪", "🛕", "🗿", "🌍", "🌎", "🌏", "🧳", "🗺️", "🏝️",
      "🎑", "🌅", "🌄",
    ],
  },
  {
    label: "Mascotas y animales",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
      "🦁", "🐸", "🐵", "🐔", "🐧", "🐦", "🦜", "🐟", "🐠", "🐢",
      "🐍", "🦎", "🐴", "🦄", "🐝", "🐛", "🦋",
    ],
  },
  {
    label: "Ropa y belleza",
    emojis: [
      "👕", "👔", "👗", "👠", "👟", "🧢", "👒", "🧣", "🧤", "🧥",
      "👜", "👝", "🎀", "💄", "💅", "✂️", "🪮", "🧴", "🪥", "👙",
      "👘", "🥿", "🩴",
    ],
  },
  {
    label: "Personas y familia",
    emojis: [
      "👶", "👧", "👦", "👩", "👨", "👵", "👴", "👪", "💑", "❤️",
      "💝", "🎁", "🎉", "🎊", "🎈", "🎄", "🎃", "🎗️", "💐", "🌹",
    ],
  },
  {
    label: "Servicios y suscripciones",
    emojis: [
      "📡", "📶", "🌐", "📧", "📮", "📦", "🔒", "🛡️", "⚙️", "🔔",
      "📰", "🗞️", "📄", "🖊️", "✉️", "🏷️",
    ],
  },
  {
    label: "Otros",
    emojis: [
      "⭐", "🌟", "✨", "🔥", "💧", "🌈", "☀️", "🌙", "⚡", "❄️",
      "🍀", "🌻", "🌸", "🪻", "♻️", "🚨", "📌", "🏴", "🏳️", "📦",
    ],
  },
];

type Props = {
  value?: string;
  onChange: (emoji: string) => void;
};

export function EmojiPicker({ value, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const allEmojis = useMemo(
    () => EMOJI_GROUPS.flatMap((g) => g.emojis),
    []
  );

  const filtered = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    // Simple: just filter groups that have emojis (can't search by name without a map, so show all when searching)
    return EMOJI_GROUPS.map((g) => ({
      ...g,
      show: g.label.toLowerCase().includes(q),
    })).filter((g) => g.show);
  }, [search]);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors hover:bg-muted/40 cursor-pointer"
      >
        {value ? (
          <span className="text-lg">{value}</span>
        ) : (
          <span className="text-muted-foreground">Elegir emoji</span>
        )}
      </button>
    );
  }

  const groups = filtered || EMOJI_GROUPS;

  return (
    <div className="rounded-md border border-input bg-background shadow-xs">
      <div className="border-b border-border/50 p-2">
        <Input
          placeholder="Buscar categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
          autoFocus
        />
      </div>
      <div className="max-h-48 overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-0.5">
              {group.emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={() => {
                    onChange(emoji);
                    setExpanded(false);
                    setSearch("");
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded text-base transition-colors hover:bg-muted cursor-pointer ${
                    value === emoji ? "bg-primary/15 ring-1 ring-primary/40" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
