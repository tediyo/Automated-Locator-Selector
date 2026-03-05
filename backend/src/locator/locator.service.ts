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

            // Scan elements and match only on direct attributes, not inherited textContent
            const elements = await page.evaluate((kw) => {
                const results: {
                    tag: string;
                    id: string;
                    name: string;
                    placeholder: string;
                    ariaLabel: string;
                    className: string;
                    directText: string;
                    xpath: string;
                }[] = [];

                // Focus on meaningful, interactive elements
                const selectors = 'input, button, select, textarea, a, label, h1, h2, h3, h4, h5, h6, img, th, td, li, p, span';
                const allElements = document.querySelectorAll(selectors);

                // Helper: get only the element's own direct text (not from children)
                function getDirectText(el: Element): string {
                    let text = '';
                    for (const node of el.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            text += node.textContent?.trim() || '';
                        }
                    }
                    return text.trim();
                }

                // Helper: generate a precise XPath for an element
                function getXPath(el: Element): string {
                    if (el.id) return `//*[@id='${el.id}']`;

                    const parts: string[] = [];
                    let current: Element | null = el;
                    while (current && current !== document.documentElement) {
                        let index = 1;
                        let sibling = current.previousElementSibling;
                        while (sibling) {
                            if (sibling.tagName === current.tagName) index++;
                            sibling = sibling.previousElementSibling;
                        }
                        const tag = current.tagName.toLowerCase();
                        const hasSameTagSiblings = current.parentElement &&
                            Array.from(current.parentElement.children).filter(c => c.tagName === current!.tagName).length > 1;

                        parts.unshift(hasSameTagSiblings ? `${tag}[${index}]` : tag);
                        current = current.parentElement;
                    }
                    return '/html/' + parts.join('/');
                }

                allElements.forEach((el) => {
                    const id = el.id || '';
                    const name = (el as any).name || '';
                    const placeholder = (el as any).placeholder || '';
                    const ariaLabel = el.getAttribute('aria-label') || '';
                    const className = typeof el.className === 'string' ? el.className : '';
                    const directText = getDirectText(el);

                    // Match only on the element's OWN attributes, not inherited text
                    const matchTargets = [id, name, placeholder, ariaLabel, directText];
                    const match = matchTargets.some(val =>
                        val.toLowerCase().includes(kw)
                    );

                    if (match) {
                        results.push({
                            tag: el.tagName.toLowerCase(),
                            id,
                            name,
                            placeholder,
                            ariaLabel,
                            className,
                            directText: directText.substring(0, 60),
                            xpath: getXPath(el),
                        });
                    }
                });
                return results;
            }, normalizedKeyword);

            const locators = elements.map(el => {
                let locator = '';
                switch (locatorType.toLowerCase()) {
                    case 'xpath':
                        // Use the real computed XPath from the DOM
                        locator = el.xpath;
                        break;
                    case 'css':
                        if (el.id) locator = `${el.tag}#${el.id}`;
                        else if (el.className) {
                            const classes = el.className.split(' ').filter(Boolean);
                            locator = `${el.tag}.${classes.join('.')}`;
                        }
                        else locator = el.tag;
                        break;
                    case 'id':
                        locator = el.id || 'N/A';
                        break;
                    case 'name':
                        locator = el.name || 'N/A';
                        break;
                    case 'class':
                        locator = el.className || 'N/A';
                        break;
                    default:
                        locator = 'Unknown type';
                }
                return { tag: el.tag, locator };
            }).filter(l => l.locator !== 'N/A' && l.locator !== 'Unknown type' && l.locator !== '');

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
