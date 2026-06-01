import { load as loadCheerio } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { defaultCover } from '@libs/defaultCover';
import { Plugin } from '@/types/plugin';

class MyDramaNovel implements Plugin.PluginBase {
  id = 'mydramanovel';
  name = 'MyDramaNovel.com';
  icon = 'src/en/mydramanovel/icon.webp';
  site = 'https://mydramanovel.com/';
  version = '1.0.0';

  private absoluteUrl(path: string) {
    return new URL(path, this.site).toString();
  }

  private normalizePath(url?: string) {
    if (!url) return '';
    return new URL(url, this.site).pathname.replace(/^\/|\/$/g, '');
  }

  private cleanTitle(title: string) {
    return title.replace(/\s+[-—]\s+MyDramaNovel\.com$/i, '').trim();
  }

  async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];

    const html = await fetchApi(this.absoluteUrl('novels/')).then(res =>
      res.text(),
    );
    const $ = loadCheerio(html);
    const novels: Plugin.NovelItem[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      const path = this.normalizePath(href);
      const name = $(element).text().replace(/\d+$/, '').trim();

      if (!name || !path || path.includes('/') || seen.has(path)) return;
      if (/^(about|contact|novels|privacy-policy)$/i.test(path)) return;

      seen.add(path);
      novels.push({ name, path, cover: defaultCover });
    });

    return novels;
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const path = this.normalizePath(novelPath);
    const html = await fetchApi(this.absoluteUrl(path)).then(res => res.text());
    const $ = loadCheerio(html);
    const name = this.cleanTitle($('title').first().text());
    const chapters: Plugin.ChapterItem[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      const chapterPath = this.normalizePath(href);
      const chapterName = $(element).text().trim();

      if (
        !chapterName ||
        !chapterPath.startsWith(`${path}/`) ||
        chapterPath === path ||
        seen.has(chapterPath)
      ) {
        return;
      }

      seen.add(chapterPath);
      chapters.push({
        name: chapterName,
        path: chapterPath,
        chapterNumber: chapters.length + 1,
      });
    });

    return {
      name,
      path,
      cover: defaultCover,
      summary: '',
      chapters,
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const html = await fetchApi(this.absoluteUrl(chapterPath)).then(res =>
      res.text(),
    );
    const $ = loadCheerio(html);
    const content = $('.tdb_single_content, .td-post-content').first().clone();

    content.find('script, style, ins, iframe, .code-block').remove();
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

export default new MyDramaNovel();
