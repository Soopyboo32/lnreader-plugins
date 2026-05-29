import { fetchApi } from '@libs/fetch';
import { Plugin } from '@/types/plugin';
import { Cheerio, CheerioAPI, load as parseHTML } from 'cheerio';
import { AnyNode } from 'domhandler';
import { defaultCover } from '@libs/defaultCover';
import { NovelStatus } from '@libs/novelStatus';

class WuxiaDreams implements Plugin.PagePlugin {
  id = 'wuxiadreams';
  name = 'Wuxia Dreams';
  icon = 'src/en/wuxiadreams/icon.png';
  site = 'https://wuxiadreams.com/';
  version = '1.0.0';

  async getCheerio(path: string): Promise<CheerioAPI> {
    const response = await fetchApi(new URL(path, this.site).href);
    if (!response.ok) {
      throw new Error(`Could not reach site (${response.status}).`);
    }

    return parseHTML(await response.text());
  }

  parseNovels($: CheerioAPI): Plugin.NovelItem[] {
    return $('a[href^="/novel/"]:has(img)')
      .map((_, element) => {
        const card = $(element);
        const href = card.attr('href');
        const name = card.find('h3').first().text().trim();

        if (!href || !name) return null;

        return {
          name,
          path: href.replace(/^\//, ''),
          cover: card.find('img').first().attr('src') || defaultCover,
        };
      })
      .get();
  }

  async popularNovels(
    pageNo: number,
    { showLatestNovels }: Plugin.PopularNovelsOptions,
  ): Promise<Plugin.NovelItem[]> {
    const params = new URLSearchParams({
      page: pageNo.toString(),
      sort: showLatestNovels ? 'update' : 'score',
    });
    const $ = await this.getCheerio(`novels?${params}`);
    return this.parseNovels($);
  }

  async parseNovel(
    novelPath: string,
  ): Promise<Plugin.SourceNovel & { totalPages: number }> {
    const $ = await this.getCheerio(novelPath);
    const jsonLd = this.getJsonLd($);
    const novel: Plugin.SourceNovel & { totalPages: number } = {
      path: novelPath,
      name: jsonLd?.name || $('h1').first().text().trim(),
      cover:
        jsonLd?.image ||
        $('meta[property="og:image"]').attr('content') ||
        defaultCover,
      summary: jsonLd?.description || '',
      rating: Number(jsonLd?.aggregateRating?.ratingValue) || undefined,
      totalPages: this.getTotalPages($),
    };

    const author = $('span:contains("Author:")')
      .parent()
      .find('a')
      .first()
      .find('span')
      .first()
      .text()
      .trim();
    if (author) novel.author = author;

    const status = $('span:contains("Status")').next().text().trim();
    novel.status = this.parseStatus(status);

    const genres = this.parseInfoBox($, 'Genres');
    const tags = this.parseInfoBox($, 'Tags');
    novel.genres = Array.from(new Set([...genres, ...tags])).join(', ');

    if (novel.totalPages === 1) {
      novel.chapters = (await this.parsePage(novelPath, '1')).chapters;
    }

    return novel;
  }

  async parsePage(novelPath: string, page: string): Promise<Plugin.SourcePage> {
    const params = new URLSearchParams({ page });
    const $ = await this.getCheerio(`${novelPath}?${params}`);

    const chapters = $('a[href*="/chapter-"]')
      .map((_, element) => this.parseChapterItem($, $(element)))
      .get()
      .filter((chapter, index, list) => {
        return list.findIndex(item => item.path === chapter.path) === index;
      });

    return { chapters };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const $ = await this.getCheerio(chapterPath);
    const chapter = $('article.chapter-content-container');
    chapter.find('div, script, astro-island').remove();
    return chapter.html() || '';
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    const params = new URLSearchParams({
      q: searchTerm,
      page: pageNo.toString(),
    });
    const $ = await this.getCheerio(`novels?${params}`);
    return this.parseNovels($);
  }

  parseChapterItem(
    $: CheerioAPI,
    element: Cheerio<AnyNode>,
  ): Plugin.ChapterItem | null {
    const href = element.attr('href');
    let name =
      element.find('span').first().text().trim() || element.text().trim();
    if (!href || !name) return null;

    const chapterNumber = Number(href.match(/chapter-(\d+)/)?.[1]);
    if (name === 'Start Reading' && Number.isFinite(chapterNumber)) {
      name = `Chapter ${chapterNumber}`;
    }
    const releaseTime = element
      .find('.text-muted-foreground span')
      .first()
      .text()
      .trim();

    return {
      name,
      path: href.replace(/^\//, ''),
      releaseTime: releaseTime || null,
      chapterNumber: Number.isFinite(chapterNumber) ? chapterNumber : undefined,
    };
  }

  getJsonLd($: CheerioAPI): JsonLdBook | undefined {
    const raw = $('script[type="application/ld+json"]').first().text();
    if (!raw) return undefined;

    try {
      return JSON.parse(raw) as JsonLdBook;
    } catch {
      return undefined;
    }
  }

  getTotalPages($: CheerioAPI): number {
    const pageText = $('main')
      .text()
      .match(/Page\s+\d+\s+of\s+(\d+)/i)?.[1];
    return Number(pageText) || 1;
  }

  parseInfoBox($: CheerioAPI, label: string): string[] {
    return $(`.uppercase:contains("${label}")`)
      .parent()
      .find('a')
      .map((_, element) => $(element).text().trim())
      .get();
  }

  parseStatus(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes('complete')) return NovelStatus.Completed;
    if (normalized.includes('ongoing')) return NovelStatus.Ongoing;
    if (normalized.includes('hiatus')) return NovelStatus.OnHiatus;
    return NovelStatus.Unknown;
  }
}

export default new WuxiaDreams();

type JsonLdBook = {
  name?: string;
  description?: string;
  image?: string;
  aggregateRating?: {
    ratingValue?: number | string;
  };
};
