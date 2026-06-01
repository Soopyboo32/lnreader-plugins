import { load as loadCheerio } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { defaultCover } from '@libs/defaultCover';
import { NovelStatus } from '@libs/novelStatus';
import { Plugin } from '@/types/plugin';

class ShinTranslations implements Plugin.PagePlugin {
  id = 'shintranslations';
  name = 'Shin Translations';
  icon = 'src/en/shintranslations/icon.png';
  site = 'https://shintranslations.com/';
  version = '1.0.0';
  private volumePageCache = new Map<string, string[]>();

  private absoluteUrl(path: string) {
    return new URL(path, this.site).toString();
  }

  private normalizePath(url?: string) {
    if (!url) return '';
    return new URL(url, this.site).pathname.replace(/^\/|\/$/g, '');
  }

  private chapterNumber(name: string, fallback: number) {
    const volume = Number(name.match(/Vol\.?\s*(\d+)/i)?.[1] || 0);
    const chapter = Number(name.match(/Chapter\s*(\d+)/i)?.[1] || 0);
    const part = Number(name.match(/Part\s*(\d+)/i)?.[1] || 0);

    if (volume && chapter) return volume * 1000000 + chapter * 1000 + part;
    if (volume && /prologue/i.test(name)) return volume * 1000000 - 1;
    if (volume && /side story/i.test(name)) {
      return volume * 1000000 + 800000 + part;
    }
    if (volume && /illustrations?/i.test(name)) {
      return volume * 1000000 + 900000 + fallback;
    }
    if (volume) return volume * 1000000 + fallback;

    return fallback;
  }

  private volumeNumber(name: string) {
    return Number(name.match(/Volume\s*(\d+)|Vol\.\s*(\d+)/i)?.[1] || 0);
  }

  private isNewGate(path: string) {
    return path.includes('the-new-gate');
  }

  private parseChapters($: ReturnType<typeof loadCheerio>) {
    const chapters: Plugin.ChapterItem[] = [];
    const seen = new Set<string>();

    $(
      '.chapter-group__list-item-link[href*="/chapter/"], .chapter-index__list a[href*="/chapter/"], a[href*="/chapter/"]',
    ).each((_, element) => {
      const chapterPath = this.normalizePath($(element).attr('href'));
      const name = $(element).text().trim();
      if (!name || seen.has(chapterPath)) return;

      seen.add(chapterPath);
      chapters.push({
        name,
        path: chapterPath,
        chapterNumber: this.chapterNumber(name, chapters.length + 1),
      });
    });

    return chapters.sort(
      (a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0),
    );
  }

  private parseVolumeLinks($: ReturnType<typeof loadCheerio>) {
    const volumes = new Map<number, string>();

    $('a[href*="/volume/"]').each((_, element) => {
      const name = $(element).text().trim();
      const path = this.normalizePath($(element).attr('href'));
      const volume =
        this.volumeNumber(name) ||
        Number(path.match(/volume-(\d+)/i)?.[1] || 0);
      if (volume && path) volumes.set(volume, path);
    });

    return Array.from(volumes.entries());
  }

  private async getVolumePages(
    path: string,
    firstPage: ReturnType<typeof loadCheerio>,
  ) {
    const cached = this.volumePageCache.get(path);
    if (cached) return cached;

    const volumes = new Map<number, string>(this.parseVolumeLinks(firstPage));
    const totalIndexPages =
      firstPage('a[href*="pg="]')
        .map((_, element) => {
          const href = firstPage(element).attr('href') || '';
          return Number(href.match(/[?&]pg=(\d+)/)?.[1] || 0);
        })
        .get()
        .reduce((max, page) => Math.max(max, page), 1) || 1;

    for (let page = 2; page <= totalIndexPages; page++) {
      const html = await fetchApi(`${this.absoluteUrl(path)}?pg=${page}`).then(
        res => res.text(),
      );
      const $ = loadCheerio(html);
      this.parseVolumeLinks($).forEach(([volume, volumePath]) => {
        volumes.set(volume, volumePath);
      });
    }

    const pages = Array.from(volumes.entries())
      .sort(([a], [b]) => a - b)
      .map(([, volumePath]) => volumePath);
    this.volumePageCache.set(path, pages);
    return pages;
  }

