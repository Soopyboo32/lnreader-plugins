import { load as loadCheerio } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { Plugin } from '@/types/plugin';

class DecodedNovels implements Plugin.PluginBase {
  id = 'decodednovels';
  name = 'Decoded Novels';
  icon = 'src/en/decodednovels/icon.webp';
  site = 'https://decodednovels.ca/';
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

    const html = await fetchApi(this.absoluteUrl('novels/')).then(res =>
      res.text(),
    );
    const $ = loadCheerio(html);
    const novels: Plugin.NovelItem[] = [];
    const seen = new Map<string, Plugin.NovelItem>();

    $('a[href*="/novels/"]').each((_, element) => {
      const href = $(element).attr('href');
      const path = this.normalizePath(href);
      const name = $(element).text().replace(/[◖◗]/g, '').trim();
      if (!name || path === 'novels') return;

      const container = $(element).closest('.wp-block-column, figure, p, div');
      const cover = container.find('img').first().attr('src') || undefined;

      const existing = seen.get(path);
      if (existing) {
        if (!existing.cover && cover) existing.cover = cover;
        return;
      }

      const novel = { name, path, cover };
      seen.set(path, novel);
      novels.push(novel);
    });

    return novels;
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const path = this.normalizePath(novelPath);
    const html = await fetchApi(this.absoluteUrl(path)).then(res => res.text());
    const $ = loadCheerio(html);
    const content = $('.entry-content').first().clone();
    const text = content.text().replace(/\s+/g, ' ').trim();
    const chapters: Plugin.ChapterItem[] = [];
    const seen = new Set<string>();
    const summaryMatch = text.match(
      /Summary:\s*(.*?)(?:CHAPTER LISTS?|\+\w|$)/i,
    );

    content.find('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      const chapterPath = this.normalizePath(href);
      const name = $(element).text().trim();
      if (
        !name ||
        !/\d{4}\/\d{2}\/\d{2}\//.test(chapterPath) ||
        seen.has(chapterPath)
      ) {
        return;
      }

      const dateMatch = chapterPath.match(/(\d{4})\/(\d{2})\/(\d{2})\//);
      seen.add(chapterPath);
      chapters.push({
        name,
        path: chapterPath,
        releaseTime: dateMatch
          ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
          : null,
        chapterNumber: chapters.length + 1,
      });
    });

    chapters.reverse();
    chapters.forEach((chapter, index) => {
      chapter.chapterNumber = index + 1;
    });

    return {
      path,
      name:
        content
          .find('h1, h2, h3, .wp-block-heading')
          .first()
          .text()
          .trim()
          .replace(/Leave a ReplyCancel reply$/i, '') ||
        $('title')
          .text()
          .replace(/\s+[–-]\s+DECODED NOVELS$/i, '')
          .trim(),
      cover: content.find('img').first().attr('src'),
      author: text.match(/Author:\s*(.*?)(?:Genre:|Summary:|$)/i)?.[1]?.trim(),
      genres: text.match(/Genre:\s*(.*?)(?:Status:|Summary:|$)/i)?.[1]?.trim(),
      summary: summaryMatch?.[1]?.trim() || '',
      chapters,
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const html = await fetchApi(this.absoluteUrl(chapterPath)).then(res =>
      res.text(),
    );
    const $ = loadCheerio(html);
    const content = $('.entry-content .post-content, .entry-content')
      .first()
      .clone();

    content
      .find(
        'script, style, iframe, select, .collapsible-container, .sharedaddy, .wp-block-jetpack-sharing-buttons, .wp-post-navigation, .wp-block-post-terms, .wordads-tag',
      )
      .remove();
    content.find('#wordads-inline-marker').remove();
    content.find('a').each((_, element) => {
      if (/^(TOC|Previous|Next)$/i.test($(element).text().trim())) {
        $(element).remove();
      }
    });
    content.find('div').each((_, element) => {
      if ($(element).text().replace(/\s+/g, ' ').trim() === '') {
        $(element).remove();
      }
    });
    content.find('p, h1, h2, h3').each((_, element) => {
      const text = $(element).text().trim();
      if (/^(Chapter Lists|Previous|Next)$/i.test(text)) $(element).remove();
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

export default new DecodedNovels();
