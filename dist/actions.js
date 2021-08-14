"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const pg_connection_string_1 = require("pg-connection-string");
const util_1 = require("util");
const lib_1 = require("./lib");
const migration_1 = require("./migration");
const pg_1 = require("./pg");
const settings_1 = require("./settings");
exports.DO_NOT_USE_DATABASE_URL = "postgres://PLEASE:USE@GM_DBURL/INSTEAD";
const exec = util_1.promisify(child_process_1.exec);
async function executeActions(parsedSettings, shadow = false, actions) {
    if (!actions) {
        return;
    }
    const connectionString = shadow
        ? parsedSettings.shadowConnectionString
        : parsedSettings.connectionString;
    if (!connectionString) {
        throw new Error("Could not determine connection string for running commands");
    }
    const { database: databaseName, user: databaseUser } = pg_connection_string_1.parse(connectionString);
    if (!databaseName) {
        throw new Error("Could not extract database name from connection string");
    }
    for (const actionSpec of actions) {
        if (actionSpec.shadow !== undefined && actionSpec.shadow !== shadow) {
            continue;
        }
        if (actionSpec._ === "sql") {
            const body = await fs_1.promises.readFile(`${parsedSettings.migrationsFolder}/${actionSpec.file}`, "utf8");
            const hookConnectionString = actionSpec.root
                ? settings_1.makeRootDatabaseConnectionString(parsedSettings, databaseName)
                : connectionString;
            await pg_1.withClient(hookConnectionString, parsedSettings, async (pgClient, context) => {
                const query = migration_1.generatePlaceholderReplacement(parsedSettings, context)(body);
                await pgClient.query({
                    text: query,
                });
            });
        }
        else if (actionSpec._ === "command") {
            const hookConnectionString = actionSpec.root
                ? settings_1.makeRootDatabaseConnectionString(parsedSettings, databaseName)
                : connectionString;
            // Run the command
            const { stdout, stderr } = await exec(actionSpec.command, {
                env: lib_1.mergeWithoutClobbering(Object.assign(Object.assign({}, process.env), { DATABASE_URL: exports.DO_NOT_USE_DATABASE_URL }), Object.assign({ GM_DBNAME: databaseName, GM_DBUSER: databaseUser, GM_DBURL: hookConnectionString }, (shadow
                    ? {
                        GM_SHADOW: "1",
                    }
                    : null)), "please ensure this environmental variable is not set because graphile-migrate sets it dynamically for children."),
                encoding: "utf8",
                // 50MB of log data should be enough for any reasonable migration... right?
                maxBuffer: 50 * 1024 * 1024,
            });
            if (stdout) {
                parsedSettings.logger.info(stdout);
            }
            if (stderr) {
                parsedSettings.logger.error(stderr);
            }
        }
    }
}
exports.executeActions = executeActions;
function makeValidateActionCallback(logger, allowRoot = false) {
    return async (inputValue) => {
        const specs = [];
        if (inputValue) {
            const rawSpecArray = Array.isArray(inputValue)
                ? inputValue
                : [inputValue];
            for (const trueRawSpec of rawSpecArray) {
                // This fudge is for backwards compatibility with v0.0.3
                const isV003OrBelowCommand = typeof trueRawSpec === "object" &&
                    trueRawSpec &&
                    !trueRawSpec["_"] &&
                    typeof trueRawSpec["command"] === "string";
                if (isV003OrBelowCommand) {
                    logger.warn("DEPRECATED: graphile-migrate now requires command action specs to have an `_: 'command'` property; we'll back-fill this for now, but please update your configuration");
                }
                const rawSpec = isV003OrBelowCommand
                    ? Object.assign({ _: "command" }, trueRawSpec) : trueRawSpec;
                if (rawSpec && typeof rawSpec === "string") {
                    const sqlSpec = rawSpec.startsWith("!")
                        ? {
                            _: "sql",
                            file: rawSpec.substr(1),
                            root: true,
                        }
                        : {
                            _: "sql",
                            file: rawSpec,
                        };
                    specs.push(sqlSpec);
                }
                else if (settings_1.isActionSpec(rawSpec)) {
                    if (settings_1.isSqlActionSpec(rawSpec) || settings_1.isCommandActionSpec(rawSpec)) {
                        specs.push(rawSpec);
                    }
                    else {
                        throw new Error(`Action spec of type '${rawSpec["_"]}' not supported; perhaps you need to upgrade?`);
                    }
                }
                else {
                    throw new Error(`Expected action spec to contain an array of strings or action specs; received '${typeof rawSpec}'`);
                }
            }
        }
        // Final validations
        for (const spec of specs) {
            if (!allowRoot && spec._ === "sql" && spec.root) {
                throw new Error("This hooks isn't permitted to require root privileges.");
            }
        }
        return specs;
    };
}
exports.makeValidateActionCallback = makeValidateActionCallback;
//# sourceMappingURL=actions.js.map