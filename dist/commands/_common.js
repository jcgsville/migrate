"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const JSON5 = require("json5");
const path_1 = require("path");
const pg_connection_string_1 = require("pg-connection-string");
exports.DEFAULT_GMRC_PATH = `${process.cwd()}/.gmrc`;
exports.DEFAULT_GMRCJS_PATH = `${exports.DEFAULT_GMRC_PATH}.js`;
async function exists(path) {
    try {
        await fs_1.promises.access(path, fs_1.constants.F_OK /* visible to us */);
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.exists = exists;
async function getSettingsFromJSON(path) {
    let data;
    try {
        data = await fs_1.promises.readFile(path, "utf8");
    }
    catch (e) {
        throw new Error(`Failed to read '${path}': ${e.message}`);
    }
    try {
        return JSON5.parse(data);
    }
    catch (e) {
        throw new Error(`Failed to parse '${path}': ${e.message}`);
    }
}
exports.getSettingsFromJSON = getSettingsFromJSON;
/**
 * Gets the raw settings from the relevant .gmrc file. Does *not* validate the
 * settings - the result of this call should not be trusted. Pass the result of
 * this function to `parseSettings` to get validated settings.
 */
async function getSettings(options = {}) {
    const { configFile } = options;
    const tryRequire = (path) => {
        // If the file is e.g. `foo.js` then Node `require('foo.js')` would look in
        // `node_modules`; we don't want this - instead force it to be a relative
        // path.
        const relativePath = path_1.resolve(process.cwd(), path);
        try {
            return require(relativePath);
        }
        catch (e) {
            throw new Error(`Failed to import '${relativePath}'; error:\n    ${e.stack.replace(/\n/g, "\n    ")}`);
        }
    };
    if (configFile != null) {
        if (!(await exists(configFile))) {
            throw new Error(`Failed to import '${configFile}': file not found`);
        }
        if (configFile.endsWith(".js")) {
            return tryRequire(configFile);
        }
        else {
            return await getSettingsFromJSON(configFile);
        }
    }
    else if (await exists(exports.DEFAULT_GMRC_PATH)) {
        return await getSettingsFromJSON(exports.DEFAULT_GMRC_PATH);
    }
    else if (await exists(exports.DEFAULT_GMRCJS_PATH)) {
        return tryRequire(exports.DEFAULT_GMRCJS_PATH);
    }
    else {
        throw new Error("No .gmrc file found; please run `graphile-migrate init` first.");
    }
}
exports.getSettings = getSettings;
function readStdin() {
    return new Promise((resolve, reject) => {
        let data = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("error", reject);
        process.stdin.on("readable", () => {
            let chunk;
            // Use a loop to make sure we read all available data.
            while ((chunk = process.stdin.read()) !== null) {
                data += chunk;
            }
        });
        process.stdin.on("end", () => {
            resolve(data);
        });
    });
}
exports.readStdin = readStdin;
function getDatabaseName(connectionString) {
    const databaseName = pg_connection_string_1.parse(connectionString).database;
    if (!databaseName) {
        throw new Error("Could not determine database name from connection string.");
    }
    return databaseName;
}
exports.getDatabaseName = getDatabaseName;
//# sourceMappingURL=_common.js.map