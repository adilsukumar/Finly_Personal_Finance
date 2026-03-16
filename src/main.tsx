import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { runSeedIfNeeded } from "./lib/seed";

document.documentElement.classList.add("dark");

runSeedIfNeeded().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
