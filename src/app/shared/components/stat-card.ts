import { Component, input } from '@angular/core';
import { Icon } from './icon';
@Component({
  selector: 'oc-stat',
  imports: [Icon],
  template: `<article class="card stat">
    <div class="stat-label">
      {{ label() }}<span class="icon-tile"><oc-icon [name]="icon()" /></span>
    </div>
    <strong>{{ value() }}</strong>
    <p>{{ detail() }}</p>
    @if (progress() > 0 || caption()) { <div class="track"><span [style.width.%]="progress()"></span></div> }
    @if (caption()) { <small>{{ caption() }}</small> }
  </article>`,
})
export class StatCard {
  label = input.required<string>();
  value = input.required<string>();
  icon = input.required<string>();
  detail = input('');
  progress = input(0);
  caption = input('');
}
