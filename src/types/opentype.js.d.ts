declare module "opentype.js" {
  export type FontPath = {
    fill: string | null;
    toSVG(options?: number | { decimalPlaces?: number }): string;
  };

  export type Font = {
    getAdvanceWidth(text: string, fontSize: number): number;
    getPath(text: string, x: number, y: number, fontSize: number): FontPath;
  };

  export function parse(buffer: ArrayBuffer): Font;
}
