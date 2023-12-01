// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-post

import "dotenv/config";

const { JIRA_EMAIL, JIRA_TOKEN, JIRA_SERVER } = process.env;
const AUTH_TOKEN = jiraAuthToken(JIRA_EMAIL, JIRA_TOKEN);

const bodyData = `{
  "expand": [
    "schema"
  ],
  "fields": [
    "summary",
    "link",
    "resolution",
    "status",
    "created",
    "updated",
    "components",
    "severity",
    "labels",
    "assignee",
    "reporter"
  ],
  "fieldsByKeys": false,
  "jql": "project = FXA AND issuetype in (Bug, Task) AND resolution = Unresolved",
  "maxResults": 100,
  "startAt": 0
}`;

try {
  const res = await fetchJira("/rest/api/3/search", bodyData);
  console.log(JSON.stringify(res, null, 2));
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
    body: bodyData,
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
