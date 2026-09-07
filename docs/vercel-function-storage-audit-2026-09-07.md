# Vercel Function Storage audit — 7 September 2026

## Outcome and scope

The supplied Vercel email reports 100% of the team's 10 GB Function Storage allowance. The team is confirmed on Hobby. This audit inventories all eight Vercel projects and adds FootAsylum deployment safeguards. No deployments, projects, application records or uploaded documents were deleted. The live production deployment remains `dpl_5exHYXheZGxprBKXG88dQn9Ps4GD`, commit `11bbe3b99a9c06e096b62168785cdeea10079d41`.

The precise billed storage total, per-project contribution and billing window could not be read: the in-app browser requires Vercel login, native Chrome access timed out, and the available connector/API responses did not supply that metric. The warning is therefore not confirmed resolved, and no guaranteed storage saving is claimed.

## Verified deployment inventory

Authenticated Vercel REST API pagination completed for every project, without truncation. Evidence is in `output/vercel-storage-audit/inventory.json` (local operational evidence).

| Project | Retained deployments | Ready |
| --- | ---: | ---: |
| foot-asylum-kss | 62 | 62 |
| lm-world-tour (ForeKingHell) | 176 | 169 |
| what-bin-is-it-tonight | 72 | 69 |
| what-bin-council-console | 57 | 45 |
| mileage-tracker-app | 34 | 34 |
| kss-accessibility-live-monitor | 20 | 20 |
| tfs | 39 | 38 |
| davidcapener-portfolio | 20 | 20 |
| **Total** | **480** | **457** |

Every project already has 30-day retention for production, preview, canceled and errored deployments, and `deploymentsToKeep: 10`. There is no evidence that retention was disabled. The latest 20 FootAsylum deployments are all Ready production deployments, spanning 3–7 September, with nine created on 7 September UTC.

Deployment counts are not storage sizes. Shared function artifacts, aliases and protected deployments mean counts cannot be multiplied by one local bundle size to calculate billed usage. ForeKingHell has the largest deployment count; this does not establish that it uses the most bytes.

## Local build findings

The existing macOS `.next` build has 156 trace manifests, 244,344,714 bytes of unique traced files and no missing referenced files. These are uncompressed local measurements, not Vercel Linux function artifacts or billed account usage.

- Largest trace: newsletter PDF, 130,346,910 bytes.
- EMP master-template PDF: 102,112,410 bytes.
- Several Chromium-backed PDF traces: approximately 83 MB each.
- Largest individual dependency: `@sparticuz/chromium/bin/chromium.br`, approximately 61.81 MB.
- Several newsletter placeholder PNGs individually occupy 7–9 MB.

Frequent deployments and heavy PDF dependencies are supported contributors to investigate. Their exact share of the 10 GB is unverified. PDF runtime dependencies and source assets were preserved for the subsequent fix phase.

## Safeguards installed

### Active on Vercel

FootAsylum's Ignored Build Step now skips a build only when a valid previous deployment commit is available and the diff contains only `docs/**` or the root `README.md`. Code changes, unknown files, missing previous commits and unavailable history continue to build. Comparing against the previous deployment, rather than just `HEAD^`, includes accumulated changes.

The remote setting was saved and independently read back. The previous setting was absent; rollback is to restore it to null. Evidence: `output/vercel-storage-audit/live-controls.json`.

### Implemented locally, awaiting release

- `npm run check:function-storage` fails if unique traced dependencies exceed 300 MiB or an individual trace exceeds 160 MiB. These limits leave headroom above the observed baseline while detecting further growth.
- Missing/invalid traces and missing dependencies fail the check.
- `vercel.json` runs this guard after the production build, so Vercel Git deployments enforce it once this change is released.
- GitHub CI also runs it after its production build.
- The repository records the same ignored-build command used in the dashboard.

These controls reduce avoidable deployments and detect bundle growth. They cannot guarantee an account-wide 10 GB ceiling: retained deployment growth and the other seven projects are outside this build guard. No repository changes were pushed or deployed during this audit.

## Verification

- Four focused guard tests passed: shared dependency deduplication, total/per-trace limit failures, missing files, empty builds and invalid budgets.
- The guard passed on all 156 existing local production traces.
- A temporary Git repository confirmed documentation changes skip, application changes build, and missing/invalid previous commit references build.
- Remote ignored-build setting readback matched exactly.
- No fresh application build or PDF rendering was performed; this phase changed deployment controls only.

## Next fix phase

1. Read the team's Usage → Deployment Storage / Function Storage panel for the exact period and each project's bytes; save a baseline before cleanup.
2. Audit the heaviest project's actual deployed artifacts, starting with FootAsylum's PDF assets and browser dependencies. Optimise images or dependency packaging only with before/after PDF rendering checks.
3. Review obsolete deployments across all projects. Protect live domains, aliases, active branch previews and a verified rollback deployment. Check protected-retention behaviour before choosing candidates; never delete whole projects solely from this inventory.
4. Release the scoped local guards, then verify the Linux build and live app. Batch related changes into releases to avoid repeatedly storing intermediate production builds.
5. After approved cleanup, re-read the same usage metric. Do not promise immediate recovery or a monthly reset without confirming how this specific metric is accounted for.

## Plan constraint

Vercel's current [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) restrict Hobby to personal, non-commercial use. FootAsylum appears to be a business application; reducing usage does not resolve plan eligibility. Avoiding Vercel Pro may require a different hosting arrangement suitable for commercial use. No upgrade, subscription or migration was initiated.

References: [Hobby retention announcement](https://vercel.com/changelog/hobby-projects-now-default-to-30-day-deployment-retention), [project settings API](https://vercel.com/docs/rest-api/projects/update-an-existing-project). Retention has protected exceptions; documentation alone is not evidence that a particular deployment is eligible for removal.


## Implementation follow-up

The newsletter PDF trace unnecessarily included the whole public directory. Route-specific tracing exclusions now omit unrelated root files, other public asset directories and unused reminder artwork. Source assets remain unchanged and available to other routes and the CDN. A 90 MiB newsletter-specific guard prevents the previous 130 MB trace from returning unnoticed.

Verification: a fresh isolated production build passed compilation, lint and types; all 465 unit tests passed; the build trace and client JavaScript guards passed. Every literal newsletter image reference is retained. Both pages of a synthetic newsletter rendered with only the packaged public files were byte-identical as rendered PNGs to the baseline, and were visually inspected. The final complete-dependency build has 189,564,422 unique traced bytes. Local trace sizes remain estimates, not billed usage.

Cleanup review identified 191 candidates across seven projects after checking live GitHub branches and current aliases. TFS is excluded because its repository could not be verified. Candidates are Ready and older than 14 days, outside the latest ten overall and latest ten per production/preview environment, and outside current branch heads. Any remaining aliases must be autogenerated branch URLs for a branch confirmed absent from GitHub. This is a candidate list, not proof of deletion: every candidate needs a final live protection check before removal. The storage baseline and deletion step remain pending dashboard access.
