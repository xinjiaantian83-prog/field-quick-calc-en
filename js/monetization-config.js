(function () {
  "use strict";
  window.GENBA_MONETIZATION_CONFIG = Object.freeze({
    monetizationEnabled: false,
    locale: "en-US",
    market: "global",
    testMode: true,
    admob: { bannerIds: {
      ios: "ca-app-pub-3940256099942544/2934735716",
      android: "ca-app-pub-3940256099942544/6300978111"
    } },
    products: {
      removeAds: { ios: "com.genbatoolbox.fieldquickcalcnew.remove_ads", android: "remove_ads" },
      tips: [
        { key: "small", ios: "com.genbatoolbox.fieldquickcalcnew.tip.small", android: "tip_small" },
        { key: "medium", ios: "com.genbatoolbox.fieldquickcalcnew.tip.medium", android: "tip_medium" },
        { key: "large", ios: "com.genbatoolbox.fieldquickcalcnew.tip.large", android: "tip_large" }
      ]
    }
  });
})();
