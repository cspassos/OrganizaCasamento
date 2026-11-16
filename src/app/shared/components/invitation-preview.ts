import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { InvitationDesign } from '../../core/models/invitations';
import { invitationSvg } from '../../core/utils/invitation-art';
@Component({
  selector: 'oc-invitation-preview',
  template: '<div class="invitation-preview-art" [innerHTML]="svg()"></div>',
  styles:
    ':host{display:block;min-width:0}.invitation-preview-art{max-width:440px;margin:auto;box-shadow:0 12px 40px #302b1e18}',
})
export class InvitationPreview {
  design = input.required<InvitationDesign>();
  recipient = input('');
  private sanitizer = inject(DomSanitizer);
  // Only the internal renderer is trusted. All user text is XML-escaped and photos are validated data images.
  svg = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(invitationSvg(this.design(), this.recipient())),
  );
}
