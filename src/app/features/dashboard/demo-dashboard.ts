import { Component } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/components/icon';
import { StatCard } from '../../shared/components/stat-card';
import { demo } from '../../data/mocks/dashboard-demo';
@Component({
  selector: 'oc-demo-dashboard',
  imports: [Icon, StatCard, RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './demo-dashboard.html',
})
export class DemoDashboard {
  demo = demo;
  total = demo.expenses.reduce((s, e) => s + e.value, 0);
  paid = demo.expenses.reduce((s, e) => s + e.paid, 0);
  progress = Math.round((demo.completed / demo.tasks) * 100);
  tasks = [
    {
      title: 'Escolher o cardápio da recepção',
      category: 'Buffet e alimentação',
      date: '20 nov',
      icon: 'restaurant',
    },
    {
      title: 'Revisar a lista de convidados',
      category: 'Pessoas e confirmações',
      date: '24 nov',
      icon: 'group',
    },
    {
      title: 'Definir as flores da cerimônia',
      category: 'Decoração e flores',
      date: '28 nov',
      icon: 'local_florist',
    },
  ];
  get days() {
    const [y, m, d] = [2027, 5, 22];
    const now = new Date();
    return Math.max(
      0,
      Math.round(
        (new Date(y, m - 1, d).getTime() -
          new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
          86400000,
      ),
    );
  }
}
