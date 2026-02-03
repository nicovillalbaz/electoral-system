// Definimos los valores válidos para todo el sistema
export const VOTE_INTENT_OPTIONS = [
  "SURE", 
  "PROBABLE", 
  "OPPOSITION", 
  "OPPOSITION_INTERNAL", 
  "OPPOSITION_PARTY", 
  "WONT_VOTE", 
  "UNDECIDED"
] as const;

export const CAMPAIGN_STATUS_OPTIONS = [
  "NOT_VISITED", 
  "TO_VISIT", 
  "CONTACTED", 
  "VISITED", 
  "VISITED_PC"
] as const;

export const TRANSPORT_STATUS_OPTIONS = [
  "PENDING", 
  "ASSIGNED", 
  "COMPLETED"
] as const;