import { useState } from 'react';

import createLogger from '../utils/logger';
const logger = createLogger('dateForm');


export function useDateForm({ startDate, endDate, setStartDate, setEndDate, handleSubmit }) {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [isModalMode, setIsModalMode] = useState(true);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setStartDate(localStartDate);
    setEndDate(localEndDate);
    logger.log('DateForm: Updated startDate and endDate:', {
      startDate: localStartDate,
      endDate: localEndDate,
    });
    setIsModalMode(false);
    handleSubmit(e);
  };

  return {
    localStartDate,
    setLocalStartDate,
    localEndDate,
    setLocalEndDate,
    isModalMode,
    setIsModalMode,
    handleFormSubmit
  };
}
