import { fetchApi } from '@libs/fetch';
import { Plugin } from '@/types/plugin';
import { Filters } from '@libs/filterInputs';
import { load as loadCheerio } from 'cheerio';
import { defaultCover } from '@libs/defaultCover';

class ExiledRebels implements Plugin.PluginBase {
  id = 'exiledrebels';
  name = 'Exiled Rebels';
  icon = 'src/en/exiledrebels/icon.png';
  site = 'https://exiledrebelsscanlations.com/';
  version = '1.0.0';
  filters: Filters | undefined = undefined;

  private novelCache: Plugin.NovelItem[] | undefined;

  private toPath(url: string | undefined) {
    if (!url) return undefined;
    const pathname = new URL(url, this.site).pathname.replace(/^\/|\/$/g, '');
    return pathname || undefined;
  }

  private toUrl(path: string) {
    return new URL(path, this.site).toString();
  }

  private async fetchHtml(path = '') {
    return fetchApi(this.toUrl(path)).then(res => res.text());
  }

  private getImage($el: ReturnType<typeof loadCheerio>) {
    return (
      $el('img').first().attr('data-lazy-src') ||
      $el('img').first().attr('data-src') ||
      $el('img').first().attr('src') ||
      defaultCover
    );
  }

  private async getAllNovels() {
    if (this.novelCache) return this.novelCache;

    const $ = loadCheerio(await this.fetchHtml('novels/'));
    const novels: Plugin.NovelItem[] = [];
    const seen = new Set<string>();

    $('.entry-content a[href*="/novels/"]').each((_, el) => {
      const href = $(el).attr('href');
      const path = this.toPath(href);
      if (!path || path === 'novels' || seen.has(path)) return;

      const name =
        $(el).attr('title')?.trim() ||
        $(el).text().trim() ||
        $(el).closest('h3,h4,p,li').text().trim();
      if (!name) return;

      const item = $(el).closest('figure,div,p,li');
      novels.push({
        name,
        path,
        cover: this.getImage(item.length ? loadCheerio($.html(item)) : $),
      });
      seen.add(path);
    });

    this.novelCache = novels;
    return novels;
  }

  private normalizeTitle(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  async popularNovels(
    pageNo: number,
    { showLatestNovels }: Plugin.PopularNovelsOptions<typeof this.filters>,
  ): Promise<Plugin.NovelItem[]> {
    if (showLatestNovels) {
      const $ = loadCheerio(await this.fetchHtml());
      const allNovels = await this.getAllNovels();
      const latest = new Map<string, Plugin.NovelItem>();

      $('.site-banner .item').each((_, el) => {
        const item = $(el);
        const category = item
          .find('a[rel~="category"]')
          .filter((_, categoryEl) => {
            const path = this.toPath($(categoryEl).attr('href'));
            return !!path && !path.endsWith('chapters');
          })
          .first();

        const categoryPath = this.toPath(category.attr('href'));
        const slug = categoryPath?.split('/').pop();
        const name = category.text().trim();
        if (!slug || !name) return;

        const normalizedName = this.normalizeTitle(name);
        const novel =
          allNovels.find(item => item.path.endsWith('/' + slug)) ||
          allNovels.find(
            item => this.normalizeTitle(item.name) === normalizedName,
          ) ||
          allNovels.find(
            item =>
              this.normalizeTitle(item.name).includes(normalizedName) ||
              normalizedName.includes(this.normalizeTitle(item.name)),
          );

        latest.set(slug, {
          name,
          path: novel?.path || 'novels/' + slug,
          cover: novel?.cover || this.getImage(loadCheerio($.html(item))),
        });
      });

      return Array.from(latest.values()).slice((pageNo - 1) * 20, pageNo * 20);
    }

    const novels = await this.getAllNovels();
    return novels.slice((pageNo - 1) * 20, pageNo * 20);
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const $ = loadCheerio(await this.fetchHtml(novelPath));
    const content = $('.entry-content').first();
    const title = $('h1.entry-title').first().text().trim();
    const novel: Plugin.SourceNovel = {
      name: title || content.find('h1,h2,h3').first().text().trim(),
      path: novelPath,
      cover: this.getImage(loadCheerio($.html(content))),
    };

    const paragraphs: string[] = [];
    let inSummary = false;
    content.children().each((_, el) => {
      const child = $(el);
      const text = child.text().trim();
      if (/^summary:?$/i.test(text)) {
        inSummary = true;
        return;
      }
      if (/^chapters?:?$/i.test(text)) {
        inSummary = false;
        return false;
      }
      if (inSummary && text) paragraphs.push(text);
    });
    novel.summary = paragraphs.join('\n\n');

    const metaText = content.text();
    novel.author = metaText.match(/Author:\s*([^\n]+)/i)?.[1]?.trim();
    novel.genres = metaText.match(/Genre:\s*([^\n]+)/i)?.[1]?.trim();
    novel.chapters = content
      .find('a[href]')
      .map((_, el) => {
        const name = $(el).text().trim();
        const path = this.toPath($(el).attr('href'));
        if (!path || path.startsWith('novels/') || !/chapter/i.test(name)) {
          return;
        }

        return { name, path };
      })
      .toArray()
      .filter(
        (chapter, index, chapters) =>
          chapters.findIndex(item => item.path === chapter.path) === index,
      );

    return novel;
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const $ = loadCheerio(await this.fetchHtml(chapterPath));
    const content = (
      $('#wtr-content').length
        ? $('#wtr-content').first()
        : $('.entry-content').first()
    ).clone();

    content
      .find(
        'script, style, .sharedaddy, .sd-sharing-enabled, .jp-relatedposts, .post-navigation, .wp-post-navigation, .wtr-time-wrap, form, iframe',
      )
      .remove();
    content.find('a').each((_, el) => {
      if (/^(prev|next)(ious)? chapter$/i.test($(el).text().trim())) {
        $(el).closest('p,div').remove();
      }
    });
    content.find('h1,h2,h3').each((_, el) => {
      const text = $(el).text().trim();
      if (/^(share this|like this|related tags)$/i.test(text)) {
        $(el).nextAll().remove();
        $(el).remove();
      }
    });

    return `<h1>${$('h1.entry-title').first().text().trim()}</h1>${content.html() || ''}`;
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];
    const allNovels = await this.getAllNovels();
    const term = searchTerm.toLowerCase();
    return allNovels.filter(novel => novel.name.toLowerCase().includes(term));
  }

  resolveUrl = (path: string) => this.toUrl(path);
}

export default new ExiledRebels();
