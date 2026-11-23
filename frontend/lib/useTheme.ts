import { useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "simula-theme";
const THEME_EVENT = "simula-theme-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function getSnapshot(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getServerSnapshot(): Theme {
  return "light";
}

/** Tema terang/gelap: disimpan di localStorage dan dipasang ke atribut data-theme di <html>. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function setTheme(value: Theme) {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      // Penyimpanan diblokir (mode privat): tema tidak bisa diganti
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return [theme, setTheme] as const;
}