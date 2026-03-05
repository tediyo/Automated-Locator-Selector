import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { chromium } from 'playwright';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchHistory } from './search-history.entity';

@Injectable()
export class LocatorService {
    constructor(
        @InjectRepository(SearchHistory)
        private searchHistoryRepository: Repository<SearchHistory>,
    ) { }

    async generateLocators(url: string, keyword: string, locatorType: string, userId: number) {
        let browser;
        try {
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const normalizedKeyword = keyword.toLowerCase();

            const elements = await page.evaluate((kw) => {
                // --- Helper functions ---

                // Get only the element's own direct text (not from children)
                function getDirectText(el: Element): string {
                    let text = '';
                    for (const node of el.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            text += node.textContent?.trim() || '';
                        }
                    }
                    return text.trim();
                }

                // Escape special characters for CSS selectors (Tailwind: '/', ':', etc.)
                function escapeCssIdent(s: string): string {
                    return s.replace(/([^\w-])/g, '\\$1');
                }

                // Generate Relative XPath (anchored to nearest parent with an ID)
                function getRelativeXPath(el: Element): string {
                    if (el.id) return `//*[@id="${el.id}"]`;

                    let current: Element | null = el;
                    const path: string[] = [];
                    while (current && current !== document.documentElement) {
                        if (current.id && current !== el) {
                            return `//*[@id="${current.id}"]/${path.join('/')}`;
                        }
                        const tag = current.tagName.toLowerCase();
                        let index = 1;
                        let sibling = current.previousElementSibling;
                        while (sibling) {
                            if (sibling.tagName === current.tagName) index++;
                            sibling = sibling.previousElementSibling;
                        }
                        const siblings = current.parentElement
                            ? Array.from(current.parentElement.children).filter(c => c.tagName === current!.tagName)
                            : [];
                        path.unshift(siblings.length > 1 ? `${tag}[${index}]` : tag);
                        current = current.parentElement;
                    }
                    return '/html/' + path.join('/');
                }

                // Generate Full XPath (absolute from /html)
                function getFullXPath(el: Element): string {
                    let current: Element | null = el;
                    const path: string[] = [];
                    while (current && current !== document.documentElement) {
                        const tag = current.tagName.toLowerCase();
                        let index = 1;
                        let sibling = current.previousElementSibling;
                        while (sibling) {
                            if (sibling.tagName === current.tagName) index++;
                            sibling = sibling.previousElementSibling;
                        }
                        const siblings = current.parentElement
                            ? Array.from(current.parentElement.children).filter(c => c.tagName === current!.tagName)
                            : [];
                        path.unshift(siblings.length > 1 ? `${tag}[${index}]` : tag);
                        current = current.parentElement;
                    }
                    return '/html/' + path.join('/');
                }

                // Generate CSS Selector (exact Chrome DevTools behavior)
                function getCssSelector(el: Element): string {
                    if (el.id) return `#${escapeCssIdent(el.id)}`;

                    let current: Element | null = el;
                    const parts: string[] = [];

                    while (current && current !== document.body && current !== document.documentElement) {
                        // If element has an ID, anchor here and stop
                        if (current.id) {
                            parts.unshift(`#${escapeCssIdent(current.id)}`);
                            break;
                        }

                        const tag = current.tagName.toLowerCase();
                        const parent = current.parentElement;
                        let selector = tag;

                        if (parent) {
                            const siblings = Array.from(parent.children);
                            const sameTagSiblings = siblings.filter((s: Element) => s.tagName === current!.tagName);

                            if (sameTagSiblings.length > 1) {
                                // Multiple same-tag siblings → add ALL classes
                                if (current.className && typeof current.className === 'string') {
                                    const classes = current.className.trim().split(/\s+/).filter(Boolean);
                                    if (classes.length > 0) {
                                        selector += '.' + classes.map(c => escapeCssIdent(c)).join('.');
                                    }
                                }

                                // Check if tag+classes is still not unique
                                const selectorClasses = typeof current.className === 'string' ? current.className : '';
                                const stillAmbiguous = sameTagSiblings.filter((s: Element) => {
                                    const sClasses = typeof s.className === 'string' ? s.className : '';
                                    return sClasses === selectorClasses;
                                });
                                if (stillAmbiguous.length > 1) {
                                    const childIndex = siblings.indexOf(current) + 1;
                                    selector += `:nth-child(${childIndex})`;
                                }
                            }
                            // If only one element with this tag → just use tag (no classes)
                        }

                        parts.unshift(selector);
                        current = parent;
                    }

                    return parts.join(' > ');
                }

                // Generate JS Path
                function getJsPath(el: Element): string {
                    const sel = getCssSelector(el);
                    return `document.querySelector("${sel.replace(/"/g, '\\"')}")`;
                }

                // Get computed styles
                function getStyles(el: Element): string {
                    const computed = window.getComputedStyle(el);
                    const importantProps = [
                        'display', 'position', 'width', 'height', 'margin', 'padding',
                        'background', 'background-color', 'color', 'font-size', 'font-weight',
                        'font-family', 'border', 'border-radius', 'box-shadow', 'opacity',
                        'cursor', 'text-align', 'line-height', 'overflow', 'z-index',
                        'transition', 'transform', 'flex', 'grid',
                    ];
                    const lines: string[] = [];
                    for (const prop of importantProps) {
                        const val = computed.getPropertyValue(prop);
                        if (val && val !== 'none' && val !== 'normal' && val !== 'auto' && val !== '0px' && val !== 'static') {
                            lines.push(`${prop}: ${val};`);
                        }
                    }
                    return lines.join('\n');
                }

                // --- Scan elements ---
                const selectors = 'input, button, select, textarea, a, label, h1, h2, h3, h4, h5, h6, img, th, td, li, p, span, div';
                const allElements = document.querySelectorAll(selectors);
                const results: {
                    tag: string;
                    directText: string;
                    xpath: string;
                    fullXpath: string;
                    cssSelector: string;
                    jsPath: string;
                    outerHTML: string;
                    element: string;
                    styles: string;
                }[] = [];

                allElements.forEach((el) => {
                    // Skip invisible elements
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden') return;

                    const id = el.id || '';
                    const name = (el as any).name || '';
                    const placeholder = (el as any).placeholder || '';
                    const ariaLabel = el.getAttribute('aria-label') || '';
                    const className = typeof el.className === 'string' ? el.className : '';
                    const directText = getDirectText(el);

                    const matchTargets = [id, name, placeholder, ariaLabel, className, directText];
                    const match = matchTargets.some(val => val.toLowerCase().includes(kw));

                    if (match) {
                        const outerHTML = el.outerHTML;

                        results.push({
                            tag: el.tagName.toLowerCase(),
                            directText: directText.substring(0, 60),
                            xpath: getRelativeXPath(el),
                            fullXpath: getFullXPath(el),
                            cssSelector: getCssSelector(el),
                            jsPath: getJsPath(el),
                            outerHTML: outerHTML.substring(0, 1000),
                            element: outerHTML.substring(0, 500),
                            styles: getStyles(el),
                        });
                    }
                });

                return results;
            }, normalizedKeyword);

            // Map to the selected locator type
            const locators = elements.map(el => {
                let locator = '';
                switch (locatorType.toLowerCase()) {
                    case 'xpath':
                        locator = el.xpath;
                        break;
                    case 'full_xpath':
                        locator = el.fullXpath;
                        break;
                    case 'selector':
                        locator = el.cssSelector;
                        break;
                    case 'js_path':
                        locator = el.jsPath;
                        break;
                    case 'outerhtml':
                        locator = el.outerHTML;
                        break;
                    case 'element':
                        locator = el.element;
                        break;
                    case 'styles':
                        locator = el.styles;
                        break;
                    default:
                        locator = el.xpath;
                }
                return { tag: el.tag, locator };
            }).filter(l => l.locator && l.locator.trim() !== '');

            // Save to history
            const history = this.searchHistoryRepository.create({
                url,
                keyword,
                locatorType,
                results: locators,
                user: { id: userId } as any,
            });
            await this.searchHistoryRepository.save(history);

            return locators;
        } catch (error) {
            console.error('Playwright error:', error);
            throw new InternalServerErrorException('Failed to generate locators: ' + (error as Error).message);
        } finally {
            if (browser) await browser.close();
        }
    }

    async getHistory(userId: number) {
        return this.searchHistoryRepository.find({
            where: { user: { id: userId } },
            order: { createdAt: 'DESC' },
        });
    }
}
