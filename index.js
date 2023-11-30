// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-post

import "dotenv/config";

const { JIRA_EMAIL, JIRA_TOKEN, JIRA_SERVER } = process.env;
const AUTH_TOKEN = jiraAuthToken(JIRA_EMAIL, JIRA_TOKEN);

const bodyData = `{
  "expand": [
    "names",
    "schema",
    "operations"
  ],
  "fields": [
    "summary",
    "status",
    "assignee"
  ],
  "fieldsByKeys": false,
  "jql": "project = FXA",
  "maxResults": 5,
  "startAt": 0
}`;

try {
  const res = await fetchJira("/rest/api/3/search", bodyData);
  console.log(res);
} catch (err) {
  console.error(err);
}

async function fetchJira(path, bodyData) {
  const res = await fetch(
    new URL(path, JIRA_SERVER).href,
    {
      method: "POST",
      headers: {
        Authorization: AUTH_TOKEN,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: bodyData,
    }
  );
  const data = await res.json();
  data.$meta = {
    status: res.status,
    statusText: res.statusText,
  };
  if (res.statusText !== "OK") {
    const err = new Error(data.message);
    err.error = data;
    err.status = res.status;
    err.statusText = res.statusText;
    process.exitCode = 1;
    throw err;
  }
  return data;
}

function jiraAuthToken(email = JIRA_EMAIL, token = JIRA_TOKEN) {
  const authToken = Buffer.from(`${email}:${token}`).toString("base64");
  return `Basic ${authToken}`;
}
