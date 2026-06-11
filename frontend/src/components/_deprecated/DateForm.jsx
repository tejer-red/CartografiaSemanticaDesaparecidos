// Deprecated: This component is deprecated and will be removed in the next major release.
import React from 'react';
import DateFormModal from './DateFormModal';
import DateFormCompact from './DateFormCompact';

const DateForm = ({
  handleSubmit,
  fetchCedulas,
  setFetchCedulas,
  fetchForense,
  setFetchForense,
  modal = true
}) => {
  if (modal) {
    return (
      <DateFormModal
        handleSubmit={handleSubmit}
        fetchCedulas={fetchCedulas}
        setFetchCedulas={setFetchCedulas}
        fetchForense={fetchForense}
        setFetchForense={setFetchForense}
      />
    );
  }
  return (
    <DateFormCompact
      handleSubmit={handleSubmit}
      fetchCedulas={fetchCedulas}
      setFetchCedulas={setFetchCedulas}
      fetchForense={fetchForense}
      setFetchForense={setFetchForense}
    />
  );
};

//export default DateForm;