/**
 * The composer's in-page confirm slot (#1082).
 *
 * `window.confirm` used to block the handler until the player answered; this
 * restores that shape without the OS dialog. `askConfirm` puts the request on
 * screen and returns a promise the handler awaits, so every caller still reads
 * `if (!(await askConfirm(...))) return;` — one line, in the same place, with
 * the same control flow.
 *
 * One slot, because only one handler can be waiting on an answer at a time.
 * `EditPraxis.tsx` mounts a single `ConfirmDialog` for it, which is what covers
 * all 16 composer surfaces, the waiting surface and both form factors.
 */
import { useCallback, useRef, useState } from "react";
import type { ConfirmRequest } from "../../components/confirm/composerConfirms";

interface ComposerConfirm {
  pendingConfirm: ConfirmRequest | null;
  /** Ask, and await the answer. Resolves false on dismiss. */
  askConfirm: (request: ConfirmRequest) => Promise<boolean>;
  acceptConfirm: () => void;
  dismissConfirm: () => void;
}

export function useComposerConfirm(): ComposerConfirm {
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmRequest | null>(
    null,
  );
  // The resolver lives in a ref rather than in state: it is not rendered, and
  // storing a function in state would need the lazy-setter dance for no gain.
  const confirmResolverRef = useRef<((accepted: boolean) => void) | null>(null);

  const settleConfirm = useCallback((accepted: boolean) => {
    const resolve = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setPendingConfirm(null);
    resolve?.(accepted);
  }, []);

  const askConfirm = useCallback((request: ConfirmRequest) => {
    // A second ask while one is open declines the first, so no handler is left
    // awaiting a promise that can never settle.
    confirmResolverRef.current?.(false);
    setPendingConfirm(request);
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);

  const acceptConfirm = useCallback(() => settleConfirm(true), [settleConfirm]);
  const dismissConfirm = useCallback(
    () => settleConfirm(false),
    [settleConfirm],
  );

  return { pendingConfirm, askConfirm, acceptConfirm, dismissConfirm };
}
