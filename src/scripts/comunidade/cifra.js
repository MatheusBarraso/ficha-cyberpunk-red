  // ---------- cifra das pistas (AES-GCM com chave tirada da resposta) ----------
  const b64 = (u8) => btoa(String.fromCharCode(...u8));
  const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function chaveDe(resp, sal) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(norm(resp)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function cifrar(txt, resp) {
    const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chaveDe(resp, sal), new TextEncoder().encode(txt));
    return { cifra: b64(new Uint8Array(ct)), iv: b64(iv), sal: b64(sal) };
  }
  async function decifrar(p, resp) {
    const ct = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(p.iv) }, await chaveDe(resp, deB64(p.sal)), deB64(p.cifra));
    return new TextDecoder().decode(ct);
  }
  const RESP_KEY = 'cpr-com-respostas';
  const respSalvas = () => { try { return JSON.parse(localStorage.getItem(RESP_KEY) || '{}'); } catch { return {}; } };
  const decifradas = {};

