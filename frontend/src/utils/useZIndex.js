import { useState, useEffect } from 'react';

const BASE_Z_INDEX = 9;
const ACTIVE_Z_INDEX = 11;

export const useZIndex = (id) => {
  const [isActive, setIsActive] = useState(false);
  const [zIndex, setZIndex] = useState(BASE_Z_INDEX);

  const handleClick = () => {
    setIsActive(true);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(`#${id}`)) {
        setIsActive(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [id]);

  useEffect(() => {
    setZIndex(isActive ? ACTIVE_Z_INDEX : BASE_Z_INDEX);
  }, [isActive]);

  return {
    zIndex,
    handleClick,
    isActive
  };
};
