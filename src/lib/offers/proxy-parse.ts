export type OfferProxy = {
  host: string;
  port: number;
  username: string;
  password: string;
  href: string;
  raw: string;
};

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseOfferProxy(raw: string): OfferProxy | null {
  const line = raw.trim().replace(/^["']|["']$/g, "");
  if (!line || line.startsWith("#")) return null;

  const fromUrl = (input: string) => {
    try {
      const url = new URL(input.includes("://") ? input : `http://${input}`);
      if (!url.hostname || !url.port) return null;
      const port = Number(url.port);
      if (!port) return null;
      const username = decode(url.username);
      const password = decode(url.password);
      if (!username || !password) return null;
      return {
        host: url.hostname,
        port,
        username,
        password,
        href: `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${url.hostname}:${port}`,
        raw: `${url.hostname}:${port}@${username}:***`,
      };
    } catch {
      return null;
    }
  };

  const hostPortAtUser =
    line.match(/^([A-Za-z0-9.-]+):(\d{2,5})@([^:@\s]+):([^:@\s]+)$/);
  if (hostPortAtUser) {
    return fromUrl(
      `http://${hostPortAtUser[3]}:${hostPortAtUser[4]}@${hostPortAtUser[1]}:${hostPortAtUser[2]}`
    );
  }

  const userAtHost = line.match(/^([^:@\s]+):([^:@\s]+)@([A-Za-z0-9.-]+):(\d{2,5})$/);
  if (userAtHost) {
    return fromUrl(
      `http://${userAtHost[1]}:${userAtHost[2]}@${userAtHost[3]}:${userAtHost[4]}`
    );
  }

  const hostUserPass = line.match(/^([A-Za-z0-9.-]+):(\d{2,5}):([^:@\s]+):([^:@\s]+)$/);
  if (hostUserPass) {
    return fromUrl(
      `http://${hostUserPass[3]}:${hostUserPass[4]}@${hostUserPass[1]}:${hostUserPass[2]}`
    );
  }

  return fromUrl(line);
}

export function parseOfferProxyList(raw: string): OfferProxy[] {
  const parts = raw
    .split(/[\r\n,;]+/)
    .map((item) => parseOfferProxy(item))
    .filter((item): item is OfferProxy => Boolean(item));
  const seen = new Set<string>();
  const unique: OfferProxy[] = [];
  for (const item of parts) {
    const key = `${item.host}:${item.port}:${item.username}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export function summarizeProxy(proxy: OfferProxy) {
  return `${proxy.host}:${proxy.port}`;
}
