import {createRoot} from 'react-dom/client';
import {App} from './App';
import {bootstrap} from './services/runtime';
import {installUnsavedGuard} from './services/unsaved';
installUnsavedGuard();
import './styles/admin.css';
const root=createRoot(document.getElementById('admin-root')!);
bootstrap().then(()=>{document.documentElement.dataset.admin='react';root.render(<App/>);}).catch(error=>root.render(<main className="ar-login"><h1>Chưa tải được trang quản trị</h1><p role="alert">{error.message}</p><button className="btn btn-primary" onClick={()=>location.reload()}>Thử lại</button></main>));
