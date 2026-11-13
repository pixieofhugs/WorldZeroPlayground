/**
 * The composer's in-page confirm slot (#1082): an awaitable `window.confirm`
 * replacement — `if (!(await askConfirm(...))) return;`. One slot; one
 * `ConfirmDialog` in `EditPraxis.tsx` serves every composer surface.
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
  const confirmResolverRef = useRef<((accepted: boolean) => void) | null>(null);

  const settleConfirm = useCallback((accepted: boolean) => {
    const resolve = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setPendingConfirm(null);
    resolve?.(accepted);
  }, []);

  const askConfirm = useCallback((request: ConfirmRequest) => {
    // Decline any open ask so its handler isn't left awaiting forever.
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
