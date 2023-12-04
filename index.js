// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-post

import * as lib from "./lib.js";
import issues from "./fxa.json" assert { type: "json" };

console.log(lib.jsonify(issues));
