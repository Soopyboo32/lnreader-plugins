import { load as loadCheerio } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { NovelStatus } from '@libs/novelStatus';
import { Plugin } from '@/types/plugin';

class SadsTranslates implements Plugin.PluginBase {
  id = 'sadstranslates';
  name = 'Sads Translates';
  icon = 'src/en/sadstranslates/icon.webp';
  site = 'https://sadstranslates.page/';
  version = '1.0.0';

  private absoluteUrl(path: string) {
    return new URL(path, this.site).toString();
  }

  private normalizePath(url?: string) {
    if (!url) return '';
    return new URL(url, this.site).pathname.replace(/^\/|\/$/g, '');
  }

  async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];

    const html = await fetchApi(this.absoluteUrl('projects/')).then(res =>
      res.text(),
    );
    const $ = loadCheerio(html);
    const novels: Plugin.NovelItem[] = [];
    const seen = new Set<string>();

    $('.entry-content a[href*="/projects/"]').each((_, element) => {
      const path = this.normalizePath($(element).attr('href'));
      const name = $(element).text().trim();
      if (!name || !path || path === 'projects' || seen.has(path)) return;
      if (/illustrations|short-stories/i.test(path)) return;

      seen.add(path);
      novels.push({ name, path });
    });

    return novels;
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const path = this.normalizePath(novelPath);
    const html = await fetchApi(this.absoluteUrl(path)).then(res => res.text());
    const $ = loadCheerio(html);
    const content = $('.entry-content').first().clone();
    const chapters: Plugin.ChapterItem[] = [];
    const summaryParts: string[] = [];
    const seen = new Set<string>();
    let reachedChapters = false;

    content.children().each((_, element) => {
      const node = $(element);
      const links = node.find('a[href*="/20"]');
      if (links.length) reachedChapters = true;

      links.each((__, link) => {
        const chapterPath = this.normalizePath($(link).attr('href'));
        let name = $(link).text().trim();
        if (!name) name = $(link).closest('p, li').text().trim();
        if (!name || seen.has(chapterPath)) return;

        const dateMatch = chapterPath.match(/(\d{4})\/(\d{2})\/(\d{2})\//);
        seen.add(chapterPath);
        chapters.push({
          name,
          path: chapterPath,
          releaseTime: dateMatch
            ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
            : null,
          chapterNumber: chapters.length + 1,
        });
      });

      if (!reachedChapters) {
        const text = node.text().trim();
        if (text) summaryParts.push(text);
      }
    });

    const summaryText = summaryParts.join('\n\n');

    return {
      path,
      name:
        $('h1.entry-title').first().text().trim() ||
        content.find('h1, h2').first().text().trim(),
      cover: content.find('img').first().attr('src'),
      author: summaryText.match(/Author\s+([^\n]+)/i)?.[1]?.trim(),
      status: NovelStatus.Unknown,
      summary: summaryText.replace(/^.*?Synopsis\s*/is, '').trim(),
      chapters,
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const html = await fetchApi(this.absoluteUrl(chapterPath)).then(res =>
      res.text(),
    );
    const $ = loadCheerio(html);
    const content = $('.entry-content').first().clone();

    content
      .find('script, style, iframe, .sharedaddy, .jp-relatedposts')
      .remove();
    content.find('p').each((_, element) => {
      const text = $(element).text().trim();
      if (/^(TOC|Next|Previous|Prev)(\s|\||$)/i.test(text)) {
        $(element).remove();
      }
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

export default new SadsTranslates();
