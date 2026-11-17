import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await copyFile("index.html", "dist/index.html");
await copyFile("Eaglercraft 1.8.8 wasm.html", "dist/tmp");
