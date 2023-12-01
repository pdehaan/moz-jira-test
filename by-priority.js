import _groupBy from "lodash.groupby";
import _sortBy from "lodash.sortby";
import issues from "./fxa-slim.json" assert { type: "json" };

const sortedByPriority = _groupBy(issues, "severity");

const priorityStats = Object.entries(sortedByPriority).reduce(
  (acc, [priority, issue]) => {
    acc.push({
      priority,
      count: issue.length,
      pct: issue.length / issues.length,
    });
    return acc;
  },
  []
);

for (const { priority, count, pct } of _sortBy(priorityStats, "pct").reverse()) {
  console.log(`[${priority}] ${count}/${issues.length} (${toPctString(pct)})`);
}

function toPctString(value) {
  return new Intl.NumberFormat("en-US", { style: "percent" }).format(value);
}

console.log("\n");
for (const issue of sortedByPriority.High) {
  if (issue.labels.length)
  console.log(`[${issue.key} / ${new Date(issue.created).toLocaleDateString()} / ${issue.priority}] ${issue.summary} ${JSON.stringify(issue.labels)}`);
}
