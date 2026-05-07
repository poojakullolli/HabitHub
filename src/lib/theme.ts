import { StatusBar, Style } from "@capacitor/status-bar";

export type ThemeMode = "light" | "dark" | "system";

export const getThemeMode = (): ThemeMode => {
  const saved = localStorage.getItem("theme");
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
};

export const getAmoled = (): boolean => localStorage.getItem("amoled") === "1";

export const applyTheme = (mode: ThemeMode = getThemeMode(), amoled: boolean = getAmoled()) => {
  const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && prefers);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("amoled", dark && amoled);
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? (amoled ? "#000000" : "#171513") : "#fafaf7");
};
