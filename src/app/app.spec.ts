import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MainLayout } from './layout/main-layout';
import { App } from './app';
import { mainNavigation } from './core/constants/navigation';

describe('Application shell', () => {
  it('renders the simplified menu without operational planning sections', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: '', component: MainLayout }])],
    });
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.nav-heading').length).toBe(8);
    expect(el.querySelector('nav')?.textContent).not.toContain('Equipe');
    expect(el.querySelector('nav')?.textContent).not.toContain('Cronograma');
    expect(el.textContent).toContain('Ambiente local');
  });
  it('assigns a unique destination to every menu entry', () => {
    const paths = mainNavigation.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
