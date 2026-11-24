import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdministrationService } from '../../core/services/administration';
import { administrationHelp, helpTopics } from './help-topics';

const searchable = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR');

@Component({
  selector: 'oc-help-page',
  imports: [RouterLink],
  templateUrl: './help-page.html',
  styleUrl: './help-page.scss',
})
export class HelpPage {
  private administration = inject(AdministrationService);
  query = signal('');
  topics = computed(() => {
    const terms = searchable(this.query().trim()).split(/\s+/).filter(Boolean);
    const available = this.administration.isAdmin()
      ? [...helpTopics, administrationHelp]
      : helpTopics;
    if (!terms.length) return available;
    return available
      .map((topic) => ({
        ...topic,
        questions: topic.questions.filter(({ title, answer }) => {
          const text = searchable(`${topic.title} ${title} ${answer}`);
          return terms.every((term) => text.includes(term));
        }),
      }))
      .filter((topic) => topic.questions.length > 0);
  });
}
