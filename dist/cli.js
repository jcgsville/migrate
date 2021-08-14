#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const yargs = require("yargs");
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
const package_json_1 = require("../package.json");
const commit_1 = require("./commands/commit");
const compile_1 = require("./commands/compile");
const init_1 = require("./commands/init");
const migrate_1 = require("./commands/migrate");
const reset_1 = require("./commands/reset");
const run_1 = require("./commands/run");
const status_1 = require("./commands/status");
const uncommit_1 = require("./commands/uncommit");
const watch_1 = require("./commands/watch");
function wrapHandler(input) {
    const { handler } = input, rest = tslib_1.__rest(input, ["handler"]);
    const newHandler = async (argv) => {
        try {
            return await Promise.resolve(handler(argv));
        }
        catch (e) {
            if (!e["_gmlogged"]) {
                // eslint-disable-next-line no-console
                console.error(e);
            }
            process.exit(1);
        }
    };
    return Object.assign(Object.assign({}, rest), { handler: newHandler });
}
yargs
    .parserConfiguration({
    "boolean-negation": true,
    "camel-case-expansion": false,
    "combine-arrays": false,
    "dot-notation": false,
    "duplicate-arguments-array": false,
    "flatten-duplicate-arrays": false,
    "halt-at-non-option": false,
    "parse-numbers": false,
    "populate--": false,
    "set-placeholder-key": false,
    "short-option-groups": true,
    "sort-commands": false,
    "strip-aliased": true,
    "strip-dashed": false,
    "unknown-options-as-args": false,
})
    .scriptName("graphile-migrate")
    .strict(true)
    .version(package_json_1.version)
    .hide("version")
    .help(true)
    .demandCommand(1, 1, "Please select a command to run.")
    .recommendCommands()
    // Commands
    .command(wrapHandler(init_1.initCommand))
    .command(wrapHandler(migrate_1.migrateCommand))
    .command(wrapHandler(watch_1.watchCommand))
    .command(wrapHandler(commit_1.commitCommand))
    .command(wrapHandler(uncommit_1.uncommitCommand))
    .command(wrapHandler(status_1.statusCommand))
    .command(wrapHandler(reset_1.resetCommand))
    .command(wrapHandler(compile_1.compileCommand))
    .command(wrapHandler(run_1.runCommand))
    // Make sure options added here are represented in CommonArgv
    .option("config", {
    alias: "c",
    type: "string",
    description: "Optional path to gmrc file",
    defaultDescription: ".gmrc[.js]",
})
    .completion("completion", "Generate shell completion script.")
    .epilogue(process.env.GRAPHILE_SPONSOR
    ? `\
You are running graphile-migrate v${package_json_1.version}.`
    : `\
You are running graphile-migrate v${package_json_1.version}.

  ╔═══════════════════════════════════╗
  ║ Graphile Migrate is crowd-funded, ║
  ║   please consider sponsorship:    ║
  ║                                   ║
  ║ https://www.graphile.org/sponsor/ ║
  ║                                   ║
  ║     🙏 THANK YOU SPONSORS! 🙏     ║
  ╚═══════════════════════════════════╝
`).argv;
//# sourceMappingURL=cli.js.map