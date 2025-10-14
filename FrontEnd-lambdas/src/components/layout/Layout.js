/**
 * Main Layout Component
 * @module components/layout/Layout
 */

import React from 'react';
import { Container } from 'react-bootstrap';
import Header from './Header';

/**
 * Main application layout wrapper
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Layout component
 */
const Layout = ({ children }) => {
  return (
    <div className="min-vh-100 app-background">
      <Header />
      
      <Container fluid className="py-4">
        {children}
      </Container>
    </div>
  );
};

export default Layout;
