# ExportDou error handling

## Authentication

- authentication_required: run npx exportdou login and ask the user to approve the browser authorization.
- unauthorized: the credential is invalid, expired, or revoked. Log in again.
- expired_token: restart the device login flow.

Never reveal the API Key while diagnosing authentication.

## Input and availability

- invalid_douyin_link or invalid_request: ask for a public Douyin video link or complete share text.
- video_unavailable: the video may be deleted, private, region-restricted, or temporarily inaccessible. Ask for another public link.
- comment_count_unavailable: use a user-approved numeric --limit instead of --all.
- result_limit_exceeded: choose at most 200,000 rows.

## Credits and policy

- insufficient_credits: stop. Report the required/current amount when available and link to https://exportdou.cn/pricing.
- paid_feature_required: replies or XLSX require the applicable subscription. Offer root-only CSV or ask the user to upgrade.
- concurrency_limit: preserve the current task IDs and wait for an active task to close. Do not submit replacements.

## Retryable failures

- rate_limited: wait retryAfterSeconds, then repeat the same read or status action.
- network_error or request_timeout during create: the CLI already retries with one Idempotency-Key and attempts recovery. Do not wrap export in another retry loop.
- upstream_rate_limited, preview_unavailable, or internal_error: wait with exponential backoff. Reuse the same task ID or creation request identity.

## Task states

- failed: report the public error and released-credit state; do not invent a result.
- cancelled: report that the task stopped and any unspent reservation was released.
- expired: the retained artifact is no longer available. Ask before creating a new paid export.
- partial: a usable file exists but reply coverage or source traversal was incomplete. State that limitation when presenting results.
- resume_already_active: keep the same task ID and continue status polling.
- resume_pages_missing: the saved checkpoints have expired; report that the same task can no longer be resumed.
- resume_not_eligible, resume_completed, resume_failed_job, resume_source_complete, resume_credit_not_settled, or resume_artifact_not_ready: do not create a replacement without user approval.
- export_not_ready: run status with the same task ID after the suggested interval.

## Local files

- output_exists: ask before adding --force.
- checksum_mismatch or size_mismatch: the partial file was deleted. Retry download for the same completed task; do not create another export.
