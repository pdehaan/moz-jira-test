import _groupBy from "lodash.groupby";
// import _sortBy from "lodash.sortby";
import issues from "./fxa-slim.json" assert { type: "json" };

import { Interval, DateTime } from "luxon";

const now = DateTime.now();

const sortedByDate = _groupBy(issues, (issue) => {
  const interval = Interval.fromDateTimes(DateTime.fromISO(issue.created), now);
  return Math.floor(interval.length("weeks"));
});

// console.log(sortedByDate);

for (const [weeks, issues] of Object.entries(sortedByDate)) {
  console.log(`[week ${Number(weeks)}] ${issues.length} ${issues.length === 1 ? "issue" : "issues"}`);
}
