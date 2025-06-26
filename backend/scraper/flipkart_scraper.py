from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re
from typing import Optional

class FlipkartScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    async def get_price(self, url: str) -> float:
        """Extract price from Flipkart product page using Playwright."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                # Set user agent and navigate to URL
                await page.set_extra_http_headers(self.headers)
                await page.goto(url, wait_until='networkidle')
                
                # Wait for price element to be visible
                await page.wait_for_selector('._30jeq3._16Jk6d', timeout=5000)
                
                # Get the page content
                content = await page.content()
                soup = BeautifulSoup(content, 'html.parser')
                
                # Extract price
                price_element = soup.select_one('._30jeq3._16Jk6d')
                
                if not price_element:
                    raise ValueError('Price element not found')
                
                # Clean price string (remove currency symbol and commas)
                price_text = price_element.text.strip()
                price = float(re.sub(r'[^0-9.]', '', price_text))
                
                return price
            
            except Exception as e:
                raise Exception(f"Error scraping Flipkart price: {str(e)}")
            
            finally:
                await browser.close()

    async def get_product_details(self, url: str) -> dict:
        """Extract additional product details from Flipkart page."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                await page.set_extra_http_headers(self.headers)
                await page.goto(url, wait_until='networkidle')
                
                content = await page.content()
                soup = BeautifulSoup(content, 'html.parser')
                
                # Extract product details
                title = soup.select_one('span.B_NuCI')
                rating = soup.select_one('div._3LWZlK')
                availability = soup.select_one('div._16FRp0')
                image = soup.select_one('img._396cs4')
                
                return {
                    'title': title.text.strip() if title else None,
                    'rating': rating.text.strip() if rating else None,
                    'availability': availability.text.strip() if availability else None,
                    'image_url': image['src'] if image else None
                }
            
            except Exception as e:
                raise Exception(f"Error scraping Flipkart product details: {str(e)}")
            
            finally:
                await browser.close()