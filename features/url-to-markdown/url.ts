/** http·https 주소만 받는다. 그 밖의 값(스킴 없음, ftp, javascript 등)은 null. */
export function parseHttpUrl(input: string): URL | null {
  try {
    const url = new URL(input.trim());
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    return isHttp && url.hostname ? url : null;
  } catch {
    return null;
  }
}
