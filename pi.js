/* ---------------------------------------------------------------------------
   Pi Platform integration.

   This is the piece worth studying — the tap tempo itself is just a host for it.

   Flow:
     1. Pi.init({ version, sandbox })          — SDK handshake
     2. Pi.authenticate(scopes, onIncomplete)  — returns { accessToken, user }
     3. (server) GET /v2/me with the token     — NOT done here; see note below

   Step 3 matters in production: anything the client tells you about who the
   user is can be forged. Only a server-side /me call against the access token
   proves identity. This build stops at step 2 because it exists to prove the
   SDK handshake works inside the Pi Browser.
   --------------------------------------------------------------------------- */

const PiIntegration = (() => {
  // Testnet app → true. A Mainnet-registered app → false.
  // Note that an app binds to one network at registration and cannot be moved.
  const SANDBOX = true;

  // Only what this app actually needs. Add 'payments' when you wire payments,
  // and 'wallet_address' only if you genuinely need the address.
  const SCOPES = ['username'];

  // sdk.minepi.com serves the script to any browser, so window.Pi existing
  // proves nothing. Outside the Pi Browser there is no host app to answer the
  // handshake and authenticate() simply never settles — so we bound the wait
  // rather than leaving the UI stuck on "Connecting…".
  //
  // The bound has to differ by context. In the Pi Browser the handshake is
  // immediate. In the sandbox it is not: the user reads a code off the Pi
  // Browser and types it into the desktop page, which takes as long as it
  // takes. A single short timeout would abort every legitimate sandbox login.
  const AUTH_TIMEOUT_FAST_MS = 4000;      // plain browser — nothing will answer
  const AUTH_TIMEOUT_INTERACTIVE_MS = 180000;  // sandbox — a human is typing

  // The sandbox runs the app framed inside sandbox.minepi.com. A cross-origin
  // parent throws on access, which is itself proof we are framed.
  function framed() {
    try { return window.self !== window.top; } catch { return true; }
  }

  function piBrowser() {
    return /PiBrowser/i.test(navigator.userAgent);
  }

  // True when something is plausibly listening and a human may need time.
  function interactive() {
    return framed() || piBrowser();
  }

  let els = {};
  let user = null;

  function setStatus(state, label) {
    if (!els.dot) return;
    els.dot.dataset.state = state;
    els.label.textContent = label;
  }

  function loaded() {
    return typeof window.Pi !== 'undefined' && window.Pi !== null;
  }

  /* Fires when a previous payment never reached developer_completed. Pi blocks
     new payments until it is resolved, so a real app forwards the identifier to
     its backend, which calls POST /v2/payments/{id}/complete. */
  function onIncompletePaymentFound(payment) {
    console.warn('[pi] incomplete payment found:', payment);
  }

  function timeout(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('PI_TIMEOUT')), ms));
  }

  async function signIn() {
    if (!loaded()) {
      setStatus('off', 'SDK unavailable');
      return;
    }

    const waiting = interactive();

    try {
      setStatus('pending', waiting ? 'Waiting for sign-in…' : 'Connecting…');

      const auth = await Promise.race([
        window.Pi.authenticate(SCOPES, onIncompletePaymentFound),
        timeout(waiting ? AUTH_TIMEOUT_INTERACTIVE_MS : AUTH_TIMEOUT_FAST_MS)
      ]);

      user = auth.user;
      setStatus('ok', '@' + user.username);

      // The uid is app-scoped: this same Pioneer gets a different uid in every
      // app, so it is a stable key for your own database and nothing more.
      console.log('[pi] uid:', user.uid);
      console.log('[pi] accessToken (verify server-side):', auth.accessToken);
    } catch (err) {
      if (err.message === 'PI_TIMEOUT') {
        if (waiting) {
          console.warn('[pi] sign-in timed out — was the sandbox code entered?');
          setStatus('error', 'Tap to retry');
        } else {
          // Expected when developing in a normal browser.
          console.info('[pi] no host app responded — not running in the Pi Browser');
          setStatus('off', 'No Pi Browser');
        }
      } else {
        console.error('[pi] authentication failed:', err);
        setStatus('error', 'Tap to retry');
      }
    }
  }

  function init() {
    els = {
      chip:  document.getElementById('pi-chip'),
      dot:   document.getElementById('pi-dot'),
      label: document.getElementById('pi-label')
    };

    if (!loaded()) {
      setStatus('off', 'SDK unavailable');
      return;
    }

    try {
      window.Pi.init({ version: '2.0', sandbox: SANDBOX });
    } catch (err) {
      console.error('[pi] init failed:', err);
      setStatus('error', 'SDK init failed');
      return;
    }

    els.chip.disabled = false;
    els.chip.addEventListener('click', signIn);
    signIn();
  }

  return { init, signIn, getUser: () => user };
})();
