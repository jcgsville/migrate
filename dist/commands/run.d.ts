import { CommandModule } from "yargs";
import { Settings } from "../settings";
import { CommonArgv } from "./_common";
interface RunArgv extends CommonArgv {
    shadow?: boolean;
    root?: boolean;
    rootDatabase?: boolean;
}
export declare function run(settings: Settings, content: string, filename: string, { shadow, root, rootDatabase, }?: {
    shadow?: boolean;
    root?: boolean;
    rootDatabase?: boolean;
}): Promise<any[] | undefined>;
export declare const runCommand: CommandModule<{}, RunArgv>;
export {};
