# Field Quick Calc monetization device test

## Preconditions

- [ ] Production AdMob app/unit IDs are inserted, but only test ads/test devices are used
- [ ] Store products are active and the device uses a Sandbox/license-test account
- [ ] Monetization UI is enabled only for the test build; production activation remains a separate decision

## iOS Sandbox

- [ ] UMP consent appears where required; accept, reject, and privacy-options paths do not crash
- [ ] Banner respects Safe Area and does not cover calculators or navigation
- [ ] Store-fetched prices appear for Remove Ads and all three tips
- [ ] Remove Ads succeeds, hides the banner immediately, and remains effective after relaunch
- [ ] Cancel/network failure does not grant Remove Ads
- [ ] Restore Purchases works after reinstall/on a second test device
- [ ] Each tip can be purchased repeatedly and unlocks no feature
- [ ] Core calculators still work offline

## Android license test

- [ ] UMP consent paths do not crash
- [ ] Banner does not cover system navigation or calculators
- [ ] Google Play prices appear for all products
- [ ] Remove Ads success persists; cancel, pending, and network failure do not grant it
- [ ] Non-consumable entitlement restores after reinstall
- [ ] Each consumable tip can be purchased repeatedly
- [ ] Core calculators still work offline

## Event verification

- [ ] `ad_banner_loaded`, `ad_banner_impression`, and (when safely testable) `ad_banner_click`
- [ ] `ad_banner_failed` under blocked network
- [ ] `remove_ads_viewed`
- [ ] `remove_ads_purchase_started/success/failed`
- [ ] `restore_purchase_started/success/empty/failed`
- [ ] `tip_viewed`
- [ ] `tip_purchase_started/success/failed`
