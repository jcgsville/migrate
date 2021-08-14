import { Client } from "./pg";
import { ParsedSettings } from "./settings";
export declare function runQueryWithErrorInstrumentation(pgClient: Client, body: string, filename: string): Promise<any[] | undefined>;
export declare const logDbError: ({ logger }: ParsedSettings, e: Error) => void;
