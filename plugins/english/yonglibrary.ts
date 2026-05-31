import { Plugin } from '@/types/plugin';
import { load as parseHTML } from 'cheerio';
import { NovelStatus } from '@libs/novelStatus';
import { defaultCover } from '@libs/defaultCover';

class YongLibrary implements Plugin.PluginBase {
  id = 'YongLibrary';
  name = 'Yong Library';
  site = 'https://yonglibrary.com';
  version = '1.0.0';
  icon = 'src/en/yonglibrary/icon.png';

  private toPath(url?: string) {
    if (!url) return '';
    return new URL(url, this.site).pathname.replace(/^\/|\/$/g, '');
  }

  private async getHTML(path = '') {
    return fetch(this.site + '/' + path.replace(/^\/|\/$/g, ''), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }).then(res => res.text());
  }

  private firstSrc(src?: string) {
    return src?.split(',')[0]?.trim().split(/\s+/)[0];
  }

  private imageSrc($: any, image: any) {
    const src =
      image.attr('data-src') ||
      image.attr('data-lazy-src') ||
      this.firstSrc(
        image.attr('data-srcset') || image.attr('data-lazy-srcset'),
      ) ||
      image.attr('data-orig-file') ||
      image.attr('data-large-file') ||
      this.firstSrc(image.attr('srcset')) ||
      image.attr('src');

    if (!src || src.startsWith('data:image')) return;

    return new URL(src, this.site).href;
  }

  async popularNovels(pageNo = 1): Promise<Plugin.NovelItem[]> {
    const page = pageNo > 1 ? `novels/?paged=${pageNo}` : 'novels';
    const $ = parseHTML(await this.getHTML(page));
    return $('a[href*="/category/"]')
      .map((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        const path = this.toPath($(el).attr('href'));
        if (!path.match(/^category\/(chinese|korean)-novel\/.+/)) return;
        const name = text
          .replace(
            /^(Chinese|Korean)\s+(Ongoing|Completed|Hiatus)\s+\d+\s+Ch\s+/i,
            '',
          )
          .trim();
        const cover = this.imageSrc($, $(el).find('img').first());
        if (!cover) return;
        return {
          name,
          path,
          cover,
          chapterNumber: Number(text.match(/\b(\d+)\s+Ch\b/i)?.[1]) || 0,
        };
      })
      .toArray()
      .filter(
        (novel, index, list) =>
          novel && list.findIndex(item => item.path === novel.path) === index,
      )
      .sort((a, b) => (b.chapterNumber || 0) - (a.chapterNumber || 0))
      .map(({ chapterNumber, ...novel }) => novel);
  }

  async parseNovel(path: string): Promise<Plugin.SourceNovel> {
    const $ = parseHTML(await this.getHTML(path));
    const main = $('main, article').first().clone();
    main.find('script, style, form, .ad-slot').remove();

    const chapters = $('a[href*="/korean-novel/"], a[href*="/chinese-novel/"]')
      .map((index, el) => {
        const name = $(el).text().replace(/\s+/g, ' ').trim();
        const chapterPath = this.toPath($(el).attr('href'));
        if (!/chapter|prologue|start/i.test(name + ' ' + chapterPath)) return;
        return {
          name,
          path: chapterPath,
          chapterNumber: Number(name.match(/Ch\.\s*(\d+)/i)?.[1]) || index + 1,
        };
      })
      .toArray()
      .filter(
        (chapter, index, list) =>
          chapter &&
          list.findIndex(item => item.path === chapter.path) === index,
      )
      .reverse();

    const summary =
      $('[class*="summary"], [class*="description"]')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim() ||
      main.text().replace(/\s+/g, ' ').trim().split('Start Reading')[0].trim();

    return {
      name: $('h1').first().text().replace(/\s+/g, ' ').trim(),
      path,
      cover:
        this.imageSrc($, $('.novel-hero__image').first()) ||
        $('meta[property="og:image"]').attr('content') ||
        this.imageSrc($, main.find('img').first()) ||
        defaultCover,
      genres: main
        .find('a[href*="/tag/"], a[href*="/genre/"]')
        .map((_, el) => $(el).text().trim())
        .toArray()
        .join(', '),
      status: /completed/i.test(main.text())
        ? NovelStatus.Completed
        : NovelStatus.Ongoing,
      summary,
      chapters,
    };
  }

  async parseChapter(path: string): Promise<string> {
    const $ = parseHTML(await this.getHTML(path));
    let content = $('.chapter-content__body')
      .filter((_, el) => !$(el).parents('.chapter-companion').length)
      .last();
    if (!content.length) {
      content = $('.entry-content, article').first();
    }
    content
      .find(
        'script, style, form, .ad-slot, header, nav, .chapter-settings, .chapter-sidebar, aside',
      )
      .remove();
    return content.html() || '';
  }

  async searchNovels(searchTerm: string): Promise<Plugin.NovelItem[]> {
    const novels = await this.popularNovels();
    return novels.filter(novel =>
      novel.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
}

export default new YongLibrary();
