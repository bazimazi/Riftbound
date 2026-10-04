export interface GameElements {
  lobby: HTMLElement;
  "ash-count": HTMLElement;
  "help-button": HTMLButtonElement;
  "settings-button": HTMLButtonElement;
  "shard-count": HTMLElement;
  "record-time": HTMLElement;
  "record-runs": HTMLElement;
  "outcasts-nav": HTMLButtonElement;
  "forge-nav": HTMLButtonElement;
  "codex-button": HTMLButtonElement;
  "codex-count": HTMLElement;
  "talents-button": HTMLButtonElement;
  "roster-count": HTMLElement;
  "hero-list": HTMLElement;
  "roster-prev": HTMLButtonElement;
  "roster-page": HTMLElement;
  "roster-next": HTMLButtonElement;
  "forge-button": HTMLButtonElement;
  portrait: HTMLCanvasElement;
  "hero-class": HTMLElement;
  "stage-realm": HTMLElement;
  "hero-quote": HTMLElement;
  "hero-number": HTMLElement;
  "hero-difficulty": HTMLElement;
  "hero-name": HTMLElement;
  "hero-desc": HTMLElement;
  "hero-kit": HTMLElement;
  "hero-unlock": HTMLElement;
  "talent-names": HTMLElement;
  "realm-button": HTMLButtonElement;
  "realm-name": HTMLElement;
  "realm-info": HTMLElement;
  "contract-button": HTMLButtonElement;
  "contract-name": HTMLElement;
  "contract-target": HTMLElement;
  "mastery-label": HTMLElement;
  "mastery-fill": HTMLElement;
  "mastery-progress": HTMLElement;
  "loadout-button": HTMLButtonElement;
  "loadout-text": HTMLElement;
  "oath-value": HTMLElement;
  "oath-description": HTMLElement;
  "oath-down": HTMLButtonElement;
  "oath-up": HTMLButtonElement;
  "start-button": HTMLButtonElement;
  "save-status": HTMLElement;
  game: HTMLElement;
  arena: HTMLCanvasElement;
  "hud-symbol": HTMLElement;
  "hud-name": HTMLElement;
  "health-fill": HTMLElement;
  "shield-fill": HTMLElement;
  "hp-text": HTMLElement;
  "wave-text": HTMLElement;
  timer: HTMLElement;
  "threat-text": HTMLElement;
  "kill-count": HTMLElement;
  "run-embers": HTMLElement;
  "pause-button": HTMLButtonElement;
  "xp-fill": HTMLElement;
  "level-text": HTMLElement;
  announcement: HTMLElement;
  "boss-bar": HTMLElement;
  "boss-name": HTMLElement;
  "boss-fill": HTMLElement;
  "build-hud": HTMLElement;
  "inspect-build": HTMLButtonElement;
  minimap: HTMLCanvasElement;
  "world-map-button": HTMLButtonElement;
  "evolve-button": HTMLButtonElement;
  "doom-clock": HTMLElement;
  "waypoint-hud": HTMLElement;
  "objective-hud": HTMLElement;
  "game-talents": HTMLButtonElement;
  "talent-point-count": HTMLElement;
  "interact-button": HTMLButtonElement;
  "biome-label": HTMLElement;
  "dash-button": HTMLButtonElement;
  "dash-cooldown": HTMLElement;
  "skill-button": HTMLButtonElement;
  "skill-name": HTMLElement;
  "skill-cooldown": HTMLElement;
  "form-abilities": HTMLElement;
  "form-0-button": HTMLButtonElement;
  "form-0-cooldown": HTMLElement;
  "form-1-button": HTMLButtonElement;
  "form-1-cooldown": HTMLElement;
  "spell-abilities": HTMLElement;
  "spell-0-button": HTMLButtonElement;
  "spell-0-cooldown": HTMLElement;
  "spell-1-button": HTMLButtonElement;
  "spell-1-cooldown": HTMLElement;
  "spell-2-button": HTMLButtonElement;
  "spell-2-cooldown": HTMLElement;
  "trait-meter": HTMLElement;
  "trait-text": HTMLElement;
  "trait-fill": HTMLElement;
  "journey-hud": HTMLElement;
  joystick: HTMLElement;
  modal: HTMLElement;
  "modal-panel": HTMLElement;
}

export function element<K extends keyof GameElements>(id: K): GameElements[K];
export function element<T extends HTMLElement = HTMLElement>(id: string): T;
export function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing game element: ${id}`);
  return found;
}

/** Dynamic screens contain only the controls belonging to the current tab. */
export function optionalElement<T extends HTMLElement = HTMLElement>(
  id: string,
): T | null {
  return document.getElementById(id) as T | null;
}
