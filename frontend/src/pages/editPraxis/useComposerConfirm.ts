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

/** The one-slot ask/settle logic, free of React so a test can drive it. */
export function createConfirmSlot(
  show: (request: ConfirmRequest | null) => void,
) {
  let resolver: ((accepted: boolean) => void) | null = null;
  return {
    settle(accepted: boolean) {
      const resolve = resolver;
      resolver = null;
      show(null);
      resolve?.(accepted);
    },
    ask(request: ConfirmRequest): Promise<boolean> {
      // Decline any open ask so its handler isn't left awaiting forever.
      resolver?.(false);
      show(request);
      return new Promise<boolean>((resolve) => {
        resolver = resolve;
      });
    },
  };
}

export function useComposerConfirm(): ComposerConfirm {
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmRequest | null>(
    null,
  );
  const slotRef = useRef<ReturnType<typeof createConfirmSlot> | null>(null);
  slotRef.current ??= createConfirmSlot(setPendingConfirm);
  const slot = slotRef.current;

  const askConfirm = useCallback(
    (request: ConfirmRequest) => slot.ask(request),
    [slot],
  );
  const acceptConfirm = useCallback(() => slot.settle(true), [slot]);
  const dismissConfirm = useCallback(() => slot.settle(false), [slot]);

  return { pendingConfirm, askConfirm, acceptConfirm, dismissConfirm };
}
