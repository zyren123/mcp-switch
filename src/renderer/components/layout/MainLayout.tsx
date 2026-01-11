import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toaster } from '../ui/toaster';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-6 relative">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
};
