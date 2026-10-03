import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  it('renders the header and the tasks page with one initial load', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    const element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    expect(element.querySelector('h1')?.textContent).toContain('TaskManager');
    expect(element.querySelector('app-tasks-page')).not.toBeNull();
    http.expectOne('http://localhost:3000/tasks').flush([]);
    fixture.detectChanges();
    expect(element.textContent).toContain('No tasks yet.');
    http.verify();
  });
});
