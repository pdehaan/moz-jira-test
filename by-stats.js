import * as lib from "./lib.js";
import issues from "./fxa.json" assert { type: "json" };

// GET ISSUE STATS
const grouped = lib.getIssueStats(issues);
console.log(lib.jsonify(grouped));
