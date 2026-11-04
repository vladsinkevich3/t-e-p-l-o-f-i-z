import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Автоматическая регистрация сервис-воркера для автономной работы на ПК (офлайн)
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Доступна новая версия кэша.');
  },
  onOfflineReady() {
    console.log('Приложение готово к автономной работе на ПК без интернета.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
