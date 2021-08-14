"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("@graphile/logger");
const pg_connection_string_1 = require("pg-connection-string");
const querystring = require("querystring");
const url_1 = require("url");
const actions_1 = require("./actions");
const logger_2 = require("./logger");
function isActionSpec(o) {
    if (!(typeof o === "object" && o && typeof o["_"] === "string")) {
        return false;
    }
    // After here it's definitely an action spec; but we should still validate the
    // other properties.
    if ("shadow" in o && typeof o["shadow"] !== "boolean") {
        throw new Error(`'${o["_"]}' action has 'shadow' property of type '${typeof o["shadow"]}'; expected 'boolean' (or not set)`);
    }
    return true;
}
exports.isActionSpec = isActionSpec;
function isSqlActionSpec(o) {
    if (!isActionSpec(o) || o._ !== "sql") {
        return false;
    }
    if (typeof o["file"] !== "string") {
        throw new Error("SQL command requires 'file' property to be set");
    }
    return true;
}
exports.isSqlActionSpec = isSqlActionSpec;
function isCommandActionSpec(o) {
    if (!isActionSpec(o) || o._ !== "command") {
        return false;
    }
    // Validations
    if (typeof o["command"] !== "string") {
        throw new Error(`Command action has 'command' property of type '${typeof o["command"]}'; expected 'string'`);
    }
    return true;
}
exports.isCommandActionSpec = isCommandActionSpec;
async function parseSettings(settings, requireShadow = false) {
    if (!settings) {
        throw new Error("Expected settings object");
    }
    if (typeof settings !== "object") {
        throw new Error("Expected settings object, received " + typeof settings);
    }
    const errors = [];
    const keysToCheck = Object.keys(settings);
    const checkedKeys = [];
    async function check(key, callback) {
        checkedKeys.push(key);
        const value = settings[key];
        try {
            return await callback(value);
        }
        catch (e) {
            errors.push(`Setting '${key}': ${e.message}`);
            return void 0;
        }
    }
    const connectionString = await check("connectionString", (rawConnectionString = process.env.DATABASE_URL) => {
        if (typeof rawConnectionString !== "string") {
            throw new Error("Expected a string, or for DATABASE_URL envvar to be set");
        }
        return rawConnectionString;
    });
    const logger = await check("logger", (rawLogger = logger_2.defaultLogger) => {
        if (!(rawLogger instanceof logger_1.Logger)) {
            throw new Error("Expected 'logger' to be a @graphile/logger Logger instance");
        }
        return rawLogger;
    });
    const rootConnectionString = await check("rootConnectionString", (rawRootConnectionString = process.env.ROOT_DATABASE_URL || "template1") => {
        if (typeof rawRootConnectionString !== "string") {
            throw new Error("Expected a string, or for ROOT_DATABASE_URL envvar to be set");
        }
        return rawRootConnectionString;
    });
    const migrationsFolder = await check("migrationsFolder", (rawMigrationsFolder = `${process.cwd()}/migrations`) => {
        if (typeof rawMigrationsFolder !== "string") {
            throw new Error("Expected a string");
        }
        return rawMigrationsFolder;
    });
    const blankMigrationContent = await check("blankMigrationContent", (rawBlankMigrationContent = "-- Enter migration here\n") => {
        if (typeof rawBlankMigrationContent !== "string") {
            throw new Error("Expected a string");
        }
        return rawBlankMigrationContent;
    });
    const { user, database: databaseName } = pg_connection_string_1.parse(connectionString || "");
    const databaseOwner = await check("databaseOwner", (rawDatabaseOwner = user || databaseName) => {
        if (typeof rawDatabaseOwner !== "string") {
            throw new Error("Expected a string or for user or database name to be specified in connectionString");
        }
        return rawDatabaseOwner;
    });
    const shadowConnectionString = await check("shadowConnectionString", (rawShadowConnectionString = process.env.SHADOW_DATABASE_URL) => {
        if (requireShadow) {
            if (typeof rawShadowConnectionString !== "string") {
                throw new Error("Expected `shadowConnectionString` to be a string, or for SHADOW_DATABASE_URL to be set");
            }
            return rawShadowConnectionString;
        }
        return null;
    });
    const { database: shadowDatabaseName } = pg_connection_string_1.parse(shadowConnectionString || "");
    await check("pgSettings", pgSettings => {
        if (pgSettings) {
            if (typeof pgSettings !== "object" || pgSettings === null) {
                throw new Error("Expected settings.pgSettings to be an object");
            }
            const badKeys = Object.keys(pgSettings).filter(key => {
                const value = pgSettings[key];
                return typeof value !== "string" && typeof value !== "number";
            });
            if (badKeys.length) {
                throw new Error(`Invalid pgSettings for keys '${badKeys.join(", ")}' - expected string` /* Number is acceptable, but prefer string. Boolean not acceptable. */);
            }
        }
    });
    const placeholders = await check("placeholders", (rawPlaceholders) => {
        if (rawPlaceholders) {
            if (typeof rawPlaceholders !== "object" || rawPlaceholders === null) {
                throw new Error("Expected settings.placeholders to be an object");
            }
            const badKeys = Object.keys(rawPlaceholders).filter(key => !/^:[A-Z][0-9A-Z_]+$/.exec(key));
            if (badKeys.length) {
                throw new Error(`Invalid placeholders keys '${badKeys.join(", ")}' - expected to follow format ':ABCD_EFG_HIJ'`);
            }
            const badValueKeys = Object.keys(rawPlaceholders).filter(key => {
                const value = rawPlaceholders[key];
                return typeof value !== "string";
            });
            if (badValueKeys.length) {
                throw new Error(`Invalid placeholders values for keys '${badValueKeys.join(", ")}' - expected string`);
            }
            return Object.entries(rawPlaceholders).reduce((memo, [key, value]) => {
                if (value === "!ENV") {
                    const envvarKey = key.substr(1);
                    const envvar = process.env[envvarKey];
                    if (!envvar) {
                        throw new Error(`Could not find environmental variable '${envvarKey}'`);
                    }
                    memo[key] = envvar;
                }
                return memo;
            }, Object.assign({}, rawPlaceholders));
        }
        return undefined;
    });
    const validateAction = actions_1.makeValidateActionCallback(logger);
    const rootValidateAction = actions_1.makeValidateActionCallback(logger, true);
    const beforeReset = await check("beforeReset", rootValidateAction);
    const afterReset = await check("afterReset", rootValidateAction);
    const beforeAllMigrations = await check("beforeAllMigrations", validateAction);
    const afterAllMigrations = await check("afterAllMigrations", validateAction);
    const beforeCurrent = await check("beforeCurrent", validateAction);
    const afterCurrent = await check("afterCurrent", validateAction);
    const manageGraphileMigrateSchema = await check("manageGraphileMigrateSchema", mgms => {
        const type = typeof mgms;
        if (type !== "undefined" && type !== "boolean") {
            throw new Error(`Expected boolean, received '${type === "object" && !mgms ? "null" : type}'`);
        }
        return mgms !== false;
    });
    /******/
    const uncheckedKeys = keysToCheck
        .filter(key => !checkedKeys.includes(key))
        .filter(key => !key.startsWith("//"));
    if (uncheckedKeys.length) {
        errors.push(`The following config settings were not understood: '${uncheckedKeys.join("', '")}'`);
    }
    if (connectionString) {
        if (!databaseOwner) {
            errors.push("Could not determine the database owner, please add the 'databaseOwner' setting.");
        }
        if (!databaseName) {
            errors.push("Could not determine the database name, please ensure connectionString includes the database name.");
        }
        if (connectionString === rootConnectionString ||
            (requireShadow && connectionString === shadowConnectionString)) {
            errors.push("connectionString cannot be the same value as rootConnectionString or shadowConnectionString.");
        }
    }
    if (requireShadow && !shadowDatabaseName) {
        errors.push("Could not determine the shadow database name, please ensure shadowConnectionString includes the database name.");
    }
    if (errors.length) {
        throw new Error(`Errors occurred during settings validation:\n- ${errors.join("\n- ")}`);
    }
    if (!databaseName) {
        // This is just to appease TypeScript, this should be caught above.
        throw new Error("Could not determine databaseName");
    }
    return Object.assign(Object.assign({}, settings), { beforeReset,
        beforeAllMigrations,
        beforeCurrent,
        afterReset,
        afterAllMigrations,
        afterCurrent,
        rootConnectionString,
        connectionString,
        manageGraphileMigrateSchema,
        databaseOwner,
        migrationsFolder,
        databaseName, shadowConnectionString: shadowConnectionString
            ? shadowConnectionString
            : void 0, shadowDatabaseName: shadowDatabaseName ? shadowDatabaseName : void 0, placeholders,
        blankMigrationContent,
        logger });
}
exports.parseSettings = parseSettings;
/**
 * Overrides the databaseName in rootConnectionString and returns the resulting
 * connection string.
 */
function makeRootDatabaseConnectionString(parsedSettings, databaseName) {
    const { rootConnectionString } = parsedSettings;
    if (!rootConnectionString) {
        throw new Error("Cannot execute SQL as root since rootConnectionString / ROOT_DATABASE_URL is not specified");
    }
    const parsed = url_1.parse(rootConnectionString, true);
    if (parsed.protocol === "socket:") {
        parsed.query.db = databaseName;
        const query = querystring.stringify(parsed.query);
        if (parsed.auth) {
            return `socket://${parsed.auth}@${parsed.pathname}?${query}`;
        }
        else {
            return `socket:${parsed.pathname}?${query}`;
        }
    }
    else {
        parsed.pathname = `/${databaseName}`;
        return url_1.format(parsed);
    }
}
exports.makeRootDatabaseConnectionString = makeRootDatabaseConnectionString;
//# sourceMappingURL=settings.js.map