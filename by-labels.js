import * as lib from "./lib.js";
import issues from "./fxa.json" assert { type: "json" };

// GROUP BY LABELS
const grouped = lib.byLabel(issues);
console.log(lib.jsonify(grouped));
