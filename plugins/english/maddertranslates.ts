import { load as loadCheerio } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { defaultCover } from '@libs/defaultCover';
import { Plugin } from '@/types/plugin';

class MadderTranslates implements Plugin.PluginBase {
  id = 'maddertranslates';
  name = 'Madder Translates';
  icon = 'src/en/maddertranslates/icon.png';
  site = 'https://maddertranslates.com/';
  version = '1.0.0';

  private requestInit = {
    headers: {
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': this.site,
    },
  };

  private absoluteUrl(path: string) {
    return new URL(path, this.site).toString();
  }

  private normalizePath(url?: string) {
    if (!url) return '';
    return new URL(url, this.site).pathname.replace(/^\/|\/$/g, '');
  }

  private async fetchHtml(path: string) {
    return fetchApi(this.absoluteUrl(path), this.requestInit).then(res =>
      res.text(),
    );
  }

  async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];

    const html = await this.fetchHtml('wn/');
    const $ = loadCheerio(html);
    const novels: Plugin.NovelItem[] = [];
    const seen = new Set<string>();

    $('.td-page-content a[href*="/wn"]').each((_, element) => {
      const path = this.normalizePath($(element).attr('href'));
      const name = $(element).text().replace(/^・/, '').trim().split('\n')[0];
      if (!name || !/^wn\d+\/?$/.test(path) || seen.has(path)) return;

      seen.add(path);
      novels.push({ name, path, cover: defaultCover });
    });

    return novels;
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const path = this.normalizePath(novelPath);
    const html = await this.fetchHtml(path);
    const $ = loadCheerio(html);
    const content = $('.td-page-content').first().clone();
    const chapters: Plugin.ChapterItem[] = [];
    const summaryParts: string[] = [];
    const seen = new Set<string>();
    let reachedChapters = false;

    content.children().each((_, element) => {
      const node = $(element);
      const hasChapterLink = node
        .find('a[href]')
        .toArray()
        .some(link =>
          this.normalizePath($(link).attr('href')).startsWith(`${path}/`),
        );
      if (hasChapterLink) reachedChapters = true;
      if (!reachedChapters) {
        const text = node.text().trim();
        if (text) summaryParts.push(text);
      }
    });

    content.find('a[href]').each((_, element) => {
      const chapterPath = this.normalizePath($(element).attr('href'));
      const name = $(element).text().trim();
      if (
        !name ||
        !chapterPath.startsWith(`${path}/`) ||
        seen.has(chapterPath)
      ) {
        return;
      }

      seen.add(chapterPath);
      chapters.push({
        name,
        path: chapterPath,
        chapterNumber: chapters.length + 1,
      });
    });

    return {
      path,
      name: $('h1.entry-title').first().text().trim(),
      cover: defaultCover,
      summary: summaryParts
        .join('\n\n')
        .replace(/Leave a comment below.*$/is, '')
        .replace(/\n\nPrologue$/i, '')
        .trim(),
      chapters,
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const html = await this.fetchHtml(chapterPath);
    const $ = loadCheerio(html);
    const content = $('.td-page-content').first().clone();

    content.find('script, style, iframe, ins, .code-block').remove();
    content.find('p').each((_, element) => {
      const text = $(element).text().trim();
      if (/(<<|>>|Prev|Next|TOC|Home)/i.test(text)) $(element).remove();
    });

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

export default new MadderTranslates();
