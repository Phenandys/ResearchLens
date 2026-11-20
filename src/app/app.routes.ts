import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    title: 'ResearchLens – Research Paper Discovery Application',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
