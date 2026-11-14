/**
 * Accessible post-interaction validation (modern-web-guidance: validate-input-after-interaction).
 * Syncs :user-invalid with aria-invalid and dynamic aria-describedby error linking.
 */

export function parseNumericInput(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s%]/g, '').trim();
  if (cleaned === '') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function formatDollarString(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function initValidation(form: HTMLFormElement): void {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.classList.add('visually-hidden');
  document.body.append(announcer);

  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  let announcedField: HTMLElement | undefined;

  const flagged = new WeakSet<HTMLElement>();
  const announced = new WeakSet<HTMLElement>();
  const dirtyState = new WeakMap<
    HTMLElement,
    { hasInteracted: boolean; hasBlurred: boolean }
  >();
  const supportsUserInvalid =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('selector(:user-invalid)');

  const linkError = (el: HTMLElement, shown: boolean): void => {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const ids = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  };

  const spokenText = (node: Node): string => {
    const copy = node.cloneNode(true) as Element;
    copy.querySelectorAll?.('[aria-hidden="true"]').forEach((n) => n.remove());
    copy.querySelectorAll?.('[role="img"][aria-label]').forEach((n) => {
      n.replaceWith(`${n.getAttribute('aria-label')}: `);
    });
    return (copy.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const announceError = (el: HTMLInputElement | HTMLSelectElement): void => {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const error = document.getElementById(errorId);
    if (!error) return;
    const labelEl = el.labels?.[0];
    const label = labelEl ? `${spokenText(labelEl)}: ` : '';
    clearTimeout(announceTimer);
    announcer.textContent = '';
    announcedField = el;
    announceTimer = setTimeout(() => {
      announcer.textContent = label + spokenText(error);
    }, 500);
  };

  const syncAria = (el: EventTarget | null, announce = false): void => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) {
      return;
    }

    // Custom numeric validation for dollar text inputs
    if (el instanceof HTMLInputElement && el.dataset.numeric === 'dollar') {
      const val = parseNumericInput(el.value);
      const min = el.dataset.min !== undefined ? Number(el.dataset.min) : 0;
      if (el.value.trim() !== '' && (val === null || val < min)) {
        el.setCustomValidity(
          el.dataset.errorText || 'Enter a valid dollar amount.',
        );
      } else {
        el.setCustomValidity('');
      }
    }

    const isInvalid = supportsUserInvalid
      ? el.matches(':user-invalid')
      : dirtyState.get(el)?.hasBlurred && !el.validity.valid;

    if (!supportsUserInvalid && dirtyState.get(el)?.hasBlurred) {
      el.classList.toggle('user-invalid-fallback', !el.validity.valid);
    }

    if (isInvalid) {
      if (announce && !announced.has(el)) {
        announceError(el);
        announced.add(el);
      }
      el.setAttribute('aria-invalid', 'true');
      linkError(el, true);
      flagged.add(el);
    } else if (flagged.has(el) || el.getAttribute('aria-invalid') !== 'true') {
      el.setAttribute('aria-invalid', 'false');
      linkError(el, false);
      flagged.delete(el);
      announced.delete(el);
      if (announcedField === el) {
        clearTimeout(announceTimer);
        announcer.textContent = '';
      }
    }
  };

  form.querySelectorAll('input, select').forEach((el) => {
    if (!el.hasAttribute('aria-invalid')) {
      el.setAttribute('aria-invalid', 'false');
    }
  });

  form.addEventListener(
    'blur',
    (e) => {
      const target = e.target;
      if (target instanceof HTMLInputElement) {
        if (target.dataset.numeric === 'dollar') {
          const val = parseNumericInput(target.value);
          if (val !== null && val >= 0) {
            target.value = formatDollarString(val);
          }
        }
        const state = dirtyState.get(target) || {
          hasInteracted: false,
          hasBlurred: false,
        };
        state.hasBlurred = true;
        dirtyState.set(target, state);
      }
      syncAria(target, true);
    },
    true,
  );

  form.addEventListener('input', (e) => {
    const target = e.target;
    if (target instanceof HTMLElement) {
      const state = dirtyState.get(target) || {
        hasInteracted: false,
        hasBlurred: false,
      };
      state.hasInteracted = true;
      dirtyState.set(target, state);
    }
    syncAria(target, false);
  });

  form.addEventListener(
    'change',
    (e) => {
      syncAria(e.target, true);
    },
    true,
  );
}
