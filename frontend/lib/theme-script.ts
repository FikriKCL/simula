export const THEME_STORAGE_KEY = "simula-theme";

// Runs before first paint (see app/layout.tsx) so no page flashes the wrong theme.
// Sets both data-theme (Tailwind dark variant in globals.css) and .dark (older chat styles).
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.dataset.theme=d?"dark":"light";e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(x){}})()`;
