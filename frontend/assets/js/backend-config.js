// Backend PHP/MySQL cùng hosting. Đổi mode thành 'demo' để xem giao diện tĩnh.
window.DT = window.DT || {};

DT.BACKEND = {
  mode: 'mysql',
  apiUrl: new URL('../../../server/api.php', document.currentScript.src).href,
  cacheMinutes: 5,    // thời gian giữ catalog trong sessionStorage
};
// Không cần URL rewrite; hỗ trợ cả hosting cài trong thư mục con.
DT.apiEndpoint = (path) => {
  const [route, query = ''] = path.split('?');
  const url = new URL(DT.BACKEND.apiUrl);
  url.search = query;
  url.searchParams.set('route', route);
  return url.href;
};
