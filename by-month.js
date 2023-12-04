import * as lib from "./lib.js";
import issues from "./fxa.json" assert { type: "json" };

// GROUP BY REPORTED MONTH
const grouped = lib.groupByMonth(issues);
console.log(lib.jsonify(grouped));
