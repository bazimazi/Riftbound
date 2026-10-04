import type { Game } from "../../game/Game.ts";
import type { Hero, Save } from "../../game/types.ts";

export interface PanelApi {
  save(): Save;
  game(): Game | null;
  modal(type: string, html: string): void;
  close(): void;
  persist(): void;
  refresh(): void;
  sound(): void;
  level(): void;
}

export interface ProgressionApi extends PanelApi {
  hero(): Hero;
  journey(): void;
}

export interface ExpeditionApi extends PanelApi {
  pause(): void;
}

export interface RealmApi extends PanelApi {
  hero(): Hero;
}

export interface JourneyApi extends PanelApi {
  hero(): Hero;
  screen(): string;
  pause(): void;
  recipes(): void;
}
