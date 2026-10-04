import assert from "node:assert/strict";
import test from "node:test";
import { formatNewsWhen, isRecentNews, relativeNewsAge, toNewsIso } from "./dates";

test("converte pubDate do RSS para ISO", () => {
  assert.equal(toNewsIso("Sun, 04 Oct 2026 15:30:00 GMT"), "2026-10-04T15:30:00.000Z");
  assert.equal(toNewsIso(""), null);
});

test("só aceita notícia recente", () => {
  const now = Date.parse("2026-10-04T18:00:00.000Z");
  assert.equal(isRecentNews("2026-10-03T12:00:00.000Z", now), true);
  assert.equal(isRecentNews("2026-08-01T12:00:00.000Z", now), false);
  assert.equal(isRecentNews(null, now), false);
});

test("escreve data absoluta e relativa", () => {
  const now = Date.parse("2026-10-04T18:00:00.000Z");
  const date = new Date("2026-10-04T15:00:00.000Z");
  assert.equal(relativeNewsAge(date, now), "há 3 h");
  assert.match(formatNewsWhen("2026-10-04T15:00:00.000Z", now), /há 3 h/);
  assert.equal(formatNewsWhen(null), "Sem data");
});
