import { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';

export const useTimelineSlider = () => {
  const {
    selectedDate,
    setSelectedDate,
    daysRange,
    timelineData,
    isTimelinePlaying,
    setIsTimelinePlaying,
    timelineVelocity,
    setTimelineVelocity,
  } = useData();

  // Add state for min and max dates
  const [minDate, setMinDate] = useState(null);
  const [maxDate, setMaxDate] = useState(null);

  const stepBackward = (days) => {
    setSelectedDate(prev => {
      if (!prev) return prev;
      const newDate = new Date(prev.getTime() - days * 86400000);
      return newDate < minDate ? minDate : newDate;
    });
  };

  const stepForward = (days) => {
    setSelectedDate(prev => {
      if (!prev) return prev;
      const newDate = new Date(prev.getTime() + days * 86400000);
      // Si llegamos al final, pausar la reproducción
      if (newDate >= maxDate) {
        setIsTimelinePlaying(false);
        return maxDate;
      }
      return newDate;
    });
  };

  const togglePlayPause = () => {
    setIsTimelinePlaying(prev => !prev);
  };

  useEffect(() => {
    let interval;
    if (isTimelinePlaying) {
      interval = setInterval(() => {
        stepForward(daysRange);
      }, timelineVelocity);
    }
    // Si llegamos al final, limpiar el intervalo
    if (selectedDate && maxDate && selectedDate >= maxDate) {
      clearInterval(interval);
      setIsTimelinePlaying(false);
    }
    return () => clearInterval(interval);
  }, [isTimelinePlaying, timelineVelocity, daysRange, selectedDate, maxDate]);

  // Calculate initial min and max dates
  useEffect(() => {
    if (timelineData && timelineData.length > 0) {
      const dates = timelineData.map(d => new Date(d.timestamp));
      const min = new Date(Math.min(...dates));
      const max = new Date(Math.max(...dates));
      setMinDate(min);
      setMaxDate(max);
      
      // If no date is selected, set it to the minimum date
      if (!selectedDate) {
        setSelectedDate(min);
        console.log('TimelineSlider: Initial date set to:', min);
      }
    }
  }, [timelineData, selectedDate, setSelectedDate]);

  return {
    isPlaying: isTimelinePlaying,
    selectedDate,
    minDate,
    maxDate,
    velocity: timelineVelocity,
    setVelocity: setTimelineVelocity,
    stepBackward,
    stepForward,
    togglePlayPause,
    handleDateChange: setSelectedDate,
    timelineData,
    daysRange,
  };
};
