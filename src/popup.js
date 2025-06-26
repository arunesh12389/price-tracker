document.getElementById('trackBtn').onclick = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Site validation
    if (!tab.url.includes('amazon.in') && !tab.url.includes('flipkart.com')) {
      alert('This site is not supported. Please use Amazon or Flipkart.');
      return;
    }

    // Get product data
    const product = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCT_INFO' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Communication error: ' + chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });

    if (!product) {
      document.getElementById('productName').textContent = 'Product not found';
      document.getElementById('productPrice').textContent = '-';
      alert('Could not extract product details.');
      return;
    }

    // Update UI
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productPrice').textContent = product.currentPrice;

    // Prepare payload
    const payload = {
      url: product.url,
      name: product.name,
      price: parseFloat(product.currentPrice.replace(/[^0-9.]/g, '')),
      threshold: parseFloat(document.getElementById('priceThreshold')?.value || 1000),
      last_checked: new Date().toISOString()
    };

    // Send to backend
    const backendResponse = await fetch('http://localhost:8000/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!backendResponse.ok) {
      throw new Error(`HTTP error! status: ${backendResponse.status}`);
    }

    const result = await backendResponse.json();
    
    // Show success and render graph
    showTrackingStatus(`Tracking: ${product.name}`, true);
    if (result.prediction) {
      renderPredictionGraph(result.prediction);
    }

  } catch (error) {
    console.error('Error:', error);
    showTrackingStatus(error.message, false);
  }
};

// Graph rendering function
function renderPredictionGraph(predictionData) {
  const graphContainer = document.getElementById('graphContainer');
  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  
  // Clear previous graph if exists
  if (window.predictionChart) {
    window.predictionChart.destroy();
  }

  // Create new chart
  window.predictionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: predictionData.dates,
      datasets: [{
        label: 'Price Prediction',
        data: predictionData.prices,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (context) => `₹${context.raw.toFixed(2)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: (value) => `₹${value}`
          }
        }
      }
    }
  });

  // Update recommendation
  document.getElementById('recText').textContent = predictionData.recommendation;
  document.getElementById('confText').textContent = (predictionData.confidence * 100).toFixed(0);
  
  // Show graph container
  graphContainer.style.display = 'block';
}

// UI helper function
function showTrackingStatus(message, isSuccess) {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.style.color = isSuccess ? 'green' : 'red';
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}


async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: {tabId: tabId},
      files: ['contentScript.js']
    });
    console.log("Injected content script");
  } catch (err) {
    console.error("Injection failed:", err);
  }
}

// Call this when popup opens
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  injectContentScript(tabs[0].id);
});