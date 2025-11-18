/**
 * Application Header Component
 * @module components/layout/Header
 */

import React from 'react';
import { Navbar, Container } from 'react-bootstrap';

/**
 * Header component with logo and title
 * @param {Object} props - Component props
 * @param {string} props.title - Application title
 * @param {string} props.version - Application version
 * @returns {JSX.Element} Header component
 */
const Header = ({ 
  title = "Invenadro",
  version = "v 1.0 - Lambda"
}) => {
  return (
    <Navbar variant="dark" className="navbar-primary shadow-sm">
      <Container fluid>
        <Navbar.Brand className="d-flex align-items-center">
          <img 
            src="/logo-invenadro.png" 
            alt="Invenadro Logo" 
            height="55"
            className="me-3"
          />
          <span className="fw-bold">{title}</span>
        </Navbar.Brand>
        <span className="badge badge-corporate">{version}</span>
      </Container>
    </Navbar>
  );
};

export default Header;
