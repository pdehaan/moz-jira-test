// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-post

import * as lib from "./lib.js";

const fields = [
  "assignee",
  "components",
  "created",
  // Custom "severity" field.
  "customfield_10319",
  "issuetype",
  "labels",
  "link",
  "priority",
  "reporter",
  "status",
  "summary",
  "updated",
];

// USE LIVE DATA
const issues = await lib.fetchJiraIssues("FXA", fields);
console.log(lib.jsonify(issues));
