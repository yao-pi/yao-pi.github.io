/* ---------------------------------------------------------------------------
   Tap tempo.

   BPM is the mean of the intervals in a rolling window of recent taps. The
   window means an accelerating or decelerating tap settles on the new tempo
   instead of being dragged back by stale taps.
   --------------------------------------------------------------------------- */

(() => {
  const IDLE_RESET_MS = 2500;  // gap after which a tap starts a fresh sequence
  const MAX_TAPS      = 9;     // → averages at most 8 intervals
  const MIN_BPM       = 20;
  const MAX_BPM       = 400;

  const valueEl = document.getElementById('bpm-value');
  const hintEl  = document.getElementById('bpm-hint');
  const ringEl  = document.getElementById('tap-ring');
  const tapBtn  = document.getElementById('tap-button');
  const resetBtn = document.getElementById('reset-button');

  /** @type {number[]} timestamps, oldest first */
  let taps = [];
  let idleTimer = null;

  function currentBpm() {
    if (taps.length < 2) return null;

    let total = 0;
    for (let i = 1; i < taps.length; i++) total += taps[i] - taps[i - 1];
    const bpm = 60000 / (total / (taps.length - 1));

    return bpm >= MIN_BPM && bpm <= MAX_BPM ? bpm : null;
  }

  function render() {
    const bpm = currentBpm();

    if (bpm === null) {
      valueEl.textContent = '—';
      valueEl.dataset.empty = 'true';
    } else {
      valueEl.textContent = String(Math.round(bpm));
      valueEl.dataset.empty = 'false';
    }

    if (taps.length === 0)      hintEl.textContent = 'Tap the button to begin';
    else if (taps.length === 1) hintEl.textContent = 'Keep tapping…';
    else if (bpm === null)      hintEl.textContent = 'Out of range — keep tapping';
    else                        hintEl.textContent = `Averaging ${taps.length - 1} interval${taps.length === 2 ? '' : 's'}`;

    resetBtn.disabled = taps.length === 0;
  }

  function pulse() {
    ringEl.removeAttribute('data-pulse');
    void ringEl.offsetWidth;          // restart the animation
    ringEl.dataset.pulse = 'true';
  }

  function ripple(event) {
    const rect = tapBtn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;

    const x = (event?.clientX ?? rect.left + rect.width / 2) - rect.left;
    const y = (event?.clientY ?? rect.top + rect.height / 2) - rect.top;

    const el = document.createElement('span');
    el.className = 'ripple';
    el.style.width = el.style.height = `${size}px`;
    el.style.left = `${x - size / 2}px`;
    el.style.top  = `${y - size / 2}px`;
    el.addEventListener('animationend', () => el.remove());

    tapBtn.appendChild(el);
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (taps.length > 0) hintEl.textContent = 'Tap again to restart';
    }, IDLE_RESET_MS);
  }

  function tap(event) {
    const now = performance.now();

    // A long enough gap means the user is starting a new tempo, not continuing.
    if (taps.length && now - taps[taps.length - 1] > IDLE_RESET_MS) taps = [];

    taps.push(now);
    if (taps.length > MAX_TAPS) taps.shift();

    pulse();
    ripple(event);
    render();
    scheduleIdle();
  }

  function reset() {
    clearTimeout(idleTimer);
    taps = [];
    render();
  }

  // pointerdown rather than click: click fires on release, which adds the
  // press duration to every interval and skews the reading.
  tapBtn.addEventListener('pointerdown', tap);

  // Keyboard parity. preventDefault stops the browser also firing a click.
  tapBtn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) tap(null);
    }
  });

  resetBtn.addEventListener('click', reset);

  render();
  Payments.init();
  PiIntegration.init();
})();
