import $issues from "./fxa.json" assert { type: "json" };

const issues = $issues.map((issue) => {
  const { issuetype, priority, status, components, assignee, reporter, created, updated } = issue.fields;

  const data = Object.assign({}, issue.fields, {
    key: issue.key,
    issuetype: issuetype.name,
    priority: priority.name,
    // Remap `severity`
    severity: issue.fields.customfield_10319?.value ?? null,
    status: status.name,
    components: components.map((c) => c.name),
    assignee: assignee?.displayName,
    reporter: reporter?.displayName,
    created: new Date(created),
    updated: new Date(updated),
  });
  delete data.customfield_10319;
  return data;
});

console.log(JSON.stringify(issues, null, 2));
