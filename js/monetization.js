(function () {
  "use strict";
  const config = window.GENBA_MONETIZATION_CONFIG;
  if (!config) return;
  const cacheKey = "fieldQuickCalc.monetization.removeAds.v1";
  const state = { platform: "web", removeAds: false, products: new Map() };
  const $ = (selector) => document.querySelector(selector);
  const plugin = (name) => window.Capacitor?.Plugins?.[name];
  const getPlatform = () => {
    const value = typeof window.Capacitor?.getPlatform === "function" ? window.Capacitor.getPlatform() : "web";
    return value === "ios" || value === "android" ? value : "web";
  };
  const idOf = (value) => value?.productIdentifier || value?.productId || value?.identifier || value?.id;
  const priceOf = (value) => value?.priceString || value?.formattedPrice || value?.displayPrice || "";

  function track(event, details = {}) {
    const payload = { event, source: state.platform, timestamp: new Date().toISOString(), ...details };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    window.dispatchEvent(new CustomEvent("genba:analytics", { detail: payload }));
  }

  function status(message, kind = "") {
    const node = $("#monetizationStatus");
    if (node) { node.textContent = message; node.dataset.kind = kind; }
  }

  function ids() {
    return [config.products.removeAds[state.platform], ...config.products.tips.map((tip) => tip[state.platform])].filter(Boolean);
  }

  function render() {
    const panel = $("#monetizationPanel");
    if (!panel) return;
    panel.hidden = !config.monetizationEnabled || state.platform === "web";
    panel.querySelectorAll("[data-pro-only]").forEach((node) => { node.hidden = !state.removeAds; });
    panel.querySelectorAll("[data-free-only]").forEach((node) => { node.hidden = state.removeAds; });
    const removeId = config.products.removeAds[state.platform];
    const removeProduct = state.products.get(removeId);
    const removeButton = panel.querySelector("[data-purchase='removeAds']");
    if (removeButton) removeButton.disabled = state.removeAds || !removeProduct;
    const removePrice = panel.querySelector("[data-price='removeAds']");
    if (removePrice) removePrice.textContent = priceOf(removeProduct);
    config.products.tips.forEach((tip) => {
      const product = state.products.get(tip[state.platform]);
      const button = panel.querySelector(`[data-tip='${tip.key}']`);
      const price = panel.querySelector(`[data-price='tip-${tip.key}']`);
      if (button) button.disabled = !product;
      if (price) price.textContent = priceOf(product);
    });
  }

  async function entitlement({ restore = false } = {}) {
    const purchases = plugin("NativePurchases");
    if (!purchases) return false;
    if (restore) await purchases.restorePurchases();
    const result = await purchases.getPurchases({ productType: "inapp", onlyCurrentEntitlements: true });
    const removeId = config.products.removeAds[state.platform];
    state.removeAds = (result.purchases || []).some((purchase) => idOf(purchase) === removeId);
    localStorage.setItem(cacheKey, state.removeAds ? "1" : "0");
    if (state.removeAds) await plugin("AdMob")?.hideBanner().catch(() => {});
    render();
    return state.removeAds;
  }

  async function loadProducts() {
    const result = await plugin("NativePurchases").getProducts({ productIdentifiers: ids(), productType: "inapp" });
    (result.products || []).forEach((product) => state.products.set(idOf(product), product));
    render();
  }

  async function banner() {
    if (state.removeAds) return;
    const admob = plugin("AdMob");
    const adId = config.admob.bannerIds[state.platform];
    if (!admob || !adId) return;
    admob.addListener("bannerAdFailedToLoad", () => track("ad_banner_failed"));
    admob.addListener("bannerAdImpression", () => track("ad_banner_impression"));
    admob.addListener("bannerAdOpened", () => track("ad_banner_click"));
    await admob.initialize({ initializeForTesting: Boolean(config.testMode) });
    let consent = await admob.requestConsentInfo();
    if (!consent.canRequestAds && consent.isConsentFormAvailable) consent = await admob.showConsentForm();
    if (!consent.canRequestAds) return;
    await admob.showBanner({ adId, adSize: "ADAPTIVE_BANNER", position: "BOTTOM_CENTER", margin: 0, isTesting: Boolean(config.testMode) });
    track("ad_banner_loaded");
  }

  async function buyRemoveAds() {
    const id = config.products.removeAds[state.platform];
    if (!state.products.has(id)) return;
    status("Opening the store…"); track("remove_ads_purchase_started");
    try {
      await plugin("NativePurchases").purchaseProduct({ productIdentifier: id, productType: "inapp", isConsumable: false });
      await entitlement();
      if (!state.removeAds) throw new Error("Entitlement unavailable");
      status("Ads removed. Thank you.", "success"); track("remove_ads_purchase_success");
    } catch (_) { status("Purchase was not completed.", "error"); track("remove_ads_purchase_failed"); }
  }

  async function buyTip(key) {
    const item = config.products.tips.find((tip) => tip.key === key);
    const id = item?.[state.platform];
    if (!id || !state.products.has(id)) return;
    status("Opening the store…"); track("tip_purchase_started", { product: `tip_${key}` });
    try {
      await plugin("NativePurchases").purchaseProduct({ productIdentifier: id, productType: "inapp", isConsumable: true });
      status("Thank you for supporting Field Quick Calc.", "success"); track("tip_purchase_success", { product: `tip_${key}` });
    } catch (_) { status("Tip was not completed.", "error"); track("tip_purchase_failed", { product: `tip_${key}` }); }
  }

  async function restore() {
    status("Checking purchases…"); track("restore_purchase_started");
    try {
      const restored = await entitlement({ restore: true });
      status(restored ? "Purchase restored." : "No restorable purchase was found.", restored ? "success" : "");
      track(restored ? "restore_purchase_success" : "restore_purchase_empty");
    } catch (_) { status("Purchases could not be checked.", "error"); track("restore_purchase_failed"); }
  }

  function bind() {
    $("[data-purchase='removeAds']")?.addEventListener("click", buyRemoveAds);
    document.querySelectorAll("[data-tip]").forEach((button) => button.addEventListener("click", () => buyTip(button.dataset.tip)));
    $("[data-restore-purchases]")?.addEventListener("click", restore);
    $("[data-privacy-options]")?.addEventListener("click", () => plugin("AdMob")?.showPrivacyOptionsForm());
    $("#customizeMenuBtn")?.addEventListener("click", () => {
      if (config.monetizationEnabled && state.platform !== "web") {
        track("remove_ads_viewed");
        track("tip_viewed");
      }
    });
  }

  async function initialize() {
    state.platform = getPlatform();
    state.removeAds = localStorage.getItem(cacheKey) === "1";
    bind(); render();
    if (!config.monetizationEnabled || state.platform === "web") return;
    try { await Promise.all([loadProducts(), entitlement()]); await banner(); }
    catch (_) { status("Store information is temporarily unavailable.", "error"); track("monetization_init_failure"); }
  }

  window.GenbaMonetization = { initialize, restore, refreshEntitlement: entitlement };
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
})();
