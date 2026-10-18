'use strict';
/* =========================================================
   Royal Pass — subscription modal.
   Checkout is a DEMO: startCheckout() resolves without charging anything.
   ========================================================= */

/* Payment hook. To take real payments, replace this with a call to your server, e.g.
   const r = await fetch('/api/checkout', { method: 'POST', body: JSON.stringify({ plan }) });
   location.href = (await r.json()).url;   // Stripe Checkout / bKash / SSLCommerz redirect
   and only grant premium after the server confirms the payment (webhook), never on the client alone. */
function startCheckout(plan) {
  return new Promise(resolve => setTimeout(() => resolve({ ok: true, plan }), 1300));
}

const Royal = {
  el: null, plan: 'yearly', busy: false, after: null,
  PLANS: {
    monthly: { label: 'Monthly', price: '৳149', per: 'per month' },
    yearly: { label: 'Yearly', price: '৳999', per: 'per year' },
    lifetime: { label: 'Lifetime', price: '৳1,999', per: 'one time' },
  },
  init() {
    this.el = document.getElementById('royal');
    this.el.querySelectorAll('.plan').forEach(b => b.addEventListener('click', () => this.select(b.dataset.plan)));
    this.el.querySelector('#subscribeBtn').addEventListener('click', () => this.subscribe());
    this.el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => this.close()));
    this.el.querySelector('#cancelSub').addEventListener('click', () => this.cancel());
    this.el.addEventListener('click', e => { if (e.target === this.el) this.close(); });
    document.addEventListener('keydown', e => {
      if (this.el.classList.contains('hidden')) return;
      e.stopPropagation();
      const keys = Object.keys(this.PLANS), i = keys.indexOf(this.plan);
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (this.view() === 'plans' && e.key === 'ArrowRight') { e.preventDefault(); this.select(keys[(i + 1) % 3]); }
      else if (this.view() === 'plans' && e.key === 'ArrowLeft') { e.preventDefault(); this.select(keys[(i + 2) % 3]); }
    });
  },
  view() { return Save.d.premium ? 'active' : 'plans'; },
  open(after) {
    this.after = after || null;
    Input.locked = true; Input.clear();
    this.render(); this.el.classList.remove('hidden');
    Sound.play('confirm');
    setTimeout(() => (this.el.querySelector(this.view() === 'plans' ? '#subscribeBtn' : '[data-close]') || this.el).focus(), 30);
  },
  close() {
    if (this.busy) return;
    this.el.classList.add('hidden');
    Input.locked = false; Input.clear();
    const cb = this.after; this.after = null;
    if (cb) cb();
    cvs.focus();
  },
  select(plan) {
    this.plan = plan;
    this.el.querySelectorAll('.plan').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.plan === plan)));
    const p = this.PLANS[plan];
    this.el.querySelector('#subscribeBtn').textContent = `Subscribe — ${p.price} ${p.per}`;
    Sound.play('select');
  },
  render() {
    const active = Save.d.premium;
    this.el.querySelector('.plans-view').hidden = active;
    this.el.querySelector('.active-view').hidden = !active;
    this.el.querySelector('.success').hidden = true;
    if (active) {
      const p = this.PLANS[Save.d.plan] || this.PLANS.yearly;
      const since = Save.d.since ? new Date(Save.d.since).toLocaleDateString() : 'today';
      this.el.querySelector('#activePlan').textContent = `${p.label} plan · member since ${since}`;
    } else this.select(this.plan);
  },
  async subscribe() {
    if (this.busy) return;
    this.busy = true;
    const btn = this.el.querySelector('#subscribeBtn');
    btn.disabled = true; btn.textContent = 'Processing…';
    try {
      await startCheckout(this.plan);
      Save.d.premium = true; Save.d.plan = this.plan; Save.d.since = Date.now(); Save.d.royal = true; Save.write();
      G.royal = true;
      Sound.play('royal');
      this.el.querySelector('.plans-view').hidden = true;
      this.el.querySelector('.success').hidden = false;
      this.el.querySelector('.success [data-close]').focus();
    } finally {
      this.busy = false; btn.disabled = false;
    }
  },
  cancel() {
    Save.d.premium = false; Save.d.plan = null; Save.d.since = 0; Save.write();
    G.royal = false;
    this.render();
  },
};
