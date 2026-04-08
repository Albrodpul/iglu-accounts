"use client";

import { useEffect } from "react";

const NAME_KEY = "iglu:user:name";

export function PersistUserName({ name }: { name: string | null }) {
  useEffect(() => {
    if (name) {
      localStorage.setItem(NAME_KEY, name);
    }
  }, [name]);

  return null;
}
