import { Plugin } from '@/types/plugin';
import { load as parseHTML } from 'cheerio';
import { NovelStatus } from '@libs/novelStatus';

const browserUA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

class DmTranslationsCn implements Plugin.PluginBase {
  id = 'DMTranslationsCN';
  name = 'DM Translations';
  site = 'https://www.dmtranslationscn.com';
  version = '1.0.0';
  icon = 'src/en/dmtranslationscn/icon.png';

  private toPath(url?: string) {
    if (!url) return '';
    return new URL(url, this.site).pathname.replace(/^\/|\/$/g, '');
  }

  private async getHTML(path = '') {
    return fetch(this.site + '/' + path.replace(/^\/|\/$/g, ''), {
      headers: { 'User-Agent': browserUA },
    }).then(res => res.text());
  }

  async popularNovels(): Promise<Plugin.NovelItem[]> {
    const $ = parseHTML(await this.getHTML());
    return $('a[href]')
      .map((_, el) => {
        const name = $(el).text().replace(/\s+/g, ' ').trim();
        const path = this.toPath($(el).attr('href'));
        if (
          !name ||
          !path ||
          path.includes('chapter') ||
          path.includes('author/')
        )
          return;
        if (
          path === 'novels' ||
          path.startsWith('type/') ||
          path.startsWith('category/') ||
          path.startsWith('page/')
        )
          return;
        if (['home', 'patreon', 'discord'].includes(name.toLowerCase())) return;
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
    content.find('script, style, .sharedaddy').remove();

    const chapters = content
      .find('a[href]')
      .map((index, el) => {
        const name = $(el).text().replace(/\s+/g, ' ').trim();
        const chapterPath = this.toPath($(el).attr('href'));
        if (!/chapter|\d+\./i.test(name + ' ' + chapterPath)) return;
        return { name, path: chapterPath, chapterNumber: index + 1 };
      })
      .toArray();

    const summaryContent = content.clone();
    summaryContent.find('a[href]').each((_, el) => {
      const name = $(el).text().replace(/\s+/g, ' ').trim();
      const chapterPath = this.toPath($(el).attr('href'));
      if (!/chapter|\d+\./i.test(name + ' ' + chapterPath)) return;

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
      .replace(/\bIndex\b.*/i, '')
      .replace(/Synopsis:\s*/i, '')
      .trim();

    return {
      name: $('.entry-title, h1').first().text().replace(/\s+/g, ' ').trim(),
      path,
      cover: content.find('img').first().attr('src'),
      status: NovelStatus.Unknown,
      summary,
      chapters,
    };
  }

  async parseChapter(path: string): Promise<string> {
    const $ = parseHTML(await this.getHTML(path));
    const content = $('.entry-content').first();
    content.find('script, style, .sharedaddy, nav').remove();
    return content.html() || '';
  }

  async searchNovels(searchTerm: string): Promise<Plugin.NovelItem[]> {
    const novels = await this.popularNovels();
    return novels.filter(novel =>
      novel.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
}

export default new DmTranslationsCn();
