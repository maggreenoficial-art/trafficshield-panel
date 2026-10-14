import { FEED_WIDTH } from "@/lib/news/feed-title";

export const PHOTO_HEIGHT = 704;
const FACE_MARGIN = 80;

export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function photoFrame(width: number, height: number, faces: FaceBox[]) {
  let scale = Math.max(FEED_WIDTH / width, PHOTO_HEIGHT / height);
  let centerX = width / 2;
  if (faces.length) {
    const minX = Math.min(...faces.map((face) => face.x)) - FACE_MARGIN;
    const maxX = Math.max(...faces.map((face) => face.x + face.width)) + FACE_MARGIN;
    const groupWidth = maxX - minX;
    if (groupWidth > 40) {
      centerX = (minX + maxX) / 2;
      if (groupWidth * scale > FEED_WIDTH) scale = FEED_WIDTH / groupWidth;
    }
  }
  const scaledWidth = Math.round(width * scale);
  const scaledHeight = Math.round(height * scale);
  const left = Math.min(
    Math.max(Math.round(centerX * scale - FEED_WIDTH / 2), 0),
    Math.max(scaledWidth - FEED_WIDTH, 0)
  );
  const top = Math.max(Math.round((scaledHeight - PHOTO_HEIGHT) / 3), 0);
  return {
    scaledWidth,
    scaledHeight,
    left,
    top,
    extendRight: Math.max(FEED_WIDTH - scaledWidth, 0),
    extendBottom: Math.max(PHOTO_HEIGHT - scaledHeight, 0),
  };
}
