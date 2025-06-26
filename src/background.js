/* global chrome */

/**
 * @typedef {Object} TrackedProduct
 * @property {string} url
 * @property {number} threshold
 * @property {number} lastChecked
 */

// Run check every hour
const CHECK_INTERVAL = 60 * 60 * 1000;

// Initialize tracked products from storage
chrome.storage.local.get(['trackedProducts'], (result) => {
  const trackedProducts = result.trackedProducts || {};
  startPriceMonitoring(trackedProducts);
});

// Listen for messages to track a new product
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRACK_PRODUCT') {
    const { url, threshold } = message.data;
    addProductToTrack(url, threshold);
    sendResponse({ success: true });
  }
});

// Add new product and trigger first check
async function addProductToTrack(url, threshold) {
  const { trackedProducts = {} } = await chrome.storage.local.get(['trackedProducts']);

  trackedProducts[url] = {
    url,
    threshold,
    lastChecked: Date.now(),
  };

  await chrome.storage.local.set({ trackedProducts });
  checkPrice(url, threshold);
}

// Periodically monitor all tracked products
function startPriceMonitoring(trackedProducts) {
  // First-time check
  Object.values(trackedProducts).forEach((product) => {
    checkPrice(product.url, product.threshold);
  });

  // Then interval checks
  setInterval(() => {
    Object.values(trackedProducts).forEach((product) => {
      checkPrice(product.url, product.threshold);
    });
  }, CHECK_INTERVAL);
}

// Fetch current price and notify if below threshold
async function checkPrice(url, threshold) {
  try {
    const response = await fetch(`http://localhost:8000/api/price?url=${encodeURIComponent(url)}`);
    const { price } = await response.json();

    if (price <= threshold) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: 'Price Alert!',
        message: `The price has dropped to $${price}! Click to view the product.`,
      });

      const { trackedProducts } = await chrome.storage.local.get(['trackedProducts']);
      if (trackedProducts[url]) {
        trackedProducts[url].lastChecked = Date.now();
        await chrome.storage.local.set({ trackedProducts });
      }
    }
  } catch (error) {
    console.error('Error checking price:', error);
  }
}

