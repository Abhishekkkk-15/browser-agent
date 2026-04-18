import { Page } from "playwright";

/**
 * Extracts a simplified version of the DOM with numeric IDs
 * assigned to every interactive element.
 * Optimized for speed and token efficiency.
 */
export async function getSimplifiedPageStructure(page: Page) {
  return await page.evaluate(() => {
    // 1. Remove previous markers
    const oldMarkers = document.querySelectorAll('[data-agent-id]');
    if (oldMarkers) {
      oldMarkers.forEach(el => el.removeAttribute('data-agent-id'));
    }

    if (!document.body) {
      return "(Page is still loading or body is missing...)";
    }

    // 2. Identify interactive elements
    const selectors = [
      'a', 'button', 'input', 'select', 'textarea', 
      '[role="button"]', '[role="link"]', '[role="checkbox"]',
      '[onclick]', '.btn', '.button'
    ];
    
    // Using a more restricted search scope (body) for speed
    const elements = Array.from(document.body.querySelectorAll(selectors.join(','))) as HTMLElement[];
    
    // 3. Filter visible elements (Fast check)
    // We avoid getComputedStyle where possible as it's slow.
    const visibleElements = elements.filter(el => {
      if (el.offsetWidth <= 0 || el.offsetHeight <= 0) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      
      const rect = el.getBoundingClientRect();
      const isVisible = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
      
      return isVisible;
    }).slice(0, 100); // Limit to top 100 elements for speed and token cost

    // 4. Assign IDs and extract data
    return visibleElements.map((el, index) => {
      el.setAttribute('data-agent-id', index.toString());
      
      const tag = el.tagName.toLowerCase();
      const type = (el as HTMLInputElement).type || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const text = el.innerText.trim().substring(0, 40); // Shorter text for token efficiency
      const ariaLabel = el.getAttribute('aria-label') || '';

      let description = `[${index}] ${tag}`;
      if (type && type !== 'text') description += `:${type}`;
      if (placeholder) description += ` p:"${placeholder}"`;
      if (ariaLabel) description += ` a:"${ariaLabel}"`;
      if (text) description += ` "${text}"`;

      return description;
    }).join('\n');
  });
}
