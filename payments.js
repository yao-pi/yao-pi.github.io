/* ---------------------------------------------------------------------------
   Pi User-to-App payments.

   The browser's only jobs are to start the payment and to relay two callbacks
   to the backend. Every decision that matters — is this the right price, has
   this already been paid, did the transaction really land — happens server
   side, because none of it can be trusted from here.

   Set BACKEND to your deployed Worker URL.
   --------------------------------------------------------------------------- */

const Payments = (() => {
  const BACKEND = 'https://pi-payments.yao-pi.workers.dev';

  const ITEM = 'tip-small';   // priced server-side; see CATALOG in the Worker
  const AMOUNT = 0.5;         // display only — the Worker re-checks this
  const MEMO = 'Tap Tempo tip';

  let els = {};
  let busy = false;

  function setStatus(text, tone = 'neutral') {
    if (!els.status) return;
    els.status.textContent = text;
    els.status.dataset.tone = tone;
  }

  function configured() {
    return BACKEND && !BACKEND.startsWith('REPLACE_');
  }

  async function post(path, body) {
    const token = PiIntegration.getAccessToken();
    if (!token) throw new Error('not authenticated');

    const res = await fetch(BACKEND + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `${path} failed (${res.status})`);
    return data;
  }

  function setBusy(state) {
    busy = state;
    if (els.button) els.button.disabled = state || !PiIntegration.getAccessToken();
  }

  function pay() {
    if (busy) return;

    if (!configured()) {
      setStatus('Backend URL not set — see payments.js', 'error');
      return;
    }

    setBusy(true);
    setStatus('Opening payment…');

    window.Pi.createPayment(
      {
        amount: AMOUNT,
        memo: MEMO,
        // The Worker reads itemId and looks the real price up itself.
        metadata: { itemId: ITEM }
      },
      {
        onReadyForServerApproval: async (paymentId) => {
          try {
            setStatus('Approving…');
            await post('/payments/approve', { paymentId });
            setStatus('Confirm in your Pi Wallet');
          } catch (err) {
            console.error('[pay] approve failed:', err);
            setStatus(err.message, 'error');
            setBusy(false);
          }
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
          try {
            setStatus('Verifying…');
            const out = await post('/payments/complete', { paymentId, txid });
            // Only now is the payment real — the Worker got a 200 from Pi.
            setStatus(out.alreadyCompleted ? 'Already paid' : 'Thank you!', 'ok');
          } catch (err) {
            console.error('[pay] complete failed:', err);
            setStatus(err.message, 'error');
          } finally {
            setBusy(false);
          }
        },

        onCancel: (paymentId) => {
          console.info('[pay] cancelled:', paymentId);
          setStatus('Payment cancelled');
          setBusy(false);
        },

        onError: (err, payment) => {
          console.error('[pay] error:', err, payment);
          setStatus(err?.message || 'Payment error', 'error');
          setBusy(false);
        }
      }
    );
  }

  async function resolveIncomplete(id) {
    if (!configured()) return;
    try {
      const out = await post('/payments/incomplete', { paymentId: id });
      console.info('[pay] stale payment resolved:', out.action);
      setStatus(`Earlier payment ${out.action}`);
    } catch (err) {
      // Worth surfacing: until this clears, Pi refuses every new payment.
      console.error('[pay] could not resolve stale payment:', err);
      setStatus('A previous payment is stuck — new payments are blocked', 'error');
    }
  }

  function init() {
    els = {
      button: document.getElementById('tip-button'),
      status: document.getElementById('pay-status')
    };
    if (!els.button) return;

    els.button.textContent = `Tip ${AMOUNT} π`;
    els.button.addEventListener('click', pay);

    window.addEventListener('pi:authenticated', () => {
      els.button.disabled = false;
      setStatus('');
    });

    window.addEventListener('pi:incomplete-payment', (e) => resolveIncomplete(e.detail.id));
  }

  return { init, pay, resolveIncomplete };
})();
