// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-post

import "dotenv/config";

const { JIRA_EMAIL, JIRA_TOKEN, JIRA_SERVER } = process.env;
const AUTH_TOKEN = jiraAuthToken(JIRA_EMAIL, JIRA_TOKEN);

const bodyData = {
  expand: ["schema"],
  fields: [
    "assignee",
    "components",
    "created",
    "issuetype",
    "labels",
    "link",
    "priority",
    "reporter",
    "resolution",
    "customfield_10319",
    "status",
    "summary",
    "updated",
  ],
  fieldsByKeys: false,
  jql: "project = FXA AND issuetype IN (Bug, Task) AND resolution = Unresolved ORDER BY created DESC",
  maxResults: 100,
  startAt: 0,
};

let issues = [];

try {
  // Not a big fan of this pagination approach, but "it works"(tm), so #yolo.
  while (true) {
    const res = await fetchJira("/rest/api/3/search", bodyData);
    issues.push(...res.issues);
    if (issues.length >= res.total) {
      break;
    }
    bodyData.startAt += bodyData.maxResults;
  }
  console.log(JSON.stringify(issues, null, 2));
} catch (err) {
  console.error(err);
}

async function fetchJira(path, bodyData) {
  const res = await fetch(new URL(path, JIRA_SERVER).href, {
    method: "POST",
    headers: {
      Authorization: AUTH_TOKEN,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyData),
  });

  // console.log(res.headers);

  const data = await res.json();

  if (res.statusText !== "OK") {
    const err = new Error(data.errorMessages[0]);
    err.error = data;
    err.status = res.status;
    err.statusText = res.statusText;
    process.exitCode = 1;
    throw err;
  }
  data.$meta = {
    status: res.status,
    statusText: res.statusText,
  };
  return data;
}

function jiraAuthToken(email = JIRA_EMAIL, token = JIRA_TOKEN) {
  const authToken = Buffer.from(`${email}:${token}`).toString("base64");
  return `Basic ${authToken}`;
}
