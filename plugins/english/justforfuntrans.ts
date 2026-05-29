import { fetchApi } from '@libs/fetch';
import { NovelStatus } from '@libs/novelStatus';
import { Plugin } from '@/types/plugin';
import { load as loadCheerio } from 'cheerio';

type WpCategory = {
  id: number;
};

type WpPost = {
  date?: string;
  link?: string;
  slug?: string;
  title?: {
    rendered?: string;
  };
};

class JustforfunTrans implements Plugin.PluginBase {
  id = 'justforfuntrans';
  name = 'Justforfun Translations';
  icon = 'src/en/justforfuntrans/icon.png';
  site = 'https://justforfuntrans.com/';
  version = '1.0.0';

  private normalizePath(url?: string) {
    if (!url) return '';
    return new URL(url, this.site).pathname.replace(/^\/|\/$/g, '');
  }

  private absoluteUrl(path: string) {
    return new URL(path, this.site).toString();
  }

  private async fetchHtml(path = '') {
    return fetchApi(this.absoluteUrl(path)).then(response => response.text());
  }

  private parseStatus(text: string) {
    if (/completed/i.test(text)) return NovelStatus.Completed;
    if (/ongoing/i.test(text)) return NovelStatus.Ongoing;
    return NovelStatus.Unknown;
  }

  private async getMenuNovels(): Promise<Plugin.NovelItem[]> {
    const html = await this.fetchHtml();
    const $ = loadCheerio(html);
    const novels = new Map<string, Plugin.NovelItem>();

    $(
      '.main-header-menu a[href], #ast-hf-menu-1 a[href], #ast-hf-mobile-menu a[href]',
    ).each((_, link) => {
      const name = $(link).text().trim().replace(/\s+/g, ' ');
      const path = this.normalizePath($(link).attr('href'));
      if (!name || !path || /^home$|about/i.test(name)) return;
      novels.set(path, { name, path });
    });

    return Array.from(novels.values());
  }

