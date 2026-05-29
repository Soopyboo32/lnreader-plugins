import { fetchApi } from '@libs/fetch';
import { NovelStatus } from '@libs/novelStatus';
import { Plugin } from '@/types/plugin';
import { load as loadCheerio } from 'cheerio';

class HidamarisouTranslations implements Plugin.PluginBase {
  id = 'hidamarisoutranslations';
  name = 'Hidamarisou Translations';
  icon = 'src/en/hidamarisoutranslations/icon.png';
  site = 'https://hidamarisoutranslations.com/';
  version = '1.0.0';

  private normalizePath(url?: string) {
    if (!url) return '';
    return new URL(url, this.site).pathname.replace(/^\/|\/$/g, '');
  }

  private absoluteUrl(path: string) {
    return new URL(path, this.site).toString();
  }

  private getStatus(label: string) {
    if (/completed/i.test(label)) return NovelStatus.Completed;
    if (/dropped/i.test(label)) return NovelStatus.Cancelled;
    if (/ongoing/i.test(label)) return NovelStatus.Ongoing;
    return NovelStatus.Unknown;
  }

  private async getMenuNovels(): Promise<Plugin.NovelItem[]> {
    const html = await fetchApi(this.site).then(res => res.text());
    const $ = loadCheerio(html);
    const novels: Plugin.NovelItem[] = [];

    $('#site-navigation li.menu-item-has-children').each((_, group) => {
      const groupName = $(group).children('a').first().text().trim();
      if (!/webnovels|teasers/i.test(groupName)) return;

      $(group)
        .children('ul')
        .find('a[href]')
        .each((__, link) => {
          const href = $(link).attr('href');
          const path = this.normalizePath(href);
          const name = $(link).text().trim();
          if (name && path) novels.push({ name, path });
        });
    });

    return novels;
  }

  async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];
    return this.getMenuNovels();
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const url = this.absoluteUrl(novelPath);
    const html = await fetchApi(url).then(res => res.text());
    const $ = loadCheerio(html);
    const content = $('.entry-content').first().clone();
    const indexPath = this.normalizePath(url);
    const chapters: Plugin.ChapterItem[] = [];
    const summaryParts: string[] = [];
    let reachedChapters = false;

    const novel: Plugin.SourceNovel = {
      path: indexPath,
      name: $('h1.entry-title').first().text().trim(),
      cover: content.find('img').first().attr('src'),
      status: NovelStatus.Unknown,
    };

    $('#site-navigation li.menu-item-has-children').each((_, group) => {
      const found = $(group)
        .children('ul')
        .find('a[href]')
        .toArray()
        .some(link => this.normalizePath($(link).attr('href')) === indexPath);
      if (found) novel.status = this.getStatus($(group).children('a').text());
    });

    content.children().each((_, element) => {
      const node = $(element);
      const link = node.is('a[href]') ? node : node.find('a[href]').first();
      const href = link.attr('href');
      const path = this.normalizePath(href);

      if (path && path !== indexPath && href?.startsWith(this.site)) {
        reachedChapters = true;
        chapters.push({
          name: link.text().trim() || node.text().trim(),
          path,
        });
        return;
      }

      if (!reachedChapters) {
        const text = node.text().trim();
        if (text) summaryParts.push(text);
      }
    });

    novel.summary = summaryParts.join('\n\n').trim();
    novel.chapters = chapters;
    return novel;
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const url = this.absoluteUrl(chapterPath);
    const html = await fetchApi(url).then(res => res.text());
    const $ = loadCheerio(html);
    const content = $('.entry-content').first().clone();

    content
      .find('script, ins, iframe, .code-block, .sharedaddy, .wpulike')
      .remove();
    content
      .find('p')
      .filter((_, element) => {
        const text = $(element).text().trim();
        return /(^|\s)(Index|Next Chapter|Previous Chapter|Prev Chapter)(\s|$)/i.test(
          text,
        );
      })
      .remove();

    return (
      content
        .html()
        ?.replace(/<!--[\s\S]*?-->/g, '')
        .trim() || ''
    );
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];
    const normalizedTerm = searchTerm.toLowerCase();
    const novels = await this.getMenuNovels();
    return novels.filter(novel =>
      novel.name.toLowerCase().includes(normalizedTerm),
    );
  }

  resolveUrl = (path: string) => this.absoluteUrl(path);
}

export default new HidamarisouTranslations();
