import * as lib from "./lib.js";
import issues from "./fxa.json" assert { type: "json" };

// GROUP BY REPORTED WEEK
const grouped = lib.groupByWeek(issues);
console.log(lib.jsonify(grouped));
