# Local validation

Install dependencies with `npm ci`, then install the test browser with `npm run test:setup`.
Run `npm run web:build` followed by `npm test`.
The pinned Playwright dependency is local; no external npm-cache path is required.

Run `npm run cap:sync:ios` to rebuild www and sync the iOS public assets from source.
Source audio masters and store artwork in Asset remain available for regeneration, but are excluded from www and the app bundle.
Keep official character PNGs and font license files unchanged.

On an iPhone, check portrait-device landscape overlays, long gameplay frame pacing,
background/resume, and Control Center recording with microphone OFF in three modes:
BGM only, effects only, both enabled. An Xcode build and these device checks require macOS/iPhone;
Capacitor sync and browser tests alone do not certify them.
