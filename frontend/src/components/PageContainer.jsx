import React from 'react';

export default function PageContainer({ children, className = '', style = {} }) {
  return (
    <main className={`page-container ${className}`} style={style}>
      {children}
    </main>
  );
}
