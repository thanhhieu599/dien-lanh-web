import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { bootstrap, siteBase } from './services/runtime';
import { App } from './App';
import './styles/react.css';

const root = createRoot(document.getElementById('root')!);
delete document.documentElement.dataset.reactReady;
document.getElementById('root')!.setAttribute('aria-busy','true');
async function start() {
  try {
    await bootstrap();
    root.render(<BrowserRouter basename={siteBase.pathname.replace(/\/$/,'')}><App/></BrowserRouter>);
  } catch (error) {
    root.render(<main className="container empty"><h1>Chưa tải được website</h1><p>{error instanceof Error ? error.message : 'Vui lòng thử lại.'}</p><button className="btn btn-primary" onClick={()=>location.reload()}>Tải lại</button></main>);
  }
}
void start();
