// Reusable SQL snippets for the GA4 BigQuery export schema.
// Call them in any .sqlx file as ga4.eventParam(...) / ga4.channelGroup(...)

// Pull one value out of the repeated event_params field.
// type: "string" | "int" | "double" | "float"
function eventParam(key, type = "string") {
  return `(SELECT value.${type}_value FROM UNNEST(event_params) WHERE key = '${key}')`;
}

// Simplified version of GA4's default channel grouping, built from session source/medium.
function channelGroup(source, medium) {
  return `CASE
    WHEN ${medium} IN ('(data deleted)', '<Other>') OR ${source} IN ('(data deleted)', '<Other>') THEN 'Unknown (obfuscated)'
    WHEN ${source} IS NULL OR ${source} = '(direct)' THEN 'Direct'
    WHEN REGEXP_CONTAINS(${medium}, r'^(cpc|ppc|paid.*)$') THEN 'Paid Search'
    WHEN ${medium} = 'organic' THEN 'Organic Search'
    WHEN REGEXP_CONTAINS(${medium}, r'^(display|cpm|banner)$') THEN 'Display'
    WHEN ${medium} = 'referral' THEN 'Referral'
    WHEN REGEXP_CONTAINS(${medium}, r'email') THEN 'Email'
    ELSE 'Other'
  END`;
}

// Shared incremental pattern: on incremental runs, reload from (latest loaded date - lookback_days).
// On a full refresh, load from start_date. Sets a BigQuery script variable called load_from.
function declareLoadFrom(dateColumn, selfTable, isIncremental) {
  const vars = dataform.projectConfig.vars;
  return isIncremental
    ? `DECLARE load_from DATE DEFAULT (SELECT DATE_SUB(MAX(${dateColumn}), INTERVAL ${vars.lookback_days} DAY) FROM ${selfTable});`
    : `DECLARE load_from DATE DEFAULT DATE('${vars.start_date}');`;
}

module.exports = { eventParam, channelGroup, declareLoadFrom };
