import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SetupComponent } from './features/setup/setup.component';
import { ShipComponent } from './features/ship/ship.component';
import { MonitorComponent } from './features/monitor/monitor.component';

type Tab = 'setup' | 'ship' | 'monitor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, SetupComponent, ShipComponent, MonitorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  activeTab = signal<Tab>('monitor');
  token     = signal('');

  tabList = [
    { id: 'setup'   as Tab, label: 'Setup',   icon: '⚙' },
    { id: 'ship'    as Tab, label: 'Ship',     icon: '🚀' },
    { id: 'monitor' as Tab, label: 'Monitor',  icon: '◉' },
  ];

  constructor() {
    // Load token from server config (server-config.json) — never stored in browser
    fetch('http://localhost:3001/api/config')
      .then(r => r.json())
      .then(cfg => { if (cfg.githubToken) this.token.set(cfg.githubToken); })
      .catch(() => {});
  }
}
