import { createContext, useContext } from 'react'

/** A context so none of the nine card skins threads a prop (#3771). */
export interface ProposalActions {
  ids: ReadonlySet<number>
  onEdit: (id: number) => void
  onWithdraw: (id: number) => void
}

export const ProposalActionsContext = createContext<ProposalActions | null>(null)

export const useProposalActions = () => useContext(ProposalActionsContext)
