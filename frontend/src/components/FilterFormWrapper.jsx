import React from 'react';
import { useData } from '../context/DataContext';
import { useFilterFormEffects } from '../utils/filterForm';
import FilterForm from './FilterForm';

const FilterFormWrapper = () => {
  const dataContext = useData();
  useFilterFormEffects(dataContext);
  
  return null;
};

export default FilterFormWrapper;
