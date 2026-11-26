import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import Disclaimer from './Disclaimer.jsx';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="flex-1 max-w-7xl w-full mx-auto">
          <TopBar />
          <Outlet />
        </div>
        <div className="max-w-7xl w-full mx-auto">
          <Disclaimer />
        </div>
      </main>
    </div>
  );
}
