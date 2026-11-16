import { Component, input } from '@angular/core';
@Component({
  selector: 'oc-icon',
  template: '<span class="material-symbols-outlined" aria-hidden="true">{{name()}}</span>',
  styles: ':host{display:inline-flex;vertical-align:middle}span{font-size:21px}',
})
export class Icon {
  name = input.required<string>();
}