  async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];

    const html = await fetchApi(this.site).then(res => res.text());
    const $ = loadCheerio(html);
    const novels: Plugin.NovelItem[] = [];
    const seen = new Set<string>();

    $('a[href*="/series/"]').each((_, element) => {
      const path = this.normalizePath($(element).attr('href'));
      const name = $(element).text().trim();
      if (!name || seen.has(path)) return;
      seen.add(path);
      novels.push({ name, path });
    });

    return novels;
  }

  async parseNovel(
    novelPath: string,
  ): Promise<Plugin.SourceNovel & { totalPages: number }> {
    const path = this.normalizePath(novelPath);
    const html = await fetchApi(this.absoluteUrl(path)).then(res => res.text());
    const $ = loadCheerio(html);
    const article = $('.collection__article').first().clone();
    const summaryContent = article.clone();
    const volumePages = await this.getVolumePages(path, $);
    summaryContent
      .find(
        '.card, .chapter-index, .collection__statistics, .pagination, nav, script, style, form, input, button, .wp-block-jetpack-subscriptions__supports-newline, .wp-block-group',
      )
      .remove();
    summaryContent.find('a[href*="/genre/"]').remove();

    return {
      path,
      name:
        article.find('h1, h2').first().text().trim() ||
        $('.header__title-heading').first().text().trim() ||
        $('title')
          .text()
          .replace(/\s+[–-]\s+Shin Translations$/i, '')
          .trim(),
      genres: article
        .find('a[href*="/genre/"]')
        .map((_, element) => $(element).text().trim())
        .get()
        .join(', '),
      status: NovelStatus.Unknown,
      cover: this.isNewGate(path) ? defaultCover : undefined,
      summary: summaryContent
        .text()
        .replace(/\s+/g, ' ')
        .replace(/^.*?\)\s*/, '')
        .replace(/Discover more from Shin Translations.*$/i, '')
        .trim(),
      totalPages: Math.max(volumePages.length, 1),
      chapters: volumePages.length
        ? (await this.parsePage(path, '1')).chapters
        : this.parseChapters($),
    };
  }

  async parsePage(novelPath: string, page: string): Promise<Plugin.SourcePage> {
    const path = this.normalizePath(novelPath);
    const cached = this.volumePageCache.get(path);
    let volumePages = cached;

    if (!volumePages) {
      const html = await fetchApi(this.absoluteUrl(path)).then(res =>
        res.text(),
      );
      volumePages = await this.getVolumePages(path, loadCheerio(html));
    }

    const volumePath = volumePages[Number(page) - 1];
    if (!volumePath) return { chapters: [] };

    const html = await fetchApi(this.absoluteUrl(volumePath)).then(res =>
      res.text(),
    );
    const $ = loadCheerio(html);
    return { chapters: this.parseChapters($) };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const html = await fetchApi(this.absoluteUrl(chapterPath)).then(res =>
      res.text(),
    );
    const $ = loadCheerio(html);
    const content = $('.chapter__content').first().clone();

    content
      .find(
        'script, style, iframe, form, input, button, .wp-block-jetpack-subscriptions__supports-newline, .code-block, ins, .wp-block-group',
      )
      .remove();
    return content.html()?.trim() || '';
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    const normalizedTerm = searchTerm.toLowerCase();
    const novels = await this.popularNovels(pageNo);
    return novels.filter(novel =>
      novel.name.toLowerCase().includes(normalizedTerm),
    );
  }

  resolveUrl = (path: string) => this.absoluteUrl(path);
}

export default new ShinTranslations();
