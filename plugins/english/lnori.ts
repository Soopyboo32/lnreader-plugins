import { fetchApi } from '@libs/fetch';
import { Plugin } from '@/types/plugin';
import { Filters } from '@libs/filterInputs';
import { load as loadCheerio } from 'cheerio';
import { defaultCover } from '@libs/defaultCover';
import { NovelStatus } from '@libs/novelStatus';

type JsonLdValue = {
  '@type'?: string;
  name?: string;
  author?: { name?: string } | { name?: string }[] | string;
  description?: string | null;
  genre?: string;
  image?: string;
  url?: string;
  hasPart?: {
    name?: string;
    position?: string;
    url?: string;
  }[];
};

class Lnori implements Plugin.PluginBase {
  id = 'lnori';
  name = 'LNORI';
  icon = 'src/en/lnori/icon.ico';
  site = 'https://lnori.com/';
  version = '1.0.0';
  filters: Filters | undefined = undefined;

  async getCheerio(path: string) {
    const url = new URL(path, this.site).href;
    const response = await fetchApi(url);
    if (!response.ok) {
      throw new Error(`Could not reach LNORI (${response.status}).`);
    }

    return loadCheerio(await response.text());
  }

  getJsonLd($: ReturnType<typeof loadCheerio>, type: string): JsonLdValue {
    for (const element of $('script[type="application/ld+json"]').toArray()) {
      try {
        const data = JSON.parse($(element).text()) as JsonLdValue;
        if (data['@type'] === type) return data;
      } catch {
        // Ignore unrelated or malformed structured data blocks.
      }
    }

    return {};
  }

  toPath(url: string): string {
    return new URL(url, this.site).pathname.substring(1);
  }

  parseNovelCards(
    $: ReturnType<typeof loadCheerio>,
    showLatestNovels?: boolean,
  ): Plugin.NovelItem[] {
    const novels = $('article.card')
      .toArray()
      .flatMap(element => {
        const card = $(element);
        const link = card.find('a.stretched-link[href^="/series/"]').first();
        const href = link.attr('href');
        const name =
          card.attr('data-t') || link.attr('aria-label') || link.text().trim();

        if (!href || !name) return [];

        return [
          {
            name,
            path: this.toPath(href),
            cover: card.find('img').first().attr('src') || defaultCover,
          },
        ];
      });

    if (!showLatestNovels) return novels;

    return novels.sort((first, second) => {
      const firstYear = Number(first.path.match(/series\/(\d+)/)?.[1] || 0);
      const secondYear = Number(second.path.match(/series\/(\d+)/)?.[1] || 0);
      return secondYear - firstYear;
    });
  }

  async popularNovels(
    pageNo: number,
    { showLatestNovels }: Plugin.PopularNovelsOptions<typeof this.filters>,
  ): Promise<Plugin.NovelItem[]> {
    const $ = await this.getCheerio('/library');
    const pageSize = 24;
    const novels = this.parseNovelCards($, showLatestNovels);

    return novels.slice((pageNo - 1) * pageSize, pageNo * pageSize);
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const $ = await this.getCheerio(novelPath);
    const jsonLd = this.getJsonLd($, 'Book');
    const author =
      typeof jsonLd.author === 'string'
        ? jsonLd.author
        : Array.isArray(jsonLd.author)
          ? jsonLd.author
              .map(item => item.name)
              .filter(Boolean)
              .join(', ')
          : jsonLd.author?.name;

    const chapters = $('article.card a.stretched-link[href^="/book/"]')
      .toArray()
      .flatMap((element, index) => {
        const link = $(element);
        const href = link.attr('href');
        const name = link.attr('aria-label') || link.text().trim();

        if (!href || !name) return [];

        return [
          {
            name,
            path: this.toPath(href),
            chapterNumber: index + 1,
          },
        ];
      });

    const jsonLdChapters =
      chapters.length > 0
        ? chapters
        : (jsonLd.hasPart || []).flatMap((part, index) => {
            if (!part.name || !part.url) return [];

            return [
              {
                name: part.name,
                path: this.toPath(part.url),
                chapterNumber: Number(part.position) || index + 1,
              },
            ];
          });

    return {
      name: jsonLd.name || $('.s-title').first().text().trim(),
      path: novelPath,
      cover:
        $('.cover-wrap img').first().attr('src') ||
        $('meta[property="og:image"]').attr('content') ||
        jsonLd.image ||
        defaultCover,
      author: author || $('.author').first().text().trim(),
      genres: jsonLd.genre,
      status: NovelStatus.Unknown,
      summary:
        jsonLd.description ||
        $('.description').first().text().trim() ||
        'Summary Not Found',
      chapters: jsonLdChapters,
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const [bookPath, fragment] = chapterPath.split('#');
    const $ = await this.getCheerio(bookPath);
    const content = fragment
      ? $(`section.chapter#${fragment}`).first()
      : $('article.content-body').first();

    content.find('script, style').remove();

    return content.html() || '';
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];

    const normalizedTerm = searchTerm.toLowerCase().trim();
    const $ = await this.getCheerio('/library');

    return this.parseNovelCards($).filter(novel =>
      novel.name.toLowerCase().includes(normalizedTerm),
    );
  }

  resolveUrl = (path: string) => new URL(path, this.site).href;
}

export default new Lnori();
