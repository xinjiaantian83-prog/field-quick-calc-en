# Field Quick Calc monetization activation

Ads and purchases are currently disabled by `monetizationEnabled: false` in `js/monetization-config.js`. With the flag off, no monetization UI, banner, or reserved ad space is shown.

## Production identifiers

Replace all Google test identifiers before activation:

- iOS AdMob App ID: `ios/App/App/Info.plist`
- Android AdMob App ID: `android/app/src/main/res/values/strings.xml`
- iOS / Android banner unit IDs: `js/monetization-config.js`

Set `testMode` to `false` only after device testing, then set `monetizationEnabled` to `true`. To roll back, set the flag to `false` and rebuild.

## Store products

Create products with identifiers matching the configuration exactly:

- Remove ads, non-consumable: iOS `com.genbatoolbox.fieldquickcalcnew.remove_ads`; Android `remove_ads`
- Small tip, consumable: iOS `com.genbatoolbox.fieldquickcalcnew.tip.small`; Android `tip_small`
- Medium tip, consumable: iOS `com.genbatoolbox.fieldquickcalcnew.tip.medium`; Android `tip_medium`
- Large tip, consumable: iOS `com.genbatoolbox.fieldquickcalcnew.tip.large`; Android `tip_large`

Suggested tip price points are USD 1.99, 4.99, and 9.99. Prices displayed in the app come from App Store / Google Play product data and are not hardcoded. Tips are optional and unlock no features. Test purchase, restore, cancellation, and repeated consumable tips with Apple Sandbox and Google Play license testers.

## Consent and privacy

Google UMP updates consent information before an ad request and presents a consent form where required. The app does not currently request ATT permission. Add a usage description and contextual ATT request only if a future ad configuration actually tracks users across apps or websites.

Before release, update App Privacy and Google Play Data safety declarations to match the enabled SDK behavior and re-check the published privacy policy.

## app-ads.txt

Replace the placeholder publisher ID in `app-ads.txt.example`, then publish it as `app-ads.txt` at the root of the developer website registered in both stores. Never publish the placeholder.

## Activation sequence

1. Create the AdMob apps and banner units.
2. Configure GDPR and applicable US-state UMP messages.
3. Create and approve all Apple / Google products.
4. Insert production IDs and validate test ads plus sandbox purchases.
5. Update privacy disclosures and store data declarations.
6. Set `testMode: false` and `monetizationEnabled: true`, then submit new builds.

Events: `ad_banner_loaded`, `ad_banner_failed`, `ad_banner_impression`, `ad_banner_click`, `remove_ads_viewed`, `remove_ads_purchase_started`, `remove_ads_purchase_success`, `remove_ads_purchase_failed`, `restore_purchase_started`, `restore_purchase_success`, `restore_purchase_empty`, `restore_purchase_failed`, `tip_viewed`, `tip_purchase_started`, `tip_purchase_success`, `tip_purchase_failed`.

See `MONETIZATION-CONSOLE-CHECKLIST.md` for console-only actions and copy-ready product metadata. See `MONETIZATION-DEVICE-TEST-CHECKLIST.md` for device validation. The same console checklist documents the scripts for identifier insertion and app-ads.txt generation.
