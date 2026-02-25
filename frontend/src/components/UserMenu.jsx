import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown, FiLogOut, FiUser } from 'react-icons/fi';
import { useGlobalContext } from '../context/globalContext';
import { getAvatarSrc, getInitials } from '../utils/avatar';

const UserMenu = () => {
  const { user, logoutUser } = useGlobalContext();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const initials = getInitials(user?.name || 'User');
  const avatarSrc = getAvatarSrc({
    avatarDataUrl: user?.avatarDataUrl || '',
    name: user?.name || 'User'
  });

  return (
    <div className="user-menu-wrap" ref={wrapRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="User menu"
      >
        <span className="user-menu-avatar">
          <img src={avatarSrc} alt={`${user?.name || 'User'} avatar`} />
          <span>{initials}</span>
        </span>
        <FiChevronDown className={`user-menu-caret ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <Link to="/profile" className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <FiUser /> Profile
          </Link>
          <button className="user-menu-item" role="menuitem" onClick={logoutUser}>
            <FiLogOut /> Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
