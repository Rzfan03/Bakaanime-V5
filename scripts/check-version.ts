import assert from "node:assert";
import { isNewer } from "../src/lib/version.ts";

assert.equal(isNewer("1.0.31", "1.0.30"), true);
assert.equal(isNewer("1.0.30", "1.0.30"), false);
assert.equal(isNewer("1.0.9", "1.0.10"), false);
assert.equal(isNewer("1.1.0", "1.0.99"), true);
assert.equal(isNewer("2.0.0", "1.9.9"), true);
console.log("version: ok");
