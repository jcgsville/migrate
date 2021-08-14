import { Settings } from "../settings";
export declare const DEFAULT_GMRC_PATH: string;
export declare const DEFAULT_GMRCJS_PATH: string;
/**
 * Represents the option flags that are valid for all commands (see
 * src/cli.ts).
 */
export interface CommonArgv {
    /**
     * Optional path to the gmrc file.
     */
    config?: string;
}
export declare function exists(path: string): Promise<boolean>;
export declare function getSettingsFromJSON(path: string): Promise<Settings>;
/**
 * Options passed to the getSettings function.
 */
interface Options {
    /**
     * Optional path to the gmrc config path to use; if not provided we'll fall
     * back to `./.gmrc` and `./.gmrc.js`.
     *
     * This must be the full path, including extension. If the extension is `.js`
     * then we'll use `require` to import it, otherwise we'll read it as JSON5.
     */
    configFile?: string;
}
/**
 * Gets the raw settings from the relevant .gmrc file. Does *not* validate the
 * settings - the result of this call should not be trusted. Pass the result of
 * this function to `parseSettings` to get validated settings.
 */
export declare function getSettings(options?: Options): Promise<Settings>;
export declare function readStdin(): Promise<string>;
export declare function getDatabaseName(connectionString: string): string;
export {};
