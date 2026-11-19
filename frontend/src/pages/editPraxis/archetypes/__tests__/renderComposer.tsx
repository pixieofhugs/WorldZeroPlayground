import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import "../../../../i18n";
import { anEditPraxisState } from "../../../../test/fixtures";

/** Composer archetype file (no extension) → its static markup, with `useFormFactor` mocked by the caller. */
export async function renderComposer(archetype: string): Promise<string> {
  const { default: Composer } = await import(`../${archetype}.tsx`);
  return renderToStaticMarkup(
    <MemoryRouter>
      <Composer state={anEditPraxisState()} />
    </MemoryRouter>,
  );
}
