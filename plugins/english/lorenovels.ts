import { Plugin } from '@/types/plugin';
import { load as parseHTML } from 'cheerio';
import { NovelStatus } from '@libs/novelStatus';
import { defaultCover } from '@libs/defaultCover';

class Lorenovels implements Plugin.PluginBase {
  id = 'Lorenovels';
  name = 'Lorenovels';
  site = 'https://lorenovels.com';
  version = '1.0.0';
  icon = 'src/en/lorenovels/icon.png';

  private toPath(url?: string) {
    if (!url) return '';
    return new URL(url, this.site).pathname.replace(/^\/|\/$/g, '');
  }

  private async getHTML(path = '') {
    return fetch(this.site + (path ? '/' + path.replace(/^\/|\/$/g, '') : ''), {
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

  private coverFrom($: any, root: any) {
    const image = root
      .find('img')
      .filter((_: number, el: any) => {
        const src = this.imageSrc($, $(el)) || '';
        return !!src && !/logo|footer-logo|avatar|gravatar/i.test(src);
      })
      .first();

    return (
      this.imageSrc($, image) ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      defaultCover
    );
  }

  async popularNovels(): Promise<Plugin.NovelItem[]> {
    const $ = parseHTML(await this.getHTML());
    const novelMap = new Map<string, Plugin.NovelItem>();
    const skippedPaths = [
      '',
      'about-us',
      'membership-join',
      'membership-login',
      'faq',
      'contact-us',
      'privacy-policy',
      'terms-of-service',
    ];

    $('main a[href], .wp-site-blocks a[href]').each((_, el) => {
      const name = $(el).text().replace(/\s+/g, ' ').trim();
      const path = this.toPath($(el).attr('href'));
      const cover = this.imageSrc($, $(el).find('img').first());

      if (path.includes('chapter-') || skippedPaths.includes(path)) return;

      const previous = novelMap.get(path);
      novelMap.set(path, {
        name: name || previous?.name || $(el).find('img').attr('alt') || '',
        path,
        cover: cover || previous?.cover,
      });
    });

    return Array.from(novelMap.values()).filter(novel => novel.name);
  }

  async parseNovel(path: string): Promise<Plugin.SourceNovel> {
    const $ = parseHTML(await this.getHTML(path));
    const content = $('article, main').first().clone();
    content.find('script, style, nav, form').remove();

    const chapters = content
      .find('a[href*="/chapter-"]')
      .map((index, el) => ({
        name: $(el).text().replace(/\s+/g, ' ').trim(),
        path: this.toPath($(el).attr('href')),
        chapterNumber: index + 1,
      }))
      .toArray()
      .reverse();

    const infoText = content.text().replace(/\s+/g, ' ').trim();
    const summary =
      infoText
        .replace(
          /^Title:\s*.*?Status:\s*(Ongoing|Completed|Hiatus|Dropped)/i,
          '',
        )
        .replace(/Start Reading.*/i, '')
        .trim() || undefined;

    return {
      name:
        $('h1').first().text().replace(/\s+/g, ' ').trim() ||
        $('title').text().split('-')[0].trim(),
      path,
      cover: this.coverFrom($, content),
      author: infoText.match(/Author:\s*([^:]+?)Genre:/i)?.[1]?.trim(),
      genres: infoText.match(/Genre:\s*([^:]+?)Status:/i)?.[1]?.trim(),
      status: /Status:\s*Completed/i.test(infoText)
        ? NovelStatus.Completed
        : NovelStatus.Ongoing,
      summary,
      chapters,
    };
  }

  async parseChapter(path: string): Promise<string> {
    const $ = parseHTML(await this.getHTML(path));
    const content = $('.entry-content, .wp-block-post-content').first();
    content
      .find(
        'script, style, nav, form, .sharedaddy, .comments-area, #comments, #respond, .wp-block-buttons',
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

export default new Lorenovels();
