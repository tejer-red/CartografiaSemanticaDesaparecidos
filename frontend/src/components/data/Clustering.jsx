import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';

import createLogger from '../../utils/logger';
const logger = createLogger('Clustering');


const Clustering = ({ type }) => {
  const { forenseRecords, avoidLayerOverlap, clusteringLayout, updateLayerData, selectedDate, daysRange } = useData();
  const [sliderMoved, setSliderMoved] = useState(false);

  useEffect(() => {
    if (sliderMoved && forenseRecords?.features?.length > 0) {
      //logger.log('Clustering', type);
      avoidLayerOverlap(forenseRecords.features, type, selectedDate, daysRange);
    }
  }, [forenseRecords, type, avoidLayerOverlap, clusteringLayout, updateLayerData, sliderMoved]);

  useEffect(() => {
    if (selectedDate && daysRange) {
      setSliderMoved(true);
    }
  }, [selectedDate, daysRange]);

  return null;
};

export default Clustering;