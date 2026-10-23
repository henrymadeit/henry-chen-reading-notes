export const sourceLabels: Record<string,string> = {
  google:'Google', facebook:'Facebook', line:'LINE（標記連結）',
  instagram:'Instagram', threads:'Threads', bing:'Bing',
  other:'其他網站', direct:'直接／來源不明'
};
export function classifySource(value: unknown, referrer: unknown, ownOrigin: string): string {
  const utm = typeof value === 'string' ? value.toLowerCase().slice(0,80) : '';
  const aliases: Record<string,string> = {google:'google',facebook:'facebook',fb:'facebook',
    line:'line',instagram:'instagram',ig:'instagram',threads:'threads',bing:'bing'};
  if (Object.hasOwn(aliases,utm)) return aliases[utm];
  if (utm) return 'other';
  if (typeof referrer !== 'string' || referrer.length > 2048) return 'direct';
  try {
    const url = new URL(referrer);
    if (!['http:','https:'].includes(url.protocol) || url.origin === ownOrigin) return 'direct';
    const host = url.hostname.toLowerCase();
    const matches = (domain:string) => host === domain || host.endsWith('.'+domain);
    if (/^(www\.)?google\.(com|com\.tw|co\.jp|co\.uk|[a-z]{2})$/.test(host)) return 'google';
    if (matches('facebook.com') || matches('fb.com')) return 'facebook';
    if (matches('instagram.com')) return 'instagram';
    if (matches('threads.net') || matches('threads.com')) return 'threads';
    if (matches('bing.com')) return 'bing';
    return 'other';
  } catch { return 'direct'; }
}
