# Field Quick Calc: console-only monetization work

Code updates, identifier insertion, app-ads.txt generation, and builds are automated locally. The steps below require an account holder to accept terms, create products, submit declarations, or upload review evidence in a browser.

## Overseas iOS

### AdMob

- [ ] AdMob > Apps > Add app > iOS and select the published Field Quick Calc listing.
- [ ] Create a banner unit named `Field Quick Calc iOS Bottom Banner`.
- [ ] Privacy & messaging: create and publish GDPR and applicable US-state consent messages.
- [ ] Copy the iOS App ID, banner unit ID, and Publisher ID.

### App Store Connect

- [ ] Create these in-app purchases and complete availability/pricing:

| Product ID | Type | English display name | English description | Japanese display name | Japanese description | Suggested price |
|---|---|---|---|---|---|---|
| `com.genbatoolbox.fieldquickcalcnew.remove_ads` | Non-consumable | Remove Ads | One-time purchase to remove ads from the app. | 広告を削除 | 買い切りでアプリ内の広告表示を削除します。 | USD 2.99 |
| `com.genbatoolbox.fieldquickcalcnew.tip.small` | Consumable | Small Tip | Send a small optional tip to support development. No features are unlocked. | スモールTip | 開発を応援する任意のTipです。機能の解除はありません。 | USD 1.99 |
| `com.genbatoolbox.fieldquickcalcnew.tip.medium` | Consumable | Medium Tip | Send an optional tip to support continued development. No features are unlocked. | ミディアムTip | 継続開発を応援する任意のTipです。機能の解除はありません。 | USD 4.99 |
| `com.genbatoolbox.fieldquickcalcnew.tip.large` | Consumable | Large Tip | Send a larger optional tip to support development. No features are unlocked. | ラージTip | 開発を大きく応援する任意のTipです。機能の解除はありません。 | USD 9.99 |

- [ ] For each product, upload one review screenshot showing the monetization panel, localized product title, and fetched price on a physical device.
- [ ] Remove Ads review note: `Open the monetization panel below the tool list. Remove Ads is a non-consumable purchase; Restore Purchases restores access.`
- [ ] Tip review note: `Open the monetization panel below the tool list. Tips are optional consumables and unlock no content or functionality.`
- [ ] Update App Privacy to match the enabled AdMob, UMP, and purchase SDK behavior.

## Overseas Android

### AdMob

- [ ] AdMob > Apps > Add app > Android and select the published Field Quick Calc listing.
- [ ] Create a banner unit named `Field Quick Calc Android Bottom Banner`.
- [ ] Add the Android app to the published consent messages.
- [ ] Copy the Android App ID and banner unit ID.

### Google Play Console

- [ ] Monetize > Products > In-app products: create and activate the following products.

| Product ID | Product behavior | English name | English description | Japanese name | Japanese description | Suggested base price |
|---|---|---|---|---|---|---|
| `remove_ads` | One-time/non-consumable | Remove Ads | One-time purchase to remove ads from the app. | 広告を削除 | 買い切りでアプリ内の広告表示を削除します。 | USD 2.99 |
| `tip_small` | Consumable | Small Tip | Optional tip to support development. No features are unlocked. | スモールTip | 開発を応援する任意のTipです。機能の解除はありません。 | USD 1.99 |
| `tip_medium` | Consumable | Medium Tip | Optional tip to support continued development. No features are unlocked. | ミディアムTip | 継続開発を応援する任意のTipです。機能の解除はありません。 | USD 4.99 |
| `tip_large` | Consumable | Large Tip | Larger optional tip to support development. No features are unlocked. | ラージTip | 開発を大きく応援する任意のTipです。機能の解除はありません。 | USD 9.99 |

- [ ] Add test Google accounts under Settings > License testing.
- [ ] Change the Ads declaration to “contains ads” and update Data safety to match actual SDK behavior.

## Local automation after IDs are supplied

```bash
node scripts/configure-monetization-ids.mjs \
  --ios-app-id=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY \
  --android-app-id=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY \
  --ios-banner-id=ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY \
  --android-banner-id=ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY

node scripts/generate-app-ads.mjs --publisher-id=pub-XXXXXXXXXXXXXXXX
```

The scripts do not change `monetizationEnabled` or `testMode`.
