import _groupBy from "lodash.groupby";
import { Interval, DateTime } from "luxon";
import issues from "./fxa-slim.json" assert { type: "json" };

const END_OF_WEEK = DateTime.fromJSDate(endOfWeek());

// Group by number of weeks from the end of the _current_ week.
const groupedByDate = _groupBy(issues, (issue) => {
  const interval = Interval.fromDateTimes(
    DateTime.fromISO(issue.created),
    END_OF_WEEK
  );
  // Whole weeks only.
  return Math.floor(interval.length("weeks"));
});

const res = Object.entries(groupedByDate).reduce((acc, [week, issues]) => {
  const weekNum = Number(week);
  const endDate = END_OF_WEEK.plus({ weeks: -weekNum });
  const startDate = endDate.plus({ weeks: -1, seconds: 1 });

  const reducer = (arr, key) =>
    Object.entries(_groupBy(arr, key)).reduce((acc, [k, v]) => {
      acc[k] = v.length;
      return acc;
    }, {});

  const uniqueLabels = issues.reduce((acc, issue) => {
    issue.labels.forEach((label) => acc.add(label));
    return acc;
  }, new Set());
  const byLabel = [...uniqueLabels]
    .sort()
    .filter((label) => !["qa+", "qa-", "qa-minor", "qa-medium"].includes(label))
    .reduce((acc, label) => {
      acc[label] = issues.filter((issue) =>
        issue.labels.includes(label)
      ).length;
      return acc;
    }, {});

  acc.push({
    week: weekNum,
    startDate: startDate.toJSDate(),
    endDate: endDate.toJSDate(),
    issues,
    byPriority: reducer(issues, "priority"),
    bySeverity: reducer(issues, "severity"),
    byIssueType: reducer(issues, "issuetype"),
    // byLabel, // Not super useful... yet.
  });
  return acc;
}, []);

console.log(JSON.stringify(res, null, 2));

// Calculate the end of the specified week to Saturday at 23:59:59.999 UTC.
function endOfWeek(date = new Date()) {
  // NOTE: "6" is Saturday in JavaScript.
  const SATURDAY_DAY = 6;
  const daysUntilSaturday = SATURDAY_DAY - date.getDay();
  const $utc = new Date();
  $utc.setUTCDate($utc.getDate() + daysUntilSaturday);
  $utc.setUTCHours(23);
  $utc.setUTCMinutes(59);
  $utc.setUTCSeconds(59);
  $utc.setUTCMilliseconds(999);
  return $utc;
}
