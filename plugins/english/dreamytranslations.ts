import { fetchApi } from '@libs/fetch';
import { NovelStatus } from '@libs/novelStatus';
import { defaultCover } from '@libs/defaultCover';
import { Plugin } from '@/types/plugin';

type DreamyProject = {
  id: number;
  title: string;
  slug: string;
  synopsis?: string;
  short_synopsis?: string;
  author?: string;
  genres?: string[];
  tags?: string[];
  completed?: boolean;
  total_chapters?: number;
  totalChapters?: number;
  latest_release?: string;
  last_updated_at?: string;
  view_count?: number;
};

type DreamyChapter = {
  id: number;
  title: string;
  index: number;
  free?: boolean;
  released_on?: string | null;
};

class DreamyTranslations implements Plugin.PluginBase {
  id = 'dreamytranslations';
  name = 'Dreamy Translations';
  version = '1.0.0';
  site = 'https://dreamy-translations.com';
  icon = 'src/en/dreamytranslations/icon.png';

  async popularNovels(
    pageNo: number,
    { showLatestNovels }: Plugin.PopularNovelsOptions,
  ): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];

    const { projects, coverImageUrls } = await this.getSeriesData();
    const sortedProjects = projects.sort((a, b) => {
      if (showLatestNovels) {
        return (
          this.dateValue(b.latest_release || b.last_updated_at) -
          this.dateValue(a.latest_release || a.last_updated_at)
        );
      }
      return (b.view_count || 0) - (a.view_count || 0);
    });

    return sortedProjects.map(project => ({
      name: project.title,
      path: this.novelPath(project.slug),
      cover: coverImageUrls[String(project.id)] || defaultCover,
    }));
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const slug = this.slugFromNovelPath(novelPath);
    const payload = await this.fetchFlightPayload(this.novelPath(slug));
    const project = this.extractJsonValue<DreamyProject>(payload, 'project');
    const chapters = this.extractJsonValue<DreamyChapter[]>(
      payload,
      'chapters',
    );
    const cover = this.extractStringValue(payload, 'coverUrl') || defaultCover;

    return {
      name: project.title,
      path: this.novelPath(project.slug),
      cover,
      author: project.author,
      summary: project.synopsis || project.short_synopsis || '',
      genres: [...(project.genres || []), ...(project.tags || [])].join(','),
      status: project.completed ? NovelStatus.Completed : NovelStatus.Ongoing,
      chapters: chapters
        .filter(chapter => chapter.free !== false)
        .map(chapter => ({
          name: chapter.title || `Chapter ${chapter.index}`,
          path: this.chapterPath(project.slug, chapter.index),
          chapterNumber: chapter.index,
          releaseTime: chapter.released_on || undefined,
        })),
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const payload = await this.fetchFlightPayload(chapterPath);
    const chapterRef = this.extractContentReference(payload);
    const content = this.extractTextChunk(payload, chapterRef);

    return content
      .split(/\n{2,}/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .map(paragraph => {
        if (paragraph.startsWith('<img ')) return paragraph;
        return `<p>${this.escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`;
      })
      .join('');
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    if (pageNo !== 1) return [];

    const query = this.normalize(searchTerm);
    const { projects, coverImageUrls } = await this.getSeriesData();

    return projects
      .filter(project => this.normalize(project.title).includes(query))
      .map(project => ({
        name: project.title,
        path: this.novelPath(project.slug),
        cover: coverImageUrls[String(project.id)] || defaultCover,
      }));
  }

  resolveUrl = (path: string) => new URL(path, this.site).toString();

  private async getSeriesData() {
    const payload = await this.fetchFlightPayload('/series');
    return {
      projects: this.extractJsonValue<DreamyProject[]>(payload, 'projects'),
      coverImageUrls: this.extractJsonValue<Record<string, string>>(
        payload,
        'coverImageUrls',
      ),
    };
  }

  private async fetchFlightPayload(path: string): Promise<string> {
    const response = await fetchApi(new URL(path, this.site).toString());
    const html = await response.text();
    const chunks: string[] = [];
    const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)<\/script>/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html))) {
      chunks.push(JSON.parse(`"${match[1]}"`));
    }

    return chunks.join('');
  }

  private extractJsonValue<T>(payload: string, key: string): T {
    const keyIndex = payload.indexOf(`"${key}":`);
    if (keyIndex === -1) throw new Error(`Dreamy payload missing ${key}`);

    const valueStart = payload.indexOf(':', keyIndex) + 1;
    const startChar = payload[valueStart];
    const endChar = startChar === '[' ? ']' : '}';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = valueStart; index < payload.length; index++) {
      const char = payload[index];

      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (char === startChar) depth++;
      if (char === endChar) depth--;
      if (depth === 0) {
        return JSON.parse(payload.slice(valueStart, index + 1));
      }
    }

    throw new Error(`Dreamy payload has unterminated ${key}`);
  }

  private extractStringValue(payload: string, key: string): string | undefined {
    const match = new RegExp(`"${key}":"([^"]*)"`).exec(payload);
    return match?.[1];
  }

  private extractContentReference(payload: string): string {
    const match = /"content":"\$(\w+)"/.exec(payload);
    if (!match) throw new Error('Dreamy chapter content reference not found');
    return match[1];
  }

  private extractTextChunk(payload: string, reference: string): string {
    const marker = `${reference}:T`;
    const markerIndex = payload.indexOf(marker);
    if (markerIndex === -1) throw new Error('Dreamy chapter text not found');

    const commaIndex = payload.indexOf(',', markerIndex);
    let textStart = commaIndex + 1;
    if (payload[textStart] === '"') textStart++;

    const nextRecord = this.findFlightRecordStart(payload, textStart);
    const textEnd = nextRecord === -1 ? payload.length : nextRecord;
    let content = payload.slice(textStart, textEnd);

    if (content.endsWith('"')) content = content.slice(0, -1);
    return content;
  }

  private findFlightRecordStart(payload: string, start: number) {
    const regex = /\w+:\["\$/g;
    regex.lastIndex = start;
    const match = regex.exec(payload);
    return match ? match.index : -1;
  }

  private novelPath(slug: string) {
    return `/novel/${slug}`;
  }

  private chapterPath(slug: string, index: number) {
    return `/novel/${slug}/chapter/${index}`;
  }

  private slugFromNovelPath(novelPath: string) {
    return novelPath.replace(/^\/?novel\//, '').replace(/\/$/, '');
  }

  private dateValue(date?: string) {
    return date ? new Date(date).getTime() : 0;
  }

  private normalize(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export default new DreamyTranslations();
