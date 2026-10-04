import { freshSave, sanitizeSave } from "../../game/save.ts";
import type { Save } from "../../game/types.ts";

export const SAVE_KEY = "riftbound.save.v1";

/** A desktop wrapper can provide a file-backed implementation of this port. */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class SaveRepository {
  available = true;

  // Access storage lazily: some browsers throw while reading localStorage itself.
  constructor(private readonly storage: () => SaveStorage) {}

  load(): Save {
    try {
      const text = this.storage().getItem(SAVE_KEY);
      this.available = true;
      return text === null ? freshSave() : sanitizeSave(JSON.parse(text));
    } catch {
      this.available = false;
      return freshSave();
    }
  }

  persist(save: Save): boolean {
    try {
      this.storage().setItem(SAVE_KEY, JSON.stringify(save));
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.available;
  }
}
