import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";
import { taxonomy } from "./data";
import { App } from "./App";

// Per-type colours as CSS variables, switching with the theme.
const vars = (key: "colorLight" | "colorDark") =>
  taxonomy.types.map((t, i) => `--type-${i}:${t[key]};`).join("");
const style = document.createElement("style");
style.textContent =
  `:root{${vars("colorLight")}}` +
  `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${vars("colorDark")}}}` +
  `:root[data-theme="dark"]{${vars("colorDark")}}`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
