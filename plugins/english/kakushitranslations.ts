import { load as loadCheerio } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { NovelStatus } from '@libs/novelStatus';
import { Plugin } from '@/types/plugin';

class KakushiTranslations implements Plugin.PluginBase {
  id = 'kakushitranslations';
  name = 'Kakushi Translations';
  icon = 'src/en/kakushitranslations/icon.webp';
  site = 'https://kakushitranslations.wordpress.com/';
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

    const html = await fetchApi(this.absoluteUrl('ongoing-projects/')).then(
      res => res.text(),
    );
    const $ = loadCheerio(html);
    const novels: Plugin.NovelItem[] = [];

    $('.entry-content a[href*="/ongoing-projects/"]').each((_, element) => {
      const path = this.normalizePath($(element).attr('href'));
      const name = $(element).text().trim();
      if (!name || !path || path === 'ongoing-projects') return;
      if (path.includes('#') || path.split('/').length > 2) return;

      novels.push({
        name,
        path,
        cover: $('.entry-content img').first().attr('src'),
      });
    });

    return novels;
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const path = this.normalizePath(novelPath);
    const html = await fetchApi(this.absoluteUrl(path)).then(res => res.text());
    const $ = loadCheerio(html);
    const content = $('.entry-content').first().clone();
    const chapters: Plugin.ChapterItem[] = [];
    const text = content.text();
    const seen = new Set<string>();

    content.find('a[href]').each((_, element) => {
      const hrefPath = this.normalizePath($(element).attr('href'));
      const chapterName = $(element).text().trim();

      if (
        chapterName &&
        hrefPath.startsWith(`${path}/`) &&
        !/illustrations/i.test(hrefPath) &&
        !seen.has(hrefPath)
      ) {
        seen.add(hrefPath);
        chapters.push({
          name: chapterName,
          path: hrefPath,
          chapterNumber: chapters.length + 1,
        });
      }
    });

    const summary =
      text
        .match(
          /Description\s*[–-]\s*([\s\S]*?)(?:Volume\s+\d+|Buy the japanese books|$)/i,
        )?.[1]
        ?.trim() || '';

    const author = text
      .match(/Author:\s*(.*?)(?:Illustrator:|Alternative Titles:|$)/i)?.[1]
      ?.trim();

    return {
      path,
      name: $('h1.entry-title').first().text().trim(),
      cover: content.find('img').first().attr('src'),
      author,
      status: NovelStatus.Ongoing,
      summary,
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
      .find(
        'script, style, iframe, .sharedaddy, .jp-relatedposts, [id^="atatags"], #wordads-inline-marker',
      )
      .remove();
    content.find('p').each((_, element) => {
      const text = $(element).text().trim();
      if (/(<-?\s*Prev|Next\s*->?|Table Of Contents)/i.test(text)) {
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

export default new KakushiTranslations();
