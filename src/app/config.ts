export const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://nova-api.muaddhalsway.workers.dev"
  : "";
