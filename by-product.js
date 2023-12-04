import * as lib from "./lib.js";
import issues from "./fxa.json" assert { type: "json" };

// GROUP BY PRODUCT
const grouped = lib.groupByProduct(issues);
console.log(lib.jsonify({
  fxa: lib.getIssueStats(grouped.fxa),
  subplat: lib.getIssueStats(grouped.subplat),
}));
