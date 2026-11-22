// Booking: dates -> room (price, availability) -> guest details -> demo payment -> confirmation.
// ponytail: prices and availability are sample data here; wire to a real channel manager + Stripe before launch.
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ROOMS = [
  { id: 'Rossa',   type: 'Deluxe', max: 2, rate: 95,  color: '#d8262c', img: 'img/p6.webp' },
  { id: 'Arancio', type: 'Tripla', max: 3, rate: 110, color: '#ef7317', img: 'img/p8.webp' },
  { id: 'Blu',     type: 'Deluxe', max: 2, rate: 95,  color: '#1f5fc4', img: 'img/p19.webp' },
  { id: 'Gigli',   type: 'Tripla', max: 3, rate: 105, color: '#2f8190', img: 'img/p7.webp' },
  { id: 'Corallo', type: 'Tripla', max: 3, rate: 105, color: '#b5202a', img: 'img/p5.webp' },
];
const TAX = 1.5; // tassa di soggiorno per persona a notte (dato di esempio)
const bk = $('#bk');
const steps = $$('.step', bk);
const dots = $$('.steps li');
const eur = n => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtD = d => new Date(d + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' });
const iso = d => d.toISOString().slice(0, 10);
const S = { step: 0, room: null, started: false };
const today = iso(new Date());
bk.in.min = today; bk.out.min = today;

const nightsOf = () => (!bk.in.value || !bk.out.value) ? 0 : Math.round((new Date(bk.out.value) - new Date(bk.in.value)) / 864e5);
// deterministic fake availability: a room is busy if any night of the stay hashes "taken"
const busy = (room, a, n) => {
  for (let k = 0; k < n; k++) {
    const d = iso(new Date(new Date(a + 'T12:00').getTime() + k * 864e5));
    const h = [...(room.id + d)].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
    if (h % 29 === 0) return true;
  }
  return false;
};
const quote = () => {
  const n = nightsOf(), g = +bk.guests.value, r = S.room;
  const stay = r.rate * n, tax = TAX * g * n, total = stay + tax;
  const due = bk.plan.value === 'dep' ? Math.round(total * 30) / 100 : total;
  return { n, g, r, stay, tax, total, due };
};
const billHTML = (q, paid) => `
  <div class="bill-room" style="--c:${q.r.color}"><img src="${q.r.img}" alt="" width="120" height="80"><div><strong>Camera ${q.r.id}</strong><span>${q.r.type} · ${q.g} ${q.g === 1 ? 'ospite' : 'ospiti'}</span></div></div>
  <p class="bill-dates">${fmtD(bk.in.value)} → ${fmtD(bk.out.value)}</p>
  <dl>
    <div><dt>${q.n} ${q.n === 1 ? 'notte' : 'notti'} × ${eur(q.r.rate)}, colazione inclusa</dt><dd>${eur(q.stay)}</dd></div>
    <div><dt>Tassa di soggiorno</dt><dd>${eur(q.tax)}</dd></div>
    <div class="tot"><dt>Totale</dt><dd>${eur(q.total)}</dd></div>
    ${q.due < q.total
      ? `<div><dt>${paid ? 'Pagato ora' : 'Da pagare ora'} (caparra 30%)</dt><dd>${eur(q.due)}</dd></div><div><dt>All’arrivo</dt><dd>${eur(q.total - q.due)}</dd></div>`
      : (paid ? `<div><dt>Pagato</dt><dd>${eur(q.due)}</dd></div>` : '')}
  </dl>`;

const msg = t => { const m = $('[data-msg]', steps[S.step]); if (m) m.textContent = t || ''; };
const go = i => {
  steps.forEach((s, k) => { s.hidden = k !== i; });
  dots.forEach((d, k) => { d.classList.toggle('on', k <= i); d.classList.toggle('now', k === i); });
  S.step = i;
  if (i === 1) renderRooms();
  if (i === 3) { const q = quote(); $('[data-bill]', bk).innerHTML = billHTML(q); $('[data-pay]').textContent = `Paga ${eur(q.due)}`; }
  if (S.started) { const f = steps[i].querySelector('input:not([type=radio]), .btn'); if (f) f.focus({ preventScroll: true }); }
  S.started = true;
};
const renderRooms = () => {
  const n = nightsOf(), g = +bk.guests.value;
  $('[data-sum]', bk).textContent = `${fmtD(bk.in.value)} → ${fmtD(bk.out.value)} · ${n} ${n === 1 ? 'notte' : 'notti'} · ${g} ${g === 1 ? 'ospite' : 'ospiti'}`;
  $('[data-rooms]', bk).innerHTML = ROOMS.map(r => {
    const off = r.max < g ? `Fino a ${r.max} ospiti` : busy(r, bk.in.value, n) ? 'Occupata in queste date' : '';
    const on = S.room && S.room.id === r.id && !off;
    return `<label class="pick${off ? ' off' : ''}" style="--c:${r.color}">
      <input type="radio" name="room" value="${r.id}" ${off ? 'disabled' : ''} ${on ? 'checked' : ''}>
      <img src="${r.img}" alt="" width="160" height="106" loading="lazy">
      <span class="pick-t"><strong>${r.id}</strong><em>${r.type}, max ${r.max}</em></span>
      <span class="pick-p">${off || `${eur(r.rate)}<small> a notte</small><br><b>${eur(r.rate * n)}</b> totale`}</span>
    </label>`;
  }).join('');
  if (S.room && $(`[name=room][value="${S.room.id}"]`, bk).disabled) S.room = null;
};
bk.addEventListener('change', e => {
  if (e.target.name === 'room') S.room = ROOMS.find(r => r.id === e.target.value);
  if (e.target.name === 'plan' && S.step === 3) go(3);
  if (e.target.name === 'in' && bk.in.value) bk.out.min = bk.in.value;
});

const luhn = s => {
  let sum = 0;
  [...s].reverse().forEach((c, i) => { let d = +c; if (i % 2) { d *= 2; if (d > 9) d -= 9; } sum += d; });
  return s.length >= 13 && sum % 10 === 0;
};
const validate = i => {
  if (i === 0) {
    if (!bk.in.value || !bk.out.value) return 'Scegli la data di arrivo e di partenza.';
    if (bk.in.value < today) return 'L’arrivo non può essere nel passato.';
    if (nightsOf() <= 0) return 'La partenza deve essere dopo l’arrivo.';
    if (nightsOf() > 30) return 'Per soggiorni oltre 30 notti scrivi direttamente a Maria.';
  }
  if (i === 1 && !S.room) return 'Scegli una camera libera.';
  if (i === 2) {
    if (bk.name.value.trim().length < 3) return 'Scrivi nome e cognome.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(bk.email.value)) return 'Controlla l’email.';
    if (bk.tel.value.replace(/\D/g, '').length < 8) return 'Controlla il numero di telefono.';
  }
  if (i === 3) {
    const cc = bk.cc.value.replace(/\D/g, ''), [mm, yy] = bk.exp.value.split('/').map(Number);
    if (!luhn(cc)) return 'Il numero della carta non è valido.';
    const now = new Date(), y = now.getFullYear() % 100, m = now.getMonth() + 1;
    if (!(mm >= 1 && mm <= 12) || !(yy > y || (yy === y && mm >= m))) return 'La scadenza non è valida.';
    if (!/^\d{3,4}$/.test(bk.cvc.value)) return 'Il CVC non è valido.';
    if (bk.holder.value.trim().length < 3) return 'Scrivi l’intestatario della carta.';
  }
  return '';
};
$$('[data-next]', bk).forEach(b => b.addEventListener('click', () => { const e = validate(S.step); msg(e); if (!e) go(S.step + 1); }));
$$('[data-back]', bk).forEach(b => b.addEventListener('click', () => go(S.step - 1)));
bk.cc.addEventListener('input', () => { bk.cc.value = bk.cc.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); });
bk.exp.addEventListener('input', () => { const v = bk.exp.value.replace(/\D/g, '').slice(0, 4); bk.exp.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v; });
bk.addEventListener('submit', e => {
  e.preventDefault();
  if (S.step !== 3) return;
  const err = validate(3); msg(err); if (err) return;
  const btn = $('[data-pay]'); btn.disabled = true; btn.textContent = 'Pagamento in corso…';
  setTimeout(() => { // simulated processor round-trip; card data never leaves the page
    btn.disabled = false;
    const q = quote(), code = 'WHT-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    $('[data-code]').textContent = `Codice ${code}`;
    $('[data-final]').innerHTML = billHTML(q, true);
    const t = `Ciao Maria, ho appena prenotato la camera ${q.r.id} dal ${fmtD(bk.in.value)} al ${fmtD(bk.out.value)} (codice ${code}). Arrivo ${bk.eta.value}. ${bk.name.value}`;
    $('[data-wa]').href = `https://wa.me/393391134202?text=${encodeURIComponent(t)}`;
    ['cc', 'exp', 'cvc', 'holder'].forEach(k => { bk[k].value = ''; });
    go(4);
  }, 1600);
});
$('[data-again]').addEventListener('click', () => { bk.reset(); S.room = null; go(0); });
$$('[data-room]').forEach(a => a.addEventListener('click', () => { S.room = ROOMS.find(r => r.id === a.dataset.room); }));
go(0);
})();
