import { Plugin } from '@/types/plugin';
import { load as parseHTML } from 'cheerio';
import { NovelStatus } from '@libs/novelStatus';
import { defaultCover } from '@libs/defaultCover';

class NyxTranslation implements Plugin.PluginBase {
  id = 'NyxTranslation';
  name = 'Nyx Translation';
  site = 'https://nyx-translation.com';
  version = '1.0.0';
  icon = 'src/en/nyxtranslation/icon.png';

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

  async popularNovels(): Promise<Plugin.NovelItem[]> {
    const $ = parseHTML(await this.getHTML('novel-list'));
    return $('a[href]')
      .map((_, el) => {
        const name = $(el).text().replace(/\s+/g, ' ').trim();
        const path = this.toPath($(el).attr('href'));
        if (
          !name ||
          !path ||
          /^\d{4}\//.test(path) ||
          path.includes('/20') ||
          path.includes('novel-list') ||
          [
            'jp-novel',
            'active',
            'completed',
            'on-hold',
            'dropped',
            'kr-novel',
            'patronage',
            'contact',
            'cookies',
            'log-in',
            'start',
            'abuse',
          ].includes(path)
        )
          return;
        return { name, path };
      })
      .toArray()
      .filter(
        (novel, index, list) =>
          novel && list.findIndex(item => item.path === novel.path) === index,
      );
  }

  async parseNovel(path: string): Promise<Plugin.SourceNovel> {
    const $ = parseHTML(await this.getHTML(path));
    const content = $('.entry-content').first().clone();
    content.find('script, style, .sharedaddy, .wp-block-buttons').remove();

    const chapters = content
      .find('a[href*="/20"]')
      .map((index, el) => ({
        name: $(el).text().replace(/\s+/g, ' ').trim(),
        path: this.toPath($(el).attr('href')),
        chapterNumber: index + 1,
      }))
      .toArray();

    const cover =
      this.imageSrc($, content.find('img').first()) ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      defaultCover;

    const summaryContent = content.clone();
    summaryContent.find('a[href*="/20"]').each((_, el) => {
      const block = $(el).closest('li, p');
      if (block.length) {
        block.remove();
      } else {
        $(el).remove();
      }
    });

    const summary = summaryContent
      .text()
      .replace(/\s+/g, ' ')
      .replace(/\bTable of Contents\b.*/i, '')
      .trim();

    return {
      name: $('.entry-title, h1').first().text().replace(/\s+/g, ' ').trim(),
      path,
      cover,
      summary,
      status: /completed/i.test(path)
        ? NovelStatus.Completed
        : NovelStatus.Ongoing,
      chapters,
    };
  }

  async parseChapter(path: string): Promise<string> {
    const $ = parseHTML(await this.getHTML(path));
    const content = $('.entry-content').first();
    content.find('script, style, .sharedaddy, .wp-block-buttons').remove();
    return content.html() || '';
  }

  async searchNovels(searchTerm: string): Promise<Plugin.NovelItem[]> {
    const novels = await this.popularNovels();
    return novels.filter(novel =>
      novel.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
}

export default new NyxTranslation();
