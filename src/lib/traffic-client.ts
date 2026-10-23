type Arrival = {source:string; referrer:string; at:number};
let captured:Arrival | undefined;
export function captureArrival():Arrival {
  if (captured) return captured;
  const now=Date.now();
  const source=(new URL(location.href).searchParams.get('utm_source') || '').slice(0,80);
  let external=false;
  try { external=!!document.referrer && new URL(document.referrer).origin!==location.origin; } catch {}
  const fresh={source,referrer:external?document.referrer.slice(0,2048):'',at:now};
  try {
    const saved=JSON.parse(sessionStorage.getItem('henry_arrival_v1') || 'null');
    const valid=saved && typeof saved.at==='number' && saved.at<=now && now-saved.at<1800000
      && typeof saved.source==='string' && typeof saved.referrer==='string';
    captured=source || external || !valid ? fresh : {...saved,at:now};
    sessionStorage.setItem('henry_arrival_v1',JSON.stringify(captured));
  } catch { captured=fresh; }
  return captured!;
}