  async popularNovels(
    pageNo: number,
    { showLatestNovels }: Plugin.PopularNovelsOptions,
  ): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];

    const novels = await this.getMenuNovels();
    if (!showLatestNovels) return novels;

    const html = await this.fetchHtml();
    const $ = loadCheerio(html);
    const latestNames = $('.wp-block-latest-posts__post-title')
      .map((_, link) => $(link).text().trim().split(/\s+/)[0].toLowerCase())
      .toArray();

    return novels.sort((a, b) => {
      const aIndex = latestNames.indexOf(a.name.toLowerCase());
      const bIndex = latestNames.indexOf(b.name.toLowerCase());
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const html = await this.fetchHtml(novelPath);
    const $ = loadCheerio(html);
    const content = $('.entry-content').first().clone();
    const path = this.normalizePath(novelPath);
    const summaryParts: string[] = [];
    const chapters: Plugin.ChapterItem[] = [];
    let reachedToc = false;

    const novel: Plugin.SourceNovel = {
      name:
        content.find('h2').first().text().trim() ||
        $('h1.entry-title').first().text().trim(),
      path,
      cover: content.find('img').first().attr('src'),
      status: this.parseStatus(content.text()),
    };

    const authorText = content
      .find('p')
      .filter((_, element) => /^Author:/i.test($(element).text().trim()))
      .first()
      .text()
      .trim();
    novel.author = authorText.replace(/^Author:\s*/i, '').trim();

    content.children().each((_, element) => {
      const node = $(element);
      const headingText = node.text().trim();
      if (/table of contents/i.test(headingText)) {
        reachedToc = true;
        return;
      }

      if (reachedToc) {
        node.find('a[href]').each((__, link) => {
          const name = $(link).text().trim().replace(/\s+/g, ' ');
          const chapterPath = this.normalizePath($(link).attr('href'));
          if (!chapterPath || chapterPath === path || !/chapter/i.test(name)) {
            return;
          }
          chapters.push({
            name,
            path: chapterPath,
            chapterNumber: this.chapterNumber(name),
          });
        });
        return;
      }

      if (node.is('p, h2, h3, h4')) {
        const text = node.text().trim();
        if (text && !/^Author:|^作者：|^Status:/i.test(text)) {
          summaryParts.push(text);
        }
      }
    });

    novel.summary = summaryParts.join('\n\n').trim();
    novel.chapters = await this.supplementChapters(chapters);
    return novel;
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const html = await this.fetchHtml(chapterPath);
    const $ = loadCheerio(html);
    const content = $('.entry-content').first().clone();

    content
      .find(
        'script, style, iframe, ins, form, [id^="ezoic-pub-ad"], .code-block, .post-views, .sharedaddy, .likebtn_container, .wpulike',
      )
      .remove();
    content.find('hr').nextAll().remove();
    content.find('hr').remove();
    content.find('p').each((_, element) => {
      const text = $(element).text().trim();
      const linkText = $(element).find('a').text();
      if (
        /^(Prev|Previous|TOC|Next)(\s|\||$)/i.test(text) ||
        /TOC/i.test(linkText)
      ) {
        $(element).remove();
      }
    });

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
    const details = await Promise.allSettled(
      novels.map(async novel => ({
        item: novel,
        details: await this.parseNovel(novel.path),
      })),
    );

    return details
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<{
          item: Plugin.NovelItem;
          details: Plugin.SourceNovel;
        }> => result.status === 'fulfilled',
      )
      .filter(({ value }) =>
        `${value.item.name} ${value.details.name}`
          .toLowerCase()
          .includes(normalizedTerm),
      )
      .map(({ value }) => ({
        name: value.details.name || value.item.name,
        path: value.item.path,
        cover: value.details.cover,
      }));
  }

  resolveUrl = (path: string) => this.absoluteUrl(path);

  private chapterNumber(name: string) {
    const match = /chapter\s*(\d+(?:\.\d+)?)/i.exec(name);
    return match ? Number(match[1]) : undefined;
  }

  private async supplementChapters(chapters: Plugin.ChapterItem[]) {
    const categorySlug = this.categorySlugFromChapters(chapters);
    if (!categorySlug) return chapters;

    try {
      const categories = (await fetchApi(
        `${this.site}wp-json/wp/v2/categories?slug=${categorySlug}`,
      ).then(response => response.json())) as WpCategory[];
      const categoryId = categories[0]?.id;
      if (!categoryId) return chapters;

      const posts: WpPost[] = [];
      for (let page = 1; ; page += 1) {
        const pagePosts = (await fetchApi(
          `${this.site}wp-json/wp/v2/posts?categories=${categoryId}&per_page=100&page=${page}`,
        ).then(response => (response.ok ? response.json() : []))) as WpPost[];
        posts.push(...pagePosts);
        if (pagePosts.length < 100) break;
      }

      const chapterMap = new Map(
        chapters.map(chapter => [chapter.path, chapter]),
      );
      posts.forEach(post => {
        const path = this.normalizePath(post.link);
        const name = loadCheerio(post.title?.rendered || '')
          .text()
          .trim();
        const chapterNumber = this.chapterNumber(name || post.slug || '');
        if (
          !path ||
          !name ||
          chapterNumber === undefined ||
          chapterMap.has(path)
        ) {
          return;
        }
        chapterMap.set(path, {
          name,
          path,
          releaseTime: post.date,
          chapterNumber,
        });
      });

      return Array.from(chapterMap.values()).sort((a, b) => {
        if (a.chapterNumber !== undefined && b.chapterNumber !== undefined) {
          return a.chapterNumber - b.chapterNumber;
        }
        return a.path.localeCompare(b.path);
      });
    } catch {
      return chapters;
    }
  }

  private categorySlugFromChapters(chapters: Plugin.ChapterItem[]) {
    for (const chapter of chapters) {
      const slug = chapter.path.split('/').pop() || '';
      const match = /^([a-z0-9]+)-chapter/i.exec(slug);
      if (match) return match[1].toLowerCase();
    }
    return undefined;
  }
}

export default new JustforfunTrans();
