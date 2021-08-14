"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const actions_1 = require("../actions");
const instrumentation_1 = require("../instrumentation");
const migration_1 = require("../migration");
const pgReal_1 = require("../pgReal");
const settings_1 = require("../settings");
const _common_1 = require("./_common");
async function run(settings, content, filename, { shadow = false, root = false, rootDatabase = false, } = {}) {
    const parsedSettings = await settings_1.parseSettings(settings, shadow);
    const sql = migration_1.compilePlaceholders(parsedSettings, content, shadow);
    const baseConnectionString = rootDatabase
        ? parsedSettings.rootConnectionString
        : shadow
            ? parsedSettings.shadowConnectionString
            : parsedSettings.connectionString;
    if (!baseConnectionString) {
        throw new Error("Could not determine connection string to use.");
    }
    const connectionString = root && !rootDatabase
        ? settings_1.makeRootDatabaseConnectionString(parsedSettings, _common_1.getDatabaseName(baseConnectionString))
        : baseConnectionString;
    return pgReal_1.withClient(connectionString, parsedSettings, pgClient => instrumentation_1.runQueryWithErrorInstrumentation(pgClient, sql, filename));
}
exports.run = run;
exports.runCommand = {
    command: "run [file]",
    aliases: [],
    describe: `\
Compiles a SQL file, inserting all the placeholders, and then runs it against the database. Useful for seeding. If called from an action will automatically run against the same database (via GM_DBURL envvar) unless --shadow or --rootDatabase are supplied.`,
    builder: {
        shadow: {
            type: "boolean",
            default: false,
            description: "Apply to the shadow database (for development).",
        },
        root: {
            type: "boolean",
            default: false,
            description: "Run the file using the root user (but application database).",
        },
        rootDatabase: {
            type: "boolean",
            default: false,
            description: "Like --root, but also runs against the root database rather than application database.",
        },
    },
    handler: async (argv) => {
        const defaultSettings = await _common_1.getSettings({ configFile: argv.config });
        // `run` might be called from an action; in this case `DATABASE_URL` will
        // be unavailable (overwritten with DO_NOT_USE_DATABASE_URL) to avoid
        // ambiguity (so we don't accidentally run commands against the main
        // database when it was the shadow database that triggered the action); in
        // this case, unless stated otherwise, the user would want to `run` against
        // whatever database was just modified, so we automatically use `GM_DBURL`
        // in this case.
        const settings = argv.shadow ||
            argv.rootDatabase ||
            process.env.DATABASE_URL !== actions_1.DO_NOT_USE_DATABASE_URL
            ? defaultSettings
            : Object.assign(Object.assign({}, defaultSettings), { connectionString: process.env.GM_DBURL });
        const { content, filename } = typeof argv.file === "string"
            ? {
                filename: argv.file,
                content: await fs_1.promises.readFile(argv.file, "utf8"),
            }
            : { filename: "stdin", content: await _common_1.readStdin() };
        const rows = await run(settings, content, filename, argv);
        if (rows) {
            // eslint-disable-next-line no-console
            console.table(rows);
        }
    },
};
//# sourceMappingURL=run.js.map