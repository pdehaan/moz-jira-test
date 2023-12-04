import "dotenv/config";
import _groupBy from "lodash.groupby";
import sortJson from "sort-json";
import { Interval, DateTime } from "luxon";

const { JIRA_EMAIL, JIRA_TOKEN, JIRA_SERVER } = process.env;
const AUTH_TOKEN = jiraAuthToken(JIRA_EMAIL, JIRA_TOKEN);

/**
 * Pretty print a JSON object using `JSON.stringify()` with some indentation.
 * @param {*} data
 * @param {*} indent
 * @returns
 */
export function jsonify(data = {}, indent = 2) {
  // const sortedData = sortJson(data, { ignoreCase: true });
  return JSON.stringify(data, null, indent);
}

/**
 * Delete potential PII ("assignee" / "reporter" / "summary" / "issues") from an issue.
 * @param {object} data An issue to remove potential PII fields from.
 * @returns A sanitized object (without an `assignee`, `reporter`, `summary`, or `issues[]`).
 */
export function sanitizeIssue(data = {}) {
  // It's possible we don't even need to fetch these in the first place if we're ignoring them anyways.
  delete data.assignee;
  delete data.reporter;
  delete data.summary;
  delete data.issues;

  return data;
}

/**
 * Convert from a Jira object to something a bit more data friendly.
 * @param {object} issue
 * @param {boolean} sanitize
 * @returns A remapped issue.
 */
export function mapIssue(issue = {}, sanitize = false) {
  const f = issue.fields;
  const data = Object.assign({}, f, {
    key: issue.key,
    issuetype: f.issuetype.name,
    priority: f.priority.name,
    status: f.status.name,
    components: f.components.map((c) => c.name),
    reporter: f.reporter?.displayName,
    assignee: f.assignee?.displayName ?? null,
    created: new Date(f.created),
    updated: new Date(f.updated),
    // Remap custom `severity` field.
    severity: f.customfield_10319?.value ?? null,
  });

  // Delete custom "severity" field (since we remapped above).
  delete data.customfield_10319;

  if (sanitize) {
    return data.map((issue) => sanitizeIssue(issue));
  }
  return data;
}

/**
 * Helper function to actually fetch the issues from Jira REST API.
 * @param {string} path
 * @param {*} bodyData
 * @returns
 */
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

/**
 * Create an authorization header token using the specified `email` used to create the token, and the API `token` itself.
 * https://id.atlassian.com/manage-profile/security/api-tokens
 * @param {string} email Email address used to generate API token.
 * @param {string} token Super top secret API token.
 * @returns Authentication header token.
 */
function jiraAuthToken(email = JIRA_EMAIL, token = JIRA_TOKEN) {
  if (!email || !token) {
    throw new Error(
      "Jira `email` and Jira `token`` are required to generate auth token."
    );
  }
  const authToken = Buffer.from(`${email}:${token}`).toString("base64");
  return `Basic ${authToken}`;
}

/**
 * Group issues by FxA/SubPlat based on whether the "component" field is set to "Subscription Platform".
 * @param {array} issues
 * @returns An object with two properties, `fxa` and `subplat`, each containing an array of issues.
 */
export function groupByProduct(issues = []) {
  const grouped = _groupBy(issues, (issue) =>
    issue.components.includes("Subscription Platform")
  );
  return {
    fxa: grouped.false,
    subplat: grouped.true,
  };
}

/**
 * Group an array of issues based on which week (Sunday - Saturday) they were reported.
 * @param {array} issues
 * @returns
 */
export function groupByWeek(issues = []) {
  const END_OF_WEEK = endOfWeek();
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

    acc.push({
      week: weekNum,
      startDate: startDate.toJSDate(),
      endDate: endDate.toJSDate(),
      issues,
      ...getIssueStats(issues),
    });

    return acc;
  }, []);
  return res;
}

/**
 * Group an array of issues based on which month they were reported.
 * @param {array} issues
 * @returns
 */
export function groupByMonth(issues = []) {
  const groupedByDate = _groupBy(issues, (issue) => {
    const created = new Date(issue.created);
    return new Date(
      Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), 1)
    ).toLocaleDateString("en-US", { timeZone: "UTC" });
  });

  const res = Object.entries(groupedByDate).reduce((acc, [month, issues]) => {
    acc.push({
      month,
      issues,
      ...getIssueStats(issues),
    });
    return acc;
  }, []);
  return res;
}

/**
 *
 * @param {array} arr
 * @param {string} key
 * @returns
 */
export function reducer(arr = [], key = "") {
  return Object.entries(_groupBy(arr, key)).reduce((acc, [k, v]) => {
    acc[k] = v.length;
    return acc;
  }, {});
}

/**
 *
 * @param {array} issues
 * @returns
 */
export function getIssueStats(issues = []) {
  issues = issues.map((issue) => {
    issue.isMaintenance = issue.labels.includes("maintenance");
    issue.isSentry = issue.labels.includes("sentry");
    issue.isSubPlat = issue.components.includes("Subscription Platform");
    return issue;
  });

  return {
    byPriority: reducer(issues, "priority"),
    bySeverity: reducer(issues, "severity"),
    byIssueType: reducer(issues, "issuetype"),
    byStatus: reducer(issues, "status"),
    byMaintenance: reducer(issues, "isMaintenance"),
    bySubPlat: reducer(issues, "isSubPlat"),
    // byLabel, // Not super useful... yet.
  };
}

/**
 *
 * @param {array} issues
 * @returns
 */
export function byLabel(issues = []) {
  const uniqueLabels = issues.reduce((acc, issue) => {
    issue.labels.forEach((label) => acc.add(label));
    return acc;
  }, new Set());

  return Array.from(uniqueLabels)
    .sort()
    .filter((label) => !["qa+", "qa-", "qa-minor", "qa-medium"].includes(label))
    .reduce((acc, label) => {
      acc[label] = issues.filter((issue) =>
        issue.labels.includes(label)
      ).length;
      return acc;
    }, {});
}

/**
 * Calculate the end of the specified week to Saturday at 23:59:59.999 UTC.
 * @param {date} date
 * @returns
 */
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

  return DateTime.fromJSDate($utc);
}

/**
 * Fetch paginated issues from Jira.
 * @param {string} project Jira Project ID.
 * @param {string[]} fields Array of strings, or "columns", to return from Jira issues.
 * @param {number} maxResults The maximum number of issues you want. Defaults to returning all paginated issues.
 * @returns
 */
export async function fetchJiraIssues(
  project = "FXA",
  fields = [],
  maxResults
) {
  const bodyData = {
    expand: ["schema"],
    fields,
    fieldsByKeys: false,
    jql: `project = ${project} AND issuetype IN (Bug, Task) AND resolution = Unresolved ORDER BY created DESC`,
    maxResults: maxResults ? Math.min(maxResults, 100) : 100,
    startAt: 0,
  };
  let issues = [];
  let res;

  do {
    res = await fetchJira("/rest/api/3/search", bodyData);
    issues.push(...res.issues);
    bodyData.startAt = issues.length;
    if (maxResults && issues.length >= maxResults) {
      break;
    }
  } while (issues.length < res.total);
  issues = issues.map((issue) => mapIssue(issue));
  if (maxResults) {
    return issues.slice(0, maxResults);
  }
  return issues;
}
