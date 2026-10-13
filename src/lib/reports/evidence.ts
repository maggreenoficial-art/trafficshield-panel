import { readFileSync } from "node:fs";
import path from "node:path";

const PRINTS = ["orelhometro-pagina.png", "orelhometro-pix.png"] as const;

export function defaultReportScreenshots() {
  const dir = path.join(process.cwd(), "public", "denuncias");
  return PRINTS.map((name) => {
    const bytes = readFileSync(path.join(dir, name));
    return new File([new Uint8Array(bytes)], name, { type: "image/png" });
  });
}
