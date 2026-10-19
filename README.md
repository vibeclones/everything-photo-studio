# everything-photo-studio (Vibeclones mirror)

Hosted builds of the **photo-studio** app from Puter's [Everything](https://github.com/HeyPuter/everything) project (MIT). The code is theirs; this repo only builds and hosts it. Puter's own site serves only the newest version; this repo keeps older snapshots so the timeline can be explored in a browser.

- Latest: `/everything-photo-studio/latest/`
- A specific snapshot: `/everything-photo-studio/v<snapshot>/`
- Snapshot list: `/everything-photo-studio/versions.json`

Upstream doesn't publish releases or version numbers, so each snapshot is named after the date and short hash of an upstream commit that touched `src/photo-studio`, for example `v2026.10.16-ab12cd3`. These are not official releases. A scheduled workflow builds a new snapshot when that app changes upstream; older ones are built on request.
