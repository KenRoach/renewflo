import React from 'react';
import { Outlet } from 'react-router-dom';
import { PartnerSidebar } from './components/PartnerSidebar';

export function PartnerLayout() {
  return (
    <div className="partner-layout">
      <PartnerSidebar />
      <main className="partner-main"><Outlet /></main>
    </div>
  );
}
