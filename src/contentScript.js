/* global chrome */

// Extract Amazon product info
const extractAmazonProduct = () => {
  try {
    const name = document.getElementById('productTitle')?.textContent?.trim();
    const priceElement = document.querySelector('.a-price-whole');
    const priceFraction = document.querySelector('.a-price-fraction')?.textContent || '00';
    const price = priceElement
      ? parseFloat(`${priceElement.textContent}.${priceFraction}`)
      : 0;
    const image = document.getElementById('landingImage')?.getAttribute('src');

    if (!name || !price) return null;

    return {
      name,
      currentPrice: price,
      url: window.location.href,
      image,
    };
  } catch (error) {
    console.error('Error extracting Amazon product info:', error);
    return null;
  }
};

// Extract Flipkart product info
const extractFlipkartProduct = () => {
  try {
    const name = document.querySelector('h1 span')?.textContent?.trim();
    const priceText = document.querySelector('._30jeq3._16Jk6d')?.textContent;
    const price = priceText
      ? parseFloat(priceText.replace(/[^0-9.]/g, ''))
      : 0;
    const image = document.querySelector('img._396cs4')?.getAttribute('src');

    if (!name || !price) return null;

    return {
      name,
      currentPrice: price,
      url: window.location.href,
      image,
    };
  } catch (error) {
    console.error('Error extracting Flipkart product info:', error);
    return null;
  }
};

// Decide which site we're on and extract accordingly
const extractProductInfo = () => {
  const hostname = window.location.hostname;

  if (hostname.includes('amazon')) {
    return extractAmazonProduct();
  } else if (hostname.includes('flipkart')) {
    return extractFlipkartProduct();
  }

  return null;
};

// Listen for popup requests
// contentScript.js
// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PRODUCT_INFO') {
    try {
      // Amazon-specific selectors
      let productName = document.getElementById('productTitle')?.textContent.trim() || 
                       document.querySelector('h1.a-size-large')?.textContent.trim() || 
                       'Unknown Product';
      
      let productPrice = document.querySelector('.a-price-whole')?.textContent.trim() || 
                        document.querySelector('.priceToPay span')?.textContent.trim() || 
                        '0';
      
      // Flipkart-specific selectors (add more as needed)
      if (window.location.host.includes('flipkart')) {
        productName = document.querySelector('.B_NuCI')?.textContent.trim() || 'Unknown Product';
        productPrice = document.querySelector('._30jeq3._16Jk6d')?.textContent.trim() || '0';
      }

      sendResponse({
        name: productName,
        currentPrice: productPrice,
        url: window.location.href
      });
    } catch (error) {
      console.error('Error getting product info:', error);
      sendResponse(null);
      
    }
  }
  return true; // Required for async sendResponse
});

// Notify background script if product info is immediately available
const productInfo = extractProductInfo();
if (productInfo) {
  chrome.runtime.sendMessage({
    type: 'PRODUCT_FOUND',
    data: productInfo,
  });
}
