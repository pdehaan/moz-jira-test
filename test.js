import issues from "./fxa.json" assert { type: "json" };

const $issues = issues.map((issue) => {
  return Object.assign({}, issue.fields, {
    key: issue.key,
    issuetype: issue.fields.issuetype.name,
    status: issue.fields.status.name,
    components: issue.fields.components.map((c) => c.name),
    assignee: issue.fields.assignee?.displayName,
    reporter: issue.fields.reporter?.displayName,
    created: new Date(issue.fields.created),
    updated: new Date(issue.fields.updated),
  });
});

console.log(JSON.stringify($issues, null, 2));
